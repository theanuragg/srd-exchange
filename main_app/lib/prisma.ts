import 'server-only'

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  isConnected: boolean | undefined
}

let isConnecting = false
let connectionPromise: Promise<void> | null = null

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL

  if (!url) {
    throw new Error('DATABASE_URL is not set')
  }

  return url
}

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma
  }

  const client = new PrismaClient({
    log: ['warn', 'error'],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  })

  globalForPrisma.prisma = client
  return client
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient()
    const value = client[prop as keyof PrismaClient]

    if (typeof value === 'function') {
      return value.bind(client)
    }

    return value
  },
}) as PrismaClient

async function connectWithRetry(retries = 3): Promise<void> {
  getDatabaseUrl()

  if (globalForPrisma.isConnected) {
    return
  }

  if (isConnecting && connectionPromise) {
    return connectionPromise
  }

  isConnecting = true
  connectionPromise = (async () => {
    const client = getPrismaClient()

    for (let i = 0; i < retries; i++) {
      try {
        await client.$connect()
        globalForPrisma.isConnected = true
        isConnecting = false
        return
      } catch (error) {
        console.error(`Database connection attempt ${i + 1} failed:`, error)
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)))
        }
      }
    }

    isConnecting = false
    console.error('All database connection attempts failed')
  })()

  return connectionPromise
}

export async function ensureConnection(): Promise<void> {
  await connectWithRetry()
}

export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  retries = 2
): Promise<T> {
  await ensureConnection()

  for (let i = 0; i < retries; i++) {
    try {
      return await operation()
    } catch (error: any) {
      console.error(`Database operation attempt ${i + 1} failed:`, error)

      if (
        error.code === 'P1001' ||
        error.message?.includes("Can't reach database") ||
        error.message?.includes('not yet connected')
      ) {
        globalForPrisma.isConnected = false
        if (i < retries - 1) {
          await ensureConnection()
          await new Promise(resolve => setTimeout(resolve, 3000))
          continue
        }
      }

      throw error
    }
  }

  throw new Error('Database operation failed after all retries')
}

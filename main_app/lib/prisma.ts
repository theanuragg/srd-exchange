import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  isConnected: boolean
}

// Enhanced Prisma client with better connection handling
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

let isConnecting = false
let connectionPromise: Promise<void> | null = null

// Add connection retry logic
async function connectWithRetry(retries = 3): Promise<void> {
  if (globalForPrisma.isConnected) {
    return
  }

  if (isConnecting && connectionPromise) {
    return connectionPromise
  }

  isConnecting = true
  connectionPromise = (async () => {
    for (let i = 0; i < retries; i++) {
      try {
        await prisma.$connect()
        console.log('✅ Database connected successfully')
        globalForPrisma.isConnected = true
        isConnecting = false
        return
      } catch (error) {
        console.error(`❌ Database connection attempt ${i + 1} failed:`, error)
        if (i < retries - 1) {
          console.log(`⏳ Retrying in ${2000 * (i + 1)}ms...`)
          await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)))
        }
      }
    }
    isConnecting = false
    console.error('❌ All database connection attempts failed')
  })()

  return connectionPromise
}

// Auto-connect with retry
connectWithRetry()

// Ensure connection before database operations
export async function ensureConnection(): Promise<void> {
  if (!globalForPrisma.isConnected) {
    await connectWithRetry()
  }
}

// Enhanced database operation with retry
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  retries = 2
): Promise<T> {
  // Ensure connection first
  await ensureConnection()

  for (let i = 0; i < retries; i++) {
    try {
      return await operation()
    } catch (error: any) {
      console.error(`Database operation attempt ${i + 1} failed:`, error)

      // Check if it's a connection error
      if (error.code === 'P1001' || error.message?.includes("Can't reach database") || error.message?.includes("not yet connected")) {
        globalForPrisma.isConnected = false
        if (i < retries - 1) {
          console.log(`⏳ Retrying database operation in 3s...`)
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

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
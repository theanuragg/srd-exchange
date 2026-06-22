import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['info', 'warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

async function main() {
  try {
    const user = await prisma.user.findFirst()
    console.log('Successfully connected to DB! User:', user?.id)
  } catch (e) {
    console.error('Error connecting to DB:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()

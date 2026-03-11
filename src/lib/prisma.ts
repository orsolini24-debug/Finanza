import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

type PrismaClientType = ReturnType<typeof createPrismaClient>

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  const adapter = new PrismaNeon({ connectionString })
  return new PrismaClient({ adapter })
}

declare global {
  var _prismaInstance: PrismaClientType | undefined
}

function getInstance(): PrismaClientType {
  if (!globalThis._prismaInstance) {
    globalThis._prismaInstance = createPrismaClient()
  }
  return globalThis._prismaInstance
}

// Lazy proxy: il client viene creato solo alla prima query, non all'import
// Questo evita errori durante la fase di build di Next.js (collecting page data)
const prisma = new Proxy({} as PrismaClientType, {
  get(_, prop: string | symbol) {
    const client = getInstance()
    const value = (client as any)[prop]
    return typeof value === 'function' ? value.bind(client) : value
  },
})

export default prisma

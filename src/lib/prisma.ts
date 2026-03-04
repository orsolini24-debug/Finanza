import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL is not set. Database operations will fail.")
    // We return a proxy that throws on any access to avoid hard crashes during SSR
    return new Proxy({} as PrismaClient, {
      get: (target, prop) => {
        if (prop === '$on' || prop === '$connect' || prop === '$disconnect') return () => {}
        throw new Error(`Prisma access failed: DATABASE_URL is missing. Check .env.local`)
      }
    })
  }
  return new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma

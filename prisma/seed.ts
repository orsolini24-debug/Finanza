import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding...')

  // This script will only seed global templates if needed, 
  // but since our architecture is workspace-based, 
  // we'll wait for a workspace to be created to add categories.
  
  // Alternatively, we can create a "System" workspace or just log that seeding is ready.
  
  console.log('Seed completed. (Categories will be created automatically for each new user workspace)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

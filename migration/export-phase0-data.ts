import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

export interface Phase0Data {
  users: Array<{
    id: string
    email: string
    username: string
    passwordHash: string
    createdAt: Date
    updatedAt: Date
  }>
  listings: Array<{
    id: string
    userId: string
    title: string
    eventName: string
    eventDate: Date
    venue: string | null
    priceInCents: number
    quantity: number
    description: string | null
    ticketPath: string | null
    originalFileName: string | null
    fileType: string | null
    fileSize: number | null
    status: string
    createdAt: Date
    updatedAt: Date
  }>
  offers: Array<{
    id: string
    listingId: string
    buyerId: string
    offerPriceInCents: number
    quantity: number
    messageTemplate: string
    customMessage: string | null
    status: string
    createdAt: Date
    updatedAt: Date
    isPaid: boolean
    paidAt: Date | null
  }>
}

async function exportPhase0Data(): Promise<Phase0Data> {
  console.log('📤 Exporting Phase 0 data from SQLite...')
  
  try {
    // Export users
    console.log('  - Exporting users...')
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' }
    })
    console.log(`    ✅ Exported ${users.length} users`)

    // Export listings
    console.log('  - Exporting listings...')
    const listings = await prisma.listing.findMany({
      orderBy: { createdAt: 'asc' }
    })
    console.log(`    ✅ Exported ${listings.length} listings`)

    // Export offers
    console.log('  - Exporting offers...')
    const offers = await prisma.offer.findMany({
      orderBy: { createdAt: 'asc' }
    })
    console.log(`    ✅ Exported ${offers.length} offers`)

    const exportData: Phase0Data = {
      users,
      listings,
      offers
    }

    // Save to JSON file for backup/review
    const exportPath = join(process.cwd(), 'migration', 'phase0-export.json')
    writeFileSync(exportPath, JSON.stringify(exportData, null, 2))
    console.log(`💾 Data exported to: ${exportPath}`)

    return exportData
  } catch (error) {
    console.error('❌ Failed to export Phase 0 data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run export if called directly
if (require.main === module) {
  exportPhase0Data()
    .then(() => {
      console.log('✅ Phase 0 data export completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Export failed:', error)
      process.exit(1)
    })
}

export { exportPhase0Data }
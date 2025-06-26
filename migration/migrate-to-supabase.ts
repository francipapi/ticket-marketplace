import { PrismaClient } from '@prisma/client'
import { supabaseAdmin } from '../lib/supabase/server'
import { exportPhase0Data, Phase0Data } from './export-phase0-data'
import { randomBytes } from 'crypto'

// Prisma client for Supabase (PostgreSQL)
const supabasePrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL // Supabase PostgreSQL URL
    }
  }
})

interface MigrationResult {
  success: boolean
  usersMigrated: number
  listingsMigrated: number
  offersMigrated: number
  errors: string[]
}

async function generateTempPassword(): Promise<string> {
  return randomBytes(16).toString('hex')
}

async function migrateUsers(users: Phase0Data['users']): Promise<{ migrated: number; errors: string[] }> {
  let migrated = 0
  const errors: string[] = []

  console.log(`👤 Migrating ${users.length} users...`)

  for (const user of users) {
    try {
      // Create user in Supabase Auth with temporary password
      const tempPassword = await generateTempPassword()
      
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: tempPassword,
        email_confirm: true, // Skip email confirmation for migration
        user_metadata: {
          username: user.username,
          migrated_from_phase0: true,
          original_id: user.id
        }
      })

      if (authError) {
        errors.push(`Failed to create auth user for ${user.email}: ${authError.message}`)
        continue
      }

      if (!authUser.user) {
        errors.push(`No user returned from Supabase Auth for ${user.email}`)
        continue
      }

      // Create user record in our database
      await supabasePrisma.user.create({
        data: {
          id: authUser.user.id, // Use Supabase Auth ID as primary key
          supabaseId: authUser.user.id,
          email: user.email,
          username: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          migratedAt: new Date(),
          migrationStatus: 'migrated',
          migratedFromId: user.id
        }
      })

      // Create profile record
      await supabasePrisma.profile.create({
        data: {
          id: authUser.user.id,
          username: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      })

      // Log successful migration
      await supabasePrisma.migrationLog.create({
        data: {
          tableName: 'users',
          recordId: authUser.user.id,
          oldId: user.id,
          newId: authUser.user.id,
          status: 'completed'
        }
      })

      migrated++
      console.log(`    ✅ Migrated user: ${user.username} (${user.email})`)

    } catch (error) {
      const errorMsg = `Failed to migrate user ${user.username}: ${error instanceof Error ? error.message : String(error)}`
      errors.push(errorMsg)
      console.error(`    ❌ ${errorMsg}`)
      
      // Log failed migration
      try {
        await supabasePrisma.migrationLog.create({
          data: {
            tableName: 'users',
            recordId: user.id,
            oldId: user.id,
            status: 'failed',
            error: errorMsg
          }
        })
      } catch (e) {
        console.error('Failed to log migration error:', e)
      }
    }
  }

  return { migrated, errors }
}

async function migrateListings(
  listings: Phase0Data['listings'],
  userIdMapping: Map<string, string>
): Promise<{ migrated: number; errors: string[] }> {
  let migrated = 0
  const errors: string[] = []

  console.log(`📋 Migrating ${listings.length} listings...`)

  for (const listing of listings) {
    try {
      const newUserId = userIdMapping.get(listing.userId)
      if (!newUserId) {
        errors.push(`Cannot find migrated user ID for listing ${listing.id}, user ${listing.userId}`)
        continue
      }

      const newListing = await supabasePrisma.listing.create({
        data: {
          userId: newUserId,
          title: listing.title,
          eventName: listing.eventName,
          eventDate: listing.eventDate,
          venue: listing.venue,
          priceInCents: listing.priceInCents,
          quantity: listing.quantity,
          description: listing.description,
          ticketPath: listing.ticketPath, // Will need to migrate files separately
          originalFileName: listing.originalFileName,
          fileType: listing.fileType,
          fileSize: listing.fileSize,
          status: listing.status,
          createdAt: listing.createdAt,
          updatedAt: listing.updatedAt,
          migratedAt: new Date(),
          migratedFromId: listing.id
        }
      })

      // Log successful migration
      await supabasePrisma.migrationLog.create({
        data: {
          tableName: 'listings',
          recordId: newListing.id,
          oldId: listing.id,
          newId: newListing.id,
          status: 'completed'
        }
      })

      migrated++
      console.log(`    ✅ Migrated listing: ${listing.title}`)

    } catch (error) {
      const errorMsg = `Failed to migrate listing ${listing.id}: ${error instanceof Error ? error.message : String(error)}`
      errors.push(errorMsg)
      console.error(`    ❌ ${errorMsg}`)
    }
  }

  return { migrated, errors }
}

async function migrateOffers(
  offers: Phase0Data['offers'],
  userIdMapping: Map<string, string>,
  listingIdMapping: Map<string, string>
): Promise<{ migrated: number; errors: string[] }> {
  let migrated = 0
  const errors: string[] = []

  console.log(`💰 Migrating ${offers.length} offers...`)

  for (const offer of offers) {
    try {
      const newBuyerId = userIdMapping.get(offer.buyerId)
      const newListingId = listingIdMapping.get(offer.listingId)

      if (!newBuyerId) {
        errors.push(`Cannot find migrated buyer ID for offer ${offer.id}, buyer ${offer.buyerId}`)
        continue
      }

      if (!newListingId) {
        errors.push(`Cannot find migrated listing ID for offer ${offer.id}, listing ${offer.listingId}`)
        continue
      }

      const newOffer = await supabasePrisma.offer.create({
        data: {
          listingId: newListingId,
          buyerId: newBuyerId,
          offerPriceInCents: offer.offerPriceInCents,
          quantity: offer.quantity,
          messageTemplate: offer.messageTemplate,
          customMessage: offer.customMessage,
          status: offer.status,
          createdAt: offer.createdAt,
          updatedAt: offer.updatedAt,
          isPaid: offer.isPaid,
          paidAt: offer.paidAt,
          migratedAt: new Date(),
          migratedFromId: offer.id
        }
      })

      // Log successful migration
      await supabasePrisma.migrationLog.create({
        data: {
          tableName: 'offers',
          recordId: newOffer.id,
          oldId: offer.id,
          newId: newOffer.id,
          status: 'completed'
        }
      })

      migrated++
      console.log(`    ✅ Migrated offer: ${offer.id}`)

    } catch (error) {
      const errorMsg = `Failed to migrate offer ${offer.id}: ${error instanceof Error ? error.message : String(error)}`
      errors.push(errorMsg)
      console.error(`    ❌ ${errorMsg}`)
    }
  }

  return { migrated, errors }
}

async function buildUserIdMapping(): Promise<Map<string, string>> {
  const mapping = new Map<string, string>()
  
  const migratedUsers = await supabasePrisma.user.findMany({
    where: {
      migrationStatus: 'migrated',
      migratedFromId: { not: null }
    },
    select: {
      id: true,
      migratedFromId: true
    }
  })

  for (const user of migratedUsers) {
    if (user.migratedFromId) {
      mapping.set(user.migratedFromId, user.id)
    }
  }

  return mapping
}

async function buildListingIdMapping(): Promise<Map<string, string>> {
  const mapping = new Map<string, string>()
  
  const migratedListings = await supabasePrisma.listing.findMany({
    where: {
      migratedFromId: { not: null }
    },
    select: {
      id: true,
      migratedFromId: true
    }
  })

  for (const listing of migratedListings) {
    if (listing.migratedFromId) {
      mapping.set(listing.migratedFromId, listing.id)
    }
  }

  return mapping
}

export async function migrateToSupabase(): Promise<MigrationResult> {
  console.log('🚀 Starting Phase 0 → Phase 1 migration...')
  
  const result: MigrationResult = {
    success: false,
    usersMigrated: 0,
    listingsMigrated: 0,
    offersMigrated: 0,
    errors: []
  }

  try {
    // Step 1: Export Phase 0 data
    console.log('\n📤 Step 1: Exporting Phase 0 data...')
    const phase0Data = await exportPhase0Data()
    
    // Step 2: Migrate users
    console.log('\n👤 Step 2: Migrating users...')
    const userResult = await migrateUsers(phase0Data.users)
    result.usersMigrated = userResult.migrated
    result.errors.push(...userResult.errors)
    
    // Step 3: Build user ID mapping for listings and offers
    console.log('\n🔗 Step 3: Building user ID mappings...')
    const userIdMapping = await buildUserIdMapping()
    console.log(`    ℹ️ Built mapping for ${userIdMapping.size} users`)
    
    // Step 4: Migrate listings
    console.log('\n📋 Step 4: Migrating listings...')
    const listingResult = await migrateListings(phase0Data.listings, userIdMapping)
    result.listingsMigrated = listingResult.migrated
    result.errors.push(...listingResult.errors)
    
    // Step 5: Build listing ID mapping for offers
    console.log('\n🔗 Step 5: Building listing ID mappings...')
    const listingIdMapping = await buildListingIdMapping()
    console.log(`    ℹ️ Built mapping for ${listingIdMapping.size} listings`)
    
    // Step 6: Migrate offers
    console.log('\n💰 Step 6: Migrating offers...')
    const offerResult = await migrateOffers(phase0Data.offers, userIdMapping, listingIdMapping)
    result.offersMigrated = offerResult.migrated
    result.errors.push(...offerResult.errors)
    
    // Determine overall success
    result.success = result.errors.length === 0
    
    console.log('\n📊 Migration Summary:')
    console.log(`    Users migrated: ${result.usersMigrated}/${phase0Data.users.length}`)
    console.log(`    Listings migrated: ${result.listingsMigrated}/${phase0Data.listings.length}`)
    console.log(`    Offers migrated: ${result.offersMigrated}/${phase0Data.offers.length}`)
    console.log(`    Errors: ${result.errors.length}`)
    
    if (result.errors.length > 0) {
      console.log('\n❌ Migration completed with errors:')
      result.errors.forEach(error => console.log(`    - ${error}`))
    } else {
      console.log('\n✅ Migration completed successfully!')
    }

  } catch (error) {
    const errorMsg = `Migration failed: ${error instanceof Error ? error.message : String(error)}`
    result.errors.push(errorMsg)
    console.error(`\n❌ ${errorMsg}`)
  } finally {
    await supabasePrisma.$disconnect()
  }

  return result
}

// Run migration if called directly
if (require.main === module) {
  migrateToSupabase()
    .then((result) => {
      if (result.success) {
        console.log('\n🎉 Phase 1 migration completed successfully!')
        process.exit(0)
      } else {
        console.log('\n⚠️ Phase 1 migration completed with errors. Check the logs above.')
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error('\n💥 Migration failed completely:', error)
      process.exit(1)
    })
}
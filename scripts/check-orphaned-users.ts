#!/usr/bin/env npx tsx

// Check for orphaned users referenced in offers

// Load environment variables
import { config } from 'dotenv'
config({ path: '.env.local' })

import { getAirtableClient, AIRTABLE_TABLES } from '../lib/airtable-client'

async function checkOrphanedUsers() {
  console.log('🔍 Checking for orphaned users in offers...')
  
  try {
    const client = getAirtableClient()
    
    // Get all users
    console.log('\n1️⃣ Getting all users...')
    const userRecords = await client.executeWithRateLimit(async () => {
      const table = client.getTable(AIRTABLE_TABLES.USERS)
      return await table.select().all()
    })
    
    const userIds = userRecords.map(record => record.id)
    console.log(`Found ${userIds.length} users:`)
    userIds.forEach(id => console.log(`  ${id}`))
    
    // Get all offers with buyer references
    console.log('\n2️⃣ Getting all offers...')
    const offerRecords = await client.executeWithRateLimit(async () => {
      const table = client.getTable(AIRTABLE_TABLES.OFFERS)
      return await table.select().all()
    })
    
    console.log(`Found ${offerRecords.length} offers`)
    
    // Check for orphaned buyers
    console.log('\n3️⃣ Checking for orphaned buyers...')
    const referencedBuyers = new Set()
    
    offerRecords.forEach(offer => {
      const buyers = offer.get('buyer') as string[]
      if (buyers && Array.isArray(buyers)) {
        buyers.forEach(buyerId => referencedBuyers.add(buyerId))
      }
    })
    
    console.log(`Referenced buyers: ${Array.from(referencedBuyers).join(', ')}`)
    
    const orphanedBuyers = Array.from(referencedBuyers).filter(buyerId => !userIds.includes(buyerId))
    
    if (orphanedBuyers.length > 0) {
      console.log(`❌ Found ${orphanedBuyers.length} orphaned buyers:`)
      orphanedBuyers.forEach(buyerId => {
        console.log(`  ${buyerId} - referenced in offers but user doesn't exist`)
        
        // Find which offers reference this buyer
        const affectedOffers = offerRecords.filter(offer => {
          const buyers = offer.get('buyer') as string[]
          return buyers && buyers.includes(buyerId)
        })
        
        console.log(`    Affects ${affectedOffers.length} offers: ${affectedOffers.map(o => o.id).join(', ')}`)
      })
    } else {
      console.log('✅ No orphaned buyers found')
    }
    
    // Check for orphaned listings
    console.log('\n4️⃣ Checking for orphaned listings...')
    const listingRecords = await client.executeWithRateLimit(async () => {
      const table = client.getTable(AIRTABLE_TABLES.LISTINGS)
      return await table.select().all()
    })
    
    const listingIds = listingRecords.map(record => record.id)
    const referencedListings = new Set()
    
    offerRecords.forEach(offer => {
      const listings = offer.get('listing') as string[]
      if (listings && Array.isArray(listings)) {
        listings.forEach(listingId => referencedListings.add(listingId))
      }
    })
    
    const orphanedListings = Array.from(referencedListings).filter(listingId => !listingIds.includes(listingId))
    
    if (orphanedListings.length > 0) {
      console.log(`❌ Found ${orphanedListings.length} orphaned listings:`)
      orphanedListings.forEach(listingId => console.log(`  ${listingId}`))
    } else {
      console.log('✅ No orphaned listings found')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the check
checkOrphanedUsers().then(() => {
  console.log('\n✅ Orphaned user check completed')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Check failed:', error)
  process.exit(1)
})
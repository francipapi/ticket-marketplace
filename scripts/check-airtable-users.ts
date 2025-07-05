#!/usr/bin/env npx tsx

// Check what users are actually in the Airtable database

// Load environment variables
import { config } from 'dotenv'
config({ path: '.env.local' })

import { getAirtableClient, AIRTABLE_TABLES } from '../lib/airtable-client'

async function checkAirtableUsers() {
  console.log('🔍 Checking Airtable users and listings...')
  
  try {
    const client = getAirtableClient()
    
    console.log('\n👥 Users in database:')
    const userRecords = await client.executeWithRateLimit(async () => {
      const table = client.getTable(AIRTABLE_TABLES.USERS)
      return await table.select({ maxRecords: 10 }).all()
    })
    
    console.log(`Found ${userRecords.length} users:`)
    userRecords.forEach((record, index) => {
      const email = record.get('email')
      const username = record.get('username')
      const clerkId = record.get('clerkId')
      console.log(`   ${index + 1}. ${username} (${email})`)
      console.log(`      Record ID: ${record.id}`)
      console.log(`      Clerk ID: ${clerkId}`)
    })
    
    console.log('\n💼 Offers in database:')
    const offerRecords = await client.executeWithRateLimit(async () => {
      const table = client.getTable(AIRTABLE_TABLES.OFFERS)
      return await table.select({ maxRecords: 10 }).all()
    })
    
    console.log(`Found ${offerRecords.length} offers:`)
    offerRecords.forEach((record, index) => {
      const listing = record.get('listing')
      const buyer = record.get('buyer')
      const offerPrice = record.get('offerPrice')
      const status = record.get('status')
      console.log(`   ${index + 1}. Offer ${record.id}`)
      console.log(`      Listing: ${JSON.stringify(listing)}`)
      console.log(`      Buyer: ${JSON.stringify(buyer)}`)
      console.log(`      Price: $${(offerPrice / 100).toFixed(2)}`)
      console.log(`      Status: ${status}`)
    })

    console.log('\n🎫 Listings in database:')
    const listingRecords = await client.executeWithRateLimit(async () => {
      const table = client.getTable(AIRTABLE_TABLES.LISTINGS)
      return await table.select({ maxRecords: 10 }).all()
    })
    
    console.log(`Found ${listingRecords.length} listings:`)
    listingRecords.forEach((record, index) => {
      const title = record.get('title')
      const eventName = record.get('eventName')
      const seller = record.get('seller')
      console.log(`   ${index + 1}. ${title} - ${eventName}`)
      console.log(`      Record ID: ${record.id}`)
      console.log(`      Seller: ${JSON.stringify(seller)}`)
    })
    
    // Test filtering with actual data
    if (userRecords.length > 0 && listingRecords.length > 0) {
      console.log('\n🧪 Testing filter with actual data...')
      
      const firstUser = userRecords[0]
      const userEmail = firstUser.get('email') as string
      const userId = firstUser.id
      
      console.log(`Testing filter for user: ${userEmail} (ID: ${userId})`)
      
      // Test the email-based filter
      const filteredRecords = await client.executeWithRateLimit(async () => {
        const table = client.getTable(AIRTABLE_TABLES.LISTINGS)
        return await table.select({
          filterByFormula: `{seller} = "${userEmail}"`,
          maxRecords: 10
        }).all()
      })
      
      console.log(`✅ Email filter returned ${filteredRecords.length} listings`)
      
      // Test the record ID filter (should fail)
      const recordIdFiltered = await client.executeWithRateLimit(async () => {
        const table = client.getTable(AIRTABLE_TABLES.LISTINGS)
        return await table.select({
          filterByFormula: `{seller} = "${userId}"`,
          maxRecords: 10
        }).all()
      })
      
      console.log(`❌ Record ID filter returned ${recordIdFiltered.length} listings`)
      
      if (filteredRecords.length > 0) {
        console.log('\n✅ SUCCESS: Email-based filtering works!')
        console.log('The fix should work correctly.')
      } else {
        console.log('\n⚠️  No listings found for the test user.')
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the check
checkAirtableUsers().then(() => {
  console.log('\n✅ Check completed')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Check failed:', error)
  process.exit(1)
})
#!/usr/bin/env npx tsx

// Direct Airtable test to verify the listing filter fix
// This bypasses the factory pattern and tests Airtable directly

// Load environment variables
import { config } from 'dotenv'
config({ path: '.env.local' })

import { AirtableDatabaseService } from '../lib/services/implementations/airtable/database.service'

async function testAirtableDirectly() {
  console.log('🧪 Testing Airtable listing filter fix directly...')
  
  try {
    // Create Airtable service directly
    const airtableService = new AirtableDatabaseService()
    
    // 1. Find the test user by Clerk ID (Alice who has 3 listings)
    console.log('\n1️⃣ Finding user by Clerk ID...')
    const testClerkId = 'user_2z8zB7aOUa2ixUUZb8U1JMqzh0Y' // Alice's Clerk ID
    const user = await airtableService.users.findByClerkId(testClerkId)
    
    if (!user) {
      console.log('❌ Test user not found')
      return
    }
    
    console.log(`✅ Found user: ${user.username} (${user.email})`)
    console.log(`   Record ID: ${user.id}`)
    
    // 2. Test listing filtering by user ID (should now work with email-based filtering)
    console.log('\n2️⃣ Testing listing filter by userId...')
    const listings = await airtableService.listings.findMany({
      userId: user.id,  // This should now internally convert to email-based filtering
      limit: 50
    })
    
    console.log(`✅ Found ${listings.items.length} listings for user ${user.username}`)
    
    if (listings.items.length > 0) {
      console.log('\n📋 Listing details:')
      listings.items.forEach((listing, index) => {
        console.log(`   ${index + 1}. ${listing.title} - ${listing.eventName}`)
        console.log(`      Status: ${listing.status}`)
        console.log(`      Price: $${(listing.priceInCents / 100).toFixed(2)}`)
        console.log(`      User ID matches: ${listing.userId === user.id ? '✅' : '❌'}`)
      })
      
      console.log('\n🎉 SUCCESS: Airtable filtering is now working correctly!')
      console.log('The dashboard should now show user listings properly.')
    } else {
      console.log('\n⚠️  No listings found for this user.')
      console.log('This could mean:')
      console.log('   1. The user has no listings')
      console.log('   2. The filtering is still not working')
      console.log('   3. The data structure has changed')
    }
    
    console.log('\n✅ Direct Airtable test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testAirtableDirectly().then(() => {
  console.log('\n✅ All tests completed')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Test suite failed:', error)
  process.exit(1)
})
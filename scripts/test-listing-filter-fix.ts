#!/usr/bin/env npx tsx

// Test script to verify the Airtable listing filter fix
// This script tests the corrected filtering by email instead of record ID

// Load environment variables
import { config } from 'dotenv'
config({ path: '.env.local' })

// Force Airtable usage for this test
process.env.USE_AIRTABLE = 'true'

import { getDatabaseService, ServiceFactory } from '../lib/services/factory'

// Reset services to pick up the environment variable change
ServiceFactory.resetServices()

async function testListingFilterFix() {
  console.log('🧪 Testing Airtable listing filter fix...')
  
  // Debug environment variables
  console.log(`DEBUG: USE_AIRTABLE = ${process.env.USE_AIRTABLE}`)
  console.log(`DEBUG: Service config:`, ServiceFactory.getServiceConfig())
  
  try {
    const dbService = getDatabaseService()
    
    // 1. Find the test user by Clerk ID
    console.log('\n1️⃣ Finding user by Clerk ID...')
    const testClerkId = 'user_2qVKa3LEQQAXd8TK6Jw1HIhpSBr'
    const user = await dbService.users.findByClerkId(testClerkId)
    
    if (!user) {
      console.log('❌ Test user not found')
      return
    }
    
    console.log(`✅ Found user: ${user.username} (${user.email})`)
    console.log(`   Record ID: ${user.id}`)
    
    // 2. Test listing filtering by user ID (should now work with email-based filtering)
    console.log('\n2️⃣ Testing listing filter by userId...')
    const listings = await dbService.listings.findMany({
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
    }
    
    // 3. Test API endpoint directly (simulating dashboard call)
    console.log('\n3️⃣ Testing API endpoint directly...')
    
    // Simulate the API call that the dashboard makes
    const response = await fetch(`http://localhost:3001/api/listings?userId=${user.id}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ API returned ${data.listings?.length || 0} listings`)
      
      if (data.listings && data.listings.length > 0) {
        console.log('\n📋 API listing details:')
        data.listings.forEach((listing: any, index: number) => {
          console.log(`   ${index + 1}. ${listing.title} - ${listing.eventName}`)
          console.log(`      Status: ${listing.status}`)
          console.log(`      Has seller info: ${listing.user ? '✅' : '❌'}`)
        })
      }
    } else {
      console.log(`❌ API call failed: ${response.status}`)
      const errorText = await response.text()
      console.log(`   Error: ${errorText}`)
    }
    
    console.log('\n🎉 Test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testListingFilterFix().then(() => {
  console.log('\n✅ All tests completed')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Test suite failed:', error)
  process.exit(1)
})
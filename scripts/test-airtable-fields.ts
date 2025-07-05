#!/usr/bin/env npx tsx

/**
 * Test Airtable Field Names
 * Verifies that the field name mappings are correct
 */

import { getDatabaseService } from '../lib/services/factory'

async function testAirtableFields() {
  console.log('🔧 Testing Airtable Field Name Mappings')
  console.log('=' .repeat(50))

  try {
    // Set environment to use Airtable
    process.env.USE_AIRTABLE = 'true'
    
    const dbService = getDatabaseService()
    console.log('✅ Database service initialized')

    // Test user lookup with a real Clerk ID from the logs
    const testClerkId = 'user_2z8zB7aOUa2ixUUZb8U1JMqzh0Y'
    
    console.log(`\n👤 Testing User Lookup with Clerk ID: ${testClerkId}`)
    
    try {
      const user = await dbService.users.findByClerkId(testClerkId)
      
      if (user) {
        console.log(`✅ SUCCESS: User found!`)
        console.log(`   ID: ${user.id}`)
        console.log(`   Username: ${user.username}`)
        console.log(`   Email: ${user.email}`)
        
        // Test listings lookup
        console.log(`\n📋 Testing Listings Lookup for User: ${user.id}`)
        const listingsResult = await dbService.listings.findByUserId(user.id, {
          limit: 10,
          offset: 0
        })
        
        console.log(`✅ SUCCESS: Found ${listingsResult.items.length} listings`)
        
        // Test offers lookup
        console.log(`\n💌 Testing Offers Lookup for User: ${user.id}`)
        const offersResult = await dbService.offers.findByBuyerId(user.id, {
          limit: 10, 
          offset: 0
        })
        
        console.log(`✅ SUCCESS: Found ${offersResult.items.length} offers`)
        
      } else {
        console.log(`❌ User not found - this might be expected if the user doesn't exist`)
      }
      
    } catch (userError: any) {
      if (userError.message?.includes('INVALID_FILTER_BY_FORMULA')) {
        console.log(`❌ FIELD NAME ERROR: ${userError.message}`)
        console.log(`   This indicates the field mappings are still incorrect`)
      } else {
        console.log(`❌ Other error: ${userError.message}`)
      }
    }

    console.log('\n✅ Field name mapping test completed')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
testAirtableFields()
  .then(() => {
    console.log('\n🎉 Test completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error)
    process.exit(1)
  })
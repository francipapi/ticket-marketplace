#!/usr/bin/env npx tsx

/**
 * Debug Airtable Data Structure
 * Investigates why listings aren't being found
 */

import { getDatabaseService } from '../lib/services/factory'

async function debugAirtableData() {
  console.log('🔍 Debugging Airtable Data Structure')
  console.log('=' .repeat(50))

  try {
    // Force Airtable usage
    process.env.USE_AIRTABLE = 'true'
    
    // Clear any cached service instances
    delete require.cache[require.resolve('../lib/services/factory')]
    
    const { getDatabaseService } = require('../lib/services/factory')
    const dbService = getDatabaseService()
    console.log('✅ Service initialized')

    const testClerkId = 'user_2z8zB7aOUa2ixUUZb8U1JMqzh0Y'
    const expectedUserId = 'recQdwm14dppUN5KH'
    
    console.log(`\n👤 Testing User: ${expectedUserId}`)
    
    // Test 1: Get a few listings without any filter to see the structure
    console.log('\n📋 1. Fetching ALL listings (sample) to inspect structure:')
    
    try {
      // Get listings without filter to see what's actually there
      const allListingsResult = await dbService.listings.findMany({
        limit: 5,
        offset: 0
      })
      
      console.log(`   Found ${allListingsResult.items.length} total listings in database`)
      
      if (allListingsResult.items.length > 0) {
        console.log('\n   Sample listing structures:')
        allListingsResult.items.forEach((listing, index) => {
          console.log(`   Listing ${index + 1}:`)
          console.log(`     ID: ${listing.id}`)
          console.log(`     Title: "${listing.title}"`)
          console.log(`     UserID: "${listing.userId}"`)
          console.log(`     Seller field: ${JSON.stringify(listing.userId)}`)
          console.log(`     Status: ${listing.status}`)
          console.log(`     Price: $${(listing.priceInCents / 100).toFixed(2)}`)
          console.log('')
        })
        
        // Check if any listing has our expected user ID
        const userListings = allListingsResult.items.filter(listing => 
          listing.userId === expectedUserId || 
          listing.id === expectedUserId ||
          JSON.stringify(listing).includes(expectedUserId)
        )
        
        console.log(`   🎯 Listings containing user ID '${expectedUserId}': ${userListings.length}`)
        
        if (userListings.length > 0) {
          console.log('   ✅ Found user listings! The filtering issue is in the query syntax.')
          userListings.forEach(listing => {
            console.log(`      - "${listing.title}" (ID: ${listing.id})`)
          })
        } else {
          console.log('   ❌ No listings found with that user ID.')
          console.log('   🔍 This means either:')
          console.log('      1. The user ID in Airtable is different')
          console.log('      2. The user has no listings')
          console.log('      3. The data transformation is incorrect')
        }
        
      } else {
        console.log('   ❌ No listings found in database at all!')
      }
      
    } catch (error: any) {
      console.log(`   ❌ Error fetching listings: ${error.message}`)
    }

    // Test 2: Try different filter approaches
    console.log('\n🧪 2. Testing different filter approaches:')
    
    const filterTests = [
      { name: 'Current approach', filter: { userId: expectedUserId } },
      { name: 'No filter', filter: {} },
      { name: 'Status filter only', filter: { status: 'ACTIVE' } },
    ]
    
    for (const test of filterTests) {
      try {
        console.log(`\n   Testing: ${test.name}`)
        const result = await dbService.listings.findMany({
          ...test.filter,
          limit: 3,
          offset: 0
        })
        console.log(`   ✅ Found ${result.items.length} listings`)
        
        if (result.items.length > 0) {
          result.items.forEach(listing => {
            console.log(`      - "${listing.title}" (userId: ${listing.userId})`)
          })
        }
      } catch (error: any) {
        console.log(`   ❌ ${test.name} failed: ${error.message}`)
      }
    }

    console.log('\n🎯 3. Recommendations:')
    console.log('   1. Check the actual seller field format in your Airtable')
    console.log('   2. Verify the user ID is correctly stored in listings')
    console.log('   3. Test the filter formula in Airtable directly')
    console.log('   4. Check if linked record fields need different syntax')

    console.log('\n✅ Debug analysis completed')
    
  } catch (error) {
    console.error('❌ Debug test failed:', error)
    process.exit(1)
  }
}

// Run the debug
debugAirtableData()
  .then(() => {
    console.log('\n🎉 Debug completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Debug failed:', error)
    process.exit(1)
  })
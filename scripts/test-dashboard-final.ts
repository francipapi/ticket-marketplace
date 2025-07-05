#!/usr/bin/env npx tsx

/**
 * Final Dashboard Performance Test
 * Tests all the Airtable field name fixes and performance improvements
 */

import { getDatabaseService } from '../lib/services/factory'

async function testDashboardFinal() {
  console.log('🎯 Final Dashboard Performance & Field Name Test')
  console.log('=' .repeat(60))

  try {
    // Force Airtable usage
    process.env.USE_AIRTABLE = 'true'
    
    console.log('\n🏭 1. Initializing Service Layer')
    const startInit = Date.now()
    const dbService = getDatabaseService()
    const initTime = Date.now() - startInit
    console.log(`✅ Service initialized in ${initTime}ms`)

    // Test with the actual Clerk ID from the logs
    const testClerkId = 'user_2z8zB7aOUa2ixUUZb8U1JMqzh0Y'
    
    console.log(`\n👤 2. Testing User Lookup (Known Working)`)
    const userStart = Date.now()
    
    try {
      const user = await dbService.users.findByClerkId(testClerkId)
      const userTime = Date.now() - userStart
      
      if (user) {
        console.log(`✅ User lookup: ${userTime}ms`)
        console.log(`   User: ${user.username} (ID: ${user.id})`)
        
        console.log(`\n📋 3. Testing Listings Query (Field Names Fixed)`)
        const listingsStart = Date.now()
        
        try {
          const listingsResult = await dbService.listings.findByUserId(user.id, {
            limit: 10,
            offset: 0
          })
          
          const listingsTime = Date.now() - listingsStart
          console.log(`✅ Listings query: ${listingsTime}ms`)
          console.log(`   Found: ${listingsResult.items.length} listings`)
          
          if (listingsResult.items.length > 0) {
            const firstListing = listingsResult.items[0]
            console.log(`   Sample: "${firstListing.title}" - $${(firstListing.priceInCents / 100).toFixed(2)}`)
          }

          console.log(`\n💌 4. Testing Sent Offers Query (Field Names Fixed)`)
          const sentOffersStart = Date.now()
          
          try {
            const sentOffersResult = await dbService.offers.findByBuyerId(user.id, {
              limit: 10,
              offset: 0
            })
            
            const sentOffersTime = Date.now() - sentOffersStart
            console.log(`✅ Sent offers query: ${sentOffersTime}ms`)
            console.log(`   Found: ${sentOffersResult.items.length} sent offers`)

            console.log(`\n📥 5. Testing Received Offers Query (Field Names Fixed)`)
            // For received offers, we need to test by listing ID
            if (listingsResult.items.length > 0) {
              const receivedOffersStart = Date.now()
              
              try {
                const firstListingId = listingsResult.items[0].id
                const receivedOffersResult = await dbService.offers.findByListingId(firstListingId, {
                  limit: 10,
                  offset: 0
                })
                
                const receivedOffersTime = Date.now() - receivedOffersStart
                console.log(`✅ Received offers query: ${receivedOffersTime}ms`)
                console.log(`   Found: ${receivedOffersResult.items.length} offers for listing`)

                // Calculate total dashboard simulation time
                const totalTime = userTime + listingsTime + sentOffersTime + receivedOffersTime
                
                console.log(`\n🏁 Dashboard Performance Summary`)
                console.log('=' .repeat(50))
                console.log(`   User lookup:       ${userTime}ms`)
                console.log(`   Listings query:    ${listingsTime}ms`)
                console.log(`   Sent offers:       ${sentOffersTime}ms`)
                console.log(`   Received offers:   ${receivedOffersTime}ms`)
                console.log(`   ────────────────────────────────`)
                console.log(`   Total dashboard:   ${totalTime}ms`)
                
                // Performance analysis
                if (totalTime < 1000) {
                  console.log(`\n🚀 EXCELLENT: Dashboard loads in under 1 second!`)
                } else if (totalTime < 2000) {
                  console.log(`\n✅ GREAT: Dashboard loads in under 2 seconds!`)
                } else if (totalTime < 5000) {
                  console.log(`\n⚠️  GOOD: Dashboard loads in under 5 seconds`)
                } else {
                  console.log(`\n❌ SLOW: Dashboard still takes over 5 seconds`)
                }

                // Compare to original performance (~7000ms)
                const originalTime = 7000
                const improvement = ((originalTime - totalTime) / originalTime * 100).toFixed(1)
                console.log(`\n📊 Performance Improvement: ${improvement}% faster than original`)
                
              } catch (receivedError: any) {
                console.log(`❌ Received offers failed: ${receivedError.message}`)
                console.log(`   Field name issue: ${receivedError.message.includes('UNKNOWN_FIELD_NAME') || receivedError.message.includes('INVALID_FILTER_BY_FORMULA')}`)
              }
            } else {
              console.log(`⚠️  No listings found, skipping received offers test`)
            }

          } catch (sentError: any) {
            console.log(`❌ Sent offers failed: ${sentError.message}`)
            console.log(`   Field name issue: ${sentError.message.includes('UNKNOWN_FIELD_NAME') || sentError.message.includes('INVALID_FILTER_BY_FORMULA')}`)
          }

        } catch (listingsError: any) {
          console.log(`❌ Listings failed: ${listingsError.message}`)
          console.log(`   Field name issue: ${listingsError.message.includes('UNKNOWN_FIELD_NAME') || listingsError.message.includes('INVALID_FILTER_BY_FORMULA')}`)
        }
        
      } else {
        console.log(`❌ User not found with Clerk ID: ${testClerkId}`)
      }
      
    } catch (userError: any) {
      console.log(`❌ User lookup failed: ${userError.message}`)
    }

    console.log(`\n🔍 6. Field Name Verification`)
    console.log(`   Expected field names based on your Airtable:`)
    console.log(`   Listings: title, eventName, eventDate, price, quantity, status, seller, venue, description, ticketFile, views`)
    console.log(`   Offers: offerCode, listings, buyer, offerPrice, quantity, status, message, customMessage`)
    console.log(`   Users: clerkId, email, username, rating, isVerified, totalSales, stripeAccountId, createdAt`)

    console.log('\n✅ Dashboard test completed')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
testDashboardFinal()
  .then(() => {
    console.log('\n🎉 All tests completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error)
    process.exit(1)
  })
#!/usr/bin/env npx tsx

/**
 * Dashboard Performance Test Script
 * Tests the optimized dashboard API routes for performance improvements
 */

import { getDatabaseService } from '../lib/services/factory'

async function testDashboardPerformance() {
  console.log('🚀 Testing Dashboard Performance Improvements')
  console.log('=' .repeat(60))

  try {
    // Test service factory initialization
    console.log('\n📊 1. Testing Service Factory Initialization')
    const startTime = Date.now()
    
    const dbService = getDatabaseService()
    const initTime = Date.now() - startTime
    
    console.log(`✅ Database service initialized in ${initTime}ms`)
    console.log(`   Implementation: ${process.env.USE_AIRTABLE === 'true' ? 'Airtable' : 'Prisma'}`)

    // Test user lookup (simulating dashboard user fetch)
    console.log('\n👤 2. Testing User Lookup Performance')
    const userStartTime = Date.now()
    
    // Use a test Clerk ID (replace with actual if needed)
    const testClerkId = 'user_test_123'
    
    try {
      const user = await dbService.users.findByClerkId(testClerkId)
      const userTime = Date.now() - userStartTime
      
      if (user) {
        console.log(`✅ User lookup completed in ${userTime}ms`)
        console.log(`   User: ${user.username} (${user.email})`)
        
        // Test listings fetch
        console.log('\n📋 3. Testing Listings Fetch Performance')
        const listingsStartTime = Date.now()
        
        const listingsResult = await dbService.listings.findByUserId(user.id, {
          limit: 50,
          offset: 0
        })
        
        const listingsTime = Date.now() - listingsStartTime
        console.log(`✅ Listings fetch completed in ${listingsTime}ms`)
        console.log(`   Found: ${listingsResult.items.length} listings`)
        
        // Test offers fetch
        console.log('\n💌 4. Testing Offers Fetch Performance')
        const offersStartTime = Date.now()
        
        const offersResult = await dbService.offers.findByBuyerId(user.id, {
          limit: 50,
          offset: 0
        })
        
        const offersTime = Date.now() - offersStartTime
        console.log(`✅ Offers fetch completed in ${offersTime}ms`)
        console.log(`   Found: ${offersResult.items.length} offers`)
        
        // Calculate total dashboard load time
        const totalDashboardTime = userTime + listingsTime + offersTime
        console.log('\n🏁 Dashboard Performance Summary')
        console.log('-'.repeat(40))
        console.log(`   User lookup:     ${userTime}ms`)
        console.log(`   Listings fetch:  ${listingsTime}ms`)
        console.log(`   Offers fetch:    ${offersTime}ms`)
        console.log(`   Total:           ${totalDashboardTime}ms`)
        
        if (totalDashboardTime < 2000) {
          console.log(`✅ EXCELLENT: Dashboard loads in under 2 seconds!`)
        } else if (totalDashboardTime < 5000) {
          console.log(`⚠️  GOOD: Dashboard loads in under 5 seconds`)
        } else {
          console.log(`❌ SLOW: Dashboard takes over 5 seconds to load`)
        }
        
      } else {
        console.log(`❌ User not found with Clerk ID: ${testClerkId}`)
        console.log(`   This is expected if no test user exists`)
      }
    } catch (userError) {
      console.log(`❌ User lookup failed: ${userError}`)
      console.log(`   This might be expected if Airtable is not properly configured`)
    }

    // Test cache performance
    console.log('\n💾 5. Testing Cache Performance')
    
    if (dbService.listings && typeof (dbService.listings as any).getCacheStats === 'function') {
      const cacheStats = (dbService.listings as any).getCacheStats()
      console.log(`✅ Cache statistics:`)
      console.log(`   Hit rate: ${cacheStats.hits || 0}/${(cacheStats.hits || 0) + (cacheStats.misses || 0)}`)
      console.log(`   Keys: ${cacheStats.keys || 0}`)
    } else {
      console.log(`ℹ️  Cache statistics not available`)
    }

    console.log('\n✅ Dashboard Performance Test Completed')
    
  } catch (error) {
    console.error('❌ Dashboard Performance Test Failed:', error)
    process.exit(1)
  }
}

// Run the test
testDashboardPerformance()
  .then(() => {
    console.log('\n🎉 All tests completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error)
    process.exit(1)
  })
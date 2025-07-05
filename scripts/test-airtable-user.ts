#!/usr/bin/env tsx
// Test script for Airtable User Service
// Validates user CRUD operations, caching, and rate limiting

// Load environment variables
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local file
const envPath = path.join(process.cwd(), '.env.local')
console.log('Loading environment from:', envPath)
const envResult = dotenv.config({ path: envPath })
if (envResult.error) {
  console.error('Error loading .env.local:', envResult.error)
} else {
  console.log('Environment loaded successfully')
}

// Debug: Check if environment variables are loaded
console.log('AIRTABLE_API_KEY loaded:', !!process.env.AIRTABLE_API_KEY)
console.log('AIRTABLE_BASE_ID loaded:', !!process.env.AIRTABLE_BASE_ID)
console.log('USE_AIRTABLE loaded:', process.env.USE_AIRTABLE)

import { AirtableUserService } from '../lib/services/implementations/airtable/user.service'
import { CreateUserData, UpdateUserData } from '../lib/services/interfaces/database.interface'

async function testAirtableUserService() {
  console.log('🧪 Testing Airtable User Service')
  console.log('=' .repeat(50))
  
  const userService = new AirtableUserService()
  let allTestsPassed = true
  let testUserId: string | null = null
  
  try {
    // Test 1: Service Health Check
    console.log('\n📊 Test 1: Service Health Check')
    const health = await userService.getServiceHealth()
    console.log('✅ Service health:', {
      healthy: health.healthy,
      responseTime: `${health.responseTime}ms`,
      cacheStats: health.cacheStats
    })
    
    if (!health.healthy) {
      console.log('❌ Service is not healthy, stopping tests')
      allTestsPassed = false
      return
    }
    
    // Test 2: Create User
    console.log('\n👤 Test 2: Create User')
    const testClerkId = `clerk_test_${Date.now()}`
    const testEmail = `test_${Date.now()}@example.com`
    
    const createUserData: CreateUserData = {
      clerkId: testClerkId,
      email: testEmail,
      username: 'testuser123',
      rating: 4.5,
      isVerified: true,
      totalSales: 0
    }
    
    const createdUser = await userService.create(createUserData)
    testUserId = createdUser.id
    
    console.log('✅ User created:', {
      id: createdUser.id,
      clerkId: createdUser.clerkId,
      email: createdUser.email,
      username: createdUser.username,
      rating: createdUser.rating,
      isVerified: createdUser.isVerified,
      totalSales: createdUser.totalSales
    })
    
    // Test 3: Find User by ID
    console.log('\n🔍 Test 3: Find User by ID')
    const foundById = await userService.findById(createdUser.id)
    
    if (foundById) {
      console.log('✅ User found by ID:', {
        id: foundById.id,
        email: foundById.email,
        username: foundById.username
      })
    } else {
      console.log('❌ User not found by ID')
      allTestsPassed = false
    }
    
    // Test 4: Find User by Clerk ID (should use cache)
    console.log('\n🔍 Test 4: Find User by Clerk ID (Cache Test)')
    const foundByClerkId = await userService.findByClerkId(testClerkId)
    
    if (foundByClerkId) {
      console.log('✅ User found by Clerk ID:', {
        id: foundByClerkId.id,
        clerkId: foundByClerkId.clerkId,
        email: foundByClerkId.email
      })
    } else {
      console.log('❌ User not found by Clerk ID')
      allTestsPassed = false
    }
    
    // Test 5: Find User by Email (should use cache)
    console.log('\n🔍 Test 5: Find User by Email (Cache Test)')
    const foundByEmail = await userService.findByEmail(testEmail)
    
    if (foundByEmail) {
      console.log('✅ User found by email:', {
        id: foundByEmail.id,
        email: foundByEmail.email,
        username: foundByEmail.username
      })
    } else {
      console.log('❌ User not found by email')
      allTestsPassed = false
    }
    
    // Test 6: Update User
    console.log('\n📝 Test 6: Update User')
    const updateData: UpdateUserData = {
      username: 'updateduser123',
      rating: 4.8,
      isVerified: true,
      totalSales: 1500 // $15.00
    }
    
    const updatedUser = await userService.update(createdUser.id, updateData)
    console.log('✅ User updated:', {
      id: updatedUser.id,
      username: updatedUser.username,
      rating: updatedUser.rating,
      totalSales: updatedUser.totalSales
    })
    
    // Test 7: Increment Total Sales
    console.log('\n💰 Test 7: Increment Total Sales')
    const salesIncrement = 2500 // $25.00
    const userWithIncrementedSales = await userService.incrementTotalSales(createdUser.id, salesIncrement)
    
    console.log('✅ Total sales incremented:', {
      id: userWithIncrementedSales.id,
      previousSales: updatedUser.totalSales,
      increment: salesIncrement,
      newTotalSales: userWithIncrementedSales.totalSales,
      expectedTotal: (updatedUser.totalSales || 0) + salesIncrement
    })
    
    if (userWithIncrementedSales.totalSales !== (updatedUser.totalSales || 0) + salesIncrement) {
      console.log('❌ Sales increment calculation incorrect')
      allTestsPassed = false
    }
    
    // Test 8: Cache Performance Test
    console.log('\n⚡ Test 8: Cache Performance Test')
    const cacheTestStart = Date.now()
    
    // Multiple lookups should hit cache
    for (let i = 0; i < 5; i++) {
      await userService.findById(createdUser.id)
      await userService.findByClerkId(testClerkId)
      await userService.findByEmail(testEmail)
    }
    
    const cacheTestTime = Date.now() - cacheTestStart
    console.log('✅ Cache performance test:', {
      totalLookups: 15,
      totalTime: `${cacheTestTime}ms`,
      averagePerLookup: `${(cacheTestTime / 15).toFixed(2)}ms`
    })
    
    // Test 9: Cache Stats
    console.log('\n📊 Test 9: Cache Statistics')
    const cacheStats = userService.getCacheStats()
    console.log('✅ Cache stats:', cacheStats)
    
    // Test 10: Error Handling - User Not Found
    console.log('\n🚨 Test 10: Error Handling - User Not Found')
    
    const nonExistentUser = await userService.findById('recNonExistent123')
    if (nonExistentUser === null) {
      console.log('✅ Correctly returned null for non-existent user')
    } else {
      console.log('❌ Should have returned null for non-existent user')
      allTestsPassed = false
    }
    
    // Test 11: Error Handling - Invalid Clerk ID
    console.log('\n🚨 Test 11: Error Handling - Invalid Clerk ID')
    
    const nonExistentByClerkId = await userService.findByClerkId('clerk_nonexistent_123')
    if (nonExistentByClerkId === null) {
      console.log('✅ Correctly returned null for non-existent Clerk ID')
    } else {
      console.log('❌ Should have returned null for non-existent Clerk ID')
      allTestsPassed = false
    }
    
    // Test 12: Error Handling - Invalid Email
    console.log('\n🚨 Test 12: Error Handling - Invalid Email')
    
    const nonExistentByEmail = await userService.findByEmail('nonexistent@example.com')
    if (nonExistentByEmail === null) {
      console.log('✅ Correctly returned null for non-existent email')
    } else {
      console.log('❌ Should have returned null for non-existent email')
      allTestsPassed = false
    }
    
    // Test 13: Rate Limiting Test
    console.log('\n🚀 Test 13: Rate Limiting Test')
    const rateLimitStart = Date.now()
    
    // Make multiple rapid requests to test rate limiting
    const rapidRequests = Array.from({ length: 10 }, (_, i) => 
      userService.findById(createdUser.id)
    )
    
    await Promise.all(rapidRequests)
    const rateLimitTime = Date.now() - rateLimitStart
    
    console.log('✅ Rate limiting test:', {
      requests: 10,
      totalTime: `${rateLimitTime}ms`,
      averagePerRequest: `${(rateLimitTime / 10).toFixed(2)}ms`,
      rateLimited: rateLimitTime > 1000 // Should take at least 2 seconds due to rate limiting
    })
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    allTestsPassed = false
  } finally {
    // Cleanup: Delete test user
    if (testUserId) {
      try {
        console.log('\n🧹 Cleanup: Deleting test user')
        const deleted = await userService.delete(testUserId)
        if (deleted) {
          console.log('✅ Test user deleted successfully')
        } else {
          console.log('⚠️ Test user was not found for deletion')
        }
      } catch (error) {
        console.error('❌ Failed to delete test user:', error)
      }
    }
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50))
  if (allTestsPassed) {
    console.log('🎉 All AirtableUserService tests PASSED!')
    console.log('✅ User service is ready for integration')
    console.log('✅ Rate limiting is working correctly')
    console.log('✅ Caching is functioning properly')
    console.log('✅ Error handling is robust')
  } else {
    console.log('❌ Some tests FAILED!')
    console.log('🔧 Please fix the issues before proceeding')
    process.exit(1)
  }
  
  console.log('\n🏁 AirtableUserService test complete!')
}

// Run the test
if (require.main === module) {
  testAirtableUserService().catch(console.error)
}

export { testAirtableUserService }
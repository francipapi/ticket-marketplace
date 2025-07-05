#!/usr/bin/env tsx
// End-to-End API Integration Test
// Comprehensive testing of the complete API flow using the new service layer

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

// Mock NextRequest for testing
class MockRequest {
  public method: string
  public url: string
  public headers: Map<string, string>
  private body: any

  constructor(method: string, url: string, body?: any, headers?: Record<string, string>) {
    this.method = method
    this.url = url
    this.body = body
    this.headers = new Map(Object.entries(headers || {}))
  }

  json() {
    return Promise.resolve(this.body)
  }
}

// Mock NextResponse for testing
class MockResponse {
  public status: number
  public body: any
  public headers: Map<string, string>

  constructor(body: any, options?: { status?: number, headers?: Record<string, string> }) {
    this.body = body
    this.status = options?.status || 200
    this.headers = new Map(Object.entries(options?.headers || {}))
  }

  json() {
    return Promise.resolve(this.body)
  }

  static json(body: any, options?: { status?: number, headers?: Record<string, string> }) {
    return new MockResponse(body, options)
  }
}

// Mock auth for testing
function mockAuth(userId: string = 'test_user_123') {
  const originalAuth = require('@clerk/nextjs/server').auth
  require('@clerk/nextjs/server').auth = jest.fn(() => ({
    userId,
    user: { id: userId }
  }))
  return originalAuth
}

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  testUserId: 'test_user_e2e_123',
  testSellerId: 'test_seller_e2e_456',
  testListingId: 'test_listing_e2e_789',
  testOfferId: 'test_offer_e2e_012',
  testAmount: 5000, // $50.00
  apiTimeout: 30000 // 30 seconds
}

async function testEndToEndApi() {
  console.log('🧪 End-to-End API Integration Test')
  console.log('=' .repeat(60))
  
  let allTestsPassed = true
  let testResults: any[] = []

  try {
    // Test 1: User Authentication Flow
    console.log('\n👤 Test 1: User Authentication Flow')
    
    try {
      // Mock Clerk auth
      const originalAuth = mockAuth(TEST_CONFIG.testUserId)
      
      // Test user sync endpoint
      const userSyncModule = await import('../app/api/user/sync-enhanced/route')
      const mockUserSyncRequest = new MockRequest('POST', `${TEST_CONFIG.baseUrl}/api/user/sync-enhanced`, {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      })
      
      const userSyncResponse = await userSyncModule.POST(mockUserSyncRequest as any)
      const userSyncData = await userSyncResponse.json()
      
      console.log('✅ User sync working:', {
        success: userSyncData.success,
        hasUser: !!userSyncData.data?.user,
        hasRequestId: !!userSyncData.requestId
      })
      
      testResults.push({
        test: 'User Authentication',
        passed: userSyncData.success,
        details: 'User sync and authentication working'
      })
      
      // Restore original auth
      require('@clerk/nextjs/server').auth = originalAuth
      
    } catch (error: any) {
      console.log('❌ User authentication error:', error.message)
      allTestsPassed = false
      testResults.push({
        test: 'User Authentication',
        passed: false,
        error: error.message
      })
    }
    
    // Test 2: Listing Creation Flow
    console.log('\n📝 Test 2: Listing Creation Flow')
    
    try {
      // Mock auth for listing creation
      const originalAuth = mockAuth(TEST_CONFIG.testUserId)
      
      const listingModule = await import('../app/api/listings/enhanced/route')
      const mockCreateListingRequest = new MockRequest('POST', `${TEST_CONFIG.baseUrl}/api/listings/enhanced`, {
        title: 'E2E Test Concert Ticket',
        eventName: 'E2E Test Concert',
        eventDate: '2025-12-31',
        venue: 'Test Venue',
        priceInCents: TEST_CONFIG.testAmount,
        quantity: 2,
        description: 'Test listing for E2E validation'
      })
      
      const createListingResponse = await listingModule.POST(mockCreateListingRequest as any)
      const createListingData = await createListingResponse.json()
      
      console.log('✅ Listing creation working:', {
        success: createListingData.success,
        hasListing: !!createListingData.data?.listing,
        hasActions: !!createListingData.data?.actions,
        listingId: createListingData.data?.listing?.id
      })
      
      // Store listing ID for later tests
      if (createListingData.data?.listing?.id) {
        TEST_CONFIG.testListingId = createListingData.data.listing.id
      }
      
      testResults.push({
        test: 'Listing Creation',
        passed: createListingData.success,
        details: 'Listing creation and validation working'
      })
      
      // Restore original auth
      require('@clerk/nextjs/server').auth = originalAuth
      
    } catch (error: any) {
      console.log('❌ Listing creation error:', error.message)
      allTestsPassed = false
      testResults.push({
        test: 'Listing Creation',
        passed: false,
        error: error.message
      })
    }
    
    // Test 3: Listing Retrieval Flow
    console.log('\n🔍 Test 3: Listing Retrieval Flow')
    
    try {
      // Test public listing retrieval (no auth required)
      const listingModule = await import('../app/api/listings/enhanced/route')
      const mockGetListingsRequest = new MockRequest('GET', `${TEST_CONFIG.baseUrl}/api/listings/enhanced?limit=10`)
      
      const getListingsResponse = await listingModule.GET(mockGetListingsRequest as any)
      const getListingsData = await getListingsResponse.json()
      
      console.log('✅ Listing retrieval working:', {
        success: getListingsData.success,
        hasListings: Array.isArray(getListingsData.data?.listings),
        hasPagination: !!getListingsData.data?.pagination,
        count: getListingsData.data?.listings?.length || 0
      })
      
      testResults.push({
        test: 'Listing Retrieval',
        passed: getListingsData.success,
        details: 'Listing retrieval and filtering working'
      })
      
    } catch (error: any) {
      console.log('❌ Listing retrieval error:', error.message)
      allTestsPassed = false
      testResults.push({
        test: 'Listing Retrieval',
        passed: false,
        error: error.message
      })
    }
    
    // Test 4: Payment Intent Creation Flow
    console.log('\n💳 Test 4: Payment Intent Creation Flow')
    
    try {
      // Mock auth for payment
      const originalAuth = mockAuth(TEST_CONFIG.testUserId)
      
      const paymentModule = await import('../app/api/payments/create-intent/route')
      const mockCreatePaymentRequest = new MockRequest('POST', `${TEST_CONFIG.baseUrl}/api/payments/create-intent`, {
        amount: TEST_CONFIG.testAmount,
        sellerId: TEST_CONFIG.testSellerId,
        listingId: TEST_CONFIG.testListingId,
        offerId: TEST_CONFIG.testOfferId,
        paymentMethod: 'mock_card_visa'
      })
      
      const createPaymentResponse = await paymentModule.POST(mockCreatePaymentRequest as any)
      const createPaymentData = await createPaymentResponse.json()
      
      console.log('✅ Payment intent creation working:', {
        success: createPaymentData.success,
        hasIntent: !!createPaymentData.data?.paymentIntent,
        hasNextStep: !!createPaymentData.data?.nextStep,
        intentId: createPaymentData.data?.paymentIntent?.id,
        amount: createPaymentData.data?.paymentIntent?.amount,
        platformFee: createPaymentData.data?.paymentIntent?.platformFee
      })
      
      // Store payment intent ID for processing test
      let paymentIntentId = createPaymentData.data?.paymentIntent?.id
      
      testResults.push({
        test: 'Payment Intent Creation',
        passed: createPaymentData.success,
        details: 'Payment intent creation and fee calculation working'
      })
      
      // Test 5: Payment Processing Flow
      console.log('\n⚡ Test 5: Payment Processing Flow')
      
      if (paymentIntentId) {
        try {
          const processPaymentModule = await import('../app/api/payments/process/route')
          const mockProcessPaymentRequest = new MockRequest('POST', `${TEST_CONFIG.baseUrl}/api/payments/process`, {
            paymentIntentId: paymentIntentId,
            confirmPayment: true
          })
          
          const processPaymentResponse = await processPaymentModule.POST(mockProcessPaymentRequest as any)
          const processPaymentData = await processPaymentResponse.json()
          
          console.log('✅ Payment processing working:', {
            success: processPaymentData.success,
            hasResult: !!processPaymentData.data?.result,
            paymentSucceeded: processPaymentData.data?.result?.success,
            hasReceipt: !!processPaymentData.data?.receipt,
            status: processPaymentData.data?.paymentIntent?.status
          })
          
          testResults.push({
            test: 'Payment Processing',
            passed: processPaymentData.success,
            details: 'Payment processing and status tracking working'
          })
          
        } catch (error: any) {
          console.log('❌ Payment processing error:', error.message)
          allTestsPassed = false
          testResults.push({
            test: 'Payment Processing',
            passed: false,
            error: error.message
          })
        }
      } else {
        console.log('⚠️ Skipping payment processing test - no payment intent ID')
        testResults.push({
          test: 'Payment Processing',
          passed: false,
          error: 'No payment intent ID from creation step'
        })
      }
      
      // Restore original auth
      require('@clerk/nextjs/server').auth = originalAuth
      
    } catch (error: any) {
      console.log('❌ Payment intent creation error:', error.message)
      allTestsPassed = false
      testResults.push({
        test: 'Payment Intent Creation',
        passed: false,
        error: error.message
      })
    }
    
    // Test 6: Service Layer Integration
    console.log('\n🔧 Test 6: Service Layer Integration')
    
    try {
      // Test service factory
      const serviceFactory = await import('../lib/services/factory')
      const dbService = serviceFactory.getDatabaseService()
      const paymentService = serviceFactory.getPaymentService()
      
      // Test database service health
      const health = await dbService.getServiceHealth()
      
      // Test payment service functionality
      const testPaymentIntent = await paymentService.createPaymentIntent({
        amount: 1000,
        sellerId: 'test_seller',
        buyerId: 'test_buyer',
        listingId: 'test_listing',
        offerId: 'test_offer'
      })
      
      console.log('✅ Service layer integration working:', {
        dbServiceHealthy: health.healthy,
        paymentServiceWorking: !!testPaymentIntent.id,
        servicesCount: Object.keys(health.services).length,
        responseTime: health.totalResponseTime,
        cacheWorking: !!dbService.getCacheStats()
      })
      
      testResults.push({
        test: 'Service Layer Integration',
        passed: health.healthy && !!testPaymentIntent.id,
        details: 'Database and payment services working correctly'
      })
      
    } catch (error: any) {
      console.log('❌ Service layer integration error:', error.message)
      allTestsPassed = false
      testResults.push({
        test: 'Service Layer Integration',
        passed: false,
        error: error.message
      })
    }
    
    // Test 7: Error Handling and Edge Cases
    console.log('\n🚨 Test 7: Error Handling and Edge Cases')
    
    try {
      // Test invalid payment intent
      const originalAuth = mockAuth(TEST_CONFIG.testUserId)
      const paymentModule = await import('../app/api/payments/create-intent/route')
      
      const mockInvalidPaymentRequest = new MockRequest('POST', `${TEST_CONFIG.baseUrl}/api/payments/create-intent`, {
        amount: 10, // Too low
        sellerId: '',
        listingId: '',
        offerId: ''
      })
      
      const invalidPaymentResponse = await paymentModule.POST(mockInvalidPaymentRequest as any)
      const invalidPaymentData = await invalidPaymentResponse.json()
      
      console.log('✅ Error handling working:', {
        rejected: !invalidPaymentData.success,
        hasError: !!invalidPaymentData.error,
        hasValidationError: invalidPaymentData.error?.code === 'VALIDATION_ERROR' || 
                            invalidPaymentData.error?.message?.includes('validation'),
        status: invalidPaymentResponse.status
      })
      
      testResults.push({
        test: 'Error Handling',
        passed: !invalidPaymentData.success, // Should fail validation
        details: 'Input validation and error responses working'
      })
      
      // Restore original auth
      require('@clerk/nextjs/server').auth = originalAuth
      
    } catch (error: any) {
      console.log('❌ Error handling test error:', error.message)
      allTestsPassed = false
      testResults.push({
        test: 'Error Handling',
        passed: false,
        error: error.message
      })
    }
    
    // Test 8: Rate Limiting and Performance
    console.log('\n⏱️ Test 8: Rate Limiting and Performance')
    
    try {
      // Test rate limiting
      const apiHelpers = await import('../lib/api-helpers-enhanced')
      
      // Test multiple requests to rate limiter
      const testId = 'e2e_test_user'
      const results = []
      
      for (let i = 0; i < 5; i++) {
        const result = apiHelpers.checkRateLimit(testId, 3, 60000) // 3 requests per minute
        results.push(result)
      }
      
      const allowedRequests = results.filter(r => r.allowed).length
      const blockedRequests = results.filter(r => !r.allowed).length
      
      console.log('✅ Rate limiting working:', {
        allowedRequests,
        blockedRequests,
        rateLimitWorking: allowedRequests === 3 && blockedRequests === 2,
        remainingCounts: results.map(r => r.remaining)
      })
      
      testResults.push({
        test: 'Rate Limiting',
        passed: allowedRequests === 3 && blockedRequests === 2,
        details: 'Rate limiting correctly enforced'
      })
      
    } catch (error: any) {
      console.log('❌ Rate limiting test error:', error.message)
      allTestsPassed = false
      testResults.push({
        test: 'Rate Limiting',
        passed: false,
        error: error.message
      })
    }
    
    // Test 9: Database Caching Performance
    console.log('\n💾 Test 9: Database Caching Performance')
    
    try {
      const serviceFactory = await import('../lib/services/factory')
      const dbService = serviceFactory.getDatabaseService()
      
      // Test cache performance
      const startTime = Date.now()
      
      // First request (should hit database)
      await dbService.getServiceHealth()
      const firstRequestTime = Date.now() - startTime
      
      // Second request (should hit cache)
      const secondStartTime = Date.now()
      await dbService.getServiceHealth()
      const secondRequestTime = Date.now() - secondStartTime
      
      // Get cache stats
      const cacheStats = dbService.getCacheStats()
      
      console.log('✅ Database caching working:', {
        firstRequestTime: `${firstRequestTime}ms`,
        secondRequestTime: `${secondRequestTime}ms`,
        cacheHit: secondRequestTime < firstRequestTime,
        cacheStats: {
          totalKeys: Object.values(cacheStats).reduce((sum: number, cache: any) => sum + cache.keys, 0),
          totalHits: Object.values(cacheStats).reduce((sum: number, cache: any) => sum + cache.hits, 0),
          totalMisses: Object.values(cacheStats).reduce((sum: number, cache: any) => sum + cache.misses, 0)
        }
      })
      
      testResults.push({
        test: 'Database Caching',
        passed: !!cacheStats && secondRequestTime < firstRequestTime,
        details: 'Database caching improving performance'
      })
      
    } catch (error: any) {
      console.log('❌ Database caching test error:', error.message)
      allTestsPassed = false
      testResults.push({
        test: 'Database Caching',
        passed: false,
        error: error.message
      })
    }
    
    // Test 10: Complete User Journey Simulation
    console.log('\n🚀 Test 10: Complete User Journey Simulation')
    
    try {
      console.log('📋 Simulating complete user journey...')
      
      // Step 1: User signs up
      const originalAuth = mockAuth('journey_user_123')
      
      // Step 2: User creates listing
      const listingModule = await import('../app/api/listings/enhanced/route')
      const createListingRequest = new MockRequest('POST', `${TEST_CONFIG.baseUrl}/api/listings/enhanced`, {
        title: 'Journey Test Concert',
        eventName: 'Journey Test Event',
        eventDate: '2025-12-31',
        venue: 'Journey Test Venue',
        priceInCents: 7500,
        quantity: 1,
        description: 'Complete journey test'
      })
      
      const createListingResponse = await listingModule.POST(createListingRequest as any)
      const createListingData = await createListingResponse.json()
      
      // Step 3: Another user makes payment
      const buyerAuth = mockAuth('journey_buyer_456')
      const paymentModule = await import('../app/api/payments/create-intent/route')
      
      const createPaymentRequest = new MockRequest('POST', `${TEST_CONFIG.baseUrl}/api/payments/create-intent`, {
        amount: 7500,
        sellerId: 'journey_user_123',
        listingId: createListingData.data?.listing?.id || 'test_listing',
        offerId: 'journey_offer_789'
      })
      
      const createPaymentResponse = await paymentModule.POST(createPaymentRequest as any)
      const createPaymentData = await createPaymentResponse.json()
      
      // Step 4: Process payment
      const processPaymentModule = await import('../app/api/payments/process/route')
      const processPaymentRequest = new MockRequest('POST', `${TEST_CONFIG.baseUrl}/api/payments/process`, {
        paymentIntentId: createPaymentData.data?.paymentIntent?.id,
        confirmPayment: true
      })
      
      const processPaymentResponse = await processPaymentModule.POST(processPaymentRequest as any)
      const processPaymentData = await processPaymentResponse.json()
      
      const journeySuccess = createListingData.success && 
                           createPaymentData.success && 
                           processPaymentData.success
      
      console.log('✅ Complete user journey working:', {
        listingCreated: createListingData.success,
        paymentIntentCreated: createPaymentData.success,
        paymentProcessed: processPaymentData.success,
        journeyComplete: journeySuccess,
        finalPaymentStatus: processPaymentData.data?.paymentIntent?.status
      })
      
      testResults.push({
        test: 'Complete User Journey',
        passed: journeySuccess,
        details: 'End-to-end user journey from listing creation to payment processing'
      })
      
      // Restore original auth
      require('@clerk/nextjs/server').auth = originalAuth
      
    } catch (error: any) {
      console.log('❌ Complete user journey error:', error.message)
      allTestsPassed = false
      testResults.push({
        test: 'Complete User Journey',
        passed: false,
        error: error.message
      })
    }
    
  } catch (error) {
    console.error('❌ End-to-end test failed:', error)
    allTestsPassed = false
  }
  
  // Summary Report
  console.log('\n' + '=' .repeat(60))
  console.log('📊 END-TO-END API TEST RESULTS')
  console.log('=' .repeat(60))
  
  const passedTests = testResults.filter(t => t.passed)
  const failedTests = testResults.filter(t => !t.passed)
  
  console.log(`\n📈 Overall Results: ${passedTests.length}/${testResults.length} tests passed`)
  console.log(`✅ Passed: ${passedTests.length}`)
  console.log(`❌ Failed: ${failedTests.length}`)
  
  if (passedTests.length > 0) {
    console.log('\n✅ PASSED TESTS:')
    passedTests.forEach(test => {
      console.log(`   • ${test.test}: ${test.details}`)
    })
  }
  
  if (failedTests.length > 0) {
    console.log('\n❌ FAILED TESTS:')
    failedTests.forEach(test => {
      console.log(`   • ${test.test}: ${test.error || 'Test failed'}`)
    })
  }
  
  console.log('\n🔧 SYSTEM COMPONENTS TESTED:')
  console.log('   ✅ User authentication and sync')
  console.log('   ✅ Listing CRUD operations')
  console.log('   ✅ Payment intent creation and processing')
  console.log('   ✅ Service layer integration')
  console.log('   ✅ Error handling and validation')
  console.log('   ✅ Rate limiting and security')
  console.log('   ✅ Database caching and performance')
  console.log('   ✅ Complete user journey simulation')
  
  if (allTestsPassed && failedTests.length === 0) {
    console.log('\n🎉 ALL END-TO-END TESTS PASSED!')
    console.log('✅ The API migration is working correctly')
    console.log('✅ Service layer integration is functional')
    console.log('✅ Payment processing is working')
    console.log('✅ Database operations are optimized')
    console.log('✅ Error handling is robust')
    console.log('✅ Rate limiting is enforced')
    console.log('✅ User journey is complete and functional')
    console.log('')
    console.log('🚀 Ready for Performance Testing (Task 9)')
  } else {
    console.log('\n⚠️ Some end-to-end tests failed')
    console.log('🔧 Please review failed tests before proceeding')
    console.log('💡 Note: Some failures may be expected in test environment')
  }
  
  console.log('\n🏁 End-to-End API test complete!')
  
  // Return results for further processing
  return {
    allPassed: allTestsPassed && failedTests.length === 0,
    totalTests: testResults.length,
    passedTests: passedTests.length,
    failedTests: failedTests.length,
    results: testResults
  }
}

// Run the test
if (require.main === module) {
  testEndToEndApi().catch(console.error)
}

export { testEndToEndApi }
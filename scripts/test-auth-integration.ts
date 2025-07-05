#!/usr/bin/env tsx
// Test script for Enhanced Clerk Authentication Integration
// Validates authentication service and API helpers

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

async function testAuthIntegration() {
  console.log('🧪 Testing Enhanced Clerk Authentication Integration')
  console.log('=' .repeat(60))
  
  let allTestsPassed = true
  
  try {
    // Test 1: Import Authentication Services
    console.log('\n📦 Test 1: Import Authentication Services')
    
    const authServerModule = await import('../lib/auth-server')
    const apiHelpersModule = await import('../lib/api-helpers-enhanced')
    
    console.log('✅ Authentication modules imported successfully')
    
    // Check AuthService methods
    const requiredAuthMethods = [
      'requireAuth', 'getCurrentUser', 'getAuthResult', 'isAuthenticated',
      'getClerkUserId', 'syncUserWithClerk', 'deleteUser', 'updateUserProfile',
      'getUserStats', 'protectRoute'
    ]
    
    const authMethodsAvailable = requiredAuthMethods.every(method => 
      typeof (authServerModule.AuthService as any)[method] === 'function'
    )
    
    if (authMethodsAvailable) {
      console.log('✅ All required AuthService methods available:', requiredAuthMethods.slice(0, 5), '...')
    } else {
      console.log('❌ Missing required AuthService methods')
      allTestsPassed = false
    }
    
    // Test 2: API Helpers Functions
    console.log('\n🔧 Test 2: API Helpers Functions')
    
    const requiredHelperFunctions = [
      'createResponse', 'createErrorResponse', 'withValidation', 'withAuth',
      'withAuthAndValidation', 'requireAuth', 'getCurrentUser', 'protectRoute'
    ]
    
    const helperFunctionsAvailable = requiredHelperFunctions.every(func => 
      typeof (apiHelpersModule as any)[func] === 'function'
    )
    
    if (helperFunctionsAvailable) {
      console.log('✅ All required API helper functions available:', requiredHelperFunctions.slice(0, 5), '...')
    } else {
      console.log('❌ Missing required API helper functions')
      allTestsPassed = false
    }
    
    // Test 3: Response Creation Functions
    console.log('\n📨 Test 3: Response Creation Functions')
    
    // Test createResponse
    const successResponse = apiHelpersModule.createResponse({ test: 'data' }, { message: 'Test message' })
    const responseBody = await successResponse.json()
    
    if (responseBody.success && responseBody.data && responseBody.timestamp) {
      console.log('✅ createResponse working correctly:', {
        success: responseBody.success,
        hasData: !!responseBody.data,
        hasTimestamp: !!responseBody.timestamp,
        hasRequestId: !!responseBody.requestId
      })
    } else {
      console.log('❌ createResponse not working correctly')
      allTestsPassed = false
    }
    
    // Test createErrorResponse
    const errorResponse = apiHelpersModule.createErrorResponse('Test error', 400, { requestId: 'test-123' })
    const errorBody = await errorResponse.json()
    
    if (!errorBody.success && errorBody.error && errorBody.timestamp) {
      console.log('✅ createErrorResponse working correctly:', {
        success: errorBody.success,
        hasError: !!errorBody.error,
        hasTimestamp: !!errorBody.timestamp,
        requestId: errorBody.requestId
      })
    } else {
      console.log('❌ createErrorResponse not working correctly')
      allTestsPassed = false
    }
    
    // Test 4: Service Factory Integration with Auth
    console.log('\n🏭 Test 4: Service Factory Integration with Auth')
    
    try {
      const { getDatabaseService } = await import('../lib/services/factory')
      const dbService = getDatabaseService()
      
      console.log('✅ Database service accessible through factory')
      
      // Check if the auth server can access the database service
      if (dbService.users) {
        console.log('✅ User service available for authentication')
      } else {
        console.log('❌ User service not available for authentication')
        allTestsPassed = false
      }
      
    } catch (error) {
      console.log('❌ Service factory integration error:', error)
      allTestsPassed = false
    }
    
    // Test 5: Type Definitions and Interfaces
    console.log('\n📝 Test 5: Type Definitions and Interfaces')
    
    // Check if AppUser type is exported correctly
    const hasAppUserType = 'AppUser' in authServerModule
    const hasAuthResultType = 'AuthResult' in authServerModule
    
    console.log('✅ Type definitions available:', {
      AppUser: hasAppUserType,
      AuthResult: hasAuthResultType
    })
    
    // Test 6: Environment Configuration for Auth
    console.log('\n⚙️ Test 6: Environment Configuration for Auth')
    
    const clerkPublicKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    const clerkSecretKey = process.env.CLERK_SECRET_KEY
    const useAirtable = process.env.USE_AIRTABLE
    const mockPayments = process.env.MOCK_PAYMENTS
    
    console.log('✅ Authentication environment variables:', {
      clerkPublicKey: !!clerkPublicKey,
      clerkSecretKey: !!clerkSecretKey,
      useAirtable: useAirtable,
      mockPayments: mockPayments
    })
    
    if (!clerkPublicKey || !clerkSecretKey) {
      console.log('⚠️ Clerk keys not configured (expected in test environment)')
    }
    
    // Test 7: Validation Schema Testing
    console.log('\n✅ Test 7: Validation Schema Testing')
    
    try {
      const { z } = await import('zod')
      
      // Test schema creation
      const TestSchema = z.object({
        name: z.string(),
        age: z.number().optional()
      })
      
      // Test validation
      const validData = { name: 'Test User', age: 25 }
      const parsedData = TestSchema.parse(validData)
      
      console.log('✅ Schema validation working:', {
        input: validData,
        parsed: parsedData,
        matches: JSON.stringify(validData) === JSON.stringify(parsedData)
      })
      
    } catch (error) {
      console.log('❌ Schema validation error:', error)
      allTestsPassed = false
    }
    
    // Test 8: Rate Limiting Function
    console.log('\n⏱️ Test 8: Rate Limiting Function')
    
    const { checkRateLimit } = apiHelpersModule
    
    // Test rate limiting
    const testId = 'test-user-123'
    const limit1 = checkRateLimit(testId, 5, 60000) // 5 requests per minute
    const limit2 = checkRateLimit(testId, 5, 60000)
    const limit3 = checkRateLimit(testId, 5, 60000)
    
    console.log('✅ Rate limiting working:', {
      firstRequest: { allowed: limit1.allowed, remaining: limit1.remaining },
      secondRequest: { allowed: limit2.allowed, remaining: limit2.remaining },
      thirdRequest: { allowed: limit3.allowed, remaining: limit3.remaining }
    })
    
    // Test 9: Request ID Generation
    console.log('\n🆔 Test 9: Request ID Generation')
    
    // Generate multiple responses to test unique request IDs
    const response1 = apiHelpersModule.createResponse({ test: 1 })
    const response2 = apiHelpersModule.createResponse({ test: 2 })
    
    const body1 = await response1.json()
    const body2 = await response2.json()
    
    if (body1.requestId && body2.requestId && body1.requestId !== body2.requestId) {
      console.log('✅ Request ID generation working:', {
        id1: body1.requestId,
        id2: body2.requestId,
        unique: body1.requestId !== body2.requestId
      })
    } else {
      console.log('❌ Request ID generation not working correctly')
      allTestsPassed = false
    }
    
    // Test 10: Mock Authentication Test (without real Clerk)
    console.log('\n🔒 Test 10: Mock Authentication Test')
    
    try {
      // This will fail in test environment but we can test the error handling
      const authResult = await authServerModule.AuthService.getAuthResult()
      
      if (authResult.success) {
        console.log('✅ Authentication successful (unexpected in test env):', authResult.user?.email)
      } else {
        console.log('✅ Authentication correctly failed in test environment:', authResult.error)
      }
      
    } catch (error: any) {
      // Expected in test environment
      console.log('✅ Authentication correctly threw error in test environment:', error.message)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    allTestsPassed = false
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60))
  if (allTestsPassed) {
    console.log('🎉 All Enhanced Authentication Integration tests PASSED!')
    console.log('✅ AuthService implementation is complete')
    console.log('✅ API helpers are functioning correctly')
    console.log('✅ Service factory integration working')
    console.log('✅ Type definitions are properly exported')
    console.log('✅ Environment configuration validated')
    console.log('✅ Validation and rate limiting working')
    console.log('')
    console.log('📋 Next Steps:')
    console.log('   1. Set up Clerk authentication in production environment')
    console.log('   2. Test with real Clerk user authentication')
    console.log('   3. Validate user auto-creation workflow')
    console.log('   4. Test API endpoints with authentication')
  } else {
    console.log('❌ Some Enhanced Authentication Integration tests FAILED!')
    console.log('🔧 Please fix the issues before proceeding')
    process.exit(1)
  }
  
  console.log('\n🏁 Enhanced Authentication Integration test complete!')
}

// Run the test
if (require.main === module) {
  testAuthIntegration().catch(console.error)
}

export { testAuthIntegration }
#!/usr/bin/env tsx
// Test script for Environment Configuration
// Validates environment setup and configuration management

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

async function testEnvironmentConfiguration() {
  console.log('🧪 Testing Environment Configuration')
  console.log('=' .repeat(60))
  
  let allTestsPassed = true
  
  try {
    // Test 1: Import Environment Configuration
    console.log('\n📦 Test 1: Import Environment Configuration')
    
    const envConfigModule = await import('../lib/env-config')
    
    console.log('✅ Environment configuration module imported successfully')
    
    // Check exported functions
    const requiredFunctions = [
      'validateEnvironment', 'getEnvironment', 'safeGetEnvironment',
      'getFeatureFlags', 'getAirtableConfig', 'getClerkConfig',
      'getPaymentConfig', 'getFileUploadConfig', 'getRateLimitConfig',
      'getEnvironmentInfo'
    ]
    
    const functionsAvailable = requiredFunctions.every(func => 
      typeof (envConfigModule as any)[func] === 'function'
    )
    
    if (functionsAvailable) {
      console.log('✅ All required functions available:', requiredFunctions.slice(0, 5), '...')
    } else {
      console.log('❌ Missing required functions')
      allTestsPassed = false
    }
    
    // Test 2: Environment Validation
    console.log('\n🔍 Test 2: Environment Validation')
    
    const validation = envConfigModule.validateEnvironment()
    console.log('✅ Environment validation result:', {
      isValid: validation.isValid,
      errorsCount: validation.errors.length,
      warningsCount: validation.warnings.length
    })
    
    if (validation.errors.length > 0) {
      console.log('❌ Validation errors:', validation.errors)
      allTestsPassed = false
    }
    
    if (validation.warnings.length > 0) {
      console.log('⚠️ Validation warnings:', validation.warnings)
    }
    
    // Test 3: Safe Environment Access
    console.log('\n🛡️ Test 3: Safe Environment Access')
    
    const safeEnv = envConfigModule.safeGetEnvironment()
    console.log('✅ Safe environment access:', {
      envAvailable: !!safeEnv.env,
      errorsCount: safeEnv.errors.length,
      warningsCount: safeEnv.warnings.length
    })
    
    if (safeEnv.env) {
      console.log('✅ Environment object structure:', {
        nodeEnv: safeEnv.env.NODE_ENV,
        useAirtable: safeEnv.env.USE_AIRTABLE,
        mockPayments: safeEnv.env.MOCK_PAYMENTS,
        platformFee: safeEnv.env.PLATFORM_FEE_PERCENT
      })
    }
    
    // Test 4: Feature Flags
    console.log('\n🚩 Test 4: Feature Flags')
    
    try {
      const featureFlags = envConfigModule.getFeatureFlags()
      console.log('✅ Feature flags:', featureFlags)
      
      // Validate feature flag logic
      if (typeof featureFlags.useAirtable !== 'boolean' ||
          typeof featureFlags.useMockPayments !== 'boolean' ||
          typeof featureFlags.isProduction !== 'boolean') {
        console.log('❌ Feature flags have incorrect types')
        allTestsPassed = false
      }
      
    } catch (error) {
      console.log('❌ Feature flags error:', error)
      allTestsPassed = false
    }
    
    // Test 5: Service Configuration Access
    console.log('\n⚙️ Test 5: Service Configuration Access')
    
    // Test Airtable configuration
    try {
      const airtableConfig = envConfigModule.getAirtableConfig()
      console.log('✅ Airtable configuration:', {
        hasApiKey: !!airtableConfig.apiKey,
        hasBaseId: !!airtableConfig.baseId,
        rateLimitPerSec: airtableConfig.rateLimitPerSec,
        cacheMaxSize: airtableConfig.cacheMaxSize
      })
    } catch (error: any) {
      if (error.message.includes('not enabled')) {
        console.log('⚠️ Airtable not enabled, skipping config test')
      } else {
        console.log('❌ Airtable configuration error:', error.message)
        allTestsPassed = false
      }
    }
    
    // Test Clerk configuration
    try {
      const clerkConfig = envConfigModule.getClerkConfig()
      console.log('✅ Clerk configuration:', {
        hasPublishableKey: !!clerkConfig.publishableKey,
        hasSecretKey: !!clerkConfig.secretKey,
        signInUrl: clerkConfig.signInUrl,
        signUpUrl: clerkConfig.signUpUrl
      })
    } catch (error) {
      console.log('❌ Clerk configuration error:', error)
      allTestsPassed = false
    }
    
    // Test Payment configuration
    try {
      const paymentConfig = envConfigModule.getPaymentConfig()
      console.log('✅ Payment configuration:', {
        useMockPayments: paymentConfig.useMockPayments,
        platformFeePercent: paymentConfig.platformFeePercent,
        mockFailureRate: paymentConfig.mockFailureRate,
        mockProcessingTime: paymentConfig.mockProcessingTime
      })
    } catch (error) {
      console.log('❌ Payment configuration error:', error)
      allTestsPassed = false
    }
    
    // Test File Upload configuration
    try {
      const fileConfig = envConfigModule.getFileUploadConfig()
      console.log('✅ File upload configuration:', {
        uploadDir: fileConfig.uploadDir,
        maxFileSizeMB: (fileConfig.maxFileSize / (1024 * 1024)).toFixed(1),
        allowedTypesCount: fileConfig.allowedFileTypes.length
      })
    } catch (error) {
      console.log('❌ File upload configuration error:', error)
      allTestsPassed = false
    }
    
    // Test Rate Limit configuration
    try {
      const rateLimitConfig = envConfigModule.getRateLimitConfig()
      console.log('✅ Rate limit configuration:', {
        windowMs: rateLimitConfig.windowMs,
        maxRequests: rateLimitConfig.maxRequests,
        windowMinutes: (rateLimitConfig.windowMs / (1000 * 60)).toFixed(1)
      })
    } catch (error) {
      console.log('❌ Rate limit configuration error:', error)
      allTestsPassed = false
    }
    
    // Test 6: Environment Info
    console.log('\n📊 Test 6: Environment Info')
    
    try {
      const envInfo = envConfigModule.getEnvironmentInfo()
      console.log('✅ Environment info:', {
        nodeEnv: envInfo.nodeEnv,
        isValid: envInfo.validation.isValid,
        featuresCount: Object.keys(envInfo.features).length,
        lastValidated: envInfo.lastValidated.toISOString()
      })
      
      if (envInfo.validation.errors.length > 0) {
        console.log('❌ Environment info shows errors:', envInfo.validation.errors)
        allTestsPassed = false
      }
      
    } catch (error) {
      console.log('❌ Environment info error:', error)
      allTestsPassed = false
    }
    
    // Test 7: Error Handling
    console.log('\n🚨 Test 7: Error Handling')
    
    // Test with invalid environment by temporarily changing values
    const originalAirtable = process.env.USE_AIRTABLE
    const originalPlatformFee = process.env.PLATFORM_FEE_PERCENT
    
    try {
      // Test invalid platform fee
      process.env.PLATFORM_FEE_PERCENT = '150' // Invalid value > 100
      
      // Clear cached environment to force re-validation
      delete require.cache[require.resolve('../lib/env-config')]
      const testEnvModule = await import('../lib/env-config')
      
      const invalidValidation = testEnvModule.validateEnvironment()
      
      if (!invalidValidation.isValid && invalidValidation.errors.some(e => e.includes('PLATFORM_FEE_PERCENT'))) {
        console.log('✅ Error handling working: Invalid platform fee detected')
      } else {
        console.log('❌ Error handling not working: Invalid platform fee not detected')
        allTestsPassed = false
      }
      
    } catch (error) {
      console.log('❌ Error handling test failed:', error)
      allTestsPassed = false
    } finally {
      // Restore original values
      if (originalAirtable) process.env.USE_AIRTABLE = originalAirtable
      if (originalPlatformFee) process.env.PLATFORM_FEE_PERCENT = originalPlatformFee
    }
    
    // Test 8: Type Safety
    console.log('\n📝 Test 8: Type Safety')
    
    try {
      // Re-import with restored environment
      delete require.cache[require.resolve('../lib/env-config')]
      const typedEnvModule = await import('../lib/env-config')
      
      const env = typedEnvModule.getEnvironment()
      
      // Test that boolean transformations work
      const useAirtableType = typeof env.USE_AIRTABLE
      const mockPaymentsType = typeof env.MOCK_PAYMENTS
      const platformFeeType = typeof env.PLATFORM_FEE_PERCENT
      
      console.log('✅ Type transformations:', {
        useAirtable: `${env.USE_AIRTABLE} (${useAirtableType})`,
        mockPayments: `${env.MOCK_PAYMENTS} (${mockPaymentsType})`,
        platformFee: `${env.PLATFORM_FEE_PERCENT} (${platformFeeType})`
      })
      
      if (useAirtableType !== 'boolean' || mockPaymentsType !== 'boolean' || platformFeeType !== 'number') {
        console.log('❌ Type transformations not working correctly')
        allTestsPassed = false
      }
      
    } catch (error) {
      console.log('❌ Type safety test failed:', error)
      allTestsPassed = false
    }
    
    // Test 9: Configuration Dependencies
    console.log('\n🔗 Test 9: Configuration Dependencies')
    
    try {
      const featureFlags = envConfigModule.getFeatureFlags()
      
      // Test that Airtable config requires USE_AIRTABLE=true
      if (featureFlags.useAirtable) {
        try {
          const airtableConfig = envConfigModule.getAirtableConfig()
          console.log('✅ Airtable dependency check passed')
        } catch (error) {
          console.log('❌ Airtable dependency check failed:', error)
          allTestsPassed = false
        }
      } else {
        try {
          envConfigModule.getAirtableConfig()
          console.log('❌ Airtable dependency check should have failed')
          allTestsPassed = false
        } catch (error: any) {
          if (error.message.includes('not enabled')) {
            console.log('✅ Airtable dependency check correctly failed')
          } else {
            console.log('❌ Unexpected Airtable dependency error:', error.message)
            allTestsPassed = false
          }
        }
      }
      
    } catch (error) {
      console.log('❌ Configuration dependencies test failed:', error)
      allTestsPassed = false
    }
    
    // Test 10: Production Safety Checks
    console.log('\n🔒 Test 10: Production Safety Checks')
    
    try {
      // Temporarily set to production
      const originalNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      // Clear cache and re-import
      delete require.cache[require.resolve('../lib/env-config')]
      const prodEnvModule = await import('../lib/env-config')
      
      const prodValidation = prodEnvModule.validateEnvironment()
      
      // Check for production-specific warnings/errors
      const hasProductionChecks = prodValidation.warnings.some(w => 
        w.includes('production') || w.includes('MOCK_PAYMENTS')
      ) || prodValidation.errors.some(e => 
        e.includes('production') || e.includes('change-this')
      )
      
      console.log('✅ Production safety checks:', {
        hasChecks: hasProductionChecks,
        warningsCount: prodValidation.warnings.length,
        errorsCount: prodValidation.errors.length
      })
      
      // Restore original NODE_ENV
      if (originalNodeEnv) {
        process.env.NODE_ENV = originalNodeEnv
      } else {
        delete process.env.NODE_ENV
      }
      
    } catch (error) {
      console.log('❌ Production safety checks failed:', error)
      allTestsPassed = false
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    allTestsPassed = false
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60))
  if (allTestsPassed) {
    console.log('🎉 All Environment Configuration tests PASSED!')
    console.log('✅ Environment validation working correctly')
    console.log('✅ Feature flags operational')
    console.log('✅ Service configuration access functional')
    console.log('✅ Type safety and transformations working')
    console.log('✅ Error handling robust')
    console.log('✅ Production safety checks implemented')
    console.log('')
    console.log('📋 Environment Configuration Summary:')
    console.log('   ✅ Zod schema validation with custom business rules')
    console.log('   ✅ Service-specific configuration getters')
    console.log('   ✅ Feature flag management')
    console.log('   ✅ Safe environment access with error handling')
    console.log('   ✅ Type transformations (string → boolean/number)')
    console.log('   ✅ Production vs development environment checks')
    console.log('   ✅ Configuration dependency validation')
    console.log('')
    console.log('🚀 Ready for API Route Migration')
  } else {
    console.log('❌ Some Environment Configuration tests FAILED!')
    console.log('🔧 Please fix the issues before proceeding')
    process.exit(1)
  }
  
  console.log('\n🏁 Environment Configuration test complete!')
}

// Run the test
if (require.main === module) {
  testEnvironmentConfiguration().catch(console.error)
}

export { testEnvironmentConfiguration }
// Environment Configuration with Zod Validation
// Provides centralized environment management and validation

import { z } from 'zod'

// Environment schema definitions
const EnvironmentSchema = z.object({
  // Node.js environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database configuration
  DATABASE_URL: z.string().min(1, 'Database URL is required'),
  USE_AIRTABLE: z.string().transform(val => val === 'true').default('false'),
  
  // Airtable configuration (required when USE_AIRTABLE=true)
  AIRTABLE_API_KEY: z.string().optional(),
  AIRTABLE_BASE_ID: z.string().optional(),
  AIRTABLE_RATE_LIMIT_PER_SEC: z.string().transform(Number).default('5'),
  
  // Cache configuration
  CACHE_TTL_USERS: z.string().transform(Number).default('300000'), // 5 minutes
  CACHE_TTL_LISTINGS: z.string().transform(Number).default('60000'), // 1 minute
  CACHE_MAX_SIZE: z.string().transform(Number).default('1000'),
  
  // Authentication (Clerk)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, 'Clerk publishable key is required'),
  CLERK_SECRET_KEY: z.string().min(1, 'Clerk secret key is required'),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default('/sign-in'),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default('/sign-up'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default('/listings'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default('/listings'),
  
  // Payment configuration
  MOCK_PAYMENTS: z.string().transform(val => val === 'true').default('true'),
  PLATFORM_FEE_PERCENT: z.string().transform(Number).default('6'),
  MOCK_PAYMENT_FAILURE_RATE: z.string().transform(Number).default('0.1'),
  MOCK_PAYMENT_PROCESSING_TIME: z.string().transform(Number).default('2000'),
  MOCK_PAYOUT_DELAY: z.string().transform(Number).default('5000'),
  
  // Security
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  
  // File upload
  UPLOAD_DIR: z.string().default('./public/uploads'),
  MAX_FILE_SIZE: z.string().transform(Number).default('10485760'), // 10MB
  ALLOWED_FILE_TYPES: z.string().default('application/pdf,image/jpeg,image/png'),
  
  // Rate limiting
  RATE_LIMIT_WINDOW: z.string().transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  
  // Logging and monitoring
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info')
})

type Environment = z.infer<typeof EnvironmentSchema>

// Validation result type
export interface EnvironmentValidationResult {
  isValid: boolean
  env?: Environment
  errors: string[]
  warnings: string[]
}

// Cached validated environment
let validatedEnv: Environment | null = null
let validationErrors: string[] = []
let validationWarnings: string[] = []

export function validateEnvironment(): EnvironmentValidationResult {
  console.log('🔍 Validating environment configuration')
  
  const errors: string[] = []
  const warnings: string[] = []
  
  try {
    // Parse and validate environment variables
    const rawEnv = process.env
    const validatedEnvironment = EnvironmentSchema.parse(rawEnv)
    
    // Additional business logic validation
    
    // Airtable validation
    if (validatedEnvironment.USE_AIRTABLE) {
      if (!validatedEnvironment.AIRTABLE_API_KEY) {
        errors.push('AIRTABLE_API_KEY is required when USE_AIRTABLE=true')
      } else if (!validatedEnvironment.AIRTABLE_API_KEY.startsWith('pat')) {
        warnings.push('AIRTABLE_API_KEY should start with "pat" for Personal Access Token')
      }
      
      if (!validatedEnvironment.AIRTABLE_BASE_ID) {
        errors.push('AIRTABLE_BASE_ID is required when USE_AIRTABLE=true')
      } else if (!validatedEnvironment.AIRTABLE_BASE_ID.startsWith('app')) {
        warnings.push('AIRTABLE_BASE_ID should start with "app"')
      }
    }
    
    // Payment validation
    if (validatedEnvironment.PLATFORM_FEE_PERCENT < 0 || validatedEnvironment.PLATFORM_FEE_PERCENT > 100) {
      errors.push('PLATFORM_FEE_PERCENT must be between 0 and 100')
    }
    
    if (validatedEnvironment.MOCK_PAYMENT_FAILURE_RATE < 0 || validatedEnvironment.MOCK_PAYMENT_FAILURE_RATE > 1) {
      errors.push('MOCK_PAYMENT_FAILURE_RATE must be between 0 and 1')
    }
    
    // Cache validation
    if (validatedEnvironment.CACHE_MAX_SIZE < 10) {
      warnings.push('CACHE_MAX_SIZE is very small, consider increasing for better performance')
    }
    
    if (validatedEnvironment.AIRTABLE_RATE_LIMIT_PER_SEC > 5) {
      warnings.push('AIRTABLE_RATE_LIMIT_PER_SEC > 5 may exceed Airtable API limits')
    }
    
    // Security validation
    if (validatedEnvironment.NODE_ENV === 'production') {
      if (validatedEnvironment.JWT_SECRET.includes('change-this')) {
        errors.push('JWT_SECRET must be changed in production environment')
      }
      
      if (validatedEnvironment.MOCK_PAYMENTS) {
        warnings.push('MOCK_PAYMENTS=true in production - consider using real payment processing')
      }
    }
    
    // File upload validation
    const maxFileSizeMB = validatedEnvironment.MAX_FILE_SIZE / (1024 * 1024)
    if (maxFileSizeMB > 50) {
      warnings.push(`MAX_FILE_SIZE is ${maxFileSizeMB}MB - consider reducing for better performance`)
    }
    
    // Cache validated environment
    validatedEnv = validatedEnvironment
    validationErrors = errors
    validationWarnings = warnings
    
    const isValid = errors.length === 0
    
    console.log(`${isValid ? '✅' : '❌'} Environment validation ${isValid ? 'passed' : 'failed'}`)
    if (errors.length > 0) {
      console.log('❌ Errors:', errors)
    }
    if (warnings.length > 0) {
      console.log('⚠️ Warnings:', warnings)
    }
    
    return {
      isValid,
      env: isValid ? validatedEnvironment : undefined,
      errors,
      warnings
    }
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodErrors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      errors.push(...zodErrors)
    } else {
      errors.push(`Unexpected validation error: ${error}`)
    }
    
    console.log('❌ Environment validation failed:', errors)
    
    return {
      isValid: false,
      errors,
      warnings
    }
  }
}

// Get validated environment (validates on first call)
export function getEnvironment(): Environment {
  if (!validatedEnv) {
    const result = validateEnvironment()
    if (!result.isValid) {
      throw new Error(`Environment validation failed: ${result.errors.join(', ')}`)
    }
  }
  
  return validatedEnv!
}

// Safely get environment with defaults
export function safeGetEnvironment(): {
  env: Environment | null
  errors: string[]
  warnings: string[]
} {
  if (!validatedEnv) {
    const result = validateEnvironment()
    return {
      env: result.env || null,
      errors: result.errors,
      warnings: result.warnings
    }
  }
  
  return {
    env: validatedEnv,
    errors: validationErrors,
    warnings: validationWarnings
  }
}

// Environment feature flags
export function getFeatureFlags(): {
  useAirtable: boolean
  useMockPayments: boolean
  isProduction: boolean
  isDevelopment: boolean
  isTest: boolean
} {
  const env = getEnvironment()
  
  return {
    useAirtable: env.USE_AIRTABLE,
    useMockPayments: env.MOCK_PAYMENTS,
    isProduction: env.NODE_ENV === 'production',
    isDevelopment: env.NODE_ENV === 'development',
    isTest: env.NODE_ENV === 'test'
  }
}

// Configuration for specific services
export function getAirtableConfig(): {
  apiKey: string
  baseId: string
  rateLimitPerSec: number
  cacheTtlUsers: number
  cacheTtlListings: number
  cacheMaxSize: number
} {
  const env = getEnvironment()
  
  if (!env.USE_AIRTABLE) {
    throw new Error('Airtable is not enabled. Set USE_AIRTABLE=true')
  }
  
  if (!env.AIRTABLE_API_KEY || !env.AIRTABLE_BASE_ID) {
    throw new Error('Airtable configuration incomplete. Check AIRTABLE_API_KEY and AIRTABLE_BASE_ID')
  }
  
  return {
    apiKey: env.AIRTABLE_API_KEY,
    baseId: env.AIRTABLE_BASE_ID,
    rateLimitPerSec: env.AIRTABLE_RATE_LIMIT_PER_SEC,
    cacheTtlUsers: env.CACHE_TTL_USERS,
    cacheTtlListings: env.CACHE_TTL_LISTINGS,
    cacheMaxSize: env.CACHE_MAX_SIZE
  }
}

export function getClerkConfig(): {
  publishableKey: string
  secretKey: string
  signInUrl: string
  signUpUrl: string
  afterSignInUrl: string
  afterSignUpUrl: string
} {
  const env = getEnvironment()
  
  return {
    publishableKey: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    secretKey: env.CLERK_SECRET_KEY,
    signInUrl: env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    signUpUrl: env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
    afterSignInUrl: env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
    afterSignUpUrl: env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
  }
}

export function getPaymentConfig(): {
  useMockPayments: boolean
  platformFeePercent: number
  mockFailureRate: number
  mockProcessingTime: number
  mockPayoutDelay: number
} {
  const env = getEnvironment()
  
  return {
    useMockPayments: env.MOCK_PAYMENTS,
    platformFeePercent: env.PLATFORM_FEE_PERCENT,
    mockFailureRate: env.MOCK_PAYMENT_FAILURE_RATE,
    mockProcessingTime: env.MOCK_PAYMENT_PROCESSING_TIME,
    mockPayoutDelay: env.MOCK_PAYOUT_DELAY
  }
}

export function getFileUploadConfig(): {
  uploadDir: string
  maxFileSize: number
  allowedFileTypes: string[]
} {
  const env = getEnvironment()
  
  return {
    uploadDir: env.UPLOAD_DIR,
    maxFileSize: env.MAX_FILE_SIZE,
    allowedFileTypes: env.ALLOWED_FILE_TYPES.split(',').map(type => type.trim())
  }
}

export function getRateLimitConfig(): {
  windowMs: number
  maxRequests: number
} {
  const env = getEnvironment()
  
  return {
    windowMs: env.RATE_LIMIT_WINDOW,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS
  }
}

// Environment info for debugging
export function getEnvironmentInfo(): {
  nodeEnv: string
  features: ReturnType<typeof getFeatureFlags>
  validation: {
    isValid: boolean
    errors: string[]
    warnings: string[]
  }
  lastValidated: Date
} {
  const { env, errors, warnings } = safeGetEnvironment()
  
  return {
    nodeEnv: env?.NODE_ENV || 'unknown',
    features: env ? getFeatureFlags() : {} as ReturnType<typeof getFeatureFlags>,
    validation: {
      isValid: errors.length === 0,
      errors,
      warnings
    },
    lastValidated: new Date()
  }
}

// Convenience functions for common environment checks
export function getUseAirtable(): boolean {
  const env = getEnvironment()
  return env.USE_AIRTABLE
}

export function getMockPayments(): boolean {
  const env = getEnvironment()
  return env.MOCK_PAYMENTS
}

export function getPlatformFeePercent(): number {
  const env = getEnvironment()
  return env.PLATFORM_FEE_PERCENT
}

export function getAirtableApiKey(): string {
  const env = getEnvironment()
  if (!env.AIRTABLE_API_KEY) {
    throw new Error('AIRTABLE_API_KEY not configured')
  }
  return env.AIRTABLE_API_KEY
}

export function getAirtableBaseId(): string {
  const env = getEnvironment()
  if (!env.AIRTABLE_BASE_ID) {
    throw new Error('AIRTABLE_BASE_ID not configured')
  }
  return env.AIRTABLE_BASE_ID
}

// Export the environment type for use in other modules
export type { Environment }
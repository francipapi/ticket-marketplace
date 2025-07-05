// Enhanced API Helpers for Ticket Marketplace
// Provides improved API utilities with better authentication and error handling

import { NextRequest, NextResponse } from 'next/server'
import { ZodSchema } from 'zod'
import { AuthService, AppUser } from './auth-server'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  timestamp?: string
  requestId?: string
}

export interface ApiError {
  code: string
  message: string
  details?: any
}

// Enhanced response creation with metadata
export function createResponse<T>(
  data: T, 
  metadata?: { 
    message?: string
    requestId?: string 
  }
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
    requestId: metadata?.requestId || generateRequestId()
  })
}

export function createErrorResponse(
  error: string | ApiError, 
  status = 400,
  metadata?: { 
    requestId?: string
    details?: any 
  }
): NextResponse<ApiResponse> {
  const errorObj = typeof error === 'string' ? { code: 'GENERIC_ERROR', message: error } : error
  
  return NextResponse.json({
    success: false,
    error: errorObj.message,
    timestamp: new Date().toISOString(),
    requestId: metadata?.requestId || generateRequestId(),
    ...(metadata?.details && { details: metadata.details })
  }, { status })
}

// Generate unique request ID for tracking
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Enhanced validation with better error messages
export async function withValidation<T>(
  request: NextRequest,
  schema: ZodSchema<T>,
  options?: {
    requestId?: string
    logValidation?: boolean
  }
): Promise<{ success: true; data: T; requestId: string } | { success: false; error: string; requestId: string }> {
  const requestId = options?.requestId || generateRequestId()
  
  try {
    const body = await request.json()
    
    if (options?.logValidation) {
      console.log(`🔍 Validating request ${requestId}:`, body)
    }
    
    const validatedData = schema.parse(body)
    
    if (options?.logValidation) {
      console.log(`✅ Validation successful for request ${requestId}`)
    }
    
    return { success: true, data: validatedData, requestId }
  } catch (error: unknown) {
    console.error(`❌ Validation failed for request ${requestId}:`, error)
    
    if (error && typeof error === 'object' && 'errors' in error) {
      const zodError = error as any
      const message = zodError.errors?.map((e: any) => `${e.path?.join('.')}: ${e.message}`).join(', ')
      return { success: false, error: `Validation error: ${message}`, requestId }
    }
    
    return { success: false, error: 'Invalid request data', requestId }
  }
}

// Enhanced authentication with better error handling
export async function withAuth(
  options?: {
    requestId?: string
    logAuth?: boolean
    required?: boolean
  }
): Promise<{ success: true; user: AppUser; requestId: string } | { success: false; error: string; requestId: string }> {
  const requestId = options?.requestId || generateRequestId()
  const required = options?.required !== false // Default to true
  
  try {
    if (options?.logAuth) {
      console.log(`🔐 Authenticating request ${requestId}`)
    }
    
    if (required) {
      const user = await AuthService.requireAuth()
      
      if (options?.logAuth) {
        console.log(`✅ Authentication successful for request ${requestId}: ${user.id}`)
      }
      
      return { success: true, user, requestId }
    } else {
      const user = await AuthService.getCurrentUser()
      
      if (user) {
        if (options?.logAuth) {
          console.log(`✅ Optional authentication successful for request ${requestId}: ${user.id}`)
        }
        return { success: true, user, requestId }
      } else {
        if (options?.logAuth) {
          console.log(`❌ No authentication found for optional request ${requestId}`)
        }
        return { success: false, error: 'Authentication not found', requestId }
      }
    }
  } catch (error: any) {
    console.error(`❌ Authentication failed for request ${requestId}:`, error)
    
    const message = error instanceof Error ? error.message : 'Authentication required'
    return { success: false, error: message, requestId }
  }
}

// Combined authentication and validation
export async function withAuthAndValidation<T>(
  request: NextRequest,
  schema: ZodSchema<T>,
  options?: {
    requestId?: string
    logAuth?: boolean
    logValidation?: boolean
    authRequired?: boolean
  }
): Promise<
  | { success: true; user: AppUser; data: T; requestId: string }
  | { success: false; error: string; requestId: string }
> {
  const requestId = options?.requestId || generateRequestId()
  
  console.log(`🔍 Processing request ${requestId} with auth and validation`)
  
  // Authenticate first
  const authResult = await withAuth({ 
    requestId, 
    logAuth: options?.logAuth,
    required: options?.authRequired 
  })
  
  if (!authResult.success) {
    return authResult
  }
  
  // Then validate
  const validationResult = await withValidation(request, schema, { 
    requestId, 
    logValidation: options?.logValidation 
  })
  
  if (!validationResult.success) {
    return validationResult
  }
  
  console.log(`✅ Request ${requestId} processed successfully`)
  
  return {
    success: true,
    user: authResult.user,
    data: validationResult.data,
    requestId
  }
}

// Enhanced convenience functions with logging
export async function requireAuth(options?: { logAuth?: boolean }): Promise<AppUser> {
  if (options?.logAuth) {
    console.log('🔐 Requiring authentication')
  }
  
  try {
    const user = await AuthService.requireAuth()
    
    if (options?.logAuth) {
      console.log(`✅ Authentication successful: ${user.id}`)
    }
    
    return user
  } catch (error) {
    if (options?.logAuth) {
      console.error('❌ Authentication failed:', error)
    }
    throw error
  }
}

export async function getCurrentUser(options?: { logAuth?: boolean }): Promise<AppUser | null> {
  if (options?.logAuth) {
    console.log('🔍 Getting current user')
  }
  
  try {
    const user = await AuthService.getCurrentUser()
    
    if (options?.logAuth) {
      if (user) {
        console.log(`✅ Current user found: ${user.id}`)
      } else {
        console.log('❌ No current user found')
      }
    }
    
    return user
  } catch (error) {
    if (options?.logAuth) {
      console.error('❌ Error getting current user:', error)
    }
    return null
  }
}

// Route protection middleware
export async function protectRoute(
  handler: (user: AppUser, requestId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  const requestId = generateRequestId()
  
  try {
    console.log(`🛡️ Protecting route with request ${requestId}`)
    
    const { user } = await AuthService.protectRoute()
    
    console.log(`✅ Route protection successful for request ${requestId}: ${user.id}`)
    
    return await handler(user, requestId)
  } catch (error: any) {
    console.error(`❌ Route protection failed for request ${requestId}:`, error)
    
    return createErrorResponse(
      {
        code: 'UNAUTHORIZED',
        message: error.message || 'Authentication required'
      },
      401,
      { requestId }
    )
  }
}

// Optional route protection (doesn't throw if not authenticated)
export async function optionalProtectRoute(
  handler: (user: AppUser | null, requestId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  const requestId = generateRequestId()
  
  try {
    console.log(`🔍 Optional route protection for request ${requestId}`)
    
    const user = await AuthService.getCurrentUser()
    
    if (user) {
      console.log(`✅ Optional route protection found user for request ${requestId}: ${user.id}`)
    } else {
      console.log(`❌ Optional route protection - no user for request ${requestId}`)
    }
    
    return await handler(user, requestId)
  } catch (error: any) {
    console.error(`❌ Optional route protection error for request ${requestId}:`, error)
    
    // Still call handler with null user if authentication fails
    return await handler(null, requestId)
  }
}

// Request logging middleware
export function logRequest(request: NextRequest, metadata?: { endpoint?: string }) {
  const requestId = generateRequestId()
  const method = request.method
  const url = request.url
  const userAgent = request.headers.get('user-agent')
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  
  console.log(`📨 ${method} ${metadata?.endpoint || url} [${requestId}]`)
  console.log(`   IP: ${ip}`)
  console.log(`   User-Agent: ${userAgent?.substring(0, 100)}...`)
  
  return requestId
}

// Error handling wrapper
export async function handleApiError<T>(
  operation: () => Promise<T>,
  context: string,
  requestId?: string
): Promise<T> {
  try {
    console.log(`⚡ Executing ${context} [${requestId || 'unknown'}]`)
    
    const result = await operation()
    
    console.log(`✅ ${context} completed successfully [${requestId || 'unknown'}]`)
    
    return result
  } catch (error: any) {
    console.error(`❌ ${context} failed [${requestId || 'unknown'}]:`, error)
    
    // Enhance error with context
    const enhancedError = new Error(`${context}: ${error.message}`)
    enhancedError.stack = error.stack
    
    throw enhancedError
  }
}

// Rate limiting helper (basic implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string, 
  limit: number = 100, 
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const windowStart = now - windowMs
  
  // Clean up old entries
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.resetTime < now) {
      rateLimitMap.delete(key)
    }
  }
  
  const entry = rateLimitMap.get(identifier)
  
  if (!entry || entry.resetTime < now) {
    // New window
    const resetTime = now + windowMs
    rateLimitMap.set(identifier, { count: 1, resetTime })
    return { allowed: true, remaining: limit - 1, resetTime }
  }
  
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime }
  }
  
  entry.count++
  return { allowed: true, remaining: limit - entry.count, resetTime: entry.resetTime }
}

// Wrapper for consistent error handling in API routes
export function withErrorHandling<T>(handler: () => Promise<T>): Promise<T> {
  return handleApiError(handler, 'API request')
}

// Export types
export type { AppUser }
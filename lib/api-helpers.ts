import { NextRequest, NextResponse } from 'next/server'
import { ZodSchema } from 'zod'
import { AuthService, AppUser } from './auth-server'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export function createResponse<T>(data: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data })
}

export function createErrorResponse(error: string, status = 400): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error }, { status })
}

export async function withValidation<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json()
    const validatedData = schema.parse(body)
    return { success: true, data: validatedData }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'errors' in error) {
      const message = (error.errors as Array<{ message: string }>).map((e) => e.message).join(', ')
      return { success: false, error: message }
    }
    return { success: false, error: 'Invalid request data' }
  }
}

export async function withAuth(): Promise<{ success: true; user: AppUser } | { success: false; error: string }> {
  try {
    const user = await AuthService.requireAuth()
    return { success: true, user }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return { success: false, error: message }
  }
}

export async function withAuthAndValidation<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<
  | { success: true; user: AppUser; data: T }
  | { success: false; error: string }
> {
  const authResult = await withAuth()
  if (!authResult.success) {
    return authResult
  }

  const validationResult = await withValidation(request, schema)
  if (!validationResult.success) {
    return validationResult
  }

  return {
    success: true,
    user: authResult.user,
    data: validationResult.data,
  }
}

// Convenience function to require authentication and return user
export async function requireAuth(): Promise<AppUser> {
  return await AuthService.requireAuth()
}

// Convenience function to get current user (returns null if not authenticated)
export async function getCurrentUser(): Promise<AppUser | null> {
  return await AuthService.getCurrentUser()
}
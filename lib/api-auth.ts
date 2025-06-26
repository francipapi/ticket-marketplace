import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, User } from './supabase-server'

export interface ApiResponse<T = any> {
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

// Require authentication for API routes
export async function requireAuth(request: NextRequest): Promise<{ user: User } | NextResponse> {
  const user = await getServerUser()
  
  if (!user) {
    return createErrorResponse('Authentication required', 401)
  }

  return { user }
}

// Wrapper for authenticated API routes
export async function withAuth<T>(
  handler: (request: NextRequest, user: User) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest) => {
    const authResult = await requireAuth(request)
    
    if (authResult instanceof NextResponse) {
      return authResult // Error response
    }

    return handler(request, authResult.user)
  }
}
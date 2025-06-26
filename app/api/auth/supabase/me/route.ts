import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { createResponse, createErrorResponse } from '@/lib/api-auth'

export async function GET(_request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user) {
      return createErrorResponse('Not authenticated', 401)
    }

    return createResponse({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        created_at: user.created_at
      }
    })

  } catch (error) {
    console.error('Get user error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
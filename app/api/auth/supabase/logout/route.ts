import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createResponse, createErrorResponse } from '@/lib/api-auth'

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return createErrorResponse(error.message, 400)
    }

    return createResponse({
      message: 'Logout successful'
    })

  } catch (error) {
    console.error('Logout error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
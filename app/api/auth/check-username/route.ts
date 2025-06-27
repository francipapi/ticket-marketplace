import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  // Create Supabase admin client
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
  try {
    const { username } = await request.json()

    if (!username) {
      return NextResponse.json({
        success: false,
        error: 'Username is required'
      }, { status: 400 })
    }

    if (username.length < 3) {
      return NextResponse.json({
        success: false,
        available: false,
        error: 'Username must be at least 3 characters long'
      }, { status: 400 })
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({
        success: false,
        available: false,
        error: 'Username can only contain letters, numbers, and underscores'
      }, { status: 400 })
    }

    // Check if username exists
    const { data: existingUser, error } = await supabaseAdmin
      .from('users')
      .select('username')
      .eq('username', username)
      .maybeSingle()

    if (error) {
      console.error('Username check error:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to check username availability'
      }, { status: 500 })
    }

    const isAvailable = !existingUser

    return NextResponse.json({
      success: true,
      available: isAvailable,
      username: username
    })

  } catch (error) {
    console.error('Username check error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check username availability'
    }, { status: 500 })
  }
}
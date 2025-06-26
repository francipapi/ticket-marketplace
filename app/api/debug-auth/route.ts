import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current auth user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({
        authenticated: false,
        error: authError?.message || 'No user found'
      })
    }
    
    // Try to get user from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('supabaseId', user.id)
      .single()
    
    // Try to get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    return NextResponse.json({
      authenticated: true,
      authUser: {
        id: user.id,
        email: user.email,
        emailConfirmed: user.email_confirmed_at
      },
      userData: userData || null,
      userError: userError?.message || null,
      profile: profile || null,
      profileError: profileError?.message || null,
      debug: {
        hasUserRecord: !!userData,
        hasProfile: !!profile,
        userTableQuery: `SELECT * FROM users WHERE "supabaseId" = '${user.id}'`
      }
    })
  } catch (error) {
    console.error('Debug auth error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
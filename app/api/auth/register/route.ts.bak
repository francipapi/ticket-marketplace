import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  // Create Supabase client with service role key inside the function
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
    const { email, password, username } = await request.json()

    console.log('Server-side registration attempt:', { email, username })

    // Validate input
    if (!email || !password || !username) {
      return NextResponse.json({
        success: false,
        error: 'Email, password, and username are required'
      }, { status: 400 })
    }

    if (username.length < 3) {
      return NextResponse.json({
        success: false,
        error: 'Username must be at least 3 characters long'
      }, { status: 400 })
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({
        success: false,
        error: 'Username can only contain letters, numbers, and underscores'
      }, { status: 400 })
    }

    // Step 1: Check if username or email is already taken
    const { data: existingUsername } = await supabaseAdmin
      .from('users')
      .select('username')
      .eq('username', username)
      .maybeSingle()

    if (existingUsername) {
      return NextResponse.json({
        success: false,
        error: 'Username is already taken'
      }, { status: 400 })
    }

    const { data: existingEmail } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('email', email)
      .maybeSingle()

    if (existingEmail) {
      return NextResponse.json({
        success: false,
        error: 'Email is already registered'
      }, { status: 400 })
    }

    // Step 2: Create Supabase auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { username },
      email_confirm: true // Auto-confirm email for development
    })

    if (authError) {
      console.error('Supabase auth error:', authError)
      let errorMessage = authError.message
      
      // Handle specific auth errors
      if (authError.message?.includes('already_registered') || 
          authError.message?.includes('email_already_exists') ||
          authError.message?.includes('user_already_exists')) {
        errorMessage = 'Email is already registered'
      }
      
      return NextResponse.json({
        success: false,
        error: errorMessage
      }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create user account'
      }, { status: 500 })
    }

    console.log('Supabase auth user created:', authData.user.id)

    // Step 3: Wait for database trigger to create user records
    console.log('Waiting for database trigger to create user records...')
    
    // Give the trigger a moment to process
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Step 4: Verify user record was created by trigger
    const { data: appUser, error: dbError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('supabaseId', authData.user.id)
      .single()

    if (dbError || !appUser) {
      console.error('Database trigger failed to create user record:', dbError)
      
      // Cleanup: Delete the auth user since app user wasn't created
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        console.log('Cleaned up auth user after trigger failure')
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user:', cleanupError)
      }

      return NextResponse.json({
        success: false,
        error: 'Database error saving new user',
        details: dbError?.message || 'Trigger failed to create user record'
      }, { status: 500 })
    }

    console.log('User record created by trigger:', appUser.id)

    return NextResponse.json({
      success: true,
      user: {
        id: appUser.id,
        supabaseId: appUser.supabaseId,
        email: appUser.email,
        username: appUser.username,
        createdAt: appUser.createdAt,
        updatedAt: appUser.updatedAt,
        migrationStatus: appUser.migrationStatus
      },
      message: 'User registered successfully'
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed'
    }, { status: 500 })
  }
}
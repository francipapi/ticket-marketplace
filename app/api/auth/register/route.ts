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

    // Step 1: Check if username is already taken
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('username')
      .eq('username', username)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'Username is already taken'
      }, { status: 400 })
    }

    // Step 2: Create Supabase auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { username },
      email_confirm: false // Skip email confirmation for development
    })

    if (authError) {
      console.error('Supabase auth error:', authError)
      return NextResponse.json({
        success: false,
        error: authError.message
      }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create user account'
      }, { status: 500 })
    }

    console.log('Supabase user created:', authData.user.id)

    // Step 3: Create application user record
    const { data: appUser, error: dbError } = await supabaseAdmin
      .from('users')
      .insert({
        supabaseId: authData.user.id,
        email: authData.user.email!,
        username: username,
        migrationStatus: 'direct_signup'
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error creating user record:', dbError)
      
      // Cleanup: Delete the auth user if database insertion failed
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        console.log('Cleaned up auth user after database failure')
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user:', cleanupError)
      }

      return NextResponse.json({
        success: false,
        error: 'Failed to create user profile',
        details: dbError.message
      }, { status: 500 })
    }

    console.log('Application user record created:', appUser.id)

    // Step 4: Create profile record (optional)
    try {
      await supabaseAdmin
        .from('profiles')
        .insert({
          id: authData.user.id,
          username: username
        })
      console.log('Profile record created')
    } catch (profileError) {
      console.warn('Profile creation failed (non-critical):', profileError)
    }

    // Step 5: Generate session for the new user (optional)
    try {
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: authData.user.email!
      })
    } catch (sessionError) {
      console.warn('Failed to generate session link:', sessionError)
    }

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
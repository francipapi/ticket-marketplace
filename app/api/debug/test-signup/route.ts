import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { email, password, username } = await request.json()

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

    const log = []
    log.push(`Starting test signup for: ${email}, username: ${username}`)

    // Step 1: Check if username already exists
    try {
      const { data: existingUser, error: checkError } = await supabaseAdmin
        .from('users')
        .select('username')
        .eq('username', username)
        .maybeSingle()

      if (checkError) {
        log.push(`❌ Username check failed: ${checkError.message}`)
        return NextResponse.json({ success: false, error: 'Username check failed', log })
      }

      if (existingUser) {
        log.push(`❌ Username already exists: ${username}`)
        return NextResponse.json({ success: false, error: 'Username already taken', log })
      }

      log.push(`✅ Username available: ${username}`)
    } catch (e) {
      log.push(`❌ Username check exception: ${e}`)
      return NextResponse.json({ success: false, error: 'Username check exception', log })
    }

    // Step 2: Attempt Supabase auth user creation
    try {
      log.push(`🔄 Creating Supabase auth user...`)
      
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        user_metadata: { username },
        email_confirm: false
      })

      if (authError) {
        log.push(`❌ Supabase auth creation failed: ${authError.message}`)
        log.push(`Error details: ${JSON.stringify(authError, null, 2)}`)
        return NextResponse.json({ 
          success: false, 
          error: 'Supabase auth creation failed', 
          authError: authError.message,
          log 
        })
      }

      if (!authData.user) {
        log.push(`❌ No user returned from Supabase auth`)
        return NextResponse.json({ success: false, error: 'No user returned', log })
      }

      log.push(`✅ Supabase auth user created: ${authData.user.id}`)
      log.push(`User email confirmed: ${authData.user.email_confirmed_at ? 'Yes' : 'No'}`)
      log.push(`User metadata: ${JSON.stringify(authData.user.user_metadata)}`)

      // Step 3: Check if trigger created user record
      try {
        log.push(`🔄 Checking if trigger created user record...`)
        
        // Wait a moment for trigger
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const { data: userRecord, error: userError } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('supabaseId', authData.user.id)
          .maybeSingle()

        if (userError) {
          log.push(`❌ Error checking user record: ${userError.message}`)
        } else if (userRecord) {
          log.push(`✅ User record found (created by trigger): ${userRecord.id}`)
          log.push(`User details: ${JSON.stringify(userRecord, null, 2)}`)
        } else {
          log.push(`❌ No user record found - trigger may not exist or failed`)
        }

        // Step 4: Check profile record
        const { data: profileRecord, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle()

        if (profileError) {
          log.push(`❌ Error checking profile record: ${profileError.message}`)
        } else if (profileRecord) {
          log.push(`✅ Profile record found: ${profileRecord.username}`)
        } else {
          log.push(`❌ No profile record found`)
        }

        // Step 5: Manual cleanup if needed
        if (!userRecord) {
          log.push(`🔄 Cleaning up auth user since no app user record was created...`)
          try {
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
            log.push(`✅ Auth user cleaned up`)
          } catch (cleanupError) {
            log.push(`❌ Failed to cleanup auth user: ${cleanupError}`)
          }
        }

        return NextResponse.json({
          success: !!userRecord,
          message: userRecord ? 'Signup test successful' : 'Signup failed - no user record created',
          authUserId: authData.user.id,
          userRecord,
          profileRecord,
          log
        })

      } catch (e) {
        log.push(`❌ Error checking records: ${e}`)
        return NextResponse.json({ success: false, error: 'Record check failed', log })
      }

    } catch (e) {
      log.push(`❌ Supabase auth creation exception: ${e}`)
      return NextResponse.json({ success: false, error: 'Auth creation exception', log })
    }

  } catch (error) {
    console.error('Test signup error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Test signup failed'
    }, { status: 500 })
  }
}
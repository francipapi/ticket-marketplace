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

    console.log('Supabase auth user created:', authData.user.id)

    // Step 3: Retrieve the application user record (created by trigger)
    // Add a small delay to allow the trigger to complete, if necessary,
    // though typically it should be synchronous within the same transaction.
    // For robustness, we can poll briefly.
    let appUser = null;
    let attempts = 0;
    const maxAttempts = 5;
    const delayMs = 200;

    while (!appUser && attempts < maxAttempts) {
      attempts++;
      const { data: fetchedUser, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('supabaseId', authData.user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: "Query returned 0 rows"
        console.error('Error fetching user record:', fetchError);
        // This is an unexpected error during fetch, not just "not found"
        // Cleanup the auth user
        try {
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          console.log('Cleaned up auth user after database fetch failure');
        } catch (cleanupError) {
          console.error('Failed to cleanup auth user:', cleanupError);
        }
        return NextResponse.json({
          success: false,
          error: 'Failed to retrieve user profile after creation',
          details: fetchError.message
        }, { status: 500 });
      }
      
      if (fetchedUser) {
        appUser = fetchedUser;
      } else if (attempts < maxAttempts) {
        console.log(`User record not found yet for supabaseId ${authData.user.id}, attempt ${attempts}. Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    if (!appUser) {
      console.error(`Failed to find user record in 'users' table for supabaseId ${authData.user.id} after ${maxAttempts} attempts.`)
      // Cleanup: Delete the auth user if the corresponding public.users record was not created by the trigger
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        console.log('Cleaned up auth user as no corresponding user record was found')
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user:', cleanupError)
      }
      return NextResponse.json({
        success: false,
        error: 'User profile not created by trigger',
      }, { status: 500 })
    }

    console.log('Application user record verified (created by trigger):', appUser.id)

    // Step 4: Profile record is also handled by the trigger.
    // We can optionally verify it here if needed, but it's less critical than the users table record.
    // For now, we assume the trigger handles it or it's okay if it's slightly delayed.

    // Step 5: Generate session for the new user (optional, but good for UX)
    // This part can remain as it is.
    try {
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink', // Or 'signup' if you want to send a confirmation email
        email: authData.user.email!
      })
      console.log('Magic link generated for new user.');
    } catch (sessionError) {
      // This is non-critical for the registration itself
      console.warn('Failed to generate session link:', sessionError)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: appUser.id, // This is public.users.id (UUID)
        supabaseId: appUser.supabaseId, // This is auth.users.id (UUID)
        email: appUser.email,
        username: appUser.username, // This username comes from the trigger, which might have de-duplicated it
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
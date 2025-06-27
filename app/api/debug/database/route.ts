import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
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

    const results = {
      environment: {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        urlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...'
      },
      tables: {},
      triggers: {},
      functions: {},
      permissions: {},
      errors: []
    } as any

    // Check users table structure
    try {
      const { data: usersTableInfo, error: usersError } = await supabaseAdmin
        .from('users')
        .select('*')
        .limit(1)

      if (usersError) {
        results.errors.push(`Users table error: ${usersError.message}`)
        results.tables.users = { exists: false, error: usersError.message }
      } else {
        results.tables.users = {
          exists: true,
          sampleColumns: usersTableInfo && usersTableInfo.length > 0 ? Object.keys(usersTableInfo[0]) : 'No data',
          recordCount: usersTableInfo?.length || 0
        }
      }
    } catch (e) {
      results.errors.push(`Users table check failed: ${e}`)
    }

    // Check profiles table structure  
    try {
      const { data: profilesTableInfo, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .limit(1)

      if (profilesError) {
        results.errors.push(`Profiles table error: ${profilesError.message}`)
        results.tables.profiles = { exists: false, error: profilesError.message }
      } else {
        results.tables.profiles = {
          exists: true,
          sampleColumns: profilesTableInfo && profilesTableInfo.length > 0 ? Object.keys(profilesTableInfo[0]) : 'No data',
          recordCount: profilesTableInfo?.length || 0
        }
      }
    } catch (e) {
      results.errors.push(`Profiles table check failed: ${e}`)
    }

    // Check if trigger function exists
    try {
      const { data: functions, error: functionsError } = await supabaseAdmin
        .rpc('get_function_info', { function_name: 'handle_new_user' })
        .single()

      if (functionsError) {
        // Function doesn't exist or can't access
        results.functions.handle_new_user = { exists: false, error: functionsError.message }
      } else {
        results.functions.handle_new_user = { exists: true, info: functions }
      }
    } catch (e) {
      // RPC might not exist, try alternative approach
      try {
        const { data: altCheck, error: altError } = await supabaseAdmin
          .from('information_schema.routines')
          .select('*')
          .eq('routine_name', 'handle_new_user')

        if (altError) {
          results.functions.handle_new_user = { exists: false, error: 'Cannot verify function existence' }
        } else {
          results.functions.handle_new_user = { exists: true, found: altCheck?.length > 0 }
        }
      } catch (e2) {
        results.functions.handle_new_user = { exists: false, error: 'Function check failed' }
      }
    }

    // Check trigger existence (simplified approach)
    try {
      const { data: triggerCheck, error: triggerError } = await supabaseAdmin
        .from('information_schema.triggers')
        .select('*')
        .eq('trigger_name', 'on_auth_user_created')

      if (triggerError) {
        results.triggers.on_auth_user_created = { exists: false, error: triggerError.message }
      } else {
        results.triggers.on_auth_user_created = { 
          exists: triggerCheck && triggerCheck.length > 0,
          count: triggerCheck?.length || 0,
          details: triggerCheck
        }
      }
    } catch (e) {
      results.triggers.on_auth_user_created = { exists: false, error: 'Trigger check failed' }
    }

    // Test basic auth user creation (simulation)
    try {
      // This is just to test if we can access auth.users table info
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
      
      results.permissions.authAccess = {
        canListUsers: !authError,
        userCount: authUsers?.users?.length || 0,
        error: authError?.message
      }
    } catch (e) {
      results.permissions.authAccess = { canListUsers: false, error: `${e}` }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    })

  } catch (error) {
    console.error('Database debug error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Database verification failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
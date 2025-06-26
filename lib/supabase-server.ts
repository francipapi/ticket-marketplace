import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Admin client for server operations (only available server-side)
export const supabaseAdmin = supabaseServiceKey ? createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
) : null

// Server-side Supabase client for API routes
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // Ignore cookie setting errors in Server Components
            console.warn('Failed to set cookie:', error)
          }
        },
      },
    }
  )
}

// Simple user type
export interface User {
  id: string
  email: string
  username: string
  created_at: string
}

// Get authenticated user on server
export async function getServerUser(): Promise<User | null> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }

    // Get user data from our users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, username, createdAt')
      .eq('supabaseId', user.id)
      .single()

    if (userError || !userData) {
      // If user doesn't exist in our table, create them
      const username = user.user_metadata?.username || user.email?.split('@')[0] || 'user'
      
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          supabaseId: user.id,
          email: user.email!,
          username: username,
          migrationStatus: 'auto'
        })
        .select('id, email, username, createdAt')
        .single()

      if (insertError) {
        console.error('Failed to create user:', insertError)
        return null
      }

      return {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        created_at: newUser.createdAt
      }
    }

    return {
      id: userData.id,
      email: userData.email,
      username: userData.username,
      created_at: userData.createdAt
    }

  } catch (error) {
    console.error('Auth error:', error)
    return null
  }
}
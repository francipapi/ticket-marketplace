import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Client-side Supabase client
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Server-side Supabase client
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Admin client for migrations and admin operations
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Unified user type that works with both Phase 0 and Phase 1
export interface UnifiedUser {
  id: string
  email: string
  username: string
  createdAt: Date
  updatedAt: Date
  // Phase 1 specific
  supabaseId?: string
  profile?: {
    username: string
    createdAt: Date
    updatedAt: Date
  }
  // Migration tracking
  migrationStatus?: string
  migratedFromId?: string
}

// Get user with Supabase Auth (Phase 1)
export async function getSupabaseUser(): Promise<UnifiedUser | null> {
  const supabase = await createServerSupabaseClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }

  // Try to get user data from our users table first by supabaseId
  let { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('supabaseId', user.id)
    .single()

  // If not found by supabaseId, try by email
  if (!userData) {
    const { data: userByEmail } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email)
      .single()
    userData = userByEmail
  }

  // If still not found, try by id directly
  if (!userData) {
    const { data: userById } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    userData = userById
  }

  // If we still don't have user data, create a basic user record
  if (!userData) {
    console.log('[Auth] User not found in users table, creating basic record for:', user.email)
    
    // Create a basic user record
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        supabaseId: user.id,
        email: user.email!,
        username: user.user_metadata?.username || user.email!.split('@')[0],
        migrationStatus: 'auto-created'
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Auth] Failed to create user record:', insertError)
      // Fallback to basic auth user data
      return {
        id: user.id,
        email: user.email!,
        username: user.user_metadata?.username || user.email!.split('@')[0],
        createdAt: new Date(user.created_at),
        updatedAt: new Date(),
        supabaseId: user.id,
        migrationStatus: 'auth-only'
      }
    }
    
    userData = newUser
  }

  // Get profile data from our database (optional)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return {
    id: userData.id,
    email: userData.email,
    username: userData.username,
    createdAt: new Date(userData.createdAt),
    updatedAt: new Date(userData.updatedAt),
    supabaseId: userData.supabaseId,
    profile: profile ? {
      username: profile.username,
      createdAt: new Date(profile.createdAt),
      updatedAt: new Date(profile.updatedAt)
    } : undefined,
    migrationStatus: userData.migrationStatus,
    migratedFromId: userData.migratedFromId
  }
}

// Authentication service that handles both Phase 0 and Phase 1
export class AuthService {
  private useSupabase: boolean

  constructor() {
    this.useSupabase = process.env.USE_SUPABASE_AUTH === 'true'
  }

  async signUp(email: string, password: string, username: string) {
    if (this.useSupabase) {
      return this.signUpSupabase(email, password, username)
    } else {
      // Fallback to Phase 0 JWT auth
      const { authService } = await import('./auth')
      return authService.register({ email, password, username })
    }
  }

  async signIn(email: string, password: string) {
    if (this.useSupabase) {
      return this.signInSupabase(email, password)
    } else {
      // Fallback to Phase 0 JWT auth
      const { authService } = await import('./auth')
      return authService.login({ email, password })
    }
  }

  async signOut() {
    if (this.useSupabase) {
      const supabase = await createServerSupabaseClient()
      return supabase.auth.signOut()
    } else {
      // Clear JWT cookie
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      cookieStore.delete('auth-token')
      return { error: null }
    }
  }

  async getUser(): Promise<UnifiedUser | null> {
    if (this.useSupabase) {
      return this.getSupabaseUser()
    } else {
      // Fallback to Phase 0 JWT auth
      const { authService } = await import('./auth')
      const user = await authService.getCurrentUser()
      if (!user) return null
      
      return {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    }
  }

  private async signUpSupabase(email: string, password: string, username: string) {
    const supabase = await createServerSupabaseClient()
    
    // Check if username is available
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single()

    if (existingProfile) {
      return { 
        data: null, 
        error: { message: 'Username already taken' } 
      }
    }

    // Create auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        }
      }
    })

    if (error || !data.user) {
      return { data: null, error }
    }

    // Create profile record
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        username
      })

    if (profileError) {
      // Clean up auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(data.user.id)
      return { 
        data: null, 
        error: { message: 'Failed to create user profile' } 
      }
    }

    // Create user record in our users table
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        supabaseId: data.user.id,
        email: data.user.email!,
        username,
        migrationStatus: 'native' // Not migrated, created directly in Phase 1
      })

    if (userError) {
      // Clean up if user record creation fails
      await supabaseAdmin.auth.admin.deleteUser(data.user.id)
      await supabase.from('profiles').delete().eq('id', data.user.id)
      return { 
        data: null, 
        error: { message: 'Failed to create user record' } 
      }
    }

    return { data, error: null }
  }

  private async signInSupabase(email: string, password: string) {
    const supabase = await createServerSupabaseClient()
    return supabase.auth.signInWithPassword({ email, password })
  }

  private async getSupabaseUser(): Promise<UnifiedUser | null> {
    return getSupabaseUser()
  }
}

export const unifiedAuthService = new AuthService()
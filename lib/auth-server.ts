import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Server-side Supabase clients
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

export async function createServerClient() {
  const cookieStore = await cookies()
  
  return createSupabaseServerClient(
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

// App User type that matches our database schema
export interface AppUser {
  id: string
  supabaseId: string
  email: string
  username: string
  createdAt: Date
  updatedAt: Date
  migrationStatus: string
}

// Server-side auth service
export class AuthService {
  /**
   * Get current user from server-side context (requires authentication)
   */
  static async getCurrentUser(): Promise<AppUser | null> {
    try {
      const supabase = await createServerClient()
      
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        return null
      }

      // Get user record from our database
      const { data: appUser, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('supabaseId', user.id)
        .maybeSingle()

      if (dbError || !appUser) {
        return null
      }

      return {
        id: appUser.id,
        supabaseId: appUser.supabaseId,
        email: appUser.email,
        username: appUser.username,
        createdAt: new Date(appUser.createdAt),
        updatedAt: new Date(appUser.updatedAt),
        migrationStatus: appUser.migrationStatus
      }
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  /**
   * Require authentication - throws error if not authenticated
   */
  static async requireAuth(): Promise<AppUser> {
    const user = await this.getCurrentUser()
    
    if (!user) {
      throw new Error('Authentication required')
    }
    
    return user
  }
}
import { createClient } from '@/lib/supabase/server'
import { User } from '@supabase/supabase-js'

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

// Server-side auth functions
export class AuthService {
  /**
   * Get the current authenticated user (server-side)
   */
  static async getCurrentUser(): Promise<AppUser | null> {
    try {
      const supabase = await createClient()
      
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        return null
      }

      // Get user from our database
      const { data: appUser, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('supabaseId', user.id)
        .single()

      if (dbError || !appUser) {
        console.error('User exists in Supabase but not in database:', user.email, dbError?.message)
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
      console.error('Auth service error:', error)
      return null
    }
  }

  /**
   * Require authentication (throws error if not authenticated)
   */
  static async requireAuth(): Promise<AppUser> {
    const user = await this.getCurrentUser()
    
    if (!user) {
      throw new Error('Authentication required')
    }
    
    return user
  }

  /**
   * Create user record in our database after Supabase signup
   */
  static async createUserRecord(supabaseUser: User, username: string): Promise<AppUser | null> {
    try {
      const supabase = await createClient()

      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          supabaseId: supabaseUser.id,
          email: supabaseUser.email!,
          username: username,
          migrationStatus: 'direct_signup'
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create user record:', error)
        return null
      }

      // Also create profile record
      await supabase
        .from('profiles')
        .insert({
          id: supabaseUser.id,
          username: username
        })

      return {
        id: newUser.id,
        supabaseId: newUser.supabaseId,
        email: newUser.email,
        username: newUser.username,
        createdAt: new Date(newUser.createdAt),
        updatedAt: new Date(newUser.updatedAt),
        migrationStatus: newUser.migrationStatus
      }
    } catch (error) {
      console.error('Error creating user record:', error)
      return null
    }
  }

  /**
   * Check if username is available
   */
  static async isUsernameAvailable(username: string): Promise<boolean> {
    try {
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single()

      // If no error and no data, username is available
      return !data && error?.code === 'PGRST116' // PGRST116 = no rows returned
    } catch (error) {
      console.error('Error checking username availability:', error)
      return false
    }
  }
}

// Convenience exports
export const { getCurrentUser, requireAuth, isUsernameAvailable } = AuthService
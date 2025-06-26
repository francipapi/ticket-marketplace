import { supabase } from '@/lib/supabase'
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

// Auth result types
export interface AuthResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface SignUpData {
  email: string
  password: string
  username: string
}

export interface SignInData {
  email: string
  password: string
}

// Client-side auth functions
export class ClientAuthService {
  /**
   * Sign up a new user
   */
  static async signUp({ email, password, username }: SignUpData): Promise<AuthResult<AppUser>> {
    try {
      // First check if username is available
      const usernameAvailable = await this.checkUsernameAvailability(username)
      if (!usernameAvailable.success) {
        return { success: false, error: usernameAvailable.error }
      }

      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username
          }
        }
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (!data.user) {
        return { success: false, error: 'Failed to create user' }
      }

      // Create user record in our database
      const appUser = await this.createUserRecordClient(data.user, username)
      if (!appUser) {
        return { success: false, error: 'Failed to create user profile' }
      }

      return { success: true, data: appUser }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Signup failed' }
    }
  }

  /**
   * Sign in existing user
   */
  static async signIn({ email, password }: SignInData): Promise<AuthResult<AppUser>> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (!data.user) {
        return { success: false, error: 'Login failed' }
      }

      // Get user record from our database
      const { data: appUser, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('supabaseId', data.user.id)
        .single()

      if (dbError || !appUser) {
        return { success: false, error: 'User profile not found' }
      }

      return {
        success: true,
        data: {
          id: appUser.id,
          supabaseId: appUser.supabaseId,
          email: appUser.email,
          username: appUser.username,
          createdAt: new Date(appUser.createdAt),
          updatedAt: new Date(appUser.updatedAt),
          migrationStatus: appUser.migrationStatus
        }
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Login failed' }
    }
  }

  /**
   * Sign out current user
   */
  static async signOut(): Promise<AuthResult<void>> {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Logout failed' }
    }
  }

  /**
   * Get current session
   */
  static async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        // Handle refresh token errors specifically
        if (error.message.includes('Invalid Refresh Token') || error.message.includes('Refresh Token Not Found')) {
          console.warn('Refresh token invalid, clearing session')
          await supabase.auth.signOut()
          return null
        }
        console.error('Session error:', error)
        return null
      }
      
      return session
    } catch (error) {
      console.error('Session check failed:', error)
      return null
    }
  }

  /**
   * Check if username is available (client-side)
   */
  static async checkUsernameAvailability(username: string): Promise<AuthResult<boolean>> {
    try {
      if (!username || username.length < 3) {
        return { success: false, error: 'Username must be at least 3 characters long' }
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return { success: false, error: 'Username can only contain letters, numbers, and underscores' }
      }

      const { data, error } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single()

      if (error && error.code === 'PGRST116') {
        // No rows returned - username is available
        return { success: true, data: true }
      }

      if (data) {
        return { success: false, error: 'Username already taken' }
      }

      return { success: false, error: 'Unable to verify username availability' }
    } catch {
      return { success: false, error: 'Username validation failed' }
    }
  }

  /**
   * Create user record in database (client-side)
   */
  private static async createUserRecordClient(supabaseUser: User, username: string): Promise<AppUser | null> {
    try {
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
}

// Convenience exports
export const { signUp, signIn, signOut, getCurrentSession, checkUsernameAvailability } = ClientAuthService
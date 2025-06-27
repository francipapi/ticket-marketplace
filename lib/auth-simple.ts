import { supabase } from '@/lib/supabase'

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

// Simplified auth service that relies on database triggers
export class SimpleAuthService {
  /**
   * Sign up a new user using direct Supabase auth + database triggers
   */
  static async signUp({ email, password, username }: SignUpData): Promise<AuthResult<AppUser>> {
    try {
      console.log('Starting simple signup process for:', { email, username })
      
      // Basic validation
      if (!username || username.length < 3) {
        return { success: false, error: 'Username must be at least 3 characters long' }
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return { success: false, error: 'Username can only contain letters, numbers, and underscores' }
      }

      // Check if username is already taken
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .maybeSingle()

      if (existingUser) {
        return { success: false, error: 'Username is already taken' }
      }

      // Sign up with Supabase Auth - the database trigger will handle user record creation
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
        console.error('Supabase signup error:', error)
        return { success: false, error: error.message }
      }

      if (!data.user) {
        return { success: false, error: 'Failed to create user account' }
      }

      console.log('Supabase user created:', data.user.id)

      // Wait a moment for the database trigger to create the user record
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Fetch the created user record
      const { data: appUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('supabaseId', data.user.id)
        .single()

      if (fetchError || !appUser) {
        console.error('Failed to fetch created user record:', fetchError)
        return { 
          success: false, 
          error: 'Account created but user profile not found. Please try logging in.' 
        }
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
      console.error('Signup error:', error)
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
   * Check if username is available
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
        .maybeSingle()

      if (error) {
        console.error('Username check error:', error)
        return { success: false, error: 'Username validation failed' }
      }

      return { success: true, data: !data } // Available if no data returned
    } catch (error) {
      console.error('Username validation error:', error)
      return { success: false, error: 'Username validation failed' }
    }
  }
}

// Export individual functions for convenience
export const { signUp, signIn, signOut, checkUsernameAvailability } = SimpleAuthService
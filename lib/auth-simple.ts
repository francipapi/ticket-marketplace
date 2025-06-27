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
   * Sign up a new user using server-side registration API
   */
  static async signUp({ email, password, username }: SignUpData): Promise<AuthResult<AppUser>> {
    try {
      console.log('Starting server-side signup process for:', { email, username })
      
      // Call our server-side registration endpoint
      let response
      try {
        response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ email, password, username }),
        })
      } catch (fetchError) {
        console.error('Network error during registration:', fetchError)
        return { success: false, error: 'Network error - please check your connection' }
      }

      console.log('Registration response status:', response.status, response.statusText)

      let result
      try {
        const responseText = await response.text()
        console.log('Raw response text:', responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''))
        
        if (!responseText) {
          console.error('Empty response from server')
          return { success: false, error: 'Empty response from server' }
        }
        
        result = JSON.parse(responseText)
        console.log('Parsed response:', result)
      } catch (parseError) {
        console.error('Failed to parse registration response:', parseError)
        return { success: false, error: 'Server response error' }
      }

      if (!response.ok) {
        console.error('Server-side registration failed:', { status: response.status, result })
        return { success: false, error: result?.error || result?.message || 'Registration failed' }
      }

      if (!result.success) {
        return { success: false, error: result.error }
      }

      console.log('Server-side registration successful:', result.user.id)

      // Now sign in the user to create a session
      const signInResult = await this.signIn({ email, password })
      
      if (signInResult.success) {
        return { success: true, data: signInResult.data }
      } else {
        // Registration succeeded but sign-in failed - user exists but can't log in
        console.warn('Registration succeeded but auto sign-in failed:', signInResult.error)
        return { 
          success: true, 
          data: result.user,
          error: 'Account created successfully. Please try logging in.'
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
      console.log('Attempting sign in for:', email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('Sign in error:', error)
        return { success: false, error: error.message }
      }

      if (!data.user) {
        return { success: false, error: 'Login failed' }
      }

      // Get user record from our database
      console.log('Fetching user profile for supabaseId:', data.user.id)
      
      const { data: appUser, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('supabaseId', data.user.id)
        .single()

      if (dbError || !appUser) {
        console.error('User profile fetch error:', dbError)
        return { success: false, error: 'User profile not found' }
      }

      console.log('User profile found:', appUser.username)

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
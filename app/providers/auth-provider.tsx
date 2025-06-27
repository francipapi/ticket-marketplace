'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { SimpleAuthService, AppUser, SignUpData, SignInData } from '@/lib/auth-simple'

interface AuthContextType {
  // State
  user: AppUser | null
  loading: boolean
  
  // Actions
  signIn: (data: SignInData) => Promise<{ success: boolean; error?: string }>
  signUp: (data: SignUpData) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  
  // Helpers
  isAuthenticated: boolean
  checkUsernameAvailability: (username: string) => Promise<{ success: boolean; available?: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch user data from our database
  const fetchUserData = useCallback(async (supabaseUser: User): Promise<AppUser | null> => {
    try {
      console.log('Fetching user data for:', supabaseUser.id, supabaseUser.email)
      
      const { data: appUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('supabaseId', supabaseUser.id)
        .maybeSingle()

      if (error) {
        console.error('Database error fetching user:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        return null
      }

      if (!appUser) {
        console.warn('User not found in database:', supabaseUser.email)
        return null
      }

      console.log('User data fetched successfully:', appUser.username)

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
      console.error('Error fetching user data:', error)
      return null
    }
  }, [])

  // Initialize auth state
  useEffect(() => {
    let isMounted = true

    // Add global error handler for unhandled Supabase errors
    const handleUnhandledError = (event: ErrorEvent) => {
      const error = event.error
      if (error?.message?.includes('AuthRetryableFetchError') ||
          error?.message?.includes('Load failed') ||
          error?.message?.includes('Fetch is aborted')) {
        console.warn('Caught unhandled Supabase error (suppressing):', error.message)
        event.preventDefault() // Prevent error from propagating
      }
    }

    window.addEventListener('error', handleUnhandledError)

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth state...')
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          // Handle various auth errors gracefully
          if (error.message?.includes('refresh_token_not_found') || 
              error.message?.includes('Invalid Refresh Token') ||
              error.message?.includes('Load failed') ||
              error.message?.includes('AuthRetryableFetchError') ||
              error.message?.includes('Fetch is aborted')) {
            console.log('Auth connectivity error - clearing session and continuing')
            try {
              await supabase.auth.signOut({ scope: 'local' })
            } catch (signOutError) {
              console.log('Error during signout, continuing anyway')
            }
          } else {
            console.error('Auth session error:', error)
          }
          if (isMounted) {
            setUser(null)
            setLoading(false)
          }
          return
        }

        console.log('Session check result:', { hasSession: !!session, hasUser: !!session?.user })

        if (session?.user) {
          console.log('Session found, fetching user data...')
          const userData = await fetchUserData(session.user)
          if (isMounted) {
            setUser(userData)
            console.log('User data set:', userData ? userData.username : 'null')
          }
        } else {
          console.log('No session found')
          if (isMounted) {
            setUser(null)
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (isMounted) {
          setUser(null)
        }
      } finally {
        if (isMounted) {
          console.log('Auth initialization complete, setting loading to false')
          setLoading(false)
        }
      }
    }

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn('Auth initialization timeout, forcing loading to false')
        setLoading(false)
        setUser(null)
      }
    }, 5000) // 5 second timeout

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return

        console.log('Auth state change event:', event, { hasSession: !!session, hasUser: !!session?.user })

        try {
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('User signed in, fetching user data...')
            setLoading(true)
            const userData = await fetchUserData(session.user)
            if (isMounted) {
              setUser(userData)
              setLoading(false)
              console.log('Auth state updated after sign in')
            }
          } else if (event === 'SIGNED_OUT') {
            console.log('User signed out')
            if (isMounted) {
              setUser(null)
              setLoading(false)
            }
          } else if (event === 'TOKEN_REFRESHED') {
            // Keep existing user data on token refresh
            console.log('Token refreshed')
          } else if (event === 'USER_UPDATED') {
            console.log('User updated event')
          } else {
            console.log('Other auth event:', event)
          }
        } catch (error) {
          console.error('Error in auth state change:', error)
          // Handle various auth errors in auth state changes
          if (error instanceof Error && 
              (error.message?.includes('refresh_token_not_found') || 
               error.message?.includes('Invalid Refresh Token') ||
               error.message?.includes('Load failed') ||
               error.message?.includes('AuthRetryableFetchError') ||
               error.message?.includes('Fetch is aborted'))) {
            console.log('Auth connectivity error in state change - clearing session')
            try {
              await supabase.auth.signOut({ scope: 'local' })
            } catch (signOutError) {
              console.log('Error during signout in state change, continuing anyway')
            }
          }
          if (isMounted) {
            setUser(null)
            setLoading(false)
          }
        }
      }
    )

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
      window.removeEventListener('error', handleUnhandledError)
    }
  }, [fetchUserData])

  // Sign in function
  const signIn = useCallback(async (data: SignInData) => {
    try {
      setLoading(true)
      const result = await SimpleAuthService.signIn(data)
      
      if (result.success) {
        // User state will be updated by the auth state change listener
        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Sign up function
  const signUp = useCallback(async (data: SignUpData) => {
    try {
      setLoading(true)
      const result = await SimpleAuthService.signUp(data)
      
      if (result.success) {
        // User state will be updated by the auth state change listener
        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Registration failed' 
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Sign out function
  const signOut = useCallback(async () => {
    try {
      setLoading(true)
      await SimpleAuthService.signOut()
      // User state will be updated by the auth state change listener
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Check username availability
  const checkUsernameAvailability = useCallback(async (username: string) => {
    try {
      const result = await SimpleAuthService.checkUsernameAvailability(username)
      
      if (result.success) {
        return { success: true, available: result.data }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Username check failed' 
      }
    }
  }, [])

  const value: AuthContextType = {
    // State
    user,
    loading,
    
    // Actions
    signIn,
    signUp,
    signOut,
    
    // Helpers
    isAuthenticated: !!user,
    checkUsernameAvailability
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Export for convenience
export default AuthProvider
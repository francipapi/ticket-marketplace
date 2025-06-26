'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { ClientAuthService, AppUser, SignUpData, SignInData } from '@/lib/auth-client'

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
      const { data: appUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('supabaseId', supabaseUser.id)
        .single()

      if (error || !appUser) {
        console.error('User not found in database:', supabaseUser.email, error?.message)
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
      console.error('Error fetching user data:', error)
      return null
    }
  }, [])

  // Initialize auth state
  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth session error:', error)
          if (isMounted) {
            setUser(null)
            setLoading(false)
          }
          return
        }

        if (session?.user) {
          const userData = await fetchUserData(session.user)
          if (isMounted) {
            setUser(userData)
          }
        } else {
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
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return

        console.log('Auth state change:', event)

        try {
          if (event === 'SIGNED_IN' && session?.user) {
            setLoading(true)
            const userData = await fetchUserData(session.user)
            if (isMounted) {
              setUser(userData)
              setLoading(false)
            }
          } else if (event === 'SIGNED_OUT') {
            if (isMounted) {
              setUser(null)
              setLoading(false)
            }
          } else if (event === 'TOKEN_REFRESHED') {
            // Keep existing user data on token refresh
            console.log('Token refreshed')
          }
        } catch (error) {
          console.error('Error in auth state change:', error)
          if (isMounted) {
            setUser(null)
            setLoading(false)
          }
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [fetchUserData])

  // Sign in function
  const signIn = useCallback(async (data: SignInData) => {
    try {
      setLoading(true)
      const result = await ClientAuthService.signIn(data)
      
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
      const result = await ClientAuthService.signUp(data)
      
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
      await ClientAuthService.signOut()
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
      const result = await ClientAuthService.checkUsernameAvailability(username)
      
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
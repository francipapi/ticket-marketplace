'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

interface AuthUser {
  id: string
  email: string
  username: string
  createdAt: Date
  isPhase1User: boolean
  migrationStatus?: string
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: any }>
  signUp: (email: string, password: string, username: string) => Promise<{ error?: any }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Get user data from our API - with retry logic
  const fetchUserData = async (supabaseUser: SupabaseUser): Promise<AuthUser | null> => {
    try {
      // First try to get user data from API
      const response = await fetch('/api/auth/supabase/me', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.user
      }

      // If API fails, create user data from Supabase user directly
      console.warn('Server-side auth failed, using client-side data')
      
      // Get additional data from Supabase directly
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('supabaseId', supabaseUser.id)
        .single()

      if (userData) {
        return {
          id: userData.id,
          email: userData.email,
          username: userData.username,
          createdAt: new Date(userData.createdAt),
          isPhase1User: true,
          migrationStatus: userData.migrationStatus
        }
      }

      // Fallback: create minimal user data from auth user
      return {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        username: supabaseUser.user_metadata?.username || supabaseUser.email!.split('@')[0],
        createdAt: new Date(supabaseUser.created_at),
        isPhase1User: true
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error)
      
      // Fallback: create minimal user data from auth user
      return {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        username: supabaseUser.user_metadata?.username || supabaseUser.email!.split('@')[0],
        createdAt: new Date(supabaseUser.created_at),
        isPhase1User: true
      }
    }
  }

  // Initialize auth state
  useEffect(() => {
    let isMounted = true
    let timeoutId: NodeJS.Timeout | null = null

    // Get initial session
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...')
        
        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (isMounted && loading) {
            console.warn('Auth initialization timeout - setting loading to false')
            setLoading(false)
            setUser(null)
          }
        }, 5000) // 5 second timeout
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        // Clear timeout if we got a response
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
        
        if (error) {
          console.error('Auth session error:', error)
          if (isMounted) {
            setUser(null)
            setLoading(false)
          }
        } else if (session?.user) {
          console.log('Found session for:', session.user.email)
          const userData = await fetchUserData(session.user)
          if (isMounted) {
            setUser(userData)
            setLoading(false)
          }
        } else {
          console.log('No session found')
          if (isMounted) {
            setUser(null)
            setLoading(false)
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (isMounted) {
          setUser(null)
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return

        console.log('Auth state change:', event, session?.user?.email)

        // Only set loading for certain events
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
          setLoading(true)
        }

        try {
          if (event === 'SIGNED_IN' && session?.user) {
            const userData = await fetchUserData(session.user)
            if (isMounted) {
              setUser(userData)
            }
          } else if (event === 'SIGNED_OUT') {
            if (isMounted) {
              setUser(null)
            }
          } else if (event === 'TOKEN_REFRESHED' && session?.user && user) {
            // Don't refetch user data on token refresh if we already have it
            console.log('Token refreshed, keeping existing user data')
          }
        } catch (error) {
          console.error('Error in auth state change:', error)
        } finally {
          if (isMounted) {
            setLoading(false)
          }
        }
      }
    )

    return () => {
      isMounted = false
      if (timeoutId) clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        return { error }
      }

      // User data will be updated by the auth state change listener
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signUp = async (email: string, password: string, username: string) => {
    try {
      // First check if username is available
      const response = await fetch('/api/auth/supabase/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, username }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: { message: data.error } }
      }

      // User will be signed in automatically if email confirmation is disabled
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.user) {
      const userData = await fetchUserData(session.user)
      setUser(userData)
    } else {
      setUser(null)
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUser
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
    throw new Error('useAuth must be used within a SupabaseAuthProvider')
  }
  return context
}

// Export useAuth for easy importing
export { useAuth }

// Fallback provider that checks if Supabase is enabled
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const useSupabaseAuth = process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === 'true'

  if (useSupabaseAuth) {
    return <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
  }

  // Return children without provider for Phase 0 compatibility
  return <>{children}</>
}
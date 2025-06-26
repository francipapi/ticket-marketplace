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

export function SimpleSupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  // Convert Supabase user to our AuthUser format
  const convertToAuthUser = async (supabaseUser: SupabaseUser): Promise<AuthUser> => {
    // Try to get user data from database
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
        isPhase1User: true
      }
    }

    // Fallback to basic user data
    return {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      username: supabaseUser.user_metadata?.username || supabaseUser.email!.split('@')[0],
      createdAt: new Date(supabaseUser.created_at),
      isPhase1User: true
    }
  }

  // Initialize auth on mount
  useEffect(() => {
    if (initialized) return

    const initAuth = async () => {
      console.log('[Auth] Initializing...')
      
      try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('[Auth] Session error:', error)
          setUser(null)
        } else if (session?.user) {
          console.log('[Auth] Found session:', session.user.email)
          const authUser = await convertToAuthUser(session.user)
          setUser(authUser)
        } else {
          console.log('[Auth] No session found')
          setUser(null)
        }
      } catch (error) {
        console.error('[Auth] Init error:', error)
        setUser(null)
      } finally {
        setLoading(false)
        setInitialized(true)
        console.log('[Auth] Initialization complete')
      }
    }

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('[Auth] Initialization timeout - forcing completion')
        setLoading(false)
        setInitialized(true)
      }
    }, 3000)

    initAuth()

    // Cleanup
    return () => {
      clearTimeout(timeoutId)
    }
  }, [initialized, loading])

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] State change:', event, session?.user?.email)
        
        if (event === 'SIGNED_IN' && session?.user) {
          const authUser = await convertToAuthUser(session.user)
          setUser(authUser)
          setLoading(false)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setLoading(false)
        }
        // Ignore other events to prevent unnecessary updates
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        setLoading(false)
        return { error }
      }

      if (data.user) {
        const authUser = await convertToAuthUser(data.user)
        setUser(authUser)
      }
      
      setLoading(false)
      return { error: null }
    } catch (error) {
      setLoading(false)
      return { error }
    }
  }

  const signUp = async (email: string, password: string, username: string) => {
    try {
      setLoading(true)
      
      // First check if username is taken
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single()

      if (existingUser) {
        setLoading(false)
        return { error: { message: 'Username already taken' } }
      }

      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username }
        }
      })

      if (error || !data.user) {
        setLoading(false)
        return { error }
      }

      // Create user record
      await supabase.from('users').insert({
        id: data.user.id,
        supabaseId: data.user.id,
        email: data.user.email!,
        username,
        migrationStatus: 'new'
      })

      const authUser = await convertToAuthUser(data.user)
      setUser(authUser)
      setLoading(false)
      
      return { error: null }
    } catch (error) {
      setLoading(false)
      return { error }
    }
  }

  const signOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    setUser(null)
    setLoading(false)
  }

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.user) {
      const authUser = await convertToAuthUser(session.user)
      setUser(authUser)
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

  // Show loading state with timeout info
  if (loading && !initialized) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing authentication...</p>
          <p className="text-sm text-gray-500 mt-2">This should only take a moment</p>
        </div>
      </div>
    )
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
    throw new Error('useAuth must be used within a SimpleSupabaseAuthProvider')
  }
  return context
}
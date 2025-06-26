'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
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

export function FixedSupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const initRef = useRef(false)

  // Simple function to create auth user
  const createAuthUser = (supabaseUser: SupabaseUser): AuthUser => {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      username: supabaseUser.user_metadata?.username || supabaseUser.email!.split('@')[0],
      createdAt: new Date(supabaseUser.created_at),
      isPhase1User: true
    }
  }

  // Initialize auth - only run once
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    console.log('[FixedAuth] Starting initialization...')

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('[FixedAuth] Session error:', error)
        setUser(null)
        setLoading(false)
        return
      }

      if (session?.user) {
        console.log('[FixedAuth] Found existing session:', session.user.email)
        setUser(createAuthUser(session.user))
      } else {
        console.log('[FixedAuth] No existing session')
        setUser(null)
      }
      
      setLoading(false)
      console.log('[FixedAuth] Initialization complete')
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[FixedAuth] Auth state changed:', event, session?.user?.email)
      
      if (session?.user) {
        setUser(createAuthUser(session.user))
      } else {
        setUser(null)
      }
      
      // Always ensure loading is false after any auth change
      setLoading(false)
    })

    // Cleanup
    return () => {
      subscription.unsubscribe()
    }
  }, []) // Empty deps - only run once

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) return { error }

      // User state will be updated by auth state listener
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username }
        }
      })

      if (error) return { error }

      // Create user record in database
      if (data.user) {
        await supabase.from('users').insert({
          id: data.user.id,
          supabaseId: data.user.id,
          email: data.user.email!,
          username,
          migrationStatus: 'new'
        }).single()
      }

      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      setUser(createAuthUser(session.user))
    } else {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signUp,
      signOut,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within FixedSupabaseAuthProvider')
  }
  return context
}
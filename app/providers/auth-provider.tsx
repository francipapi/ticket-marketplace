'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface User {
  id: string
  email: string
  username: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: any }>
  signUp: (email: string, password: string, username: string) => Promise<{ error?: any }>
  signOut: () => Promise<void>
  // Legacy interface compatibility
  login: (email: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.warn('Session error, clearing auth:', error.message)
          // Clear any invalid tokens
          await supabase.auth.signOut()
          setUser(null)
          setLoading(false)
          return
        }
        
        if (session?.user) {
          await updateUserState(session.user)
        } else {
          setUser(null)
        }
        
        setLoading(false)
      } catch (error) {
        console.error('Error getting session:', error)
        // Clear any corrupted auth state
        await supabase.auth.signOut()
        setUser(null)
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      
      if (event === 'TOKEN_REFRESHED' && !session) {
        // Token refresh failed, clear auth
        console.warn('Token refresh failed, clearing auth')
        setUser(null)
        setLoading(false)
        return
      }
      
      if (session?.user) {
        await updateUserState(session.user)
      } else {
        setUser(null)
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const updateUserState = async (supabaseUser: SupabaseUser) => {
    try {
      // Get or create user in our database
      let { data: userData, error } = await supabase
        .from('users')
        .select('id, email, username')
        .eq('supabaseId', supabaseUser.id)
        .single()

      if (error || !userData) {
        // Create user if doesn't exist
        const username = supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0] || 'user'
        
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            id: supabaseUser.id,
            supabaseId: supabaseUser.id,
            email: supabaseUser.email!,
            username: username,
            migrationStatus: 'auto'
          })
          .select('id, email, username')
          .single()

        if (!insertError && newUser) {
          userData = newUser
        } else {
          // Fallback to basic user data
          userData = {
            id: supabaseUser.id,
            email: supabaseUser.email!,
            username: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0] || 'user'
          }
        }
      }

      setUser({
        id: userData.id,
        email: userData.email,
        username: userData.username
      })

    } catch (error) {
      console.error('Error updating user state:', error)
      // Fallback to basic auth data
      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email!,
        username: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0] || 'user'
      })
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    return { error }
  }

  const signUp = async (email: string, password: string, username: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username
        }
      }
    })

    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  // Legacy interface wrappers
  const login = async (email: string, password: string) => {
    const { error } = await signIn(email, password)
    if (error) {
      throw new Error(error.message || 'Login failed')
    }
  }

  const register = async (email: string, username: string, password: string) => {
    const { error } = await signUp(email, password, username)
    if (error) {
      throw new Error(error.message || 'Registration failed')
    }
  }

  const logout = async () => {
    await signOut()
  }

  return (
    <AuthContext.Provider 
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        // Legacy interface
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
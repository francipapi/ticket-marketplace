import { createClient } from '@supabase/supabase-js'

// Environment variables check
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client-side Supabase client with better error handling
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Reduce retry attempts to avoid constant fetch errors
    retryAttempts: 2,
  },
  global: {
    // Add custom fetch to handle errors gracefully but without timeout
    fetch: (url, options = {}) => {
      return fetch(url, options).catch(error => {
        // Don't log every retry, just pass through
        if (!error.message?.includes('AuthRetryableFetchError')) {
          console.warn('Supabase fetch error:', error.message)
        }
        throw error
      })
    }
  }
})

// Simple user type
export interface User {
  id: string
  email: string
  username: string
  created_at: string
}
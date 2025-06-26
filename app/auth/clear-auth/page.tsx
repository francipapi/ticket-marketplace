'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function ClearAuthPage() {
  useEffect(() => {
    const clearAuth = async () => {
      // Clear Supabase auth
      await supabase.auth.signOut()
      
      // Clear local storage
      localStorage.clear()
      
      // Clear session storage
      sessionStorage.clear()
      
      // Clear all cookies
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      
      console.log('All auth state cleared')
      
      // Redirect to login
      setTimeout(() => {
        window.location.href = '/auth/login'
      }, 1000)
    }
    
    clearAuth()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Clearing authentication state...</p>
        <p className="mt-2 text-sm text-gray-500">You will be redirected to login</p>
      </div>
    </div>
  )
}
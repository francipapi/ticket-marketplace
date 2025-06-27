'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestAuthPage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testSupabaseConnection = async () => {
    setLoading(true)
    setResult('Testing Supabase connection...\n')
    
    try {
      console.log('Starting Supabase tests...')
      // Test 1: Check Supabase URL
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      setResult(prev => prev + `\n1. Supabase URL: ${supabaseUrl ? '✓ Set' : '✗ Missing'}\n`)
      
      // Test 2: Check if we can query users table
      const { error: usersError } = await supabase
        .from('users')
        .select('id')
        .limit(1)
      
      if (usersError) {
        setResult(prev => prev + `\n2. Users table access: ✗ Error - ${usersError.message}\n`)
      } else {
        setResult(prev => prev + `\n2. Users table access: ✓ Success\n`)
      }
      
      // Test 3: Check auth session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        setResult(prev => prev + `\n3. Auth session: ✗ Error - ${sessionError.message}\n`)
      } else {
        setResult(prev => prev + `\n3. Auth session: ${session ? '✓ Active' : '○ No session'}\n`)
      }
      
      // Test 4: Test signup with a dummy user
      const testEmail = `test${Date.now()}@example.com`
      const testUsername = `testuser${Date.now()}`
      
      setResult(prev => prev + `\n4. Testing signup with:\n   Email: ${testEmail}\n   Username: ${testUsername}\n`)
      
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPassword123!',
        options: {
          data: { username: testUsername }
        }
      })
      
      if (signupError) {
        setResult(prev => prev + `\n   Signup result: ✗ Error - ${signupError.message}\n`)
        setResult(prev => prev + `   Error details: ${JSON.stringify(signupError, null, 2)}\n`)
      } else {
        setResult(prev => prev + `\n   Signup result: ✓ Success\n`)
        setResult(prev => prev + `   User ID: ${signupData.user?.id}\n`)
        
        // Clean up - sign out the test user
        await supabase.auth.signOut()
      }
      
    } catch (error) {
      console.error('Test error:', error)
      setResult(prev => prev + `\n\nUnexpected error: ${error}\n`)
      if (error instanceof Error) {
        setResult(prev => prev + `\nError stack: ${error.stack}\n`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Auth System Test</h1>
      
      <button
        onClick={testSupabaseConnection}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 mb-6"
      >
        {loading ? 'Testing...' : 'Run Tests'}
      </button>
      
      <pre className="bg-gray-100 p-4 rounded overflow-auto">
        {result || 'Click "Run Tests" to start...'}
      </pre>
      
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm text-yellow-800">
          This page tests the Supabase connection and auth functionality. 
          Check the browser console for additional debug logs.
        </p>
      </div>
    </div>
  )
}
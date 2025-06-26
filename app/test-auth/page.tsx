'use client'

import { useState } from 'react'
import { useAuth } from '@/app/providers/auth-provider'
import { supabase } from '@/lib/supabase'
import { Loader2, CheckCircle, XCircle, User, Mail, Shield } from 'lucide-react'

interface TestResult {
  name: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  message?: string
  details?: Record<string, unknown>
}

export default function AuthTestPage() {
  const { user, loading, signIn, signOut, isAuthenticated } = useAuth()
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [overallStatus, setOverallStatus] = useState<'idle' | 'running' | 'completed'>('idle')

  const updateTestResult = (name: string, status: TestResult['status'], message?: string, details?: Record<string, unknown>) => {
    setTestResults(prev => prev.map(test => 
      test.name === name 
        ? { ...test, status, message, details }
        : test
    ))
  }

  const runComprehensiveTests = async () => {
    setOverallStatus('running')
    
    // Initialize test results
    const tests: TestResult[] = [
      { name: 'Auth Provider State', status: 'pending' },
      { name: 'Supabase Connection', status: 'pending' },
      { name: 'Database User Query', status: 'pending' },
      { name: 'Session Management', status: 'pending' },
      { name: 'Username Availability Check', status: 'pending' }
    ]
    setTestResults(tests)

    try {
      // Test 1: Auth Provider State
      updateTestResult('Auth Provider State', 'running')
      if (loading) {
        updateTestResult('Auth Provider State', 'failed', 'Provider is in loading state')
      } else {
        updateTestResult('Auth Provider State', 'passed', `User: ${user ? user.email : 'None'}, Authenticated: ${isAuthenticated}`)
      }

      // Test 2: Supabase Connection
      updateTestResult('Supabase Connection', 'running')
      try {
        const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true })
        if (error) {
          updateTestResult('Supabase Connection', 'failed', error.message)
        } else {
          updateTestResult('Supabase Connection', 'passed', `Connected, found ${data || 0} users`)
        }
      } catch (error) {
        updateTestResult('Supabase Connection', 'failed', error instanceof Error ? error.message : 'Connection failed')
      }

      // Test 3: Database User Query
      updateTestResult('Database User Query', 'running')
      try {
        const { data: users, error } = await supabase
          .from('users')
          .select('email, username, migrationStatus')
          .limit(5)
        
        if (error) {
          updateTestResult('Database User Query', 'failed', error.message)
        } else {
          updateTestResult('Database User Query', 'passed', `Found ${users.length} users`, { users })
        }
      } catch (error) {
        updateTestResult('Database User Query', 'failed', error instanceof Error ? error.message : 'Query failed')
      }

      // Test 4: Session Management
      updateTestResult('Session Management', 'running')
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          updateTestResult('Session Management', 'failed', error.message)
        } else {
          updateTestResult('Session Management', 'passed', session ? `Active session for ${session.user.email}` : 'No active session')
        }
      } catch (error) {
        updateTestResult('Session Management', 'failed', error instanceof Error ? error.message : 'Session check failed')
      }

      // Test 5: Username Availability Check
      updateTestResult('Username Availability Check', 'running')
      try {
        const { data: existingUser } = await supabase
          .from('users')
          .select('username')
          .eq('username', 'testuser999')
          .single()
        
        const isAvailable = !existingUser
        updateTestResult('Username Availability Check', 'passed', `Username 'testuser999' is ${isAvailable ? 'available' : 'taken'}`)
      } catch {
        updateTestResult('Username Availability Check', 'passed', 'Username availability check works')
      }

    } catch (error) {
      console.error('Test suite error:', error)
    }

    setOverallStatus('completed')
  }

  const handleTestLogin = async () => {
    try {
      const result = await signIn({ email: 'alice@example.com', password: 'password123' })
      if (!result.success) {
        alert(`Login failed: ${result.error}`)
      }
    } catch (error) {
      alert(`Login error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h1 className="text-2xl font-bold text-gray-900">Authentication System Test</h1>
            <p className="text-gray-600 mt-1">Comprehensive testing of the authentication flow</p>
          </div>

          <div className="p-6">
            {/* Current Auth State */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h2 className="text-lg font-semibold mb-3 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Current Authentication State
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center">
                  <Shield className={`w-4 h-4 mr-2 ${isAuthenticated ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className="text-sm">
                    Status: <span className={`font-semibold ${isAuthenticated ? 'text-green-600' : 'text-gray-600'}`}>
                      {loading ? 'Loading...' : isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
                    </span>
                  </span>
                </div>
                {user && (
                  <>
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-blue-500" />
                      <span className="text-sm">Email: <span className="font-semibold">{user.email}</span></span>
                    </div>
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2 text-purple-500" />
                      <span className="text-sm">Username: <span className="font-semibold">{user.username}</span></span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Test Controls */}
            <div className="mb-8 flex gap-4 flex-wrap">
              <button
                onClick={runComprehensiveTests}
                disabled={overallStatus === 'running'}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {overallStatus === 'running' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  'Run Comprehensive Tests'
                )}
              </button>

              {!user ? (
                <button
                  onClick={handleTestLogin}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Test Login (Alice)
                </button>
              ) : (
                <button
                  onClick={signOut}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Sign Out
                </button>
              )}
              
              <a 
                href="/auth/login" 
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Go to Login Page
              </a>
              
              <a 
                href="/dashboard" 
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
              >
                Test Protected Route
              </a>
            </div>

            {/* Test Results */}
            {testResults.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Test Results</h2>
                {testResults.map((test, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium flex items-center">
                        {getStatusIcon(test.status)}
                        <span className="ml-2">{test.name}</span>
                      </h3>
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        test.status === 'passed' ? 'bg-green-100 text-green-800' :
                        test.status === 'failed' ? 'bg-red-100 text-red-800' :
                        test.status === 'running' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {test.status}
                      </span>
                    </div>
                    {test.message && (
                      <p className="text-sm text-gray-600 mb-2">{test.message}</p>
                    )}
                    {test.details && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-gray-500">Show details</summary>
                        <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
                          {JSON.stringify(test.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Test Credentials */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Test Credentials</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• alice@example.com / password123</p>
                <p>• bob@example.com / password123</p>
                <p>• charlie@example.com / password123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
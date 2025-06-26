'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/providers/auth-provider'
import toast from 'react-hot-toast'
import { Mail, Lock, User, UserPlus, CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle')
  const { signUp, user, loading: authLoading, checkUsernameAvailability } = useAuth()
  const router = useRouter()

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  // Debounced username availability check
  const checkUsername = useCallback(async (usernameToCheck: string) => {
    if (!usernameToCheck || usernameToCheck.length < 3) {
      setUsernameStatus('idle')
      return
    }

    setUsernameStatus('checking')
    
    try {
      const result = await checkUsernameAvailability(usernameToCheck)
      
      if (result.success) {
        setUsernameStatus(result.available ? 'available' : 'taken')
      } else {
        setUsernameStatus('error')
      }
    } catch {
      setUsernameStatus('error')
    }
  }, [checkUsernameAvailability])

  // Debounce username checking
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (username) {
        checkUsername(username)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [username, checkUsername])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Validate username availability
    if (usernameStatus !== 'available') {
      toast.error('Please choose an available username')
      setIsSubmitting(false)
      return
    }

    try {
      const result = await signUp({ email, password, username })
      
      if (result.success) {
        toast.success('Account created successfully!')
        // Redirect will be handled by useEffect when user state updates
      } else {
        toast.error(result.error || 'Registration failed')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Registration failed'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading while checking auth status
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center">
            <UserPlus className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
              sign in to your existing account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your email"
                />
              </div>
            </div>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className={`appearance-none block w-full pl-10 pr-10 py-2 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 ${
                    usernameStatus === 'available' 
                      ? 'border-green-300 focus:border-green-500' 
                      : usernameStatus === 'taken' || usernameStatus === 'error'
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder="Choose a username"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {usernameStatus === 'checking' && (
                    <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                  )}
                  {usernameStatus === 'available' && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {usernameStatus === 'taken' && (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
              <div className="mt-1 min-h-[20px]">
                {usernameStatus === 'available' && (
                  <p className="text-xs text-green-600">✓ Username is available</p>
                )}
                {usernameStatus === 'taken' && (
                  <p className="text-xs text-red-600">✗ Username is already taken</p>
                )}
                {usernameStatus === 'error' && (
                  <p className="text-xs text-red-600">✗ Error checking username</p>
                )}
                {usernameStatus === 'idle' && (
                  <p className="text-xs text-gray-500">Username must be at least 3 characters (letters, numbers, underscore only)</p>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Create a password"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Password must be at least 8 characters long
              </p>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting || usernameStatus !== 'available' || !email || !password}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
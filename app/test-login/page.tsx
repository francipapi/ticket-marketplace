'use client'

import { useAuth } from '@/app/providers/auth-provider'

export default function TestLoginPage() {
  const { user, loading, isAuthenticated } = useAuth()

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Auth State Test</h1>
      
      <div className="space-y-4">
        <div>
          <strong>Loading:</strong> {loading ? 'true' : 'false'}
        </div>
        
        <div>
          <strong>Authenticated:</strong> {isAuthenticated ? 'true' : 'false'}
        </div>
        
        <div>
          <strong>User:</strong> {user ? user.username : 'null'}
        </div>
        
        <div>
          <strong>User Email:</strong> {user ? user.email : 'null'}
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <p className="text-sm text-gray-600">
          Check the browser console for detailed auth logs.
        </p>
      </div>
    </div>
  )
}
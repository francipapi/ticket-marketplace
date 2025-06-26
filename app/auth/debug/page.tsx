'use client'

import { useAuth } from '@/app/providers'

export default function DebugAuthPage() {
  const { user, loading } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Auth Debug Page</h1>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <strong>Loading:</strong> {loading ? 'true' : 'false'}
          </div>
          
          <div>
            <strong>User:</strong> {user ? 'Authenticated' : 'Not authenticated'}
          </div>
          
          {user && (
            <div className="space-y-2">
              <div><strong>ID:</strong> {user.id}</div>
              <div><strong>Email:</strong> {user.email}</div>
              <div><strong>Username:</strong> {user.username}</div>
            </div>
          )}
          
          <div className="mt-6 space-x-4">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
            
            <button
              onClick={() => window.location.href = '/'}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
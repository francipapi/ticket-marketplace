'use client';

import { useAuth } from '@/app/providers';

export default function SimpleDashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Simple Dashboard</h1>
        
        {user ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Welcome!</h2>
            <div className="space-y-2">
              <p><strong>ID:</strong> {user.id}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Username:</strong> {user.username}</p>
              <p><strong>Authenticated:</strong> ✅ Yes</p>
            </div>
            
            <div className="mt-6 space-x-4">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Go to Full Dashboard
              </button>
              
              <button
                onClick={() => window.location.href = '/listings'}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                View Listings
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Not Authenticated</h2>
            <p className="text-red-600">You are not logged in.</p>
            <button
              onClick={() => window.location.href = '/auth/force-login'}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Force Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
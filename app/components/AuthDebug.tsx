'use client';

import { useAuth } from '@/app/providers';
import Link from 'next/link';

export function AuthDebug() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 text-sm">
      <div className="font-semibold mb-2">Auth Debug</div>
      <div>User: {user ? user.email : 'Not logged in'}</div>
      {user && (
        <div className="mt-2 space-y-1">
          <Link 
            href="/dashboard" 
            className="block text-blue-600 hover:underline"
          >
            → Go to Dashboard
          </Link>
          <Link 
            href="/listings" 
            className="block text-blue-600 hover:underline"
          >
            → Go to Listings
          </Link>
        </div>
      )}
    </div>
  );
}
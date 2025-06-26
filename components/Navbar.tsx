'use client';

import Link from 'next/link';
import { useAuth } from '@/app/providers';
import { User, LogOut, Plus, Home } from 'lucide-react';

export function Navbar() {
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Home className="h-8 w-8 text-blue-600" />
              <span className="font-bold text-xl text-gray-900">TicketMarket</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  href="/listings"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Browse Tickets
                </Link>
                <Link
                  href="/listings/create"
                  className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  <span>Sell Tickets</span>
                </Link>
                <Link
                  href="/dashboard"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-700">{user.username}</span>
                  <button
                    onClick={handleLogout}
                    className="text-gray-400 hover:text-gray-600"
                    title="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/listings"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Browse Tickets
                </Link>
                <Link
                  href="/auth/login"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
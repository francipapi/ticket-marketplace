'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function ForceLoginPage() {
  const [status, setStatus] = useState('');

  const forceLogin = async () => {
    setStatus('Logging in...');
    
    // Clear any existing session first
    await supabase.auth.signOut();
    
    // Sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'alice@example.com',
      password: 'password123'
    });

    if (error) {
      setStatus(`Error: ${error.message}`);
      return;
    }

    setStatus('Login successful! Redirecting...');
    
    // Force reload to dashboard
    setTimeout(() => {
      window.location.replace('/dashboard');
    }, 1000);
  };

  const clearAndGoHome = () => {
    // Clear everything and go home
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6">Force Login</h1>
        
        <p className="text-gray-600 mb-6">
          This page bypasses the normal auth flow to force a login.
        </p>

        <div className="space-y-4">
          <button
            onClick={forceLogin}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Force Login as alice@example.com
          </button>

          <button
            onClick={clearAndGoHome}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700"
          >
            Clear Everything & Go Home
          </button>

          {status && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <p className="text-sm">{status}</p>
            </div>
          )}
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p>This will:</p>
          <ul className="list-disc list-inside mt-2">
            <li>Clear any existing sessions</li>
            <li>Login as alice@example.com</li>
            <li>Force redirect to dashboard</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
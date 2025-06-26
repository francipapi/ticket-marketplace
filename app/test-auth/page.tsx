'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function TestAuthPage() {
  const [email, setEmail] = useState('alice@example.com');
  const [password, setPassword] = useState('password123');
  const [status, setStatus] = useState('');
  const [user, setUser] = useState<any>(null);

  const testLogin = async () => {
    setStatus('Logging in...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setStatus(`Login failed: ${error.message}`);
    } else {
      setStatus('Login successful!');
      setUser(data.user);
      
      // Test if we can access protected data
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('supabaseId', data.user?.id)
        .single();
        
      if (userData) {
        setStatus(`Login successful! User: ${userData.username}`);
      }
    }
  };

  const testLogout = async () => {
    await supabase.auth.signOut();
    setStatus('Logged out');
    setUser(null);
  };

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setStatus(`Session found for: ${session.user.email}`);
      setUser(session.user);
    } else {
      setStatus('No session found');
      setUser(null);
    }
  };

  const goToDashboard = () => {
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>
      
      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div className="space-x-2">
          <button
            onClick={testLogin}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Test Login
          </button>
          
          <button
            onClick={testLogout}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Test Logout
          </button>
          
          <button
            onClick={checkSession}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Check Session
          </button>
        </div>

        <div className="p-4 bg-gray-100 rounded">
          <p className="font-semibold">Status:</p>
          <p>{status}</p>
        </div>

        {user && (
          <div className="p-4 bg-blue-50 rounded">
            <p className="font-semibold">Logged in as:</p>
            <p>ID: {user.id}</p>
            <p>Email: {user.email}</p>
            
            <button
              onClick={goToDashboard}
              className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
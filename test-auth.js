// Test script to verify Supabase authentication
// Run with: node test-auth.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qtzcerfovpoyjykqfrnt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0emNlcmZvdnBveWp5a3Fmcm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1MDY3MDUsImV4cCI6MjA2NjA4MjcwNX0.g2L9amCwqQxuwr56mV1lZYnkiCwAHv-RzQbtkgiVj_E';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
  console.log('Testing Supabase authentication...\n');

  // Test 1: Try to sign in with test credentials
  console.log('Test 1: Attempting to sign in with alice@example.com...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'alice@example.com',
    password: 'password123'
  });

  if (error) {
    console.error('❌ Sign in failed:', error.message);
    console.error('Error details:', error);
  } else {
    console.log('✅ Sign in successful!');
    console.log('User ID:', data.user?.id);
    console.log('Email:', data.user?.email);
    
    // Sign out
    await supabase.auth.signOut();
  }

  // Test 2: Check if we can query the users table
  console.log('\nTest 2: Checking users table...');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('email, username')
    .eq('email', 'alice@example.com');

  if (usersError) {
    console.error('❌ Failed to query users table:', usersError.message);
  } else {
    console.log('✅ Users table query successful:');
    console.log(users);
  }

  // Test 3: Check auth.users via admin API (this might fail without service role key)
  console.log('\nTest 3: Checking if user exists in auth system...');
  const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.log('⚠️  Cannot list auth users (requires service role key)');
  } else {
    const alice = authUsers?.find(u => u.email === 'alice@example.com');
    if (alice) {
      console.log('✅ Found alice in auth.users');
      console.log('Confirmed:', alice.email_confirmed_at ? 'Yes' : 'No');
    }
  }
}

testAuth().catch(console.error);
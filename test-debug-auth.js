// Test the debug auth endpoint
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qtzcerfovpoyjykqfrnt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0emNlcmZvdnBveWp5a3Fmcm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1MDY3MDUsImV4cCI6MjA2NjA4MjcwNX0.g2L9amCwqQxuwr56mV1lZYnkiCwAHv-RzQbtkgiVj_E';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDebugAuth() {
  console.log('Testing authentication flow...\n');

  // Step 1: Sign in
  console.log('1. Signing in...');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'alice@example.com',
    password: 'password123'
  });

  if (signInError) {
    console.error('❌ Sign in failed:', signInError.message);
    return;
  }

  console.log('✅ Signed in successfully');
  console.log('Session:', signInData.session ? 'Valid' : 'Invalid');
  console.log('Access token:', signInData.session?.access_token ? 'Present' : 'Missing');

  // Step 2: Get session
  console.log('\n2. Getting current session...');
  const { data: { session } } = await supabase.auth.getSession();
  console.log('Session exists:', !!session);

  // Step 3: Make API call with auth header
  console.log('\n3. Testing /api/debug-auth endpoint...');
  const response = await fetch('http://localhost:3000/api/debug-auth', {
    headers: {
      'Authorization': `Bearer ${signInData.session?.access_token}`,
      'Cookie': `sb-qtzcerfovpoyjykqfrnt-auth-token=${signInData.session?.access_token}`
    }
  });

  const debugData = await response.json();
  console.log('\nDebug response:', JSON.stringify(debugData, null, 2));

  // Step 4: Test the /api/auth/supabase/me endpoint
  console.log('\n4. Testing /api/auth/supabase/me endpoint...');
  const meResponse = await fetch('http://localhost:3000/api/auth/supabase/me', {
    headers: {
      'Authorization': `Bearer ${signInData.session?.access_token}`,
      'Cookie': `sb-qtzcerfovpoyjykqfrnt-auth-token=${signInData.session?.access_token}`
    }
  });

  const meData = await meResponse.json();
  console.log('\nMe endpoint response:', JSON.stringify(meData, null, 2));

  // Clean up
  await supabase.auth.signOut();
}

testDebugAuth().catch(console.error);
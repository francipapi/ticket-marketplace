// Comprehensive auth flow test
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qtzcerfovpoyjykqfrnt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0emNlcmZvdnBveWp5a3Fmcm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1MDY3MDUsImV4cCI6MjA2NjA4MjcwNX0.g2L9amCwqQxuwr56mV1lZYnkiCwAHv-RzQbtkgiVj_E';

async function testCompleteAuthFlow() {
  console.log('🔍 Testing complete authentication flow...\n');

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Step 1: Clean slate
  console.log('1️⃣ Starting fresh (sign out any existing session)');
  await supabase.auth.signOut();

  // Step 2: Sign in
  console.log('\n2️⃣ Signing in with alice@example.com...');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'alice@example.com',
    password: 'password123'
  });

  if (signInError) {
    console.error('❌ Sign in failed:', signInError.message);
    return;
  }

  console.log('✅ Sign in successful');
  console.log(`   User ID: ${signInData.user?.id}`);
  console.log(`   Email: ${signInData.user?.email}`);
  console.log(`   Session: ${signInData.session ? 'Present' : 'Missing'}`);

  // Step 3: Get session details
  console.log('\n3️⃣ Getting session details...');
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error('❌ Session error:', sessionError.message);
  } else if (session) {
    console.log('✅ Session retrieved');
    console.log(`   Access token: ${session.access_token ? 'Present' : 'Missing'}`);
    console.log(`   Refresh token: ${session.refresh_token ? 'Present' : 'Missing'}`);
    console.log(`   Expires at: ${new Date(session.expires_at * 1000).toISOString()}`);
  } else {
    console.log('❌ No session found');
  }

  // Step 4: Test cookie endpoint
  console.log('\n4️⃣ Testing cookie visibility on server...');
  try {
    // In a real browser, cookies would be automatically included
    const cookieResponse = await fetch('http://localhost:3000/api/test-cookies');
    const cookieData = await cookieResponse.json();
    console.log('Server can see:');
    console.log(`   Total cookies: ${cookieData.totalCookies}`);
    console.log(`   Supabase cookies: ${cookieData.supabaseCookies}`);
    console.log(`   Cookie names: ${cookieData.allCookieNames.join(', ')}`);
  } catch (error) {
    console.log('⚠️  Could not test server cookies (expected in this context)');
  }

  // Step 5: Test direct API calls with session
  console.log('\n5️⃣ Testing direct API authentication...');
  
  if (session) {
    // Test with different header formats
    const testConfigs = [
      {
        name: 'Authorization Bearer',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      },
      {
        name: 'Cookie header',
        headers: {
          'Cookie': `sb-qtzcerfovpoyjykqfrnt-auth-token=${session.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    ];

    for (const config of testConfigs) {
      try {
        console.log(`\n   Testing ${config.name}...`);
        const response = await fetch('http://localhost:3000/api/auth/supabase/me', {
          method: 'GET',
          headers: config.headers
        });
        
        const data = await response.json();
        console.log(`   Status: ${response.status}`);
        console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
      } catch (error) {
        console.log(`   ❌ ${config.name} failed:`, error.message);
      }
    }
  }

  // Step 6: Check user data in database
  console.log('\n6️⃣ Checking user data in database...');
  if (signInData.user) {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('supabaseId', signInData.user.id);

    if (userError) {
      console.log('❌ Could not query users table:', userError.message);
    } else {
      console.log('✅ User data found:', userData);
    }
  }

  // Clean up
  console.log('\n7️⃣ Cleaning up...');
  await supabase.auth.signOut();
  console.log('✅ Signed out');

  console.log('\n🎯 DIAGNOSIS:');
  console.log('If auth is working but server calls fail, the issue is:');
  console.log('1. Server-side Supabase client not reading cookies properly');
  console.log('2. Cookie names/format mismatch');
  console.log('3. CORS or middleware intercepting requests');
}

testCompleteAuthFlow().catch(console.error);
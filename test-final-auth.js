// Test the final auth fix
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qtzcerfovpoyjykqfrnt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0emNlcmZvdnBveWp5a3Fmcm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1MDY3MDUsImV4cCI6MjA2NjA4MjcwNX0.g2L9amCwqQxuwr56mV1lZYnkiCwAHv-RzQbtkgiVj_E';

async function testAuthFix() {
  console.log('🔧 Testing auth fix...\n');

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Test 1: Sign in
  console.log('1️⃣ Testing sign in...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'alice@example.com',
    password: 'password123'
  });

  if (error) {
    console.error('❌ Sign in failed:', error.message);
    return;
  }

  console.log('✅ Sign in successful');

  // Test 2: Check if we can query user data directly from client
  console.log('\n2️⃣ Testing direct user data query...');
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('supabaseId', data.user.id)
    .single();

  if (userError) {
    console.log('❌ User data query failed:', userError.message);
  } else {
    console.log('✅ User data retrieved directly:', {
      id: userData.id,
      email: userData.email,
      username: userData.username
    });
  }

  // Clean up
  await supabase.auth.signOut();
  
  console.log('\n🎯 RESULT:');
  console.log('The client-side auth should now work independently of server-side auth.');
  console.log('After login, the app should be able to set user state and redirect to dashboard.');
  console.log('\n📋 NEXT STEPS:');
  console.log('1. Restart your dev server: npm run dev');
  console.log('2. Go to http://localhost:3000/auth/login');
  console.log('3. Login with alice@example.com / password123');
  console.log('4. You should be redirected to dashboard and stay there');
}

testAuthFix().catch(console.error);
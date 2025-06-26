import { createClient } from '@supabase/supabase-js'

// Use service role key to create users
const supabaseUrl = 'https://qtzcerfovpoyjykqfrnt.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0emNlcmZvdnBveWp5a3Fmcm50Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDUwNjcwNSwiZXhwIjoyMDY2MDgyNzA1fQ.nQvWrfKWeUyYC-gy2XI8KYE_gKnivUZdmRbKnK_dvG4'

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupTestUsers() {
  console.log('Setting up test users...\n')

  const testUsers = [
    { email: 'alice@example.com', password: 'password123', username: 'alice' },
    { email: 'bob@example.com', password: 'password123', username: 'bob' }
  ]

  for (const user of testUsers) {
    console.log(`Creating user: ${user.email}`)
    
    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { username: user.username }
    })

    if (authError) {
      console.error(`❌ Failed to create auth user ${user.email}:`, authError.message)
      
      // Try to update existing user
      const { data: users } = await supabaseAdmin.auth.admin.listUsers()
      const existingUser = users?.users?.find(u => u.email === user.email)
      
      if (existingUser) {
        console.log(`User ${user.email} already exists, updating password...`)
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          { password: user.password }
        )
        
        if (updateError) {
          console.error(`❌ Failed to update password:`, updateError.message)
        } else {
          console.log(`✅ Password updated for ${user.email}`)
        }
      }
      continue
    }

    console.log(`✅ Created auth user: ${user.email}`)

    // Create corresponding records in public tables
    if (authData.user) {
      // Create user record
      const { error: userError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: authData.user.id,
          supabaseId: authData.user.id,
          email: user.email,
          username: user.username,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          migrationStatus: 'created'
        })

      if (userError) {
        console.error(`❌ Failed to create user record:`, userError.message)
      } else {
        console.log(`✅ Created user record for ${user.email}`)
      }

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: authData.user.id,
          username: user.username,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })

      if (profileError) {
        console.error(`❌ Failed to create profile:`, profileError.message)
      } else {
        console.log(`✅ Created profile for ${user.email}`)
      }
    }
  }

  console.log('\n✅ Setup complete! You can now log in with:')
  console.log('   Email: alice@example.com')
  console.log('   Password: password123')
}

setupTestUsers().catch(console.error)
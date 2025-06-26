#!/usr/bin/env node

/**
 * Script to create test users in Supabase Auth and database
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const prisma = new PrismaClient()

const testUsers = [
  {
    email: 'alice@example.com',
    password: 'password123',
    username: 'alice'
  },
  {
    email: 'bob@example.com', 
    password: 'password123',
    username: 'bob'
  },
  {
    email: 'charlie@example.com',
    password: 'password123', 
    username: 'charlie'
  }
]

async function createTestUsers() {
  console.log('🌱 Creating test users...')
  
  for (const userData of testUsers) {
    try {
      console.log(`Creating user: ${userData.email}`)
      
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true // Auto-confirm email
      })
      
      if (authError) {
        console.log(`⚠️ Auth user might already exist: ${userData.email}`)
        continue
      }
      
      if (!authData.user) {
        console.log(`❌ Failed to create auth user: ${userData.email}`)
        continue
      }
      
      // Create user record in database
      const dbUser = await prisma.user.upsert({
        where: {
          id: authData.user.id
        },
        update: {
          email: userData.email,
          username: userData.username,
          migrationStatus: 'test_user'
        },
        create: {
          id: authData.user.id,
          email: userData.email,
          username: userData.username,
          passwordHash: '', // Not needed with Supabase Auth
          migrationStatus: 'test_user'
        }
      })
      
      console.log(`✅ Created user: ${userData.email} (${dbUser.id})`)
      
    } catch (error) {
      console.error(`❌ Error creating user ${userData.email}:`, error.message)
    }
  }
  
  console.log('✅ Test user creation completed!')
}

async function main() {
  try {
    await createTestUsers()
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
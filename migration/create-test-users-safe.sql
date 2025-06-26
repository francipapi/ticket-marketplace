-- Safe script to create test users (checks for existing users first)
-- Run this in your Supabase SQL Editor

-- First, let's check what users already exist
SELECT 
  u.email, 
  u.username, 
  u."supabaseId",
  au.email_confirmed_at,
  au.created_at
FROM users u 
LEFT JOIN auth.users au ON u."supabaseId" = au.id
WHERE u.email IN ('alice@example.com', 'bob@example.com', 'charlie@example.com', 'diana@example.com')
ORDER BY u.email;

-- Check auth.users table directly
SELECT email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email IN ('alice@example.com', 'bob@example.com', 'charlie@example.com', 'diana@example.com');

-- Create only missing test users
DO $$
DECLARE
  user_id uuid;
  user_exists boolean;
BEGIN
  -- Check if user1@example.com exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'user1@example.com') INTO user_exists;
  
  IF NOT user_exists THEN
    -- Create auth user
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      gen_random_uuid(),
      'user1@example.com',
      crypt('password123', gen_salt('bf')),
      NOW(),
      '{"username": "user1"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    ) RETURNING id INTO user_id;

    -- Create corresponding user record
    INSERT INTO public.users (
      id,
      "supabaseId",
      email,
      username,
      "createdAt",
      "updatedAt",
      "migrationStatus"
    ) VALUES (
      user_id,
      user_id,
      'user1@example.com',
      'user1',
      NOW(),
      NOW(),
      'created'
    );

    -- Create profile
    INSERT INTO public.profiles (
      id,
      username,
      "createdAt",
      "updatedAt"
    ) VALUES (
      user_id,
      'user1',
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Created user: user1@example.com';
  ELSE
    RAISE NOTICE 'User already exists: user1@example.com';
  END IF;
END $$;

-- If you need to update existing users to have confirmed emails
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email IN ('alice@example.com', 'bob@example.com', 'charlie@example.com', 'diana@example.com')
AND email_confirmed_at IS NULL;

-- Final check: Show all test users
SELECT 
  u.email, 
  u.username,
  CASE 
    WHEN au.email_confirmed_at IS NOT NULL THEN 'Confirmed'
    ELSE 'Not Confirmed'
  END as email_status,
  CASE 
    WHEN au.encrypted_password IS NOT NULL THEN 'Has Password'
    ELSE 'No Password'
  END as password_status
FROM users u 
JOIN auth.users au ON u."supabaseId" = au.id
WHERE u.email LIKE '%@example.com'
ORDER BY u.email;
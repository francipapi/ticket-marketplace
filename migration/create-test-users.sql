-- Script to create test users in Supabase
-- Run this in your Supabase SQL Editor

-- First, let's check if email confirmation is required
-- If it's enabled, we'll need to disable it for testing

-- Create test users using Supabase Admin API
-- Note: You'll need to run these commands one by one

-- User 1: Alice
DO $$
DECLARE
  user_id uuid;
BEGIN
  -- Create auth user (this bypasses email validation)
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
    'alice@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '{"username": "alice"}',
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
    'alice@example.com',
    'alice',
    NOW(),
    NOW(),
    'migrated'
  );

  -- Create profile
  INSERT INTO public.profiles (
    id,
    username,
    "createdAt",
    "updatedAt"
  ) VALUES (
    user_id,
    'alice',
    NOW(),
    NOW()
  );
END $$;

-- User 2: Bob
DO $$
DECLARE
  user_id uuid;
BEGIN
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
    'bob@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '{"username": "bob"}',
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
    'bob@example.com',
    'bob',
    NOW(),
    NOW(),
    'migrated'
  );

  -- Create profile
  INSERT INTO public.profiles (
    id,
    username,
    "createdAt",
    "updatedAt"
  ) VALUES (
    user_id,
    'bob',
    NOW(),
    NOW()
  );
END $$;

-- User 3: Charlie
DO $$
DECLARE
  user_id uuid;
BEGIN
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
    'charlie@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '{"username": "charlie"}',
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
    'charlie@example.com',
    'charlie',
    NOW(),
    NOW(),
    'migrated'
  );

  -- Create profile
  INSERT INTO public.profiles (
    id,
    username,
    "createdAt",
    "updatedAt"
  ) VALUES (
    user_id,
    'charlie',
    NOW(),
    NOW()
  );
END $$;

-- User 4: Diana
DO $$
DECLARE
  user_id uuid;
BEGIN
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
    'diana@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '{"username": "diana"}',
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
    'diana@example.com',
    'diana',
    NOW(),
    NOW(),
    'migrated'
  );

  -- Create profile
  INSERT INTO public.profiles (
    id,
    username,
    "createdAt",
    "updatedAt"
  ) VALUES (
    user_id,
    'diana',
    NOW(),
    NOW()
  );
END $$;

-- Verify users were created
SELECT u.email, u.username, au.email_confirmed_at 
FROM users u 
JOIN auth.users au ON u."supabaseId" = au.id
ORDER BY u."createdAt" DESC;
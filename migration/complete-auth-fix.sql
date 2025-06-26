-- Complete Authentication Fix Script
-- Run this entire script in Supabase SQL Editor to fix all auth issues

-- STEP 1: Clean up any existing test users
DELETE FROM public.profiles WHERE id IN (
  SELECT id FROM auth.users WHERE email IN ('testuser@example.com', 'alice@example.com', 'bob@example.com')
);

DELETE FROM public.users WHERE email IN ('testuser@example.com', 'alice@example.com', 'bob@example.com');

DELETE FROM auth.users WHERE email IN ('testuser@example.com', 'alice@example.com', 'bob@example.com');

-- STEP 2: Fix the trigger function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_username text;
BEGIN
  -- Generate username from email if not provided
  new_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  
  -- Ensure username is unique
  IF EXISTS (SELECT 1 FROM public.users WHERE username = new_username AND "supabaseId" != NEW.id) THEN
    new_username := new_username || '_' || substr(md5(random()::text), 1, 4);
  END IF;

  -- Create user record
  INSERT INTO public.users (
    id, 
    "supabaseId", 
    email, 
    username,
    "createdAt",
    "updatedAt",
    "migrationStatus"
  )
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    new_username,
    COALESCE(NEW.created_at, NOW()),
    NOW(),
    'new'
  )
  ON CONFLICT ("supabaseId") DO UPDATE SET
    email = EXCLUDED.email,
    "updatedAt" = NOW();
  
  -- Create profile
  INSERT INTO public.profiles (id, username, "createdAt", "updatedAt")
  VALUES (NEW.id, new_username, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    "updatedAt" = NOW();
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in handle_new_user for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STEP 3: Create fresh test users
DO $$
DECLARE
  alice_id uuid := gen_random_uuid();
  bob_id uuid := gen_random_uuid();
BEGIN
  -- Create Alice
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    alice_id,
    '00000000-0000-0000-0000-000000000000',
    'alice@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '{"username": "alice"}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  -- Create Bob
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    bob_id,
    '00000000-0000-0000-0000-000000000000',
    'bob@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '{"username": "bob"}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  -- The trigger should automatically create users and profiles records
  -- Let's verify
  PERFORM pg_sleep(0.5); -- Small delay to ensure trigger completes

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE "supabaseId" = alice_id) THEN
    -- Manually create if trigger failed
    INSERT INTO public.users (id, "supabaseId", email, username, "createdAt", "updatedAt", "migrationStatus")
    VALUES (alice_id, alice_id, 'alice@example.com', 'alice', NOW(), NOW(), 'new');
    
    INSERT INTO public.profiles (id, username, "createdAt", "updatedAt")
    VALUES (alice_id, 'alice', NOW(), NOW());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE "supabaseId" = bob_id) THEN
    -- Manually create if trigger failed
    INSERT INTO public.users (id, "supabaseId", email, username, "createdAt", "updatedAt", "migrationStatus")
    VALUES (bob_id, bob_id, 'bob@example.com', 'bob', NOW(), NOW(), 'new');
    
    INSERT INTO public.profiles (id, username, "createdAt", "updatedAt")
    VALUES (bob_id, 'bob', NOW(), NOW());
  END IF;

  RAISE NOTICE 'Created users alice@example.com and bob@example.com with password: password123';
END $$;

-- STEP 4: Verify everything is set up correctly
SELECT 
  'Auth User' as type,
  au.email,
  CASE WHEN au.encrypted_password IS NOT NULL THEN 'Has Password' ELSE 'No Password' END as password_status,
  CASE WHEN au.email_confirmed_at IS NOT NULL THEN 'Confirmed' ELSE 'Not Confirmed' END as email_status,
  au.created_at
FROM auth.users au
WHERE au.email IN ('alice@example.com', 'bob@example.com')

UNION ALL

SELECT 
  'Public User' as type,
  u.email,
  u.username as password_status,
  u."migrationStatus" as email_status,
  u."createdAt" as created_at
FROM public.users u
WHERE u.email IN ('alice@example.com', 'bob@example.com')

UNION ALL

SELECT 
  'Profile' as type,
  au.email,
  p.username as password_status,
  'Profile Exists' as email_status,
  p."createdAt" as created_at
FROM public.profiles p
JOIN auth.users au ON au.id = p.id
WHERE au.email IN ('alice@example.com', 'bob@example.com')

ORDER BY email, type;

-- STEP 5: Test password verification
DO $$
DECLARE
  test_result boolean;
BEGIN
  -- Test Alice's password
  SELECT (encrypted_password = crypt('password123', encrypted_password)) 
  INTO test_result
  FROM auth.users 
  WHERE email = 'alice@example.com';
  
  IF test_result THEN
    RAISE NOTICE 'Password verification test PASSED for alice@example.com';
  ELSE
    RAISE WARNING 'Password verification test FAILED for alice@example.com';
  END IF;
END $$;

-- STEP 6: Final summary
SELECT 
  'SETUP COMPLETE' as status,
  COUNT(*) as total_test_users,
  'Login with: alice@example.com / password123' as credentials
FROM auth.users
WHERE email IN ('alice@example.com', 'bob@example.com');
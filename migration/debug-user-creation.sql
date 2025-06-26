-- Debug user creation issues
-- Run this in Supabase SQL Editor to identify the problem

-- 1. Check if the trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- 2. Check the handle_new_user function
SELECT 
  proname as function_name,
  prosrc as function_source
FROM pg_proc
WHERE proname = 'handle_new_user';

-- 3. Check for any constraint violations
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('users', 'profiles')
ORDER BY tc.table_name, tc.constraint_type;

-- 4. Test the trigger function manually
-- This simulates what happens when a new user signs up
DO $$
DECLARE
  test_user_id uuid := gen_random_uuid();
  test_email text := 'test' || extract(epoch from now())::text || '@example.com';
  test_username text := 'test' || extract(epoch from now())::text;
BEGIN
  -- Try to execute what the trigger does
  BEGIN
    -- Insert into users table
    INSERT INTO public.users (id, "supabaseId", email, username)
    VALUES (
      test_user_id,
      test_user_id,
      test_email,
      test_username
    );
    
    -- Insert into profiles table
    INSERT INTO public.profiles (id, username)
    VALUES (
      test_user_id,
      test_username
    );
    
    RAISE NOTICE 'Test successful! User can be created.';
    
    -- Clean up test data
    DELETE FROM public.profiles WHERE id = test_user_id;
    DELETE FROM public.users WHERE id = test_user_id;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error: %', SQLERRM;
    RAISE NOTICE 'Error detail: %', SQLSTATE;
  END;
END $$;

-- 5. Check for username conflicts
-- The error might be due to username already existing
SELECT username, COUNT(*) as count
FROM public.users
GROUP BY username
HAVING COUNT(*) > 1;

-- Also check profiles table
SELECT username, COUNT(*) as count
FROM public.profiles
GROUP BY username
HAVING COUNT(*) > 1;
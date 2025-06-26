-- Fix the user creation trigger
-- This replaces the existing trigger with a more robust version

-- 1. First, drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Create an improved version that handles errors better
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
  
  -- Ensure username is unique by appending random suffix if needed
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = new_username) LOOP
    new_username := new_username || '_' || substr(md5(random()::text), 1, 4);
  END LOOP;

  -- Create user record with better error handling
  BEGIN
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
      NOW(),
      NOW(),
      'new'
    );
  EXCEPTION WHEN unique_violation THEN
    -- If user already exists, update it instead
    UPDATE public.users 
    SET 
      email = NEW.email,
      "updatedAt" = NOW()
    WHERE "supabaseId" = NEW.id;
  END;
  
  -- Create or update profile
  BEGIN
    INSERT INTO public.profiles (id, username, "createdAt", "updatedAt")
    VALUES (NEW.id, new_username, NOW(), NOW());
  EXCEPTION WHEN unique_violation THEN
    -- If profile exists, update username if needed
    UPDATE public.profiles 
    SET 
      username = new_username,
      "updatedAt" = NOW()
    WHERE id = NEW.id;
  END;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the auth signup
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Test by checking if we can manually insert a test auth user
DO $$
DECLARE
  test_id uuid := gen_random_uuid();
  test_email text := 'trigger_test_' || extract(epoch from now())::text || '@example.com';
BEGIN
  -- Simulate auth.users insert (what happens during signup)
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    test_id,
    test_email,
    crypt('test123', gen_salt('bf')),
    NOW(),
    '{"username": "trigger_test"}',
    NOW(),
    NOW()
  );
  
  -- Check if trigger created the user records
  IF EXISTS (SELECT 1 FROM public.users WHERE "supabaseId" = test_id) THEN
    RAISE NOTICE 'Success! Trigger is working correctly.';
    
    -- Show what was created (using PERFORM to discard results)
    PERFORM email, username 
    FROM public.users 
    WHERE "supabaseId" = test_id;
    
    -- Clean up
    DELETE FROM public.profiles WHERE id = test_id;
    DELETE FROM public.users WHERE "supabaseId" = test_id;
    DELETE FROM auth.users WHERE id = test_id;
  ELSE
    RAISE WARNING 'Trigger did not create user record!';
  END IF;
END $$;

-- 5. Show current trigger status
SELECT 
  'Trigger Status' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_name = 'on_auth_user_created'
    ) THEN 'Trigger exists and is active'
    ELSE 'Trigger is missing!'
  END as status;
-- Create a test user directly without relying on triggers
-- Use this if the trigger is still failing

DO $$
DECLARE
  new_user_id uuid;
  user_email text := 'testuser@example.com';
  user_password text := 'password123';
  user_name text := 'testuser';
BEGIN
  -- 1. First check if user already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    -- Get existing user id
    SELECT id INTO new_user_id FROM auth.users WHERE email = user_email;
    RAISE NOTICE 'User already exists with ID: %', new_user_id;
  ELSE
    -- Create new auth user
    new_user_id := gen_random_uuid();
    
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
      new_user_id,
      user_email,
      crypt(user_password, gen_salt('bf')),
      NOW(), -- Email already confirmed
      jsonb_build_object('username', user_name),
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
    RAISE NOTICE 'Created auth user with ID: %', new_user_id;
  END IF;

  -- 2. Create or update public.users record
  INSERT INTO public.users (
    id,
    "supabaseId",
    email,
    username,
    "createdAt",
    "updatedAt",
    "migrationStatus"
  ) VALUES (
    new_user_id,
    new_user_id,
    user_email,
    user_name,
    NOW(),
    NOW(),
    'created'
  )
  ON CONFLICT ("supabaseId") DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    "updatedAt" = NOW();

  -- 3. Create or update profile
  INSERT INTO public.profiles (
    id,
    username,
    "createdAt",
    "updatedAt"
  ) VALUES (
    new_user_id,
    user_name,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    "updatedAt" = NOW();

  RAISE NOTICE 'Successfully created/updated user: % with password: %', user_email, user_password;
END $$;

-- Verify the user was created
SELECT 
  u.email,
  u.username,
  u."supabaseId",
  'Can login with password: password123' as login_info
FROM public.users u
JOIN auth.users au ON u."supabaseId" = au.id
WHERE u.email = 'testuser@example.com';
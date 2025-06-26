-- Simple fix for user creation trigger
-- This just replaces the trigger without testing

-- 1. Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Create improved trigger function
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
    NOW(),
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
  -- Log error but don't fail the auth signup
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Verify trigger was created
SELECT 'Trigger created successfully!' as status
WHERE EXISTS (
  SELECT 1 FROM information_schema.triggers 
  WHERE trigger_name = 'on_auth_user_created'
);
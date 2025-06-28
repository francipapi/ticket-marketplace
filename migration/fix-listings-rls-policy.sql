-- Drop existing insert policy for listings
DROP POLICY IF EXISTS "Users can insert own listings" ON listings;

-- Create a new, more robust insert policy for listings
-- This policy ensures that authenticated users can create listings with their user ID
CREATE POLICY "Users can insert own listings" ON listings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = listings.userId 
      AND users.supabaseId = auth.uid()
    )
  );

-- Also update the update and delete policies to be consistent
DROP POLICY IF EXISTS "Users can update own listings" ON listings;
DROP POLICY IF EXISTS "Users can delete own listings" ON listings;

CREATE POLICY "Users can update own listings" ON listings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = listings.userId 
      AND users.supabaseId = auth.uid()
    )
  );

CREATE POLICY "Users can delete own listings" ON listings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = listings.userId 
      AND users.supabaseId = auth.uid()
    )
  );

-- Verify the user trigger is working correctly
-- This ensures new auth users automatically get a users table record
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user already exists (in case of duplicate trigger)
  IF EXISTS (SELECT 1 FROM public.users WHERE supabaseId = NEW.id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.users (supabaseId, email, username, migrationStatus)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    'direct_signup'
  )
  ON CONFLICT (supabaseId) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth process
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.listings TO authenticated;
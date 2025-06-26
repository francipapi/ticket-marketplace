-- Check Supabase Auth Settings
-- Run this to understand your current auth configuration

-- 1. Check if email confirmation is required
SELECT 
  CASE 
    WHEN current_setting('app.settings.auth.email_confirm', true) = 'true' THEN 'Email confirmation is ENABLED'
    ELSE 'Email confirmation is DISABLED'
  END as email_confirmation_status;

-- 2. List all existing test users
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  au.created_at,
  au.last_sign_in_at,
  u.username,
  u."migrationStatus"
FROM auth.users au
LEFT JOIN public.users u ON u."supabaseId" = au.id
WHERE au.email LIKE '%@example.com'
ORDER BY au.created_at DESC;

-- 3. Check for any users without proper setup
SELECT 
  'Auth users without public.users record' as issue,
  au.email
FROM auth.users au
LEFT JOIN public.users u ON u."supabaseId" = au.id
WHERE u.id IS NULL
  AND au.email LIKE '%@example.com'

UNION ALL

SELECT 
  'Auth users without profile' as issue,
  au.email
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
  AND au.email LIKE '%@example.com';

-- 4. Fix any unconfirmed emails for test users
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email LIKE '%@example.com' 
  AND email_confirmed_at IS NULL
RETURNING email, 'Email confirmed' as action;

-- 5. Show final status
SELECT 
  'Test Users Summary' as report,
  COUNT(*) as total_users,
  COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as confirmed_users,
  COUNT(CASE WHEN email_confirmed_at IS NULL THEN 1 END) as unconfirmed_users
FROM auth.users
WHERE email LIKE '%@example.com';
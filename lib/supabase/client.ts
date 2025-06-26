import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'ERROR: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required in .env.local'
  )
  // You might want to throw an error here or handle it gracefully depending on desired behavior
  // For now, this will cause createBrowserClient to be called with undefined, leading to Supabase errors.
}

export const supabase = createBrowserClient(supabaseUrl!, supabaseAnonKey!)
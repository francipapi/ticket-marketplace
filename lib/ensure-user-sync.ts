import { supabaseAdmin } from '@/lib/auth-server'

/**
 * Ensures that a Supabase auth user has a corresponding record in the users table
 * This is a safeguard in case the trigger didn't fire or failed
 */
export async function ensureUserSync(authUserId: string, email: string) {
  try {
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('supabaseId', authUserId)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking for existing user:', checkError)
      throw checkError
    }

    // If user doesn't exist, create them
    if (!existingUser) {
      const username = email.split('@')[0] + '_' + Date.now() // Add timestamp to ensure uniqueness
      
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          supabaseId: authUserId,
          email: email,
          username: username,
          migrationStatus: 'direct_signup'
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating user record:', insertError)
        throw insertError
      }

      console.log('Created missing user record:', newUser)
      return newUser
    }

    return existingUser
  } catch (error) {
    console.error('Error in ensureUserSync:', error)
    throw error
  }
}
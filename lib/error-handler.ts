// Global error handler for Supabase and auth errors

export function handleSupabaseError(error: any): void {
  // Check if it's a Supabase auth error that we should ignore/handle gracefully
  if (error?.message?.includes('AuthRetryableFetchError') ||
      error?.message?.includes('Load failed') ||
      error?.message?.includes('refresh_token_not_found') ||
      error?.message?.includes('Invalid Refresh Token')) {
    
    // These are connectivity/auth refresh errors that are usually temporary
    console.warn('Supabase connectivity issue (ignoring):', error.message)
    return
  }

  // Log other errors normally
  console.error('Supabase error:', error)
}

// Wrap Supabase calls with error handling
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await operation()
  } catch (error) {
    handleSupabaseError(error)
    return fallback
  }
}
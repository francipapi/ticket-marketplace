'use client';

// Since we're using Clerk, we don't need a custom auth provider
// Clerk Provider is already in the root layout

// Re-export a dummy hook for compatibility
export function useAuth() {
  return {
    user: null,
    loading: false,
    signOut: () => Promise.resolve(),
  };
}
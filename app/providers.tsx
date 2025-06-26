'use client';

import AuthProvider, { useAuth } from './providers/auth-provider';

// Simple providers wrapper
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}

// Re-export useAuth for convenience
export { useAuth };
import { useAuth as useClerkAuth, useUser } from '@clerk/nextjs';
import { useEffect, useState, useRef } from 'react';

interface AppUser {
  id: string; // Airtable record ID
  email: string;
  username: string;
  clerkId: string;
  rating?: number;
  isVerified?: boolean;
  totalSales?: number;
}

export function useAuth() {
  const { isLoaded, userId, signOut } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const syncInProgress = useRef(false);
  const lastSyncedUserId = useRef<string | null>(null);

  useEffect(() => {
    async function syncUser() {
      // Skip if not loaded or no user
      if (!isLoaded || !userId || !clerkUser) {
        setAppUser(null);
        setLoading(false);
        return;
      }
      
      // Skip if already syncing or already synced this user
      if (syncInProgress.current || lastSyncedUserId.current === userId) {
        return;
      }
      
      syncInProgress.current = true;
      
      try {
        const response = await fetch('/api/user/sync');
        
        if (response.ok) {
          const data = await response.json();
          setAppUser(data.user);
          lastSyncedUserId.current = userId;
        } else {
          console.error('Failed to sync user:', await response.text());
          setAppUser(null);
        }
      } catch (error) {
        console.error('Error syncing user:', error);
        setAppUser(null);
      } finally {
        syncInProgress.current = false;
        setLoading(false);
      }
    }

    syncUser();
  }, [isLoaded, userId, clerkUser]);

  return {
    user: appUser,
    loading,
    isAuthenticated: !!userId,
    signOut,
  };
}
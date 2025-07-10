'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUser as useClerkUser } from '@clerk/nextjs'
import { api } from '@/lib/api/client'
import { User, DashboardStats } from '@/lib/types'
import { toast } from 'sonner'

const USER_QUERY_KEY = 'user'

// User profile hooks
export function useUser() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useClerkUser()
  
  return useQuery({
    queryKey: [USER_QUERY_KEY, 'current'],
    queryFn: async () => {
      return api.get<User>('/api/user/sync')
    },
    enabled: clerkLoaded && !!clerkUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.status === 401 || error?.status === 403) {
        return false
      }
      return failureCount < 3
    }
  })
}

export function useUserProfile(userId?: string) {
  return useQuery({
    queryKey: [USER_QUERY_KEY, 'profile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required')
      return api.get<User>(`/api/users/${userId}`)
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useDashboardStats() {
  return useQuery({
    queryKey: [USER_QUERY_KEY, 'dashboard-stats'],
    queryFn: async () => {
      return api.get<DashboardStats>('/api/dashboard/stats')
    },
    staleTime: 60 * 1000, // 1 minute
  })
}

// User actions
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: Partial<User>) => {
      return api.put<User>('/api/user/profile', data)
    },
    onSuccess: (updatedUser) => {
      // Update user data in cache
      queryClient.setQueryData([USER_QUERY_KEY, 'current'], updatedUser)
      
      toast.success('Profile updated successfully!')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update profile')
    }
  })
}

export function useSyncUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      return api.post<User>('/api/user/sync-enhanced')
    },
    onSuccess: (syncedUser) => {
      // Update user data in cache
      queryClient.setQueryData([USER_QUERY_KEY, 'current'], syncedUser)
      
      toast.success('Profile synced successfully!')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to sync profile')
    }
  })
}

// Authentication helpers
export function useAuthenticatedUser() {
  const { user: clerkUser, isLoaded, isSignedIn } = useClerkUser()
  const { data: appUser, isLoading, error } = useUser()
  
  return {
    user: appUser,
    clerkUser,
    isLoading: !isLoaded || isLoading,
    isAuthenticated: isLoaded && isSignedIn && !!appUser,
    error
  }
}

// Utility hooks
export function useUserStats(userId?: string) {
  return useQuery({
    queryKey: [USER_QUERY_KEY, 'stats', userId],
    queryFn: async () => {
      const endpoint = userId ? `/api/users/${userId}/stats` : '/api/user/stats'
      return api.get<{
        totalListings: number
        activeListings: number
        totalSales: number
        averageRating: number
        joinedDate: string
        lastActivity: string
      }>(endpoint)
    },
    enabled: !userId || !!userId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useUserVerification() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (verificationData: {
      studentId?: string
      universityEmail?: string
      documentType?: string
      documentFile?: File
    }) => {
      const formData = new FormData()
      
      Object.entries(verificationData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'documentFile' && value instanceof File) {
            formData.append(key, value)
          } else {
            formData.append(key, String(value))
          }
        }
      })
      
      return api.post('/api/user/verify', formData)
    },
    onSuccess: () => {
      // Invalidate user data to refetch updated verification status
      queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEY] })
      
      toast.success('Verification request submitted! We\'ll review it within 24 hours.')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit verification request')
    }
  })
}

// Notification preferences
export function useNotificationPreferences() {
  return useQuery({
    queryKey: [USER_QUERY_KEY, 'notifications'],
    queryFn: async () => {
      return api.get<{
        emailOffers: boolean
        emailMessages: boolean
        emailUpdates: boolean
        pushOffers: boolean
        pushMessages: boolean
        pushUpdates: boolean
      }>('/api/user/notifications')
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (preferences: {
      emailOffers?: boolean
      emailMessages?: boolean
      emailUpdates?: boolean
      pushOffers?: boolean
      pushMessages?: boolean
      pushUpdates?: boolean
    }) => {
      return api.put('/api/user/notifications', preferences)
    },
    onSuccess: (updatedPreferences) => {
      // Update preferences in cache
      queryClient.setQueryData([USER_QUERY_KEY, 'notifications'], updatedPreferences)
      
      toast.success('Notification preferences updated!')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update preferences')
    }
  })
}
'use client'

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { 
  Listing, 
  CreateListingData, 
  UpdateListingData, 
  ListingFilters, 
  PaginatedResponse,
  QueryOptions 
} from '@/lib/types'
import { toast } from 'sonner'

const LISTINGS_QUERY_KEY = 'listings'

// Query hooks
export function useListings(filters?: ListingFilters & QueryOptions) {
  return useQuery({
    queryKey: [LISTINGS_QUERY_KEY, filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value))
          }
        })
      }
      
      const query = params.toString()
      return api.get<PaginatedResponse<Listing>>(
        `/api/listings${query ? `?${query}` : ''}`
      )
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useInfiniteListings(filters?: ListingFilters) {
  return useInfiniteQuery({
    queryKey: [LISTINGS_QUERY_KEY, 'infinite', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: '12'
      })
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value))
          }
        })
      }
      
      return api.get<PaginatedResponse<Listing>>(`/api/listings?${params}`)
    },
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination
      return page < totalPages ? page + 1 : undefined
    },
    initialPageParam: 1,
    staleTime: 60 * 1000,
  })
}

export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: [LISTINGS_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error('Listing ID is required')
      return api.get<Listing>(`/api/listings/${id}`)
    },
    enabled: !!id,
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useMyListings(filters?: Partial<ListingFilters>) {
  return useQuery({
    queryKey: [LISTINGS_QUERY_KEY, 'my', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value))
          }
        })
      }
      
      return api.get<Listing[]>(`/api/listings/my${params.toString() ? `?${params}` : ''}`)
    },
    staleTime: 30 * 1000,
  })
}

// Mutation hooks
export function useCreateListing() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: CreateListingData) => {
      const formData = new FormData()
      
      // Append regular fields
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'ticketFiles' && value !== undefined && value !== null) {
          formData.append(key, String(value))
        }
      })
      
      // Append files
      if (data.ticketFiles) {
        data.ticketFiles.forEach((file) => {
          formData.append('ticketFiles', file)
        })
      }
      
      return api.post<Listing>('/api/listings', formData)
    },
    onSuccess: (newListing) => {
      // Invalidate and refetch listings
      queryClient.invalidateQueries({ queryKey: [LISTINGS_QUERY_KEY] })
      toast.success('Listing created successfully!')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create listing')
    }
  })
}

export function useUpdateListing() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateListingData }) => {
      const formData = new FormData()
      
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'ticketFiles' && value !== undefined && value !== null) {
          formData.append(key, String(value))
        }
      })
      
      if (data.ticketFiles) {
        data.ticketFiles.forEach((file) => {
          formData.append('ticketFiles', file)
        })
      }
      
      return api.put<Listing>(`/api/listings/${id}`, formData)
    },
    onSuccess: (updatedListing, { id }) => {
      // Update specific listing in cache
      queryClient.setQueryData([LISTINGS_QUERY_KEY, id], updatedListing)
      
      // Invalidate listings list
      queryClient.invalidateQueries({ queryKey: [LISTINGS_QUERY_KEY] })
      
      toast.success('Listing updated successfully!')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update listing')
    }
  })
}

export function useDeleteListing() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/listings/${id}`)
    },
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: [LISTINGS_QUERY_KEY, id] })
      
      // Invalidate listings list
      queryClient.invalidateQueries({ queryKey: [LISTINGS_QUERY_KEY] })
      
      toast.success('Listing deleted successfully!')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete listing')
    }
  })
}

// Additional utility hooks
export function usePopularEvents() {
  return useQuery({
    queryKey: ['popular-events'],
    queryFn: async () => {
      return api.get<{ eventName: string; count: number; averagePrice: number }[]>(
        '/api/listings/popular-events'
      )
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useRecentListings(limit: number = 6) {
  return useQuery({
    queryKey: ['recent-listings', limit],
    queryFn: async () => {
      return api.get<Listing[]>(`/api/listings/recent?limit=${limit}`)
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}
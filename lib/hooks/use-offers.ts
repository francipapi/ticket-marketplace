'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { 
  Offer, 
  CreateOfferData, 
  OfferFilters,
  PaginatedResponse 
} from '@/lib/types'
import { toast } from 'sonner'

const OFFERS_QUERY_KEY = 'offers'

// Query hooks
export function useOffers(filters?: OfferFilters) {
  return useQuery({
    queryKey: [OFFERS_QUERY_KEY, filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value))
          }
        })
      }
      
      return api.get<Offer[]>(`/api/offers${params.toString() ? `?${params}` : ''}`)
    },
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useOffer(id: string | undefined) {
  return useQuery({
    queryKey: [OFFERS_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error('Offer ID is required')
      return api.get<Offer>(`/api/offers/${id}`)
    },
    enabled: !!id,
    staleTime: 15 * 1000, // 15 seconds
  })
}

export function useSentOffers() {
  return useQuery({
    queryKey: [OFFERS_QUERY_KEY, 'sent'],
    queryFn: async () => {
      return api.get<Offer[]>('/api/offers?type=sent')
    },
    staleTime: 30 * 1000,
  })
}

export function useReceivedOffers() {
  return useQuery({
    queryKey: [OFFERS_QUERY_KEY, 'received'],
    queryFn: async () => {
      return api.get<Offer[]>('/api/offers?type=received')
    },
    staleTime: 30 * 1000,
  })
}

export function useListingOffers(listingId: string | undefined) {
  return useQuery({
    queryKey: [OFFERS_QUERY_KEY, 'listing', listingId],
    queryFn: async () => {
      if (!listingId) throw new Error('Listing ID is required')
      return api.get<Offer[]>(`/api/offers?listingId=${listingId}`)
    },
    enabled: !!listingId,
    staleTime: 15 * 1000,
  })
}

// Mutation hooks
export function useCreateOffer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: CreateOfferData) => {
      return api.post<Offer>('/api/offers', data)
    },
    onSuccess: (newOffer) => {
      // Invalidate offers queries
      queryClient.invalidateQueries({ queryKey: [OFFERS_QUERY_KEY] })
      
      // Show success message based on offer type
      if (newOffer.messageTemplate === 'asking_price') {
        toast.success('Purchase offer sent! Seller will be notified.')
      } else if (newOffer.messageTemplate === 'make_offer') {
        toast.success('Your offer has been sent to the seller!')
      } else {
        toast.success('Your inquiry has been sent to the seller!')
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to send offer')
    }
  })
}

export function useAcceptOffer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (offerId: string) => {
      return api.post<Offer>(`/api/offers/${offerId}/accept`)
    },
    onSuccess: (acceptedOffer) => {
      // Update specific offer in cache
      queryClient.setQueryData([OFFERS_QUERY_KEY, acceptedOffer.id], acceptedOffer)
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: [OFFERS_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: ['listings', acceptedOffer.listing.id] })
      
      toast.success('Offer accepted! Payment processing will begin.')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to accept offer')
    }
  })
}

export function useDeclineOffer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ offerId, reason }: { offerId: string; reason?: string }) => {
      return api.post<Offer>(`/api/offers/${offerId}/decline`, { reason })
    },
    onSuccess: (declinedOffer) => {
      // Update specific offer in cache
      queryClient.setQueryData([OFFERS_QUERY_KEY, declinedOffer.id], declinedOffer)
      
      // Invalidate offers queries
      queryClient.invalidateQueries({ queryKey: [OFFERS_QUERY_KEY] })
      
      toast.success('Offer declined.')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to decline offer')
    }
  })
}

export function useRespondToOffer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      offerId, 
      action, 
      counterOfferPrice, 
      message 
    }: { 
      offerId: string
      action: 'accept' | 'decline' | 'counter'
      counterOfferPrice?: number
      message?: string 
    }) => {
      return api.post<Offer>(`/api/offers/${offerId}/respond`, {
        action,
        counterOfferPrice,
        message
      })
    },
    onSuccess: (updatedOffer, { action }) => {
      // Update specific offer in cache
      queryClient.setQueryData([OFFERS_QUERY_KEY, updatedOffer.id], updatedOffer)
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: [OFFERS_QUERY_KEY] })
      
      if (action === 'accept') {
        toast.success('Offer accepted! Payment processing will begin.')
      } else if (action === 'decline') {
        toast.success('Offer declined.')
      } else if (action === 'counter') {
        toast.success('Counter offer sent!')
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to respond to offer')
    }
  })
}

// Utility hooks
export function usePendingOffersCount() {
  return useQuery({
    queryKey: [OFFERS_QUERY_KEY, 'pending-count'],
    queryFn: async () => {
      const offers = await api.get<Offer[]>('/api/offers?type=received&status=PENDING')
      return offers.length
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

export function useOfferStats() {
  return useQuery({
    queryKey: [OFFERS_QUERY_KEY, 'stats'],
    queryFn: async () => {
      return api.get<{
        totalSent: number
        totalReceived: number
        acceptanceRate: number
        averageOfferPrice: number
      }>('/api/offers/stats')
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
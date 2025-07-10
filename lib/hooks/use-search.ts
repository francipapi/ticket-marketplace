'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, useCallback } from 'react'
import { api } from '@/lib/api/client'
import { Listing, SearchResult } from '@/lib/types'
import { debounce } from '@/lib/utils'

// Search hooks
export function useSearch(query: string, options?: {
  enabled?: boolean
  debounceMs?: number
}) {
  const { enabled = true, debounceMs = 300 } = options || {}
  
  return useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      if (!query.trim()) {
        return { listings: [], totalCount: 0, suggestions: [] }
      }
      
      return api.get<SearchResult>(`/api/search?q=${encodeURIComponent(query)}`)
    },
    enabled: enabled && query.length >= 2,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useSearchSuggestions(query: string) {
  return useQuery({
    queryKey: ['search-suggestions', query],
    queryFn: async () => {
      if (!query.trim()) return []
      
      return api.get<string[]>(`/api/search/suggestions?q=${encodeURIComponent(query)}`)
    },
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function usePopularSearches() {
  return useQuery({
    queryKey: ['popular-searches'],
    queryFn: async () => {
      return api.get<{ term: string; count: number }[]>('/api/search/popular')
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useRecentSearches() {
  const [searches, setSearches] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('recent-searches')
      return stored ? JSON.parse(stored) : []
    }
    return []
  })

  const addSearch = useCallback((query: string) => {
    if (!query.trim()) return

    const newSearches = [
      query,
      ...searches.filter(s => s !== query)
    ].slice(0, 10) // Keep only last 10 searches

    setSearches(newSearches)
    localStorage.setItem('recent-searches', JSON.stringify(newSearches))
  }, [searches])

  const clearSearches = useCallback(() => {
    setSearches([])
    localStorage.removeItem('recent-searches')
  }, [])

  return {
    searches,
    addSearch,
    clearSearches
  }
}

// Advanced search hook
export function useAdvancedSearch(filters: {
  query?: string
  eventName?: string
  minPrice?: number
  maxPrice?: number
  dateFrom?: string
  dateTo?: string
  venue?: string
  ticketType?: string
}) {
  return useQuery({
    queryKey: ['advanced-search', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })
      
      if (params.toString() === '') {
        return { listings: [], totalCount: 0, suggestions: [] }
      }
      
      return api.get<SearchResult>(`/api/search/advanced?${params}`)
    },
    enabled: Object.values(filters).some(v => v !== undefined && v !== null && v !== ''),
    staleTime: 60 * 1000, // 1 minute
  })
}

// Custom hook for debounced search
export function useDebouncedSearch(initialQuery: string = '', debounceMs: number = 300) {
  const [query, setQuery] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)

  const debouncedSetQuery = useCallback(
    debounce((value: string) => {
      setDebouncedQuery(value)
    }, debounceMs),
    [debounceMs]
  )

  const updateQuery = useCallback((value: string) => {
    setQuery(value)
    debouncedSetQuery(value)
  }, [debouncedSetQuery])

  const { data, isLoading, error } = useSearch(debouncedQuery)

  return {
    query,
    debouncedQuery,
    updateQuery,
    setQuery: updateQuery,
    results: data,
    isLoading,
    error
  }
}

// Event-specific search
export function useEventSearch(eventName: string) {
  return useQuery({
    queryKey: ['event-search', eventName],
    queryFn: async () => {
      if (!eventName.trim()) return []
      
      return api.get<Listing[]>(`/api/search/events?event=${encodeURIComponent(eventName)}`)
    },
    enabled: eventName.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Venue search
export function useVenueSearch(venue: string) {
  return useQuery({
    queryKey: ['venue-search', venue],
    queryFn: async () => {
      if (!venue.trim()) return []
      
      return api.get<Listing[]>(`/api/search/venues?venue=${encodeURIComponent(venue)}`)
    },
    enabled: venue.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Search analytics
export function useSearchAnalytics() {
  return useQuery({
    queryKey: ['search-analytics'],
    queryFn: async () => {
      return api.get<{
        totalSearches: number
        topSearchTerms: { term: string; count: number }[]
        noResultsTerms: { term: string; count: number }[]
        avgResultsPerSearch: number
      }>('/api/search/analytics')
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  })
}
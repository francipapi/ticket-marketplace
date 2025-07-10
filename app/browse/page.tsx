'use client'

import { useState, useMemo, useEffect } from 'react'
import { format } from 'date-fns'
import { Filter, Grid, List, Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useListings } from '@/lib/hooks/use-listings'
// Removed unused import: useDebouncedSearch
import { Listing, ListingFilters } from '@/lib/types'
import { formatPrice } from '@/lib/utils'
import Link from 'next/link'

interface FilterState extends ListingFilters {
  groupBy: 'event' | 'date' | 'venue'
  viewMode: 'grid' | 'list'
}

export default function BrowsePage() {
  const [filters, setFilters] = useState<FilterState>({
    groupBy: 'event',
    viewMode: 'grid'
  })
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: listingsData, isLoading, error, refetch } = useListings(filters)

  // Filter listings based on search query
  const listings = useMemo(() => {
    const allListings = listingsData?.data || []
    
    if (!searchQuery.trim()) return allListings
    
    const query = searchQuery.toLowerCase()
    return allListings.filter(listing => 
      listing.title.toLowerCase().includes(query) ||
      listing.eventName.toLowerCase().includes(query) ||
      listing.description?.toLowerCase().includes(query) ||
      listing.venue?.toLowerCase().includes(query)
    )
  }, [listingsData?.data, searchQuery])

  // Group listings based on groupBy filter
  const groupedListings = useMemo(() => {
    if (!listings.length) return {}

    return listings.reduce((acc, listing) => {
      let key: string
      
      switch (filters.groupBy) {
        case 'event':
          key = listing.eventName
          break
        case 'date':
          key = format(new Date(listing.eventDate), 'EEEE, MMMM d, yyyy')
          break
        case 'venue':
          key = listing.venue || 'Unknown Venue'
          break
        default:
          key = 'All Listings'
      }

      if (!acc[key]) acc[key] = []
      acc[key].push(listing)
      return acc
    }, {} as Record<string, Listing[]>)
  }, [listings, filters.groupBy])

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      groupBy: 'event',
      viewMode: 'grid'
    })
    setSearchQuery('')
  }

  // Refetch listings when page becomes visible (e.g., after delisting)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && refetch) {
        refetch()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [refetch])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Browse Tickets
          </h1>
          <p className="text-gray-600">
            Find tickets for events happening at Warwick University
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Search events, venues, or ticket types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 text-lg"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {Object.keys(filters).some(key => 
                key !== 'groupBy' && key !== 'viewMode' && filters[key as keyof FilterState]
              ) && (
                <Badge variant="secondary" className="ml-1">
                  {Object.keys(filters).filter(key => 
                    key !== 'groupBy' && key !== 'viewMode' && filters[key as keyof FilterState]
                  ).length}
                </Badge>
              )}
            </Button>

            {/* Group By */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Group by:</span>
              <div className="flex border rounded-md">
                {(['event', 'date', 'venue'] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => updateFilter('groupBy', option)}
                    className={`px-3 py-1 text-sm capitalize ${
                      filters.groupBy === option
                        ? 'bg-purple-700 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* View Mode */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">View:</span>
              <div className="flex border rounded-md">
                <button
                  onClick={() => updateFilter('viewMode', 'grid')}
                  className={`p-2 ${
                    filters.viewMode === 'grid'
                      ? 'bg-purple-700 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => updateFilter('viewMode', 'list')}
                  className={`p-2 ${
                    filters.viewMode === 'list'
                      ? 'bg-purple-700 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1" />

            {/* Clear Filters */}
            {Boolean(searchQuery || Object.keys(filters).some(key => 
              key !== 'groupBy' && key !== 'viewMode' && filters[key as keyof FilterState]
            )) && (
              <Button variant="ghost" onClick={clearFilters} className="text-sm">
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && <FilterPanel filters={filters} onChange={updateFilter} />}

        {/* Results */}
        <div className="space-y-8">
          {isLoading ? (
            <LoadingSkeleton viewMode={filters.viewMode} />
          ) : error ? (
            <ErrorState />
          ) : listings.length === 0 ? (
            <EmptyState hasFilters={Boolean(searchQuery || Object.keys(filters).some(key => 
              key !== 'groupBy' && key !== 'viewMode' && filters[key as keyof FilterState]
            ))} />
          ) : (
            Object.entries(groupedListings).map(([groupKey, groupListings]) => (
              <EventSection
                key={groupKey}
                title={groupKey}
                listings={groupListings}
                viewMode={filters.viewMode}
                groupBy={filters.groupBy}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// Filter Panel Component
interface FilterPanelProps {
  filters: FilterState
  onChange: (key: keyof FilterState, value: any) => void
}

function FilterPanel({ filters, onChange }: FilterPanelProps) {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-lg">Advanced Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Price (£)
            </label>
            <Input
              type="number"
              placeholder="0"
              value={filters.minPrice ? (filters.minPrice / 100).toString() : ''}
              onChange={(e) => onChange('minPrice', e.target.value ? Math.round(Number(e.target.value) * 100) : undefined)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Price (£)
            </label>
            <Input
              type="number"
              placeholder="500"
              value={filters.maxPrice ? (filters.maxPrice / 100).toString() : ''}
              onChange={(e) => onChange('maxPrice', e.target.value ? Math.round(Number(e.target.value) * 100) : undefined)}
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <Input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => onChange('dateFrom', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <Input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => onChange('dateTo', e.target.value)}
            />
          </div>

          {/* Venue */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Venue
            </label>
            <Input
              placeholder="Enter venue name"
              value={filters.venue || ''}
              onChange={(e) => onChange('venue', e.target.value)}
            />
          </div>

          {/* Ticket Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ticket Type
            </label>
            <Input
              placeholder="e.g. General, VIP, Student"
              value={filters.ticketType || ''}
              onChange={(e) => onChange('ticketType', e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Event Section Component
interface EventSectionProps {
  title: string
  listings: Listing[]
  viewMode: 'grid' | 'list'
  groupBy: 'event' | 'date' | 'venue'
}

function EventSection({ title, listings, viewMode, groupBy }: EventSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="space-y-4">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          {title}
          <Badge variant="secondary">{listings.length}</Badge>
        </h2>
        <Button variant="ghost" size="sm">
          {isExpanded ? 'Collapse' : 'Expand'}
        </Button>
      </div>

      {isExpanded && (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'space-y-4'
        }>
          {listings.map((listing) => (
            <TicketCard key={listing.id} listing={listing} viewMode={viewMode} />
          ))}
        </div>
      )}
    </div>
  )
}

// Ticket Card Component
interface TicketCardProps {
  listing: Listing
  viewMode: 'grid' | 'list'
}

function TicketCard({ listing, viewMode }: TicketCardProps) {
  if (viewMode === 'list') {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Link href={`/listings/${listing.id}`} className="block">
                <h3 className="font-semibold text-lg text-gray-900 hover:text-purple-700">
                  {listing.title}
                </h3>
                <p className="text-gray-600">{listing.eventName}</p>
                <p className="text-sm text-gray-500">
                  {format(new Date(listing.eventDate), 'PPP')}{listing.venue ? ` • ${listing.venue}` : ''}
                </p>
              </Link>
            </div>
            <div className="text-right ml-4">
              <p className="text-2xl font-bold text-purple-700">
                {formatPrice(listing.priceInCents)}
              </p>
              <p className="text-sm text-gray-500">
                {listing.quantity} ticket{listing.quantity !== 1 ? 's' : ''} available
              </p>
              <Badge 
                variant={listing.status === 'ACTIVE' ? 'default' : 'secondary'}
                className="mt-1"
              >
                {listing.status.toLowerCase()}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="h-32 bg-gradient-to-br from-purple-500 to-gold-500 relative">
        <div className="absolute top-2 right-2">
          <Badge variant="secondary">
            {listing.quantity} available
          </Badge>
        </div>
      </div>
      <CardContent className="p-4">
        <Link href={`/listings/${listing.id}`} className="block">
          <h3 className="font-semibold text-lg text-gray-900 hover:text-purple-700 mb-1">
            {listing.title}
          </h3>
          <p className="text-gray-600 mb-2">{listing.eventName}</p>
          <p className="text-sm text-gray-500 mb-3">
            {format(new Date(listing.eventDate), 'MMM d')}{listing.venue ? ` • ${listing.venue}` : ''}
          </p>
        </Link>
        <div className="flex justify-between items-center">
          <span className="text-xl font-bold text-purple-700">
            {formatPrice(listing.priceInCents)}
          </span>
          <Badge 
            variant={listing.status === 'ACTIVE' ? 'default' : 'secondary'}
          >
            {listing.status.toLowerCase()}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

// Loading skeleton
function LoadingSkeleton({ viewMode }: { viewMode: 'grid' | 'list' }) {
  return (
    <div className="space-y-8">
      {[1, 2, 3].map((group) => (
        <div key={group} className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
          }>
            {[1, 2, 3, 4].map((item) => (
              <Card key={item}>
                <CardContent className="p-4">
                  {viewMode === 'grid' ? (
                    <>
                      <Skeleton className="h-32 w-full mb-4" />
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-2" />
                      <Skeleton className="h-4 w-2/3" />
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <div className="flex-1">
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2 mb-1" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                      <div className="text-right ml-4">
                        <Skeleton className="h-8 w-20 mb-2" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Error state
function ErrorState() {
  return (
    <Card className="text-center py-12">
      <CardContent>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Something went wrong
        </h3>
        <p className="text-gray-600 mb-4">
          We couldn't load the tickets. Please try again.
        </p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </CardContent>
    </Card>
  )
}

// Empty state
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <Card className="text-center py-12">
      <CardContent>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {hasFilters ? 'No tickets match your search' : 'No tickets available'}
        </h3>
        <p className="text-gray-600 mb-4">
          {hasFilters 
            ? 'Try adjusting your filters or search terms'
            : 'Be the first to list tickets for upcoming events!'
          }
        </p>
        <div className="flex gap-4 justify-center">
          {hasFilters && (
            <Button variant="outline" onClick={() => window.location.reload()}>
              Clear Filters
            </Button>
          )}
          <Link href="/listings/create-ocr">
            <Button>List Your Tickets</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
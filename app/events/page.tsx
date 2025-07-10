'use client'

import { useState } from 'react'
import { format, isBefore, isAfter, startOfDay } from 'date-fns'
import { Calendar, MapPin, Users, Clock, ArrowRight, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useListings, usePopularEvents } from '@/lib/hooks/use-listings'
import { Listing } from '@/lib/types'
import { formatPrice } from '@/lib/utils'
import Link from 'next/link'

interface EventGroup {
  eventName: string
  listings: Listing[]
  earliestDate: Date
  latestDate: Date
  totalTickets: number
  priceRange: { min: number; max: number }
  venues: string[]
}

export default function EventsPage() {
  const [timeFilter, setTimeFilter] = useState<'all' | 'upcoming' | 'this-week' | 'this-month'>('upcoming')
  const [searchQuery, setSearchQuery] = useState('')
  const { data: listingsData, isLoading } = useListings()
  const { data: popularEvents } = usePopularEvents()

  // Filter listings based on search query (client-side)
  const allListings = listingsData?.data || []
  const listings = searchQuery.trim() 
    ? allListings.filter(listing => 
        listing.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.venue?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allListings

  // Group listings by event
  const eventGroups: EventGroup[] = []
  const eventMap = new Map<string, Listing[]>()

  listings.forEach(listing => {
    if (!eventMap.has(listing.eventName)) {
      eventMap.set(listing.eventName, [])
    }
    eventMap.get(listing.eventName)!.push(listing)
  })

  eventMap.forEach((eventListings, eventName) => {
    const dates = eventListings.map(l => new Date(l.eventDate))
    const prices = eventListings.map(l => l.priceInCents)
    const venues = [...new Set(eventListings.map(l => l.venue).filter(Boolean) as string[])]

    eventGroups.push({
      eventName,
      listings: eventListings,
      earliestDate: new Date(Math.min(...dates.map(d => d.getTime()))),
      latestDate: new Date(Math.max(...dates.map(d => d.getTime()))),
      totalTickets: eventListings.reduce((sum, l) => sum + l.quantity, 0),
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices)
      },
      venues
    })
  })

  // Filter by time
  const filteredEventGroups = eventGroups.filter(group => {
    const now = new Date()
    const today = startOfDay(now)
    
    switch (timeFilter) {
      case 'upcoming':
        return isAfter(group.earliestDate, today) || isAfter(group.latestDate, today)
      case 'this-week':
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
        return isAfter(group.latestDate, today) && isBefore(group.earliestDate, nextWeek)
      case 'this-month':
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
        return isAfter(group.latestDate, today) && isBefore(group.earliestDate, nextMonth)
      default:
        return true
    }
  })

  // Sort by earliest date
  filteredEventGroups.sort((a, b) => a.earliestDate.getTime() - b.earliestDate.getTime())

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Events at Warwick
          </h1>
          <p className="text-gray-600">
            Discover upcoming events and find tickets from fellow students
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-lg"
              />
            </div>
            
            <div className="flex gap-2">
              {(['all', 'upcoming', 'this-week', 'this-month'] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={timeFilter === filter ? 'default' : 'outline'}
                  onClick={() => setTimeFilter(filter)}
                  className="capitalize"
                >
                  {filter.replace('-', ' ')}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Popular Events */}
        {!searchQuery && popularEvents && popularEvents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Popular This Week</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {popularEvents.slice(0, 3).map((event, index) => (
                <Card key={event.eventName} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-gold-500' : 
                        index === 1 ? 'bg-gray-400' : 
                        'bg-orange-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{event.eventName}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>{event.count} tickets</span>
                          <span>avg {formatPrice(event.averagePrice)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Event Groups */}
        <div className="space-y-6">
          {isLoading ? (
            <EventsSkeleton />
          ) : filteredEventGroups.length === 0 ? (
            <EmptyEventsState hasSearch={!!searchQuery} timeFilter={timeFilter} />
          ) : (
            filteredEventGroups.map((eventGroup) => (
              <EventCard key={eventGroup.eventName} eventGroup={eventGroup} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// Event Card Component
interface EventCardProps {
  eventGroup: EventGroup
}

function EventCard({ eventGroup }: EventCardProps) {
  const isMultiDay = eventGroup.earliestDate.getTime() !== eventGroup.latestDate.getTime()
  const isPastEvent = isBefore(eventGroup.latestDate, new Date())

  return (
    <Card className={`hover:shadow-lg transition-shadow ${isPastEvent ? 'opacity-75' : ''}`}>
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Event Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {eventGroup.eventName}
                  {isPastEvent && (
                    <Badge variant="secondary" className="ml-2">Past Event</Badge>
                  )}
                </h2>
                
                <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {isMultiDay ? (
                        `${format(eventGroup.earliestDate, 'MMM d')} - ${format(eventGroup.latestDate, 'MMM d, yyyy')}`
                      ) : (
                        format(eventGroup.earliestDate, 'EEEE, MMMM d, yyyy')
                      )}
                    </span>
                  </div>
                  
                  {eventGroup.venues.length > 0 && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {eventGroup.venues.length === 1 
                          ? eventGroup.venues[0]
                          : `${eventGroup.venues.length} venues`
                        }
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{eventGroup.totalTickets} tickets available</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Range */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700">Price Range:</span>
                <span className="text-lg font-bold text-purple-700">
                  {eventGroup.priceRange.min === eventGroup.priceRange.max 
                    ? formatPrice(eventGroup.priceRange.min)
                    : `${formatPrice(eventGroup.priceRange.min)} - ${formatPrice(eventGroup.priceRange.max)}`
                  }
                </span>
              </div>
            </div>

            {/* Venue List */}
            {eventGroup.venues.length > 1 && (
              <div className="mb-4">
                <span className="text-sm font-medium text-gray-700 block mb-2">Venues:</span>
                <div className="flex flex-wrap gap-2">
                  {eventGroup.venues.map((venue) => (
                    <Badge key={venue} variant="outline">{venue}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats & Action */}
          <div className="lg:w-64 space-y-4">
            <Card className="bg-gradient-to-br from-purple-50 to-gold-50 border-purple-200">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-700 mb-1">
                    {eventGroup.listings.length}
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    {eventGroup.listings.length === 1 ? 'listing' : 'listings'}
                  </div>
                  
                  <Link href={`/browse?eventName=${encodeURIComponent(eventGroup.eventName)}`}>
                    <Button className="w-full" size="sm">
                      View All Tickets
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Quick Preview of Tickets */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Recent Listings:</span>
              {eventGroup.listings.slice(0, 3).map((listing) => (
                <Link 
                  key={listing.id} 
                  href={`/listings/${listing.id}`}
                  className="block"
                >
                  <Card className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {listing.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {listing.quantity} tickets
                          </p>
                        </div>
                        <span className="text-sm font-bold text-purple-700 ml-2">
                          {formatPrice(listing.priceInCents)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              
              {eventGroup.listings.length > 3 && (
                <p className="text-xs text-gray-500 text-center">
                  +{eventGroup.listings.length - 3} more listings
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Loading skeleton
function EventsSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="flex gap-4">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-28"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-48"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                  <div className="h-6 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
              <div className="lg:w-64 space-y-4">
                <div className="h-32 bg-gray-200 rounded"></div>
                <div className="space-y-2">
                  <div className="h-12 bg-gray-200 rounded"></div>
                  <div className="h-12 bg-gray-200 rounded"></div>
                  <div className="h-12 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Empty state
function EmptyEventsState({ hasSearch, timeFilter }: { hasSearch: boolean; timeFilter: string }) {
  return (
    <Card className="text-center py-12">
      <CardContent>
        <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {hasSearch ? 'No events match your search' : `No ${timeFilter} events`}
        </h3>
        <p className="text-gray-600 mb-6">
          {hasSearch 
            ? 'Try adjusting your search terms or browse all events'
            : `Check back later for ${timeFilter === 'all' ? 'new' : timeFilter} events, or list your own tickets!`
          }
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/browse">
            <Button variant="outline">Browse All Tickets</Button>
          </Link>
          <Link href="/listings/create-ocr">
            <Button>List Your Tickets</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { useListings } from '@/lib/hooks/use-listings'
import { useOffers } from '@/lib/hooks/use-offers'
import { 
  Package, 
  Tag, 
  ShoppingBag, 
  Plus, 
  Eye, 
  Edit, 
  Trash2,
  TrendingUp,
  DollarSign,
  Calendar,
  MapPin
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

export default function EnhancedDashboard() {
  const { user, loading: authLoading } = useAuth()
  
  // Get user's listings
  const { data: listingsData, isLoading: listingsLoading, error: listingsError } = useListings({})
  
  // Get sent offers  
  const { data: sentOffers, isLoading: sentLoading } = useOffers({ type: 'sent' })
  
  // Get received offers
  const { data: receivedOffers, isLoading: receivedLoading } = useOffers({ type: 'received' })
  
  const listings = listingsData?.data || []
  const activeListings = listings.filter(l => l.status === 'ACTIVE')
  const totalViews = listings.reduce((sum, l) => sum + ((l as any).views || 0), 0)
  const totalValue = listings.reduce((sum, l) => sum + (l.priceInCents * l.quantity), 0)

  const handleDeleteListing = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return

    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast.success('Listing deleted successfully')
        // The useListings hook will automatically refetch
      } else {
        toast.error('Failed to delete listing')
      }
    } catch (error) {
      console.error('Error deleting listing:', error)
      toast.error('Failed to delete listing')
    }
  }

  if (authLoading) {
    return <DashboardSkeleton />
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-8">
            <h2 className="text-xl font-semibold mb-4">Please sign in</h2>
            <p className="text-gray-600 mb-6">You need to sign in to view your dashboard</p>
            <Link href="/sign-in">
              <Button>Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back, {user.username}!</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-full">
                  <Package className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Listings</p>
                  <p className="text-2xl font-bold text-gray-900">{activeListings.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-full">
                  <Tag className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Offers Received</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {receivedLoading ? <Skeleton className="h-8 w-8" /> : (receivedOffers?.length || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-full">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Views</p>
                  <p className="text-2xl font-bold text-gray-900">{totalViews}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-gold-100 p-3 rounded-full">
                  <DollarSign className="h-6 w-6 text-gold-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPrice(totalValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Listings */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>My Listings</CardTitle>
              <Link href="/listings/create-ocr">
                <Button className="bg-purple-700 hover:bg-purple-800">
                  <Plus className="h-4 w-4 mr-2" />
                  New Listing
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {listingsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : listingsError ? (
              <div className="text-center py-8">
                <p className="text-red-600">Error loading listings: {listingsError.message}</p>
                <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
                  Retry
                </Button>
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No listings yet</h3>
                <p className="text-gray-600 mb-4">Create your first listing to start selling tickets</p>
                <Link href="/listings/create-ocr">
                  <Button>Create Listing</Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {listings.map((listing) => (
                  <div key={listing.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-gold-500 rounded-lg flex items-center justify-center">
                        <Package className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{listing.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDate(listing.eventDate)}
                          </div>
                          {listing.venue && (
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {listing.venue}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-semibold text-purple-700">{formatPrice(listing.priceInCents)}</p>
                        <p className="text-sm text-gray-500">{listing.quantity} tickets</p>
                      </div>
                      
                      <Badge
                        variant={listing.status === 'ACTIVE' ? 'default' : 'secondary'}
                        className={listing.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {listing.status}
                      </Badge>
                      
                      <div className="flex items-center text-gray-400">
                        <Eye className="h-4 w-4 mr-1" />
                        <span className="text-sm">{(listing as any).views || 0}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Link href={`/listings/${listing.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/listings/edit/${listing.id}`}>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteListing(listing.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Offers Section */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Offers Received */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Tag className="h-5 w-5 mr-2 text-green-600" />
                Offers Received
              </CardTitle>
            </CardHeader>
            <CardContent>
              {receivedLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : !receivedOffers || receivedOffers.length === 0 ? (
                <div className="text-center py-8">
                  <Tag className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No offers received yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {receivedOffers.slice(0, 5).map((offer) => (
                    <div key={offer.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium">{offer.listing?.title || 'Unknown Event'}</p>
                        <p className="text-sm text-gray-600">
                          {formatPrice(offer.offerPriceInCents)} • {offer.quantity} tickets
                        </p>
                      </div>
                      <Badge
                        variant={
                          offer.status === 'PENDING' ? 'default' :
                          offer.status === 'ACCEPTED' ? 'secondary' :
                          'outline'
                        }
                        className={
                          offer.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          offer.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }
                      >
                        {offer.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Offers Sent */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingBag className="h-5 w-5 mr-2 text-blue-600" />
                Offers Sent
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sentLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : !sentOffers || sentOffers.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingBag className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No offers sent yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sentOffers.slice(0, 5).map((offer) => (
                    <div key={offer.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium">{offer.listing?.title || 'Unknown Event'}</p>
                        <p className="text-sm text-gray-600">
                          {formatPrice(offer.offerPriceInCents)} • {offer.quantity} tickets
                        </p>
                      </div>
                      <Badge
                        variant={
                          offer.status === 'PENDING' ? 'default' :
                          offer.status === 'ACCEPTED' ? 'secondary' :
                          'outline'
                        }
                        className={
                          offer.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          offer.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }
                      >
                        {offer.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
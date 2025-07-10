'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { toast } from 'sonner';
import { 
  Calendar, 
  MapPin, 
  User, 
  ArrowLeft, 
  MessageSquare,
  Clock,
  CreditCard,
  Shield,
  Ticket,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BuyNowDialog } from '@/components/offers/buy-now-dialog';
import { PlaceBidDialog } from '@/components/offers/place-bid-dialog';
import { format } from 'date-fns';

interface Listing {
  id: string;
  title: string;
  eventName: string;
  eventDate: string;
  venue?: string;
  priceInCents: number;
  quantity: number;
  description?: string;
  createdAt: string;
  seller: {
    id: string;
    username: string;
    rating: number;
    createdAt: string;
  };
  user?: {
    id: string;
    username: string;
    createdAt: string;
  };
  offers: Array<{
    id: string;
    offerPriceInCents: number;
    quantity: number;
    createdAt: string;
    buyer: {
      username: string;
    };
  }>;
}

export default function ListingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBuyNow, setShowBuyNow] = useState(false);
  const [showPlaceBid, setShowPlaceBid] = useState(false);

  const fetchListing = useCallback(async () => {
    try {
      const response = await fetch(`/api/listings/${params.id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Listing not found');
        } else {
          toast.error('Failed to load listing');
        }
        router.push('/listings');
        return;
      }
      
      const result = await response.json();
      
      // Handle different response formats
      const listing = result.success ? result.data?.listing || result.data : result;
      
      if (listing && listing.id) {
        console.log('Fetched listing:', listing); // Debug log
        setListing(listing);
      } else {
        console.error('Invalid listing data:', result);
        toast.error('Invalid listing data');
        router.push('/listings');
      }
    } catch (error) {
      console.error('Error fetching listing:', error);
      toast.error('Failed to load listing');
      router.push('/listings');
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    if (params.id) {
      fetchListing();
    }
  }, [fetchListing, params.id]);

  const formatPrice = (priceInCents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(priceInCents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-8"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Listing not found</h1>
          <Link
            href="/listings"
            className="text-blue-600 hover:text-blue-500"
          >
            ← Back to listings
          </Link>
        </div>
      </div>
    );
  }

  const seller = listing.seller || listing.user;
  const isOwner = user?.id === seller?.id;
  const canMakeOffer = user && !isOwner;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/browse"
            className="inline-flex items-center text-purple-600 hover:text-purple-500 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to browse
          </Link>
          
          <div className="flex items-center gap-3 mb-4">
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              {listing.quantity} available
            </Badge>
            <Badge className="bg-green-100 text-green-800">
              Active Listing
            </Badge>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{listing.title}</h1>
          <p className="text-xl text-gray-600">{listing.eventName}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery Placeholder */}
            <Card>
              <CardContent className="p-0">
                <div className="h-64 bg-gradient-to-br from-purple-500 to-gold-500 rounded-t-lg flex items-center justify-center">
                  <Ticket className="h-16 w-16 text-white" />
                </div>
              </CardContent>
            </Card>
            
            {/* Event Details */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-6">Event Details</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center text-gray-900">
                    <Calendar className="h-5 w-5 mr-3 text-purple-600" />
                    <div>
                      <div className="font-medium">{format(new Date(listing.eventDate), 'EEEE, MMMM d, yyyy')}</div>
                      <div className="text-sm text-gray-500">{format(new Date(listing.eventDate), 'h:mm a')}</div>
                    </div>
                  </div>
                  
                  {listing.venue && (
                    <div className="flex items-center text-gray-900">
                      <MapPin className="h-5 w-5 mr-3 text-purple-600" />
                      <span>{listing.venue}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-gray-900">
                    <User className="h-5 w-5 mr-3 text-purple-600" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span>Sold by {seller?.username}</span>
                        {seller?.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-gold-500 fill-current" />
                            <span className="text-sm">{seller.rating}/5</span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        Member since {formatRelativeDate(seller?.createdAt || listing.createdAt)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center text-gray-900">
                    <Clock className="h-5 w-5 mr-3 text-purple-600" />
                    <span>Listed {formatRelativeDate(listing.createdAt)}</span>
                  </div>
                </div>
                
                {listing.description && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="font-semibold mb-3">Description</h3>
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{listing.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Offers */}
            {listing.offers.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Recent Offers</h2>
                  <div className="space-y-4">
                    {listing.offers.slice(0, 3).map((offer) => (
                      <div key={offer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{offer.buyer.username}</div>
                          <div className="text-sm text-gray-600">
                            Offered {formatPrice(offer.offerPriceInCents)}
                            {offer.quantity > 1 && ` for ${offer.quantity} tickets`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">
                            {formatRelativeDate(offer.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price & Actions */}
            <Card>
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <p className="text-sm text-gray-500">Price per ticket</p>
                  <p className="text-4xl font-bold text-purple-700">
                    £{(listing.priceInCents / 100).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {listing.quantity} ticket{listing.quantity !== 1 ? 's' : ''} available
                  </p>
                </div>
                
                {canMakeOffer ? (
                  <div className="space-y-3">
                    <Button
                      size="lg"
                      className="w-full bg-purple-700 hover:bg-purple-800"
                      onClick={() => setShowBuyNow(true)}
                    >
                      <CreditCard className="mr-2 h-5 w-5" />
                      Buy Now
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full border-purple-200 text-purple-700 hover:bg-purple-50"
                      onClick={() => setShowPlaceBid(true)}
                    >
                      <MessageSquare className="mr-2 h-5 w-5" />
                      Place Bid
                    </Button>
                  </div>
                ) : isOwner ? (
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">This is your listing</p>
                    <Link href={`/listings/edit/${listing.id}`}>
                      <Button size="lg" variant="outline" className="w-full">
                        Edit Listing
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">Please sign in to purchase</p>
                    <Link href="/sign-in">
                      <Button size="lg" className="w-full">
                        Sign In
                      </Button>
                    </Link>
                  </div>
                )}
                
                {/* Urgency Indicator */}
                <div className="mt-4 text-center">
                  <p className="text-sm text-orange-600">
                    <User className="inline w-4 h-4 mr-1" />
                    {Math.floor(Math.random() * 5) + 2} others viewing this listing
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* Trust Indicators */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Why buy with us?</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-green-500" />
                    <span>Secure payment processing</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <span>Instant ticket delivery</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-purple-500" />
                    <span>University verified sellers</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modals */}
        <BuyNowDialog
          listing={{
            id: listing.id,
            title: listing.title,
            eventName: listing.eventName,
            eventDate: listing.eventDate,
            priceInCents: listing.priceInCents,
            quantity: listing.quantity,
            seller: {
              id: seller?.id || '',
              username: seller?.username || '',
              rating: seller?.rating || 5
            }
          }}
          open={showBuyNow}
          onClose={() => setShowBuyNow(false)}
        />
        <PlaceBidDialog
          listing={{
            id: listing.id,
            title: listing.title,
            eventName: listing.eventName,
            eventDate: listing.eventDate,
            priceInCents: listing.priceInCents,
            quantity: listing.quantity,
            seller: {
              id: seller?.id || '',
              username: seller?.username || '',
              rating: seller?.rating || 5
            }
          }}
          open={showPlaceBid}
          onClose={() => setShowPlaceBid(false)}
        />
      </div>
    </div>
  );
}


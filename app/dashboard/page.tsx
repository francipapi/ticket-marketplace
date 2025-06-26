'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/providers';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Plus, Package, MessageSquare, CreditCard } from 'lucide-react';

interface Listing {
  id: string;
  title: string;
  eventName: string;
  eventDate: string;
  priceInCents: number;
  quantity: number;
  status: string;
}

interface Offer {
  id: string;
  offerPriceInCents: number;
  quantity: number;
  status: string;
  createdAt: string;
  isPaid: boolean;
  listing: {
    id: string;
    title: string;
    eventName: string;
    user?: {
      id: string;
      username: string;
    };
  };
  buyer?: {
    id: string;
    username: string;
  };
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userListings, setUserListings] = useState<Listing[]>([]);
  const [sentOffers, setSentOffers] = useState<Offer[]>([]);
  const [receivedOffers, setReceivedOffers] = useState<Offer[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Redirect to login if not authenticated (after loading completes)
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch user's listings
      const listingsResponse = await fetch('/api/listings/supabase');
      if (listingsResponse.ok) {
        const listingsResult = await listingsResponse.json();
        // Handle both old and new response formats
        const listings = listingsResult.success ? listingsResult.data.listings : listingsResult.listings;
        if (listings) {
          // Filter for user's listings
          const userListings = listings.filter(
            (listing: { user: { id: string } }) => listing.user.id === user?.id
          );
          setUserListings(userListings);
        }
      }

      // Fetch sent offers
      const sentOffersResponse = await fetch('/api/offers/supabase?type=sent');
      if (sentOffersResponse.ok) {
        const sentOffersResult = await sentOffersResponse.json();
        // Handle both old and new response formats
        const sentOffers = sentOffersResult.success ? sentOffersResult.data.offers : sentOffersResult.offers;
        if (sentOffers) {
          setSentOffers(sentOffers);
        }
      }

      // Fetch received offers
      const receivedOffersResponse = await fetch('/api/offers/supabase?type=received');
      if (receivedOffersResponse.ok) {
        const receivedOffersResult = await receivedOffersResponse.json();
        // Handle both old and new response formats
        const receivedOffers = receivedOffersResult.success ? receivedOffersResult.data.offers : receivedOffersResult.offers;
        if (receivedOffers) {
          setReceivedOffers(receivedOffers);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);

  const formatPrice = (priceInCents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(priceInCents / 100);
  };

  if (loading || !user) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.username}!</h1>
        <p className="text-gray-600">Manage your tickets and track your offers</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link
          href="/listings/create"
          className="bg-blue-600 text-white p-6 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <div className="flex items-center">
            <Plus className="h-8 w-8 mr-3" />
            <div>
              <h3 className="font-semibold">Sell Tickets</h3>
              <p className="text-blue-100">List your tickets for sale</p>
            </div>
          </div>
        </Link>

        <Link
          href="/listings"
          className="bg-green-600 text-white p-6 rounded-lg hover:bg-green-700 transition-colors"
        >
          <div className="flex items-center">
            <Package className="h-8 w-8 mr-3" />
            <div>
              <h3 className="font-semibold">Buy Tickets</h3>
              <p className="text-green-100">Browse available tickets</p>
            </div>
          </div>
        </Link>

        <Link
          href="/offers"
          className="bg-purple-600 text-white p-6 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <div className="flex items-center">
            <MessageSquare className="h-8 w-8 mr-3" />
            <div>
              <h3 className="font-semibold">Active Offers</h3>
              <p className="text-purple-100">{sentOffers.filter(o => o.status === 'pending').length + receivedOffers.filter(o => o.status === 'pending').length} pending offers</p>
            </div>
          </div>
        </Link>
      </div>

      {/* User's Listings */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Listings</h2>
        {loadingData ? (
          <div className="bg-white rounded-lg shadow p-6">Loading...</div>
        ) : userListings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No listings yet</h3>
            <p className="text-gray-600 mb-4">Start selling by creating your first listing</p>
            <Link
              href="/listings/create"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Create Listing
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userListings.map((listing) => (
                    <tr key={listing.id}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {listing.title}
                          </div>
                          <div className="text-sm text-gray-500">{listing.eventName}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatPrice(listing.priceInCents)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{listing.quantity}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            listing.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {listing.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium space-x-2">
                        <Link
                          href={`/listings/${listing.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </Link>
                        <Link
                          href={`/listings/edit/${listing.id}`}
                          className="text-green-600 hover:text-green-900"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Received Offers */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Offers on Your Listings</h2>
        {loadingData ? (
          <div className="bg-white rounded-lg shadow p-6">Loading...</div>
        ) : receivedOffers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No offers received</h3>
            <p className="text-gray-600">When buyers make offers on your listings, they&apos;ll appear here</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="space-y-4 p-6">
              {receivedOffers.map((offer) => (
                <OfferCard 
                  key={offer.id} 
                  offer={offer} 
                  type="received" 
                  onUpdate={fetchDashboardData}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sent Offers */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Offers</h2>
        {loadingData ? (
          <div className="bg-white rounded-lg shadow p-6">Loading...</div>
        ) : sentOffers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No offers yet</h3>
            <p className="text-gray-600 mb-4">Browse tickets and make your first offer</p>
            <Link
              href="/listings"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Browse Tickets
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="space-y-4 p-6">
              {sentOffers.map((offer) => (
                <OfferCard 
                  key={offer.id} 
                  offer={offer} 
                  type="sent" 
                  onUpdate={fetchDashboardData}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// OfferCard Component
function OfferCard({ 
  offer, 
  type, 
  onUpdate 
}: { 
  offer: Offer; 
  type: 'sent' | 'received'; 
  onUpdate: () => void; 
}) {
  const [responding, setResponding] = useState(false);
  const [paying, setPaying] = useState(false);

  const formatPrice = (priceInCents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(priceInCents / 100);
  };

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return `${Math.floor(diffInDays / 7)} weeks ago`;
  };

  const handleOfferResponse = async (response: 'accept' | 'reject') => {
    setResponding(true);
    
    try {
      const res = await fetch(`/api/offers/supabase/${offer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: response }),
      });

      const result = await res.json();

      if (result.offer) {
        toast.success(`Offer ${response}ed successfully!`);
        onUpdate();
      } else {
        toast.error(result.error || `Failed to ${response} offer`);
      }
    } catch (error) {
      console.error('Error responding to offer:', error);
      toast.error(`Failed to ${response} offer`);
    } finally {
      setResponding(false);
    }
  };

  const handlePayment = async () => {
    setPaying(true);
    
    try {
      const res = await fetch(`/api/offers/supabase/${offer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pay' }),
      });

      const result = await res.json();

      if (result.offer) {
        toast.success('Payment successful! You can now download your tickets.');
        onUpdate();
      } else {
        toast.error(result.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Payment failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="font-medium text-gray-900">{offer.listing.title}</h3>
            <span
              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                offer.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : offer.status === 'accepted'
                  ? 'bg-green-100 text-green-800'
                  : offer.status === 'completed'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {offer.status}
            </span>
          </div>
          
          <p className="text-sm text-gray-600 mb-2">{offer.listing.eventName}</p>
          
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>
              <strong>{formatPrice(offer.offerPriceInCents)}</strong>
              {offer.quantity > 1 && ` × ${offer.quantity}`}
            </span>
            {type === 'received' && offer.buyer && (
              <span>from {offer.buyer.username}</span>
            )}
            {type === 'sent' && offer.listing.user && (
              <span>to {offer.listing.user.username}</span>
            )}
            <span>{formatRelativeDate(offer.createdAt)}</span>
          </div>
        </div>

        <div className="ml-4 flex space-x-2">
          {type === 'received' && offer.status === 'pending' && (
            <>
              <button
                onClick={() => handleOfferResponse('accept')}
                disabled={responding}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
              >
                {responding ? 'Processing...' : 'Accept'}
              </button>
              <button
                onClick={() => handleOfferResponse('reject')}
                disabled={responding}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
              >
                {responding ? 'Processing...' : 'Reject'}
              </button>
            </>
          )}
          
          {type === 'sent' && offer.status === 'accepted' && !offer.isPaid && (
            <button
              onClick={handlePayment}
              disabled={paying}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {paying ? 'Processing...' : 'Pay Now'}
            </button>
          )}
          
          {type === 'sent' && offer.status === 'completed' && offer.isPaid && (
            <a
              href={`/api/offers/supabase/${offer.id}/download`}
              download
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Download Tickets
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
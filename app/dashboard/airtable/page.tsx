'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Package, Tag, ShoppingBag, Plus, Eye, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Listing {
  id: string;
  title: string;
  eventName: string;
  eventDate: string;
  price: number;
  quantity: number;
  status: string;
  views?: number;
}

interface Offer {
  id: string;
  offerPrice: number;
  quantity: number;
  status: string;
  message: string;
  customMessage?: string;
  listing?: string[];
  createdAt: string;
  listingInfo?: {
    id: string;
    title: string;
    eventName: string;
    eventDate: string;
  };
}

export default function AirtableDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [sentOffers, setSentOffers] = useState<Offer[]>([]);
  const [receivedOffers, setReceivedOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (user && !authLoading) {
      fetchDashboardData();
    } else if (!authLoading && !user && retryCount < 3) {
      // If auth is loaded but no user, retry after a delay
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading, retryCount]);

  const fetchDashboardData = async () => {
    try {
      console.log('Fetching dashboard data...');
      
      // Fetch user's listings
      const listingsRes = await fetch(`/api/listings?userId=${user?.id}`);
      console.log('Listings response status:', listingsRes.status);
      
      if (listingsRes.ok) {
        const data = await listingsRes.json();
        console.log('Listings data received:', data);
        
        // Transform the data to match the expected interface
        const transformedListings = (data.data || []).map((listing: any) => ({
          id: listing.id,
          title: listing.title,
          eventName: listing.eventName,
          eventDate: listing.eventDate,
          price: listing.priceInCents, // ✅ Fixed: API returns priceInCents, not price
          quantity: listing.quantity,
          status: listing.status,
          views: listing.views || 0,
        }));
        
        console.log('Transformed listings:', transformedListings);
        setListings(transformedListings);
      } else {
        const errorData = await listingsRes.json();
        console.error('Listings error:', listingsRes.status, errorData);
        if (listingsRes.status === 404) {
          console.log('User not found in Airtable, might need sync');
        } else if (listingsRes.status === 401) {
          console.error('Unauthorized access to listings');
        }
      }

      // Fetch sent offers
      const sentRes = await fetch('/api/offers?type=sent');
      console.log('Sent offers response status:', sentRes.status);
      
      if (sentRes.ok) {
        const data = await sentRes.json();
        console.log('Sent offers data received:', data);
        
        // Transform the data to match the expected interface
        // API returns offers directly, not wrapped in 'offers' property
        const transformedSentOffers = (Array.isArray(data) ? data : []).map((offer: any) => ({
          id: offer.id,
          offerPrice: offer.offerPriceInCents, // ✅ Fixed: API returns offerPriceInCents
          quantity: offer.quantity,
          status: offer.status,
          message: offer.messageTemplate, // ✅ Fixed: API returns messageTemplate
          customMessage: offer.customMessage, // ✅ Added: Custom message support
          listing: offer.listing,
          createdAt: offer.createdAt,
          listingInfo: offer.listing, // ✅ Fixed: API returns listing, not listingInfo
        }));
        
        // Remove duplicates based on offer ID to prevent React key conflicts
        const uniqueSentOffers = transformedSentOffers.filter((offer, index, self) => 
          index === self.findIndex(o => o.id === offer.id)
        );
        
        console.log('Transformed sent offers:', transformedSentOffers);
        console.log('Unique sent offers after deduplication:', uniqueSentOffers);
        
        // Log if duplicates were found
        if (transformedSentOffers.length !== uniqueSentOffers.length) {
          console.warn(`⚠️  Found ${transformedSentOffers.length - uniqueSentOffers.length} duplicate sent offers that were removed`);
        }
        setSentOffers(uniqueSentOffers);
      } else {
        const errorData = await sentRes.json();
        console.error('Sent offers error:', sentRes.status, errorData);
        if (sentRes.status === 404) {
          console.log('User not found for sent offers');
        } else if (sentRes.status === 401) {
          console.error('Unauthorized access to sent offers');
        }
      }

      // Fetch received offers  
      const receivedRes = await fetch('/api/offers?type=received');
      console.log('Received offers response status:', receivedRes.status);
      
      if (receivedRes.ok) {
        const data = await receivedRes.json();
        console.log('Received offers data received:', data);
        
        // Transform the data to match the expected interface
        // API returns offers directly, not wrapped in 'offers' property
        const transformedReceivedOffers = (Array.isArray(data) ? data : []).map((offer: any) => ({
          id: offer.id,
          offerPrice: offer.offerPriceInCents, // ✅ Fixed: API returns offerPriceInCents
          quantity: offer.quantity,
          status: offer.status,
          message: offer.messageTemplate, // ✅ Fixed: API returns messageTemplate
          customMessage: offer.customMessage, // ✅ Added: Custom message support
          listing: offer.listing,
          createdAt: offer.createdAt,
          listingInfo: offer.listing, // ✅ Fixed: API returns listing, not listingInfo
        }));
        
        // Remove duplicates based on offer ID to prevent React key conflicts
        const uniqueReceivedOffers = transformedReceivedOffers.filter((offer, index, self) => 
          index === self.findIndex(o => o.id === offer.id)
        );
        
        console.log('Transformed received offers:', transformedReceivedOffers);
        console.log('Unique received offers after deduplication:', uniqueReceivedOffers);
        
        // Log if duplicates were found
        if (transformedReceivedOffers.length !== uniqueReceivedOffers.length) {
          console.warn(`⚠️  Found ${transformedReceivedOffers.length - uniqueReceivedOffers.length} duplicate received offers that were removed`);
        }
        setReceivedOffers(uniqueReceivedOffers);
      } else {
        const errorData = await receivedRes.json();
        console.error('Received offers error:', receivedRes.status, errorData);
        if (receivedRes.status === 404) {
          console.log('User not found for received offers');
        } else if (receivedRes.status === 401) {
          console.error('Unauthorized access to received offers');
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteListing = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Listing deleted successfully');
        setListings(listings.filter(l => l.id !== id));
      } else {
        toast.error('Failed to delete listing');
      }
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast.error('Failed to delete listing');
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    if (!confirm('Are you sure you want to accept this offer? This will decline all other pending offers for this listing.')) return;

    try {
      const res = await fetch(`/api/offers/${offerId}/accept`, {
        method: 'POST',
      });

      if (res.ok) {
        toast.success('Offer accepted successfully');
        // Refresh dashboard data
        await fetchDashboardData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to accept offer');
      }
    } catch (error) {
      console.error('Error accepting offer:', error);
      toast.error('Failed to accept offer');
    }
  };

  const handleDeclineOffer = async (offerId: string) => {
    if (!confirm('Are you sure you want to decline this offer?')) return;

    try {
      const res = await fetch(`/api/offers/${offerId}/decline`, {
        method: 'POST',
      });

      if (res.ok) {
        toast.success('Offer declined successfully');
        // Refresh dashboard data
        await fetchDashboardData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to decline offer');
      }
    } catch (error) {
      console.error('Error declining offer:', error);
      toast.error('Failed to decline offer');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-900 mb-4">Please sign in to view your dashboard</p>
        <Link href="/sign-in" className="text-blue-600 hover:underline">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
        <p className="text-gray-900 mt-2">Welcome back, {user.username}!</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Package className="h-10 w-10 text-blue-600 mr-4" />
            <div>
              <p className="text-sm text-gray-900">Active Listings</p>
              <p className="text-2xl font-bold text-gray-900">{listings.filter(l => l.status === 'ACTIVE').length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Tag className="h-10 w-10 text-green-600 mr-4" />
            <div>
              <p className="text-sm text-gray-900">Offers Received</p>
              <p className="text-2xl font-bold text-gray-900">{receivedOffers.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <ShoppingBag className="h-10 w-10 text-purple-600 mr-4" />
            <div>
              <p className="text-sm text-gray-900">Offers Sent</p>
              <p className="text-2xl font-bold text-gray-900">{sentOffers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* My Listings */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">My Listings</h2>
          <Link
            href="/listings/create-ocr"
            className="flex items-center space-x-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>New Listing</span>
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Package className="h-12 w-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-900 mb-4">You haven't created any listings yet</p>
            <Link
              href="/listings/create-ocr"
              className="text-blue-600 hover:underline"
            >
              Create your first listing
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {listings.map((listing) => (
                  <tr key={listing.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{listing.title}</div>
                        <div className="text-sm text-gray-900">{listing.eventName}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(listing.eventDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(listing.price / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        listing.status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-200 text-gray-900'
                      }`}>
                        {listing.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Eye className="h-4 w-4 mr-1" />
                        {listing.views || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/listings/${listing.id}`}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        View
                      </Link>
                      <Link
                        href={`/listings/edit/${listing.id}`}
                        className="text-green-600 hover:text-green-900 mr-3"
                      >
                        <Edit className="inline h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDeleteListing(listing.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="inline h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Offers Sent */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Offers Sent</h2>
        {sentOffers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <ShoppingBag className="h-12 w-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-900">You haven't sent any offers yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Offer Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Message
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sentOffers.map((offer) => (
                  <tr key={offer.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {offer.listingInfo?.title || 'Event information not available'}
                        </div>
                        <div className="text-sm text-gray-900">
                          {offer.listingInfo?.eventName || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(offer.offerPrice / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {offer.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        offer.status === 'PENDING' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : offer.status === 'ACCEPTED'
                          ? 'bg-green-100 text-green-800'
                          : offer.status === 'REJECTED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {offer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div>{offer.message}</div>
                        {offer.customMessage && (
                          <div className="text-xs text-gray-600 mt-1">"{offer.customMessage}"</div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Offers Received */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Offers Received</h2>
        {receivedOffers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Tag className="h-12 w-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-900">You haven't received any offers yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Offer Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {receivedOffers.map((offer) => (
                  <tr key={offer.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {offer.listingInfo?.title || 'Event information not available'}
                        </div>
                        <div className="text-sm text-gray-900">
                          {offer.listingInfo?.eventName || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(offer.offerPrice / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {offer.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        offer.status === 'PENDING' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : offer.status === 'ACCEPTED'
                          ? 'bg-green-100 text-green-800'
                          : offer.status === 'REJECTED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {offer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div>{offer.message}</div>
                        {offer.customMessage && (
                          <div className="text-xs text-gray-600 mt-1">"{offer.customMessage}"</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {offer.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleAcceptOffer(offer.id)}
                            className="text-green-600 hover:text-green-900 mr-3"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDeclineOffer(offer.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Decline
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
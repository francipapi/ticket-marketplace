'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Calendar, MapPin, User } from 'lucide-react';

interface Listing {
  id: string;
  title: string;
  eventName: string;
  eventDate: string;
  venue?: string;
  priceInCents: number;
  quantity: number;
  createdAt: string;
  user: {
    username: string;
  };
  _count?: {
    offers: number;
  };
  offers?: Array<{
    id: string;
    status: string;
    offerPriceInCents: number;
    quantity: number;
  }>;
}

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page] = useState(1);

  const fetchListings = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        ...(search && { search }),
      });

      const response = await fetch(`/api/listings/supabase?${params}`);
      const result = await response.json();

      // Handle both old and new response formats
      const listings = result.success ? result.data.listings : result.listings;
      if (listings) {
        setListings(listings);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchListings();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [page, search, fetchListings]);

  const formatPrice = (priceInCents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(priceInCents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Browse Tickets</h1>
        
        {/* Search Bar */}
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search events, artists, venues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow animate-pulse">
              <div className="h-48 bg-gray-200 rounded-t-lg"></div>
              <div className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-6 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tickets found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {search ? 'Try adjusting your search terms' : 'Be the first to list tickets!'}
          </p>
          <div className="mt-6">
            <Link
              href="/listings/create"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              List Your Tickets
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <Link
              key={listing.id}
              href={`/listings/${listing.id}`}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {listing.title}
                  </h3>
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {listing.quantity} {listing.quantity === 1 ? 'ticket' : 'tickets'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(listing.eventDate)}
                  </div>
                  {listing.venue && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      {listing.venue}
                    </div>
                  )}
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="h-4 w-4 mr-2" />
                    {listing.user.username}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-xl font-bold text-green-600">
                      {formatPrice(listing.priceInCents)}
                    </span>
                  </div>
                  {((listing._count?.offers || listing.offers?.length || 0) > 0) && (
                    <span className="text-sm text-gray-500">
                      {listing._count?.offers || listing.offers?.length || 0} offer{(listing._count?.offers || listing.offers?.length || 0) !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
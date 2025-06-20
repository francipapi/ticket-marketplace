'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { 
  Calendar, 
  MapPin, 
  User, 
  ArrowLeft, 
  MessageSquare,
  Clock
} from 'lucide-react';

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
  user: {
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
  const [showOfferModal, setShowOfferModal] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchListing();
    }
  }, [params.id]);

  const fetchListing = async () => {
    try {
      const response = await fetch(`/api/listings/${params.id}`);
      const result = await response.json();

      if (result.success) {
        setListing(result.data);
      } else {
        toast.error('Listing not found');
        router.push('/listings');
      }
    } catch (error) {
      console.error('Error fetching listing:', error);
      toast.error('Failed to load listing');
      router.push('/listings');
    } finally {
      setLoading(false);
    }
  };

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

  const isOwner = user?.id === listing.user.id;
  const canMakeOffer = user && !isOwner;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/listings"
          className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to listings
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{listing.title}</h1>
        <p className="text-xl text-gray-600">{listing.eventName}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Event Details */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Event Details</h2>
            
            <div className="space-y-3">
              <div className="flex items-center text-gray-600">
                <Calendar className="h-5 w-5 mr-3" />
                <span>{formatDate(listing.eventDate)}</span>
              </div>
              
              {listing.venue && (
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-5 w-5 mr-3" />
                  <span>{listing.venue}</span>
                </div>
              )}
              
              <div className="flex items-center text-gray-600">
                <User className="h-5 w-5 mr-3" />
                <span>Sold by {listing.user.username}</span>
                <span className="ml-2 text-sm text-gray-500">
                  (Member since {formatRelativeDate(listing.user.createdAt)})
                </span>
              </div>
              
              <div className="flex items-center text-gray-600">
                <Clock className="h-5 w-5 mr-3" />
                <span>Listed {formatRelativeDate(listing.createdAt)}</span>
              </div>
            </div>
            
            {listing.description && (
              <div className="mt-6">
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{listing.description}</p>
              </div>
            )}
          </div>

          {/* Offers */}
          {listing.offers.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Offers</h2>
              <div className="space-y-3">
                {listing.offers.slice(0, 3).map((offer) => (
                  <div key={offer.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <span className="font-medium">{offer.buyer.username}</span>
                      <span className="text-gray-500 ml-2">
                        offered {formatPrice(offer.offerPriceInCents)}
                      </span>
                      {offer.quantity > 1 && (
                        <span className="text-gray-500"> for {offer.quantity} tickets</span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatRelativeDate(offer.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-6">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center mb-2">
                <span className="text-3xl font-bold text-green-600">
                  {formatPrice(listing.priceInCents)}
                </span>
              </div>
              <p className="text-gray-600">
                {listing.quantity} {listing.quantity === 1 ? 'ticket' : 'tickets'} available
              </p>
            </div>

            {canMakeOffer ? (
              <button
                onClick={() => setShowOfferModal(true)}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <MessageSquare className="h-5 w-5 mr-2" />
                Make Offer
              </button>
            ) : isOwner ? (
              <div className="text-center">
                <p className="text-gray-600 mb-4">This is your listing</p>
                <Link
                  href={`/listings/edit/${listing.id}`}
                  className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-700 transition-colors inline-block text-center"
                >
                  Edit Listing
                </Link>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-600 mb-4">Please log in to make an offer</p>
                <Link
                  href="/auth/login"
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-block text-center"
                >
                  Log In
                </Link>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <div className="text-sm text-gray-500">
                <p>✓ Secure payment processing</p>
                <p>✓ Instant ticket delivery</p>
                <p>✓ Fraud protection</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferModal && (
        <OfferModal
          listing={listing}
          onClose={() => setShowOfferModal(false)}
          onSuccess={() => {
            setShowOfferModal(false);
            fetchListing(); // Refresh to show new offer
          }}
        />
      )}
    </div>
  );
}

// Offer Modal Component
function OfferModal({ 
  listing, 
  onClose, 
  onSuccess 
}: { 
  listing: Listing; 
  onClose: () => void; 
  onSuccess: () => void; 
}) {
  const [messageTemplate, setMessageTemplate] = useState<string>('asking_price');
  const [customPrice, setCustomPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [customMessage, setCustomMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let offerPrice = listing.priceInCents;
      
      if (messageTemplate === 'make_offer') {
        const priceInDollars = parseFloat(customPrice);
        if (isNaN(priceInDollars) || priceInDollars <= 0) {
          toast.error('Please enter a valid price');
          setLoading(false);
          return;
        }
        offerPrice = Math.round(priceInDollars * 100);
      }

      const response = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          offerPrice,
          quantity,
          messageTemplate,
          customMessage: messageTemplate === 'make_offer' ? customMessage : undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Offer sent successfully!');
        onSuccess();
      } else {
        toast.error(result.error || 'Failed to send offer');
      }
    } catch (error) {
      console.error('Error sending offer:', error);
      toast.error('Failed to send offer');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (priceInCents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(priceInCents / 100);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-semibold mb-4">Make an Offer</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Message Template */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Type
              </label>
              <select
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="asking_price">I'll buy at asking price</option>
                <option value="make_offer">I want to make a custom offer</option>
                <option value="check_availability">Is this still available?</option>
              </select>
            </div>

            {/* Custom Price */}
            {messageTemplate === 'make_offer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Offer Price (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Asking price: {formatPrice(listing.priceInCents)}
                </p>
              </div>
            )}

            {/* Custom Message */}
            {messageTemplate === 'make_offer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message (Optional)
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Add a note to your offer..."
                  maxLength={200}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity
              </label>
              <select
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {[...Array(Math.min(listing.quantity, 10))].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1} {i + 1 === 1 ? 'ticket' : 'tickets'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
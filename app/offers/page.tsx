'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/providers';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, MessageSquare, CreditCard } from 'lucide-react';

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

export default function OffersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sentOffers, setSentOffers] = useState<Offer[]>([]);
  const [receivedOffers, setReceivedOffers] = useState<Offer[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('received');
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('1');
  const [editingInProgress, setEditingInProgress] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  const fetchOffers = useCallback(async () => {
    if (!user) return;
    
    try {
      // Fetch both sent and received offers
      const [sentResponse, receivedResponse] = await Promise.all([
        fetch('/api/offers?type=sent'),
        fetch('/api/offers?type=received')
      ]);

      const [sentResult, receivedResult] = await Promise.all([
        sentResponse.json(),
        receivedResponse.json()
      ]);

      if (sentResult.success) {
        setSentOffers(sentResult.data);
      }

      if (receivedResult.success) {
        setReceivedOffers(receivedResult.data);
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast.error('Failed to load offers');
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchOffers();
    }
  }, [user, fetchOffers]);

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

  const handleOfferResponse = async (offerId: string, response: 'accept' | 'reject') => {
    try {
      const res = await fetch(`/api/offers/${offerId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success(`Offer ${response}ed successfully!`);
        fetchOffers(); // Refresh offers
      } else {
        toast.error(result.error || `Failed to ${response} offer`);
      }
    } catch (error) {
      console.error('Error responding to offer:', error);
      toast.error(`Failed to ${response} offer`);
    }
  };

  const handlePayment = async (offerId: string) => {
    try {
      const res = await fetch('/api/payments/mock-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success('Payment successful! You can now download your tickets.');
        fetchOffers(); // Refresh offers
      } else {
        toast.error(result.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Payment failed');
    }
  };

  const handleCancelOffer = async (offerId: string) => {
    if (!confirm('Are you sure you want to cancel this offer? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/offers/${offerId}`, {
        method: 'DELETE',
      });

      const result = await res.json();

      if (result.success) {
        toast.success('Offer cancelled successfully');
        fetchOffers(); // Refresh offers
      } else {
        toast.error(result.error || 'Failed to cancel offer');
      }
    } catch (error) {
      console.error('Error cancelling offer:', error);
      toast.error('Failed to cancel offer');
    }
  };

  const handleEditOffer = async () => {
    if (!editingOffer) return;

    const price = parseFloat(editPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    const quantity = parseInt(editQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    setEditingInProgress(true);

    try {
      const res = await fetch(`/api/offers/${editingOffer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerPriceInCents: Math.round(price * 100),
          quantity,
        }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success('Offer updated successfully');
        setEditingOffer(null);
        setEditPrice('');
        setEditQuantity('1');
        fetchOffers(); // Refresh offers
      } else {
        toast.error(result.error || 'Failed to update offer');
      }
    } catch (error) {
      console.error('Error updating offer:', error);
      toast.error('Failed to update offer');
    } finally {
      setEditingInProgress(false);
    }
  };

  const openEditModal = (offer: Offer) => {
    setEditingOffer(offer);
    setEditPrice((offer.offerPriceInCents / 100).toString());
    setEditQuantity(offer.quantity.toString());
  };

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentOffers = activeTab === 'sent' ? sentOffers : receivedOffers;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to dashboard
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Offers</h1>
        <p className="text-gray-600">Manage your sent and received offers</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('received')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'received'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Received Offers ({receivedOffers.length})
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'sent'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Sent Offers ({sentOffers.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {loadingData ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading offers...</p>
            </div>
          ) : currentOffers.length === 0 ? (
            <div className="text-center py-8">
              {activeTab === 'received' ? (
                <>
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No offers received</h3>
                  <p className="text-gray-600 mb-4">When buyers make offers on your listings, they'll appear here</p>
                  <Link
                    href="/listings/create"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Create a Listing
                  </Link>
                </>
              ) : (
                <>
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No offers sent</h3>
                  <p className="text-gray-600 mb-4">Browse tickets and make your first offer</p>
                  <Link
                    href="/listings"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Browse Tickets
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {currentOffers.map((offer) => (
                <div key={offer.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Link
                          href={`/listings/${offer.listing.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {offer.listing.title}
                        </Link>
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
                        {activeTab === 'received' && offer.buyer && (
                          <span>from {offer.buyer.username}</span>
                        )}
                        {activeTab === 'sent' && offer.listing.user && (
                          <span>to {offer.listing.user.username}</span>
                        )}
                        <span>{formatRelativeDate(offer.createdAt)}</span>
                      </div>
                    </div>

                    <div className="ml-4 flex space-x-2">
                      {activeTab === 'received' && offer.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleOfferResponse(offer.id, 'accept')}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleOfferResponse(offer.id, 'reject')}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      
                      {activeTab === 'sent' && offer.status === 'pending' && (
                        <>
                          <button
                            onClick={() => openEditModal(offer)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleCancelOffer(offer.id)}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      
                      {activeTab === 'sent' && offer.status === 'accepted' && !offer.isPaid && (
                        <button
                          onClick={() => handlePayment(offer.id)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Pay Now
                        </button>
                      )}
                      
                      {activeTab === 'sent' && offer.status === 'completed' && offer.isPaid && (
                        <a
                          href={`/api/offers/${offer.id}/download`}
                          download
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Download Tickets
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Offer Modal */}
      {editingOffer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Your Offer</h3>
            <p className="text-sm text-gray-600 mb-4">
              Editing offer for: <strong>{editingOffer.listing.title}</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="editPrice" className="block text-sm font-medium text-gray-700 mb-1">
                  Offer Price (USD) *
                </label>
                <input
                  type="number"
                  id="editPrice"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="editQuantity" className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <select
                  id="editQuantity"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {[...Array(10)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} {i + 1 === 1 ? 'ticket' : 'tickets'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setEditingOffer(null);
                  setEditPrice('');
                  setEditQuantity('1');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={editingInProgress}
              >
                Cancel
              </button>
              <button
                onClick={handleEditOffer}
                disabled={editingInProgress}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {editingInProgress ? 'Updating...' : 'Update Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
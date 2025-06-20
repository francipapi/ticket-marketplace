'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import toast from 'react-hot-toast';
import { Calendar, MapPin, DollarSign, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Listing {
  id: string;
  title: string;
  eventName: string;
  eventDate: string;
  venue?: string;
  priceInCents: number;
  quantity: number;
  description?: string;
  userId: string;
}

export default function EditListingPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  
  const [listing, setListing] = useState<Listing | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    eventName: '',
    eventDate: '',
    venue: '',
    price: '',
    quantity: '1',
    description: '',
  });
  
  const [loadingListing, setLoadingListing] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

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
        const listingData = result.data;
        
        // Check if user owns this listing
        if (user && listingData.user.id !== user.id) {
          toast.error('You can only edit your own listings');
          router.push('/dashboard');
          return;
        }

        setListing(listingData);
        
        // Convert date to datetime-local format
        const eventDate = new Date(listingData.eventDate);
        const localDate = new Date(eventDate.getTime() - eventDate.getTimezoneOffset() * 60000);
        
        setFormData({
          title: listingData.title,
          eventName: listingData.eventName,
          eventDate: localDate.toISOString().slice(0, 16),
          venue: listingData.venue || '',
          price: (listingData.priceInCents / 100).toString(),
          quantity: listingData.quantity.toString(),
          description: listingData.description || '',
        });
      } else {
        toast.error('Listing not found');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching listing:', error);
      toast.error('Failed to load listing');
      router.push('/dashboard');
    } finally {
      setLoadingListing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !listing) {
      toast.error('You must be logged in to edit a listing');
      return;
    }

    // Validation
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    
    if (!formData.eventName.trim()) {
      toast.error('Event name is required');
      return;
    }
    
    if (!formData.eventDate) {
      toast.error('Event date is required');
      return;
    }
    
    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    
    const quantity = parseInt(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/listings/${listing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          eventName: formData.eventName.trim(),
          eventDate: new Date(formData.eventDate).toISOString(),
          venue: formData.venue.trim() || undefined,
          price: Math.round(price * 100), // Convert to cents
          quantity,
          description: formData.description.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Listing updated successfully!');
        router.push(`/listings/${listing.id}`);
      } else {
        toast.error(result.error || 'Failed to update listing');
      }
    } catch (error) {
      console.error('Error updating listing:', error);
      toast.error('Failed to update listing');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!listing) return;
    
    if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/listings/${listing.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Listing deleted successfully');
        router.push('/dashboard');
      } else {
        toast.error(result.error || 'Failed to delete listing');
      }
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast.error('Failed to delete listing');
    }
  };

  if (loading || loadingListing) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !listing) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link
          href={`/listings/${listing.id}`}
          className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to listing
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Your Listing</h1>
        <p className="text-gray-600">Update your ticket listing details</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Listing Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Taylor Swift Concert - Floor Seats"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="eventName" className="block text-sm font-medium text-gray-700 mb-1">
                Event Name *
              </label>
              <input
                type="text"
                id="eventName"
                name="eventName"
                value={formData.eventName}
                onChange={handleInputChange}
                placeholder="e.g., Taylor Swift: The Eras Tour"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Event Date & Time *
                </label>
                <input
                  type="datetime-local"
                  id="eventDate"
                  name="eventDate"
                  value={formData.eventDate}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Venue
                </label>
                <input
                  type="text"
                  id="venue"
                  name="venue"
                  value={formData.venue}
                  onChange={handleInputChange}
                  placeholder="e.g., Madison Square Garden"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe your tickets (section, row, seat numbers, etc.)"
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Pricing & Quantity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Pricing & Quantity</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="inline h-4 w-4 mr-1" />
                Price per Ticket (USD) *
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                min="0.01"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                Number of Tickets *
              </label>
              <select
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
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
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 px-4 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleDelete}
            className="flex-1 py-3 px-4 border border-red-300 rounded-md text-red-700 font-medium hover:bg-red-50 transition-colors"
          >
            Delete Listing
          </button>
          
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating...
              </div>
            ) : (
              'Update Listing'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
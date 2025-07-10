'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Ticket, Shield, Upload, CreditCard, Users, Star, ArrowRight, Camera, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface PopularEvent {
  eventName: string;
  count: number;
  averagePrice: number;
  lowestPrice: number;
  listingCount: number;
  sampleListing?: {
    eventDate: string;
    venue?: string;
  } | null;
}

export default function Home() {
  const [popularEvents, setPopularEvents] = useState<PopularEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [totalTickets, setTotalTickets] = useState(127); // Default fallback

  useEffect(() => {
    fetchPopularEvents();
    fetchTotalTickets();
  }, []);

  const fetchPopularEvents = async () => {
    try {
      const response = await fetch('/api/listings/popular-events');
      if (response.ok) {
        const data = await response.json();
        setPopularEvents(data.slice(0, 3)); // Show only top 3 events
      } else {
        console.error('Failed to fetch popular events');
      }
    } catch (error) {
      console.error('Error fetching popular events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchTotalTickets = async () => {
    try {
      const response = await fetch('/api/listings?status=ACTIVE');
      if (response.ok) {
        const data = await response.json();
        const activeListings = data.data || [];
        const total = activeListings.reduce((sum: number, listing: any) => sum + (listing.quantity || 0), 0);
        setTotalTickets(total);
      }
    } catch (error) {
      console.error('Error fetching total tickets:', error);
      // Keep default value on error
    }
  };

  const getEventGradient = (index: number) => {
    const gradients = [
      'bg-gradient-to-r from-purple-500 to-pink-500',
      'bg-gradient-to-r from-blue-500 to-cyan-500', 
      'bg-gradient-to-r from-green-500 to-emerald-500'
    ];
    return gradients[index % gradients.length];
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-warwick-gradient text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center">
            {/* Live Stats Badge */}
            <div className="inline-flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-8">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              <span className="text-sm font-medium">{totalTickets} tickets available now</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Tickets for Warwick Students,
              <span className="block text-gold-300">
                by Warwick Students
              </span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-purple-100 max-w-3xl mx-auto leading-relaxed">
              Buy and sell event tickets safely within the Warwick community. 
              No more sketchy Facebook posts or risky WhatsApp groups.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/browse">
                <Button size="xl" className="bg-white text-purple-700 hover:bg-gray-100 font-semibold">
                  Browse Tickets
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/listings/create-ocr">
                <Button size="xl" variant="outline" className="border-white text-white hover:bg-white hover:text-purple-700 font-semibold">
                  <Upload className="mr-2 h-5 w-5" />
                  Sell Your Tickets
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-8 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center items-center gap-8 text-gray-600">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              <span className="font-medium">University Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              <span className="font-medium">2,000+ Students</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-gold-500" />
              <span className="font-medium">4.9/5 Rating</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-500" />
              <span className="font-medium">Secure Payments</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Why Choose Warwick Tickets?</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Built for Students, By Students
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We understand student life. That's why we've created the safest, easiest way to trade tickets within our community.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center p-6 hover:shadow-lg transition-shadow border-purple-100">
              <CardContent className="p-0">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">Smart OCR Upload</h3>
                <p className="text-gray-600">
                  Just snap a photo of your ticket. Our AI extracts all the details automatically.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-6 hover:shadow-lg transition-shadow border-gold-100">
              <CardContent className="p-0">
                <div className="bg-gold-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-gold-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">Fraud Protection</h3>
                <p className="text-gray-600">
                  University verification and smart detection keep fake tickets out.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-6 hover:shadow-lg transition-shadow border-green-100">
              <CardContent className="p-0">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">Instant Payments</h3>
                <p className="text-gray-600">
                  Buy now or place bids. Money is held securely until tickets are transferred.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-6 hover:shadow-lg transition-shadow border-blue-100">
              <CardContent className="p-0">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">Student Focus</h3>
                <p className="text-gray-600">
                  Events you care about, prices you can afford, people you can trust.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-warwick-card-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Simple Process</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Three simple steps to trade tickets safely
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="bg-gradient-to-r from-purple-700 to-purple-600 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold group-hover:shadow-lg transition-shadow duration-200">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">List Your Tickets</h3>
              <p className="text-gray-600 leading-relaxed">
                Upload your tickets with our smart OCR scanner or manually enter details. We'll watermark them for protection.
              </p>
            </div>

            <div className="text-center group">
              <div className="bg-gradient-to-r from-gold-600 to-gold-500 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold group-hover:shadow-lg transition-shadow duration-200">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Get Offers</h3>
              <p className="text-gray-600 leading-relaxed">
                Students can buy instantly at your price or make offers. You choose which ones to accept.
              </p>
            </div>

            <div className="text-center group">
              <div className="bg-gradient-to-r from-green-600 to-green-500 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold group-hover:shadow-lg transition-shadow duration-200">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Get Paid Instantly</h3>
              <p className="text-gray-600 leading-relaxed">
                Once you transfer the tickets, payment is released immediately to your account.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Events Preview */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                What's Hot at Warwick
              </h2>
              <p className="text-gray-600">Popular events students are buying tickets for</p>
            </div>
            <Link href="/browse">
              <Button variant="outline">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {loadingEvents ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="overflow-hidden">
                  <div className="h-32 bg-gray-200 animate-pulse"></div>
                  <CardContent className="p-4">
                    <div className="h-6 bg-gray-200 animate-pulse rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 animate-pulse rounded mb-2"></div>
                    <div className="flex justify-between items-center">
                      <div className="h-5 bg-gray-200 animate-pulse rounded w-20"></div>
                      <div className="h-6 bg-gray-200 animate-pulse rounded w-16"></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : popularEvents.length > 0 ? (
              // Real events
              popularEvents.map((event, index) => {
                const eventDate = event.sampleListing?.eventDate ? new Date(event.sampleListing.eventDate) : null;
                const venue = event.sampleListing?.venue || 'Multiple venues';
                
                return (
                  <Link key={event.eventName} href={`/browse?search=${encodeURIComponent(event.eventName)}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                      <div className={`h-32 ${getEventGradient(index)}`}></div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-1">{event.eventName}</h3>
                        <p className="text-gray-600 text-sm mb-2">
                          {eventDate ? format(eventDate, 'EEE, MMM dd') : 'Various dates'} • {venue}
                        </p>
                        <div className="flex justify-between items-center">
                          <span className="text-purple-700 font-semibold">
                            from £{(event.lowestPrice / 100).toFixed(2)}
                          </span>
                          <Badge variant="secondary">{event.count} available</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })
            ) : (
              // No events fallback
              <div className="col-span-full text-center py-12">
                <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Events Yet</h3>
                <p className="text-gray-600 mb-4">Be the first to list tickets for Warwick events!</p>
                <Link href="/listings/create-ocr">
                  <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    List Your Tickets
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-warwick-gradient text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Join Warwick's Ticket Community?
          </h2>
          <p className="text-xl mb-8 text-purple-100 max-w-2xl mx-auto">
            Join over 2,000 Warwick students already trading tickets safely on our platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up">
              <Button size="xl" className="bg-white text-purple-700 hover:bg-gray-100 font-semibold">
                Join Free Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/browse">
              <Button size="xl" variant="outline" className="border-white text-white hover:bg-white hover:text-purple-700 font-semibold">
                Browse Tickets First
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
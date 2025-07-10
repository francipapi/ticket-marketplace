import { NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/services/factory';
import { withErrorHandling } from '@/lib/api-helpers-enhanced';

export async function GET() {
  return withErrorHandling(async () => {
    const dbService = getDatabaseService();
    
    // Get all active listings
    const result = await dbService.listings.findMany({
      status: 'ACTIVE',
      limit: 1000 // Get a large number to calculate popular events
    });

    // Group by event name and calculate stats
    const eventStats = new Map<string, {
      eventName: string;
      count: number;
      totalPriceInCents: number;
      listings: any[];
    }>();

    result.items.forEach(listing => {
      const eventName = listing.eventName;
      if (!eventStats.has(eventName)) {
        eventStats.set(eventName, {
          eventName,
          count: 0,
          totalPriceInCents: 0,
          listings: []
        });
      }
      
      const stats = eventStats.get(eventName)!;
      stats.count += listing.quantity;
      stats.totalPriceInCents += listing.priceInCents * listing.quantity;
      stats.listings.push(listing);
    });

    // Convert to array and calculate average prices
    const popularEvents = Array.from(eventStats.values())
      .map(stats => ({
        eventName: stats.eventName,
        count: stats.count,
        averagePrice: Math.round(stats.totalPriceInCents / stats.count), // Average price in cents
        listingCount: stats.listings.length
      }))
      .filter(event => event.count > 0) // Only events with available tickets
      .sort((a, b) => b.count - a.count) // Sort by ticket count (most popular first)
      .slice(0, 10); // Top 10 popular events

    return NextResponse.json(popularEvents);
  });
}
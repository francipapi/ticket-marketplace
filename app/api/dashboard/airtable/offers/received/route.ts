import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { getDatabaseService } from '@/lib/services/factory';
import { handleDatabaseError } from '@/services/database.service';

export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get database service instance
    const dbService = getDatabaseService();
    
    // Get user from database
    const user = await dbService.users.findByClerkId(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's listings first to find received offers
    console.log('Fetching user listings for received offers:', { userId: user.id, username: user.username });
    
    // Use the primary field method to get listings
    const listingsResult = await (dbService.listings as any).findByUserPrimaryField(user.username, {
      limit: 50,
      offset: 0
    });
    
    const listingIds = listingsResult.items.map(listing => listing.id);
    
    if (listingIds.length === 0) {
      return NextResponse.json({ offers: [] });
    }

    // Get offers for user's listings using the optimized service layer
    console.log(`Finding offers for ${listingIds.length} user listings`);
    
    let allOffers: any[] = [];
    
    // Get offers for each listing 
    for (const listing of listingsResult.items) {
      // Use listing title (primary field) instead of record ID
      const offersForListing = await (dbService.offers as any).findByListingPrimaryField(listing.title, {
        limit: 50,
        offset: 0
      });
      allOffers = allOffers.concat(offersForListing.items);
    }
    
    // Remove duplicate offers (same offer ID appearing multiple times)
    const uniqueOffers = allOffers.filter((offer, index, self) => 
      index === self.findIndex(o => o.id === offer.id)
    );
    
    // Enrich offers with listing information for display
    const offersWithListings = await Promise.all(
      uniqueOffers.map(async (offer) => {
        // Find the listing this offer is for
        const listing = listingsResult.items.find(l => l.title === offer.listingId || l.id === offer.listingId);
        
        if (listing) {
          return {
            ...offer,
            // Add listing information for display
            listing: {
              id: listing.id,
              title: listing.title,
              eventName: listing.eventName,
              eventDate: listing.eventDate,
              priceInCents: listing.priceInCents,
              venue: listing.venue
            }
          };
        } else {
          // If listing not found in our cache, try to fetch it
          try {
            const foundListing = await dbService.listings.findById(offer.listingId);
            if (foundListing) {
              return {
                ...offer,
                listing: {
                  id: foundListing.id,
                  title: foundListing.title,
                  eventName: foundListing.eventName,
                  eventDate: foundListing.eventDate,
                  priceInCents: foundListing.priceInCents,
                  venue: foundListing.venue
                }
              };
            }
          } catch (error) {
            console.warn(`Could not fetch listing ${offer.listingId} for offer ${offer.id}`);
          }
          
          return {
            ...offer,
            listing: {
              id: offer.listingId,
              title: 'Unknown Listing',
              eventName: 'Event information not available',
              eventDate: new Date(),
              priceInCents: 0,
              venue: 'Unknown'
            }
          };
        }
      })
    );
    
    console.log(`✅ Found ${allOffers.length} total offers, ${uniqueOffers.length} unique received offers with listing data using service layer`);

    return NextResponse.json({ offers: offersWithListings });
  } catch (error) {
    console.error('Error fetching received offers:', error);
    return NextResponse.json(
      { error: handleDatabaseError(error) },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { db } from '@/services/database.service';
import { getTables, recordToObject } from '@/lib/airtable';

export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from Airtable
    const user = await db.getUserByClerkId(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const tables = getTables();
    
    console.log('Manual filtering - searching for user ID:', user.id);
    
    // Get ALL listings and filter manually
    const allListings = await tables.listings.select().all();
    console.log('Total listings found:', allListings.length);
    
    const userListings = allListings.filter(record => {
      const listing = recordToObject(record);
      console.log('Checking listing:', {
        id: listing.id,
        seller: listing.seller,
        sellerType: typeof listing.seller,
        isArray: Array.isArray(listing.seller),
        includes: listing.seller?.includes?.(user.id),
        match: listing.seller?.includes?.(user.id) || listing.seller === user.id
      });
      
      // Try different matching approaches
      if (Array.isArray(listing.seller)) {
        return listing.seller.includes(user.id);
      } else if (typeof listing.seller === 'string') {
        return listing.seller === user.id;
      }
      return false;
    });
    
    console.log('User listings found:', userListings.length);
    
    // Get ALL offers and filter manually
    const allOffers = await tables.offers.select().all();
    console.log('Total offers found:', allOffers.length);
    
    const userOffers = allOffers.filter(record => {
      const offer = recordToObject(record);
      console.log('Checking offer:', {
        id: offer.id,
        buyer: offer.buyer,
        buyerType: typeof offer.buyer,
        isArray: Array.isArray(offer.buyer),
        includes: offer.buyer?.includes?.(user.id),
        match: offer.buyer?.includes?.(user.id) || offer.buyer === user.id
      });
      
      // Try different matching approaches
      if (Array.isArray(offer.buyer)) {
        return offer.buyer.includes(user.id);
      } else if (typeof offer.buyer === 'string') {
        return offer.buyer === user.id;
      }
      return false;
    });
    
    console.log('User offers found:', userOffers.length);

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username
      },
      totalListings: allListings.length,
      userListings: userListings.map(recordToObject),
      totalOffers: allOffers.length,
      userOffers: userOffers.map(recordToObject)
    });
  } catch (error) {
    console.error('Error in manual filter debug:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
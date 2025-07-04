import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { db, handleDatabaseError } from '@/services/database.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = getAuth(request);
    const { id } = await params;
    
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

    // Get the offer
    const offer = await db.getOfferById(id);
    if (!offer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      );
    }

    // Get the listing to verify ownership
    if (!offer.listing || offer.listing.length === 0) {
      return NextResponse.json(
        { error: 'Offer has no associated listing' },
        { status: 400 }
      );
    }

    const listing = await db.getListingById(offer.listing[0]);
    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    // Verify the user owns the listing
    const listingSellerId = Array.isArray(listing.seller) ? listing.seller[0] : listing.seller;
    if (listingSellerId !== user.id) {
      return NextResponse.json(
        { error: 'You are not authorized to accept this offer' },
        { status: 403 }
      );
    }

    // Check if offer is already accepted/declined
    if (offer.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Offer is already ${offer.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Accept the offer
    const updatedOffer = await db.updateOfferStatus(id, 'ACCEPTED');

    // Reject all other pending offers for this listing
    const allOffers = await db.getOffersByListing(listing.id);
    const otherPendingOffers = allOffers.filter(
      o => o.id !== id && o.status === 'PENDING'
    );

    await Promise.all(
      otherPendingOffers.map(o => 
        db.updateOfferStatus(o.id, 'REJECTED')
      )
    );

    return NextResponse.json({ 
      offer: updatedOffer,
      message: 'Offer accepted successfully'
    });

  } catch (error) {
    console.error('Error accepting offer:', error);
    return NextResponse.json(
      { error: handleDatabaseError(error) },
      { status: 500 }
    );
  }
}
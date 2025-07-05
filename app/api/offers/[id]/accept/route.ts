import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/services/factory';
import { requireAuth } from '@/lib/auth-server';
import { withErrorHandling } from '@/lib/api-helpers-enhanced';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    const user = await requireAuth();
    const { id } = await params;
    const dbService = getDatabaseService();

    // Get the offer
    const offer = await dbService.offers.findById(id);
    if (!offer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      );
    }

    // Get the listing to verify ownership
    const listing = await dbService.listings.findById(offer.listingId);
    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    // Verify the user owns the listing
    if (listing.userId !== user.id) {
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
    const updatedOffer = await dbService.offers.update(id, {
      status: 'ACCEPTED',
    });

    // Reject all other pending offers for this listing
    try {
      const allOffersResult = await dbService.offers.findByListingId(listing.id, {
        status: 'PENDING',
        limit: 100,
      });

      const otherPendingOffers = allOffersResult.items.filter(o => o.id !== id);

      await Promise.all(
        otherPendingOffers.map(o => 
          dbService.offers.update(o.id, { status: 'REJECTED' })
        )
      );

      // Optionally update listing status to SOLD if quantity matches offer quantity
      if (offer.quantity >= listing.quantity) {
        await dbService.listings.updateStatus(listing.id, 'SOLD');
      }
    } catch (error) {
      console.warn('Error updating other offers or listing status:', error);
      // Continue anyway - the main offer was accepted successfully
    }

    return NextResponse.json({ 
      offer: updatedOffer,
      message: 'Offer accepted successfully'
    });
  });
}
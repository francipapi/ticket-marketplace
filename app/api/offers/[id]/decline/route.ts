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
        { error: 'You are not authorized to decline this offer' },
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

    // Decline the offer
    const updatedOffer = await dbService.offers.update(id, {
      status: 'REJECTED',
    });

    return NextResponse.json({ 
      offer: updatedOffer,
      message: 'Offer declined successfully'
    });
  });
}
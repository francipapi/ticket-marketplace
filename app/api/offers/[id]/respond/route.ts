import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/services/factory';
import { requireAuth } from '@/lib/auth-server';
import { withErrorHandling } from '@/lib/api-helpers-enhanced';
import { z } from 'zod';

// Validation schema for responding to offers
const respondToOfferSchema = z.object({
  response: z.enum(['accept', 'reject']),
});

// POST /api/offers/[id]/respond - Accept or reject an offer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    // Validate the request body
    const validationResult = respondToOfferSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { response } = validationResult.data;
    const dbService = getDatabaseService();

    // Find offer and verify ownership
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
        { error: 'Associated listing not found' },
        { status: 404 }
      );
    }

    if (listing.userId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to respond to this offer' },
        { status: 403 }
      );
    }

    if (offer.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Offer is no longer pending' },
        { status: 400 }
      );
    }

    if (listing.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Listing is no longer active' },
        { status: 400 }
      );
    }

    // Update offer status
    const newStatus = response === 'accept' ? 'ACCEPTED' : 'REJECTED';
    const updatedOffer = await dbService.offers.update(id, {
      status: newStatus,
    });

    // If accepted, reject all other pending offers for this listing
    if (response === 'accept') {
      try {
        // Get all other pending offers for this listing
        const otherOffersResult = await dbService.offers.findByListingId(listing.id, {
          status: 'PENDING',
          limit: 100,
        });

        // Reject all other pending offers
        for (const otherOffer of otherOffersResult.items) {
          if (otherOffer.id !== id) {
            await dbService.offers.update(otherOffer.id, {
              status: 'REJECTED',
            });
          }
        }

        // Optionally update listing status to SOLD if quantity matches offer quantity
        if (offer.quantity >= listing.quantity) {
          await dbService.listings.updateStatus(listing.id, 'SOLD');
        }
      } catch (error) {
        console.warn('Error updating other offers or listing status:', error);
        // Continue anyway - the main offer was updated successfully
      }
    }

    // Get buyer info
    let buyerInfo = null;
    if (offer.buyerId) {
      try {
        const buyer = await dbService.users.findById(offer.buyerId);
        if (buyer) {
          buyerInfo = {
            id: buyer.id,
            username: buyer.username,
          };
        }
      } catch (error) {
        console.warn(`Could not fetch buyer info:`, error);
      }
    }

    return NextResponse.json({
      offer: {
        ...updatedOffer,
        listing: {
          id: listing.id,
          title: listing.title,
          eventName: listing.eventName,
          eventDate: listing.eventDate,
          priceInCents: listing.priceInCents,
        },
        buyer: buyerInfo,
      },
      message: `Offer ${response}ed successfully`,
    });
  });
}
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/services/factory';
import { requireAuth } from '@/lib/auth-server';
import { withErrorHandling } from '@/lib/api-helpers-enhanced';
import { z } from 'zod';

// Validation schema for updating offers
const updateOfferSchema = z.object({
  offerPriceInCents: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

// GET /api/offers/[id] - Get single offer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    const { id } = await params;
    const user = await requireAuth();
    const dbService = getDatabaseService();

    const offer = await dbService.offers.findById(id);
    
    if (!offer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      );
    }

    // Check if user is either the buyer or the seller
    let listing = null;
    if (offer.listingId) {
      listing = await dbService.listings.findById(offer.listingId);
    }

    const isOwner = offer.buyerId === user.id;
    const isSeller = listing && listing.userId === user.id;

    if (!isOwner && !isSeller) {
      return NextResponse.json(
        { error: 'Not authorized to view this offer' },
        { status: 403 }
      );
    }

    // Get listing info
    let listingInfo = null;
    if (listing) {
      // Get seller info
      let sellerInfo = null;
      if (listing.userId) {
        try {
          const seller = await dbService.users.findById(listing.userId);
          if (seller) {
            sellerInfo = {
              id: seller.id,
              username: seller.username,
            };
          }
        } catch (error) {
          console.warn(`Could not fetch seller info:`, error);
        }
      }

      listingInfo = {
        ...listing,
        user: sellerInfo,
      };
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
      ...offer,
      listing: listingInfo,
      buyer: buyerInfo,
    });
  });
}

// PUT /api/offers/[id] - Update offer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    const { id } = await params;
    const user = await requireAuth();
    const body = await request.json();

    // Validate the request body
    const validationResult = updateOfferSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const dbService = getDatabaseService();

    // Verify the offer exists and belongs to the user
    const existingOffer = await dbService.offers.findById(id);
    
    if (!existingOffer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      );
    }

    if (existingOffer.buyerId !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own offers' },
        { status: 403 }
      );
    }

    if (existingOffer.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'You can only edit pending offers' },
        { status: 400 }
      );
    }

    // Get the listing to validate quantity
    const listing = await dbService.listings.findById(existingOffer.listingId);
    if (!listing) {
      return NextResponse.json(
        { error: 'Associated listing not found' },
        { status: 404 }
      );
    }

    // Validate quantity against listing
    if (data.quantity > listing.quantity) {
      return NextResponse.json(
        { error: `Only ${listing.quantity} tickets available` },
        { status: 400 }
      );
    }

    // Update the offer
    const updatedOffer = await dbService.offers.update(id, {
      offerPriceInCents: data.offerPriceInCents,
      quantity: data.quantity,
    });

    // Get seller info
    let sellerInfo = null;
    if (listing.userId) {
      try {
        const seller = await dbService.users.findById(listing.userId);
        if (seller) {
          sellerInfo = {
            id: seller.id,
            username: seller.username,
          };
        }
      } catch (error) {
        console.warn(`Could not fetch seller info:`, error);
      }
    }

    // Get buyer info
    const buyer = await dbService.users.findById(user.id);

    return NextResponse.json({
      success: true,
      data: {
        ...updatedOffer,
        listing: {
          ...listing,
          user: sellerInfo,
        },
        buyer: buyer ? {
          id: buyer.id,
          username: buyer.username,
        } : null,
      },
    });
  });
}

// DELETE /api/offers/[id] - Cancel offer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    const { id } = await params;
    const user = await requireAuth();
    const dbService = getDatabaseService();

    // Verify the offer exists and belongs to the user
    const existingOffer = await dbService.offers.findById(id);
    
    if (!existingOffer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      );
    }

    if (existingOffer.buyerId !== user.id) {
      return NextResponse.json(
        { error: 'You can only cancel your own offers' },
        { status: 403 }
      );
    }

    if (existingOffer.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'You can only cancel pending offers' },
        { status: 400 }
      );
    }

    // Update offer status to CANCELLED
    await dbService.offers.update(id, {
      status: 'REJECTED', // Using REJECTED as there's no CANCELLED status
    });

    return NextResponse.json({
      success: true,
      message: 'Offer cancelled successfully',
    });
  });
}
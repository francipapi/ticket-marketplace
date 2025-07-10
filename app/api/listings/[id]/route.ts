import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/services/factory';
import { requireAuth } from '@/lib/auth-server';
import { withErrorHandling } from '@/lib/api-helpers-enhanced';
import { z } from 'zod';

// Validation schema for updating listings
const updateListingSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  eventName: z.string().min(1).max(200).optional(),
  eventDate: z.string().datetime().optional(),
  venue: z.string().optional(),
  priceInCents: z.number().int().positive().optional(),
  quantity: z.number().int().positive().optional(),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SOLD', 'DELISTED']).optional(),
});

// GET /api/listings/[id] - Get single listing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    const { id } = await params;
    console.log(`🔍 API: Fetching listing ${id}`);
    
    const dbService = getDatabaseService();
    const listing = await dbService.listings.findById(id);
    
    console.log(`📋 API: Listing found:`, {
      id: listing?.id,
      status: listing?.status,
      userId: listing?.userId,
      title: listing?.title
    });
    
    if (!listing) {
      console.log(`❌ API: Listing ${id} not found in database`);
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    // Check if listing is viewable
    // Get current user to check ownership
    let currentUser = null;
    try {
      const { auth } = await import('@clerk/nextjs/server');
      const { userId } = await auth();
      
      if (userId) {
        // Get user from database
        currentUser = await dbService.users.findByClerkId(userId);
      }
    } catch (error) {
      // User not authenticated, continue
      console.log('🔍 No authentication found for listing access check');
    }

    const isOwner = currentUser && currentUser.id === listing.userId;
    const isActive = listing.status === 'ACTIVE';

    console.log(`🔐 API: Access check:`, {
      currentUserId: currentUser?.id,
      listingUserId: listing.userId,
      isOwner,
      listingStatus: listing.status,
      isActive
    });

    // Allow viewing if: listing is active OR user is the owner
    if (!isActive && !isOwner) {
      console.log(`❌ API: Access denied - listing not active and user not owner`);
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    console.log(`✅ API: Access granted to listing ${id}`);
  

    // Get seller info
    let sellerInfo = null;
    if (listing.userId) {
      try {
        const seller = await dbService.users.findById(listing.userId);
        if (seller) {
          sellerInfo = {
            id: seller.id,
            username: seller.username,
            createdAt: seller.createdAt,
          };
        }
      } catch (error) {
        console.warn(`Could not fetch seller info for listing ${listing.id}:`, error);
      }
    }

    // Get pending offers for the listing
    const offersResult = await dbService.offers.findByListingId(id, {
      status: 'PENDING',
      limit: 50,
    });

    // Transform offers with buyer info
    const offers = await Promise.all(
      offersResult.items.map(async (offer) => {
        let buyerInfo = null;
        if (offer.buyerId) {
          try {
            const buyer = await dbService.users.findById(offer.buyerId);
            if (buyer) {
              buyerInfo = {
                username: buyer.username,
              };
            }
          } catch (error) {
            console.warn(`Could not fetch buyer info for offer ${offer.id}:`, error);
          }
        }

        return {
          id: offer.id,
          offerPriceInCents: offer.offerPriceInCents,
          quantity: offer.quantity,
          createdAt: offer.createdAt,
          buyer: buyerInfo,
        };
      })
    );

    return NextResponse.json({
      ...listing,
      user: sellerInfo,
      offers,
    });
  });
}

// PUT /api/listings/[id] - Update listing
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    // Validate the request body
    const validationResult = updateListingSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const dbService = getDatabaseService();

    // Check if listing exists and user owns it
    const existingListing = await dbService.listings.findById(id);
    
    if (!existingListing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    if (existingListing.userId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to update this listing' },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.eventName !== undefined) updateData.eventName = data.eventName;
    if (data.eventDate !== undefined) updateData.eventDate = new Date(data.eventDate);
    if (data.venue !== undefined) updateData.venue = data.venue;
    if (data.priceInCents !== undefined) updateData.priceInCents = data.priceInCents;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;

    // Update the listing
    const updatedListing = await dbService.listings.update(id, updateData);

    // Get seller info
    const seller = await dbService.users.findById(user.id);

    return NextResponse.json({
      ...updatedListing,
      user: seller ? {
        id: seller.id,
        username: seller.username,
      } : null,
    });
  });
}

// DELETE /api/listings/[id] - Delete listing (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    const user = await requireAuth();
    const { id } = await params;
    const dbService = getDatabaseService();

    // Check if listing exists and user owns it
    const existingListing = await dbService.listings.findById(id);
    
    if (!existingListing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    if (existingListing.userId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to delete this listing' },
        { status: 403 }
      );
    }

    // Soft delete by setting status to DELISTED
    await dbService.listings.updateStatus(id, 'DELISTED');

    return NextResponse.json({
      message: 'Listing deleted successfully'
    });
  });
}
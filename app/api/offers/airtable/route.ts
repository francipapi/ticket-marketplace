import { NextRequest, NextResponse } from 'next/server';
import { getAuth, currentUser } from '@clerk/nextjs/server';
import { db, handleDatabaseError } from '@/services/database.service';
import { z } from 'zod';

const createOfferSchema = z.object({
  listingId: z.string().min(1, 'Listing ID is required'),
  offerPrice: z.number().min(1, 'Offer price must be at least 1 cent'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  message: z.enum(['Buy at asking price', 'Make offer', 'Check availability']),
  customMessage: z.string().optional(),
});

// GET /api/offers/airtable - Get user's offers (sent and received)
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'sent' or 'received'

    let offers;

    if (type === 'sent') {
      offers = await db.getOffersByBuyer(user.id);
    } else if (type === 'received') {
      // Get offers on user's listings - we need to implement this
      // For now, return empty array
      offers = [];
    } else {
      // Get all offers for the user
      const sentOffers = await db.getOffersByBuyer(user.id);
      return NextResponse.json({
        sent: sentOffers,
        received: [], // TODO: Implement received offers
      });
    }

    return NextResponse.json(offers);
  } catch (error) {
    console.error('Error fetching offers:', error);
    return NextResponse.json(
      { error: handleDatabaseError(error) },
      { status: 500 }
    );
  }
}

// POST /api/offers/airtable - Create new offer
export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get or create user in Airtable
    let user = await db.getUserByClerkId(userId);
    if (!user) {
      // Try to sync user from Clerk
      const clerkUser = await currentUser();
      if (!clerkUser) {
        return NextResponse.json(
          { error: 'Unable to fetch user information' },
          { status: 500 }
        );
      }
      
      // Create user in Airtable
      const email = clerkUser.emailAddresses[0]?.emailAddress || 'no-email@example.com';
      const username = clerkUser.username || clerkUser.firstName || email.split('@')[0] || 'user';
      
      try {
        user = await db.createUser({
          email,
          username,
          clerkId: userId,
        });
        console.log('User created for offer:', { id: user.id, username: user.username });
      } catch (createError) {
        console.error('Failed to create user in Airtable:', createError);
        return NextResponse.json(
          { error: 'Failed to sync user profile. Please try again.' },
          { status: 500 }
        );
      }
    }

    // Parse and validate request body
    const body = await request.json();
    let validatedData;
    
    try {
      validatedData = createOfferSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid input: ' + error.errors.map(e => e.message).join(', ') },
          { status: 400 }
        );
      }
      throw error;
    }

    const { listingId, offerPrice, quantity, message, customMessage } = validatedData;

    // Check if listing exists and is active
    try {
      const listing = await db.getListingById(listingId);
      
      if (!listing) {
        return NextResponse.json(
          { error: 'Listing not found' },
          { status: 404 }
        );
      }

      if (listing.status !== 'ACTIVE') {
        return NextResponse.json(
          { error: 'Listing is no longer active' },
          { status: 400 }
        );
      }

      // Check if user is trying to make offer on their own listing
      if (listing.seller && listing.seller.includes(user.id)) {
        return NextResponse.json(
          { error: 'Cannot make offer on your own listing' },
          { status: 400 }
        );
      }

      if (quantity > listing.quantity) {
        return NextResponse.json(
          { error: 'Requested quantity not available' },
          { status: 400 }
        );
      }

      // Check if user already has a pending offer on this listing
      const existingOffers = await db.getOffersByBuyer(user.id);
      const existingOffer = existingOffers.find(offer => 
        offer.listing && offer.listing.includes(listingId) && offer.status === 'PENDING'
      );

      if (existingOffer) {
        return NextResponse.json(
          { error: 'You already have a pending offer on this listing' },
          { status: 400 }
        );
      }

      // Create offer in Airtable
      const offer = await db.createOffer({
        listingId,
        buyerId: user.id,
        offerPrice,
        quantity,
        message,
        customMessage,
      });

      console.log('Offer created successfully:', { offerId: offer.id, listingId, buyerId: user.id });

      return NextResponse.json(offer);
    } catch (offerError) {
      console.error('Failed to create offer:', offerError);
      
      // If it's an Airtable error, provide more specific feedback
      if (offerError && typeof offerError === 'object' && 'statusCode' in offerError) {
        const airtableError = offerError as any;
        if (airtableError.statusCode === 422) {
          return NextResponse.json(
            { error: `Invalid data for offer creation: ${airtableError.message}` },
            { status: 422 }
          );
        }
      }
      
      throw offerError;
    }
  } catch (error) {
    console.error('Error creating offer:', error);
    return NextResponse.json(
      { error: handleDatabaseError(error) },
      { status: 500 }
    );
  }
}
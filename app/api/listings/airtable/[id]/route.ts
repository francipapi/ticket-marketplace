import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { db, handleDatabaseError } from '@/services/database.service';
import { updateListingSchema } from '@/lib/validations';
import { z } from 'zod';

// GET /api/listings/airtable/[id] - Get single listing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const listing = await db.getListingById(id);
    
    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }
    
    // Increment view count
    await db.incrementListingViews(id);
    
    // Fetch seller information
    const seller = listing.seller?.[0] 
      ? await db.getUserById(listing.seller[0])
      : null;
    
    // Get offers for this listing
    const offers = await db.getOffersByListing(id);
    
    // Transform the data to match frontend expectations
    const transformedListing = {
      id: listing.id,
      title: listing.title,
      eventName: listing.eventName,
      eventDate: listing.eventDate,
      venue: listing.venue,
      priceInCents: listing.price, // Map price to priceInCents
      quantity: listing.quantity,
      description: listing.description,
      createdAt: listing.createdAt || new Date().toISOString(),
      user: seller ? {
        id: seller.id,
        username: seller.username,
        rating: seller.rating,
        isVerified: seller.isVerified,
        createdAt: seller.createdAt || new Date().toISOString(),
      } : null,
      offers: offers.map(offer => ({
        id: offer.id,
        offerPriceInCents: offer.offerPrice, // Map offerPrice to offerPriceInCents
        quantity: offer.quantity,
        createdAt: offer.createdAt || new Date().toISOString(),
        buyer: {
          username: offer.buyerInfo?.username || 'Anonymous'
        }
      }))
    };
    
    return NextResponse.json(transformedListing);
  } catch (error) {
    console.error('Error fetching listing:', error);
    return NextResponse.json(
      { error: handleDatabaseError(error) },
      { status: 404 }
    );
  }
}

// PUT /api/listings/airtable/[id] - Update listing
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Get listing to check ownership
    const listing = await db.getListingById(id);
    
    if (!listing.seller || listing.seller[0] !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this listing' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    let validatedData;
    
    try {
      validatedData = updateListingSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid input: ' + error.errors.map(e => e.message).join(', ') },
          { status: 400 }
        );
      }
      throw error;
    }

    // Update listing with proper date formatting
    const updateData: any = {};
    
    if (validatedData.title) updateData.title = validatedData.title;
    if (validatedData.eventName) updateData.eventName = validatedData.eventName;
    if (validatedData.eventDate) {
      // Airtable expects YYYY-MM-DD format for date fields
      updateData.eventDate = new Date(validatedData.eventDate).toISOString().split('T')[0];
    }
    if (validatedData.venue !== undefined) updateData.venue = validatedData.venue;
    if (validatedData.price) updateData.price = validatedData.price;
    if (validatedData.quantity) updateData.quantity = validatedData.quantity;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    
    console.log('Update data being sent to Airtable:', updateData);
    
    const updatedListing = await db.updateListing(id, updateData);

    return NextResponse.json({
      ...updatedListing,
      priceInCents: updatedListing.price, // Map price to priceInCents for frontend compatibility
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('Error updating listing:', error);
    return NextResponse.json(
      { error: handleDatabaseError(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/listings/airtable/[id] - Delete listing
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Get listing to check ownership
    const listing = await db.getListingById(id);
    
    if (!listing.seller || listing.seller[0] !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this listing' },
        { status: 403 }
      );
    }

    // Update status to DELISTED instead of actually deleting
    await db.updateListing(id, { status: 'DELISTED' });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting listing:', error);
    return NextResponse.json(
      { error: handleDatabaseError(error) },
      { status: 500 }
    );
  }
}
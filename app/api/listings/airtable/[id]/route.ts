import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db, handleDatabaseError } from '@/services/database.service';
import { updateListingSchema } from '@/lib/validations';
import { z } from 'zod';

// GET /api/listings/airtable/[id] - Get single listing
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const listing = await db.getListingById(params.id);
    
    // Increment view count
    await db.incrementListingViews(params.id);
    
    // Fetch seller information
    const seller = listing.seller?.[0] 
      ? await db.getUserById(listing.seller[0])
      : null;
    
    return NextResponse.json({
      ...listing,
      user: seller ? {
        id: seller.id,
        username: seller.username,
        rating: seller.rating,
        isVerified: seller.isVerified,
      } : null,
    });
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
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();
    
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
    const listing = await db.getListingById(params.id);
    
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

    // Update listing
    const updatedListing = await db.updateListing(params.id, {
      ...(validatedData.title && { title: validatedData.title }),
      ...(validatedData.eventName && { eventName: validatedData.eventName }),
      ...(validatedData.eventDate && { eventDate: new Date(validatedData.eventDate).toISOString() }),
      ...(validatedData.venue !== undefined && { venue: validatedData.venue }),
      ...(validatedData.price && { price: validatedData.price }),
      ...(validatedData.quantity && { quantity: validatedData.quantity }),
      ...(validatedData.description !== undefined && { description: validatedData.description }),
    });

    return NextResponse.json({
      ...updatedListing,
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
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();
    
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
    const listing = await db.getListingById(params.id);
    
    if (!listing.seller || listing.seller[0] !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this listing' },
        { status: 403 }
      );
    }

    // Update status to DELISTED instead of actually deleting
    await db.updateListing(params.id, { status: 'DELISTED' });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting listing:', error);
    return NextResponse.json(
      { error: handleDatabaseError(error) },
      { status: 500 }
    );
  }
}
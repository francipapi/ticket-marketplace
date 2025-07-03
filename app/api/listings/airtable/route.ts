import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { db, handleDatabaseError } from '@/services/database.service';
import { createListingSchema } from '@/lib/validations';
import { z } from 'zod';

// GET /api/listings/airtable - Get all active listings with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const search = searchParams.get('search') || '';
    const eventDate = searchParams.get('eventDate');

    const result = await db.getActiveListings({
      page,
      limit,
      search,
      eventDate: eventDate ? new Date(eventDate) : undefined,
    });

    // Fetch seller information for each listing
    const listingsWithSellers = await Promise.all(
      result.listings.map(async (listing) => {
        try {
          const seller = listing.seller?.[0] 
            ? await db.getUserById(listing.seller[0])
            : null;
          
          return {
            ...listing,
            user: seller ? {
              id: seller.id,
              username: seller.username,
            } : null,
          };
        } catch (error) {
          console.error('Error fetching seller:', error);
          return {
            ...listing,
            user: null,
          };
        }
      })
    );

    return NextResponse.json({
      listings: listingsWithSellers,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    return NextResponse.json(
      { error: handleDatabaseError(error) },
      { status: 500 }
    );
  }
}

// POST /api/listings/airtable - Create new listing
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
      // Get user info from Clerk (this would need the Clerk SDK)
      return NextResponse.json(
        { error: 'User not found. Please complete your profile.' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    let validatedData;
    
    try {
      validatedData = createListingSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid input: ' + error.errors.map(e => e.message).join(', ') },
          { status: 400 }
        );
      }
      throw error;
    }

    const { title, eventName, eventDate, venue, price, quantity, description } = validatedData;

    // Create listing in Airtable
    const listing = await db.createListing({
      title,
      eventName,
      eventDate: new Date(eventDate),
      price, // Already in cents from validation
      quantity,
      venue,
      description,
      sellerId: user.id, // Airtable record ID
    });

    // Return listing with user info
    return NextResponse.json({
      ...listing,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('Error creating listing:', error);
    return NextResponse.json(
      { error: handleDatabaseError(error) },
      { status: 500 }
    );
  }
}
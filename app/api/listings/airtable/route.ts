import { NextRequest, NextResponse } from 'next/server';
import { getAuth, currentUser } from '@clerk/nextjs/server';
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
            priceInCents: listing.price, // Map price to priceInCents for frontend compatibility
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
        console.log('User created successfully:', { id: user.id, username: user.username });
        
        // Add a small delay to ensure user is fully created in Airtable
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (createError) {
        console.error('Failed to create user in Airtable:', createError);
        return NextResponse.json(
          { error: 'Failed to sync user profile. Please try again.' },
          { status: 500 }
        );
      }
    }
    
    // Validate user exists and has a valid ID
    if (!user || !user.id) {
      console.error('User validation failed:', { user, userId });
      return NextResponse.json(
        { error: 'User validation failed. Please try again.' },
        { status: 500 }
      );
    }
    
    console.log('User for listing:', { userId, airtableUserId: user.id });

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
    try {
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
      
      console.log('Listing created successfully:', { listingId: listing.id, sellerId: user.id });
      
      // Return listing with user info
      return NextResponse.json({
        ...listing,
        user: {
          id: user.id,
          username: user.username,
        },
      });
    } catch (listingError) {
      console.error('Failed to create listing:', listingError);
      
      // If it's an Airtable error, provide more specific feedback
      if (listingError && typeof listingError === 'object' && 'statusCode' in listingError) {
        const airtableError = listingError as any;
        if (airtableError.statusCode === 422) {
          return NextResponse.json(
            { error: `Invalid data for listing creation: ${airtableError.message}` },
            { status: 422 }
          );
        }
      }
      
      throw listingError;
    }

    // This should not be reached due to the try-catch block above
    // but keeping it as a fallback
    return NextResponse.json(
      { error: 'Unexpected error in listing creation flow' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error creating listing:', error);
    return NextResponse.json(
      { error: handleDatabaseError(error) },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/services/factory';
import { requireAuth } from '@/lib/auth-server';
import { withErrorHandling } from '@/lib/api-helpers-enhanced';
import { z } from 'zod';

// Validation schema for creating listings
const createListingSchema = z.object({
  title: z.string().min(1).max(200),
  eventName: z.string().min(1).max(200),
  eventDate: z.string().datetime(),
  venue: z.string().optional(),
  priceInCents: z.number().int().positive(),
  quantity: z.number().int().positive(),
  description: z.string().optional(),
});

// GET /api/listings - Get all active listings with pagination
export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const search = searchParams.get('search') || '';
    const eventDate = searchParams.get('eventDate');
    const userId = searchParams.get('userId'); // For dashboard - show user's listings

    const dbService = getDatabaseService();
    
    // Build filters for the service layer
    const filters: any = {
      limit,
      offset: (page - 1) * limit,
    };

    // If userId is provided (dashboard view), don't filter by status to show all user listings
    // Otherwise (public view), only show active listings
    if (userId) {
      filters.userId = userId;
    } else {
      filters.status = 'ACTIVE';
    }

    if (search) {
      filters.eventName = search; // Service layer will handle the search
    }

    if (eventDate) {
      filters.eventDateFrom = new Date(eventDate);
    }

    const result = await dbService.listings.findMany(filters);

    // Transform the result for API response
    const listings = await Promise.all(
      result.items.map(async (listing) => {
        // Get seller info if available
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
            console.warn(`Could not fetch seller info for listing ${listing.id}:`, error);
          }
        }

        return {
          ...listing,
          user: sellerInfo,
          _count: {
            offers: 0, // TODO: Implement offer count in service layer
          },
        };
      })
    );

    return NextResponse.json({
      listings,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  });
}

// POST /api/listings - Create new listing
export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireAuth();
    const body = await request.json();

    // Validate the request body
    const validationResult = createListingSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const dbService = getDatabaseService();

    // Create the listing
    const listing = await dbService.listings.create({
      userId: user.id,
      title: data.title,
      eventName: data.eventName,
      eventDate: new Date(data.eventDate),
      venue: data.venue,
      priceInCents: data.priceInCents,
      quantity: data.quantity,
      description: data.description,
    });

    // Get seller info
    const seller = await dbService.users.findById(user.id);

    return NextResponse.json({
      ...listing,
      user: seller ? {
        id: seller.id,
        username: seller.username,
      } : null,
    });
  });
}
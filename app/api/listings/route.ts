import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { createListingSchema } from '@/lib/validations';
import { 
  createResponse, 
  createErrorResponse, 
  withAuthAndValidation 
} from '@/lib/api-helpers';

// GET /api/listings - Get all active listings with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const eventDate = searchParams.get('eventDate');

    const skip = (page - 1) * limit;

    const where = {
      status: 'active',
      ...(search && {
        OR: [
          { title: { contains: search } },
          { eventName: { contains: search } },
          { venue: { contains: search } },
        ],
      }),
      ...(eventDate && {
        eventDate: {
          gte: new Date(eventDate),
        },
      }),
    };

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
          _count: {
            select: {
              offers: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.listing.count({ where }),
    ]);

    return createResponse({
      listings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

// POST /api/listings - Create new listing
export async function POST(request: NextRequest) {
  try {
    const result = await withAuthAndValidation(request, createListingSchema);
    if (!result.success) {
      return createErrorResponse(result.error);
    }

    const { user, data } = result;
    const { title, eventName, eventDate, venue, price, quantity, description } = data;

    const listing = await prisma.listing.create({
      data: {
        userId: user.id,
        title,
        eventName,
        eventDate: new Date(eventDate),
        venue,
        priceInCents: price,
        quantity,
        description,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return createResponse(listing);
  } catch (error) {
    console.error('Error creating listing:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
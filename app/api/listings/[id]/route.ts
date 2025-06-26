import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { 
  createResponse, 
  createErrorResponse, 
  requireAuth
} from '@/lib/api-helpers';

// GET /api/listings/[id] - Get single listing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const listing = await prisma.listing.findUnique({
      where: { 
        id,
        status: 'active',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            createdAt: true,
          },
        },
        offers: {
          where: {
            status: 'pending',
          },
          select: {
            id: true,
            offerPriceInCents: true,
            quantity: true,
            createdAt: true,
            buyer: {
              select: {
                username: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!listing) {
      return createErrorResponse('Listing not found', 404);
    }

    return createResponse(listing);
  } catch (error) {
    console.error('Error fetching listing:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

// PUT /api/listings/[id] - Update listing
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const data = body;
    const { id } = await params;

    // Check if listing exists and user owns it
    const existingListing = await prisma.listing.findUnique({
      where: { id },
    });

    if (!existingListing) {
      return createErrorResponse('Listing not found', 404);
    }

    if (existingListing.userId !== user.id) {
      return createErrorResponse('Not authorized to update this listing', 403);
    }

    // Update listing
    const updatedData: Record<string, unknown> = {};
    if (data.title) updatedData.title = data.title;
    if (data.eventName) updatedData.eventName = data.eventName;
    if (data.eventDate) updatedData.eventDate = new Date(data.eventDate);
    if (data.venue) updatedData.venue = data.venue;
    if (data.price) updatedData.priceInCents = data.price;
    if (data.quantity) updatedData.quantity = data.quantity;
    if (data.description !== undefined) updatedData.description = data.description;

    const listing = await prisma.listing.update({
      where: { id },
      data: updatedData,
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
    console.error('Error updating listing:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

// DELETE /api/listings/[id] - Delete listing (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Check if listing exists and user owns it
    const existingListing = await prisma.listing.findUnique({
      where: { id },
    });

    if (!existingListing) {
      return createErrorResponse('Listing not found', 404);
    }

    if (existingListing.userId !== user.id) {
      return createErrorResponse('Not authorized to delete this listing', 403);
    }

    // Soft delete by setting status to inactive
    await prisma.listing.update({
      where: { id },
      data: { status: 'inactive' },
    });

    return createResponse({ message: 'Listing deleted successfully' });
  } catch (error) {
    console.error('Error deleting listing:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
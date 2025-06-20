import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { createOfferSchema } from '@/lib/validations';
import { 
  createResponse, 
  createErrorResponse, 
  withAuth, 
  withAuthAndValidation 
} from '@/lib/api-helpers';

// GET /api/offers - Get user's offers (sent and received)
export async function GET(request: NextRequest) {
  try {
    const authResult = await withAuth(request);
    if (!authResult.success) {
      return createErrorResponse(authResult.error, 401);
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'sent' or 'received'

    let offers;

    if (type === 'sent') {
      offers = await prisma.offer.findMany({
        where: { buyerId: user.id },
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              eventName: true,
              eventDate: true,
              priceInCents: true,
              user: {
                select: {
                  username: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (type === 'received') {
      // Get offers on user's listings
      offers = await prisma.offer.findMany({
        where: {
          listing: {
            userId: user.id,
          },
        },
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              eventName: true,
              eventDate: true,
              priceInCents: true,
            },
          },
          buyer: {
            select: {
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Get all offers for the user
      const [sentOffers, receivedOffers] = await Promise.all([
        prisma.offer.findMany({
          where: { buyerId: user.id },
          include: {
            listing: {
              select: {
                id: true,
                title: true,
                eventName: true,
                eventDate: true,
                priceInCents: true,
                user: {
                  select: {
                    username: true,
                  },
                },
              },
            },
          },
        }),
        prisma.offer.findMany({
          where: {
            listing: {
              userId: user.id,
            },
          },
          include: {
            listing: {
              select: {
                id: true,
                title: true,
                eventName: true,
                eventDate: true,
                priceInCents: true,
              },
            },
            buyer: {
              select: {
                username: true,
              },
            },
          },
        }),
      ]);

      return createResponse({
        sent: sentOffers,
        received: receivedOffers,
      });
    }

    return createResponse(offers);
  } catch (error) {
    console.error('Error fetching offers:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

// POST /api/offers - Create new offer
export async function POST(request: NextRequest) {
  try {
    const result = await withAuthAndValidation(request, createOfferSchema);
    if (!result.success) {
      return createErrorResponse(result.error);
    }

    const { user, data } = result;
    const { listingId, offerPrice, quantity, messageTemplate, customMessage } = data;

    // Check if listing exists and is active
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return createErrorResponse('Listing not found', 404);
    }

    if (listing.status !== 'active') {
      return createErrorResponse('Listing is no longer active', 400);
    }

    if (listing.userId === user.id) {
      return createErrorResponse('Cannot make offer on your own listing', 400);
    }

    if (quantity > listing.quantity) {
      return createErrorResponse('Requested quantity not available', 400);
    }

    // Check if user already has a pending offer on this listing
    const existingOffer = await prisma.offer.findFirst({
      where: {
        listingId,
        buyerId: user.id,
        status: 'pending',
      },
    });

    if (existingOffer) {
      return createErrorResponse('You already have a pending offer on this listing', 400);
    }

    // Create offer
    const offer = await prisma.offer.create({
      data: {
        listingId,
        buyerId: user.id,
        offerPriceInCents: offerPrice,
        quantity,
        messageTemplate,
        customMessage: messageTemplate === 'make_offer' ? customMessage : null,
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            eventName: true,
            eventDate: true,
            priceInCents: true,
            user: {
              select: {
                username: true,
              },
            },
          },
        },
        buyer: {
          select: {
            username: true,
          },
        },
      },
    });

    return createResponse(offer);
  } catch (error) {
    console.error('Error creating offer:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { respondToOfferSchema } from '@/lib/validations';
import { 
  createResponse, 
  createErrorResponse, 
  withAuthAndValidation 
} from '@/lib/api-helpers';

// POST /api/offers/[id]/respond - Accept or reject an offer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await withAuthAndValidation(request, respondToOfferSchema);
    if (!result.success) {
      return createErrorResponse(result.error);
    }

    const { user, data } = result;
    const { response } = data;
    const { id } = await params;

    // Find offer and verify ownership
    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        listing: {
          select: {
            id: true,
            userId: true,
            title: true,
            quantity: true,
            status: true,
          },
        },
      },
    });

    if (!offer) {
      return createErrorResponse('Offer not found', 404);
    }

    if (offer.listing.userId !== user.id) {
      return createErrorResponse('Not authorized to respond to this offer', 403);
    }

    if (offer.status !== 'pending') {
      return createErrorResponse('Offer is no longer pending', 400);
    }

    if (offer.listing.status !== 'active') {
      return createErrorResponse('Listing is no longer active', 400);
    }

    // Update offer status
    const updatedOffer = await prisma.offer.update({
      where: { id },
      data: {
        status: response === 'accept' ? 'accepted' : 'rejected',
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
            id: true,
            username: true,
          },
        },
      },
    });

    // If accepted, we'll handle payment in the next step
    // For now, just update the offer status

    return createResponse({
      offer: updatedOffer,
      message: `Offer ${response}ed successfully`,
    });
  } catch (error) {
    console.error('Error responding to offer:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { createResponse, createErrorResponse, requireAuth } from '@/lib/api-helpers';

// POST /api/payments/mock-pay - Mock payment processing
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { offerId } = await request.json();

    if (!offerId) {
      return createErrorResponse('Offer ID is required');
    }

    // Find and validate offer
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            userId: true,
            quantity: true,
            status: true,
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

    if (!offer) {
      return createErrorResponse('Offer not found', 404);
    }

    if (offer.buyerId !== user.id) {
      return createErrorResponse('Not authorized to pay for this offer', 403);
    }

    if (offer.status !== 'accepted') {
      return createErrorResponse('Offer must be accepted before payment', 400);
    }

    if (offer.isPaid) {
      return createErrorResponse('Offer has already been paid', 400);
    }

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock payment success (in real implementation, this would be handled by Stripe webhooks)
    const updatedOffer = await prisma.offer.update({
      where: { id: offerId },
      data: {
        isPaid: true,
        paidAt: new Date(),
        status: 'completed',
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            eventName: true,
            eventDate: true,
            venue: true,
            ticketPath: true,
            originalFileName: true,
          },
        },
      },
    });

    // Update listing quantity
    await prisma.listing.update({
      where: { id: offer.listing.id },
      data: {
        quantity: {
          decrement: offer.quantity,
        },
        // Mark as sold if quantity reaches 0
        status: offer.listing.quantity <= offer.quantity ? 'sold' : 'active',
      },
    });

    return createResponse({
      offer: updatedOffer,
      message: 'Payment successful! You can now download your tickets.',
      downloadAvailable: true,
    });
  } catch (error) {
    console.error('Mock payment error:', error);
    return createErrorResponse('Payment processing failed', 500);
  }
}
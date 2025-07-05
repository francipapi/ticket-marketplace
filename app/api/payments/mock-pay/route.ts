import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService, getPaymentService } from '@/lib/services/factory';
import { requireAuth } from '@/lib/auth-server';
import { withErrorHandling } from '@/lib/api-helpers-enhanced';

// POST /api/payments/mock-pay - Mock payment processing
export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireAuth();
    const { offerId } = await request.json();

    if (!offerId) {
      return NextResponse.json(
        { error: 'Offer ID is required' },
        { status: 400 }
      );
    }

    const dbService = getDatabaseService();
    const paymentService = getPaymentService();

    // Find and validate offer
    const offer = await dbService.offers.findById(offerId);

    if (!offer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      );
    }

    if (offer.buyerId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to pay for this offer' },
        { status: 403 }
      );
    }

    if (offer.status !== 'ACCEPTED') {
      return NextResponse.json(
        { error: 'Offer must be accepted before payment' },
        { status: 400 }
      );
    }

    // Get the listing
    const listing = await dbService.listings.findById(offer.listingId);
    if (!listing) {
      return NextResponse.json(
        { error: 'Associated listing not found' },
        { status: 404 }
      );
    }

    // Simulate payment processing using payment service
    const mockPaymentIntent = await paymentService.createPaymentIntent({
      amount: offer.offerPriceInCents,
      sellerId: listing.userId,
      buyerId: user.id,
      listingId: listing.id,
      offerId: offerId,
    });

    // Simulate payment completion
    if (!paymentService.simulatePayment) {
      throw new Error('Payment service does not support simulation');
    }
    const processedPayment = await paymentService.simulatePayment(mockPaymentIntent.id);

    if (processedPayment.status === 'succeeded') {
      // Update offer status
      const updatedOffer = await dbService.offers.update(offerId, {
        status: 'COMPLETED',
      });

      // Update listing quantity if needed
      if (offer.quantity >= listing.quantity) {
        await dbService.listings.updateStatus(listing.id, 'SOLD');
      }

      return NextResponse.json({
        offer: updatedOffer,
        payment: processedPayment,
        message: 'Payment successful! You can now download your tickets.',
        downloadAvailable: true,
      });
    } else {
      return NextResponse.json(
        { error: 'Payment failed', details: processedPayment },
        { status: 400 }
      );
    }
  });
}
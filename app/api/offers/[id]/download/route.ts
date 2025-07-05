import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/services/factory';
import { requireAuth } from '@/lib/auth-server';
import { withErrorHandling } from '@/lib/api-helpers-enhanced';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    const { id } = await params;
    const user = await requireAuth();
    const dbService = getDatabaseService();

    // Get the offer
    const offer = await dbService.offers.findById(id);
    if (!offer) {
      return NextResponse.json(
        { success: false, error: 'Offer not found' },
        { status: 404 }
      );
    }

    // Verify the offer belongs to the user
    if (offer.buyerId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only download tickets for your own paid offers' },
        { status: 403 }
      );
    }

    // Check if offer is completed and paid
    if (offer.status !== 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'You can only download tickets for completed offers' },
        { status: 400 }
      );
    }

    // Get the listing
    const listing = await dbService.listings.findById(offer.listingId);
    if (!listing) {
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 }
      );
    }

    // Get seller info
    const seller = await dbService.users.findById(listing.userId);
    const sellerName = seller?.username || 'Unknown Seller';

    // Generate a mock ticket file for demonstration
    const ticketContent = `
🎫 TICKET CONFIRMATION 🎫

Event: ${listing.eventName}
Title: ${listing.title}
Date: ${new Date(listing.eventDate).toLocaleDateString()}
${listing.venue ? `Venue: ${listing.venue}` : ''}

Quantity: ${offer.quantity} ticket(s)
Total Paid: $${(offer.offerPriceInCents / 100).toFixed(2)}

Confirmation Number: ${offer.id}
Purchase Date: ${new Date().toLocaleDateString()}

Sold by: ${sellerName}
Purchased by: ${user.username}

⚠️  This is a mock ticket for demonstration purposes.
In a real implementation, this would be the actual ticket file
uploaded by the seller with proper watermarking and security.

Thank you for using Ticket Marketplace!
    `.trim();

    const fileName = `ticket-${listing.eventName.replace(/[^a-zA-Z0-9]/g, '-')}-${offer.id}.txt`;
    
    return new NextResponse(ticketContent, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  });
}
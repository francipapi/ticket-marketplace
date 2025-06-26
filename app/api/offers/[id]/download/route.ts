import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '@/lib/api-helpers';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();

    // Verify user still exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, username: true },
    });
    
    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }

    // Verify the offer exists, is paid, and belongs to the user
    const offer = await prisma.offer.findUnique({
      where: { id },
      include: { 
        listing: {
          include: {
            user: true
          }
        }
      }
    });

    if (!offer) {
      return NextResponse.json(
        { success: false, error: 'Offer not found' },
        { status: 404 }
      );
    }

    if (offer.buyerId !== dbUser.id) {
      return NextResponse.json(
        { success: false, error: 'You can only download tickets for your own paid offers' },
        { status: 403 }
      );
    }

    if (!offer.isPaid || offer.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: 'You can only download tickets for completed and paid offers' },
        { status: 400 }
      );
    }

    // Check if listing has a ticket file
    if (!offer.listing.ticketPath || !offer.listing.originalFileName) {
      // Generate a mock ticket file for demonstration
      const ticketContent = `
🎫 TICKET CONFIRMATION 🎫

Event: ${offer.listing.eventName}
Title: ${offer.listing.title}
Date: ${new Date(offer.listing.eventDate).toLocaleDateString()}
${offer.listing.venue ? `Venue: ${offer.listing.venue}` : ''}

Quantity: ${offer.quantity} ticket(s)
Total Paid: $${(offer.offerPriceInCents / 100).toFixed(2)}

Confirmation Number: ${offer.id}
Purchase Date: ${new Date(offer.paidAt!).toLocaleDateString()}

Sold by: ${offer.listing.user.username}
Purchased by: ${dbUser.username}

⚠️  This is a mock ticket for demonstration purposes.
In a real implementation, this would be the actual ticket file
uploaded by the seller with proper watermarking and security.

Thank you for using Ticket Marketplace!
      `.trim();

      const fileName = `ticket-${offer.listing.eventName.replace(/[^a-zA-Z0-9]/g, '-')}-${offer.id}.txt`;
      
      return new NextResponse(ticketContent, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      });
    }

    // Try to serve the actual uploaded file
    const filePath = path.join(process.cwd(), 'uploads', offer.listing.ticketPath);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: 'Ticket file not found on server' },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(filePath);
    const mimeType = offer.listing.fileType || 'application/octet-stream';
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${offer.listing.originalFileName}"`,
      },
    });

  } catch (error) {
    console.error('Error downloading ticket:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to download ticket' },
      { status: 500 }
    );
  }
}
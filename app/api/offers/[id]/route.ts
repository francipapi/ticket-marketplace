import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authService } from '@/lib/auth';

const prisma = new PrismaClient();

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('Authorization')?.replace('Bearer ', '') || 
                  request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = authService.verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

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

    const body = await request.json();
    const { offerPriceInCents, quantity } = body;

    // More robust validation
    if (typeof offerPriceInCents !== 'number' || offerPriceInCents <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid offer price is required' },
        { status: 400 }
      );
    }

    if (typeof quantity !== 'number' || quantity <= 0 || !Number.isInteger(quantity)) {
      return NextResponse.json(
        { success: false, error: 'Valid quantity is required' },
        { status: 400 }
      );
    }

    // Verify the offer exists and belongs to the user
    const existingOffer = await prisma.offer.findUnique({
      where: { id },
      include: { listing: true }
    });

    if (!existingOffer) {
      return NextResponse.json(
        { success: false, error: 'Offer not found' },
        { status: 404 }
      );
    }

    if (existingOffer.buyerId !== dbUser.id) {
      return NextResponse.json(
        { success: false, error: 'You can only edit your own offers' },
        { status: 403 }
      );
    }

    if (existingOffer.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'You can only edit pending offers' },
        { status: 400 }
      );
    }

    // Validate quantity against listing
    if (quantity > existingOffer.listing.quantity) {
      return NextResponse.json(
        { success: false, error: `Only ${existingOffer.listing.quantity} tickets available` },
        { status: 400 }
      );
    }

    // Update the offer
    const updatedOffer = await prisma.offer.update({
      where: { id },
      data: {
        offerPriceInCents,
        quantity,
      },
      include: {
        listing: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
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

    return NextResponse.json({
      success: true,
      data: updatedOffer,
    });

  } catch (error) {
    console.error('Error updating offer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update offer' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('Authorization')?.replace('Bearer ', '') || 
                  request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = authService.verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

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

    // Verify the offer exists and belongs to the user
    const existingOffer = await prisma.offer.findUnique({
      where: { id },
    });

    if (!existingOffer) {
      return NextResponse.json(
        { success: false, error: 'Offer not found' },
        { status: 404 }
      );
    }

    if (existingOffer.buyerId !== dbUser.id) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own offers' },
        { status: 403 }
      );
    }

    if (existingOffer.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'You can only cancel pending offers' },
        { status: 400 }
      );
    }

    // Delete the offer
    await prisma.offer.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Offer cancelled successfully',
    });

  } catch (error) {
    console.error('Error deleting offer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel offer' },
      { status: 500 }
    );
  }
}
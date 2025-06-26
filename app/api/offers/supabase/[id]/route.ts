import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase-server'
import { createResponse, createErrorResponse } from '@/lib/api-auth'

interface Props {
  params: { id: string }
}

// GET /api/offers/supabase/[id] - Get single offer
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const user = await getServerUser()
    if (!user) {
      return createErrorResponse('Unauthorized', 401)
    }

    const supabase = await createServerSupabaseClient()
    
    const { data: offer, error } = await supabase
      .from('offers')
      .select(`
        *,
        listing:listings (
          *,
          user:users!userId (
            id,
            username
          )
        ),
        buyer:users!buyerId (
          id,
          username,
          email
        )
      `)
      .eq('id', params.id)
      .single()

    if (error || !offer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      )
    }

    // Check if user is involved in this offer
    const isInvolved = offer.buyerId === user.id || offer.listing.userId === user.id
    if (!isInvolved) {
      return NextResponse.json(
        { error: 'Forbidden: You can only view offers you are involved in' },
        { status: 403 }
      )
    }

    return createResponse({ offer })

  } catch (error) {
    console.error('Get offer error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/offers/supabase/[id] - Update offer (accept/reject/update)
export async function PUT(request: NextRequest, { params }: Props) {
  try {
    const user = await getServerUser()
    if (!user) {
      return createErrorResponse('Unauthorized', 401)
    }

    const body = await request.json()
    const { action, ...updateData } = body

    const supabase = await createServerSupabaseClient()
    
    // Get the offer with listing info
    const { data: offer, error: fetchError } = await supabase
      .from('offers')
      .select(`
        *,
        listing:listings (
          id,
          userId,
          title,
          ticketPath,
          quantity,
          status
        )
      `)
      .eq('id', params.id)
      .single()

    if (fetchError || !offer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      )
    }

    if (offer.status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only modify pending offers' },
        { status: 400 }
      )
    }

    let updateFields: any = {}

    if (action === 'accept') {
      // Only listing owner can accept
      if (offer.listing.userId !== user.id) {
        return NextResponse.json(
          { error: 'Only the seller can accept offers' },
          { status: 403 }
        )
      }

      updateFields = {
        status: 'accepted',
        updatedAt: new Date().toISOString()
      }

    } else if (action === 'reject') {
      // Only listing owner can reject
      if (offer.listing.userId !== user.id) {
        return NextResponse.json(
          { error: 'Only the seller can reject offers' },
          { status: 403 }
        )
      }

      updateFields = {
        status: 'rejected',
        updatedAt: new Date().toISOString()
      }

    } else if (action === 'update') {
      // Only buyer can update their offer
      if (offer.buyerId !== user.id) {
        return NextResponse.json(
          { error: 'Only the buyer can update their offer' },
          { status: 403 }
        )
      }

      // Allow updating price, quantity, and message
      updateFields = {
        offerPriceInCents: updateData.offerPriceInCents || offer.offerPriceInCents,
        quantity: updateData.quantity || offer.quantity,
        customMessage: updateData.customMessage !== undefined ? updateData.customMessage : offer.customMessage,
        updatedAt: new Date().toISOString()
      }

      // Validate quantity doesn't exceed listing quantity
      if (updateFields.quantity > offer.listing.quantity) {
        return NextResponse.json(
          { error: 'Requested quantity exceeds available tickets' },
          { status: 400 }
        )
      }

    } else if (action === 'pay') {
      // Only buyer can pay for accepted offers
      if (offer.buyerId !== user.id) {
        return NextResponse.json(
          { error: 'Only the buyer can pay for offers' },
          { status: 403 }
        )
      }

      if (offer.status !== 'accepted') {
        return NextResponse.json(
          { error: 'Can only pay for accepted offers' },
          { status: 400 }
        )
      }

      // Mock payment completion
      updateFields = {
        isPaid: true,
        paidAt: new Date().toISOString(),
        status: 'completed',
        updatedAt: new Date().toISOString()
      }

    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    // Update the offer
    const { data: updatedOffer, error: updateError } = await supabase
      .from('offers')
      .update(updateFields)
      .eq('id', params.id)
      .select(`
        *,
        listing:listings (
          *,
          user:users!userId (
            id,
            username
          )
        ),
        buyer:users!buyerId (
          id,
          username
        )
      `)
      .single()

    if (updateError) {
      console.error('Update offer error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update offer' },
        { status: 500 }
      )
    }

    return createResponse({
      message: `Offer ${action}ed successfully`,
      offer: updatedOffer
    })

  } catch (error) {
    console.error('Update offer error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/offers/supabase/[id] - Cancel offer (buyer only)
export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const user = await getServerUser()
    if (!user) {
      return createErrorResponse('Unauthorized', 401)
    }

    const supabase = await createServerSupabaseClient()
    
    // Check ownership
    const { data: offer, error: fetchError } = await supabase
      .from('offers')
      .select('buyerId, status')
      .eq('id', params.id)
      .single()

    if (fetchError || !offer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      )
    }

    if (offer.buyerId !== user.id) {
      return NextResponse.json(
        { error: 'You can only cancel your own offers' },
        { status: 403 }
      )
    }

    if (offer.status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only cancel pending offers' },
        { status: 400 }
      )
    }

    // Delete the offer
    const { error: deleteError } = await supabase
      .from('offers')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Delete offer error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to cancel offer' },
        { status: 500 }
      )
    }

    return createResponse({
      message: 'Offer cancelled successfully'
    })

  } catch (error) {
    console.error('Cancel offer error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase-server'
import { createResponse, createErrorResponse } from '@/lib/api-auth'

interface Props {
  params: { id: string }
}

// GET /api/listings/supabase/[id] - Get single listing
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data: listing, error } = await supabase
      .from('listings')
      .select(`
        *,
        user:users!userId (
          id,
          username,
          email
        ),
        offers (
          id,
          offerPriceInCents,
          quantity,
          status,
          createdAt,
          buyer:users!buyerId (
            id,
            username
          )
        )
      `)
      .eq('id', params.id)
      .single()

    if (error || !listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    return createResponse({
      listing
    })

  } catch (error) {
    console.error('Get listing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/listings/supabase/[id] - Update listing (owner only)
export async function PUT(request: NextRequest, { params }: Props) {
  try {
    const user = await getServerUser()
    if (!user) {
      return createErrorResponse('Unauthorized', 401)
    }

    const supabase = await createServerSupabaseClient()
    
    // Check if user owns this listing
    const { data: existingListing, error: fetchError } = await supabase
      .from('listings')
      .select('userId')
      .eq('id', params.id)
      .single()

    if (fetchError || !existingListing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    if (existingListing.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only update your own listings' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Only allow certain fields to be updated
    const allowedUpdates = {
      title: body.title,
      description: body.description,
      priceInCents: body.priceInCents,
      quantity: body.quantity,
      status: body.status
    }

    const { data: updatedListing, error: updateError } = await supabase
      .from('listings')
      .update(allowedUpdates)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Update listing error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update listing' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Listing updated successfully',
      listing: updatedListing
    })

  } catch (error) {
    console.error('Update listing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/listings/supabase/[id] - Delete listing (owner only)
export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const user = await getServerUser()
    if (!user) {
      return createErrorResponse('Unauthorized', 401)
    }

    const supabase = await createServerSupabaseClient()
    
    // Check ownership and get file path for cleanup
    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('userId, ticketPath')
      .eq('id', params.id)
      .single()

    if (fetchError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    if (listing.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own listings' },
        { status: 403 }
      )
    }

    // Delete the listing (cascading delete will handle offers)
    const { error: deleteError } = await supabase
      .from('listings')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Delete listing error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete listing' },
        { status: 500 }
      )
    }

    return createResponse({
      message: 'Listing deleted successfully'
    })

  } catch (error) {
    console.error('Delete listing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase-server'
import { createResponse, createErrorResponse } from '@/lib/api-auth'
import { z } from 'zod'

const createOfferSchema = z.object({
  listingId: z.string().uuid(),
  offerPriceInCents: z.number().min(100),
  quantity: z.number().min(1),
  messageTemplate: z.enum(['asking_price', 'make_offer', 'check_availability']),
  customMessage: z.string().optional()
})

// GET /api/offers/supabase - Get user's offers
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return createErrorResponse('Unauthorized', 401)
    }

    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'sent' // 'sent' or 'received'

    let query = supabase
      .from('offers')
      .select(`
        *,
        listing:listings (
          id,
          title,
          eventName,
          eventDate,
          priceInCents,
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
      .order('createdAt', { ascending: false })

    if (type === 'sent') {
      query = query.eq('buyerId', user.id)
    } else if (type === 'received') {
      // Get offers on user's listings
      query = query.eq('listing.userId', user.id)
    }

    const { data: offers, error } = await query

    if (error) {
      console.error('Get offers error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch offers' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      offers: offers || []
    })

  } catch (error) {
    console.error('Get offers error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/offers/supabase - Create new offer
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return createErrorResponse('Unauthorized', 401)
    }

    const body = await request.json()
    const validatedData = createOfferSchema.parse(body)

    const supabase = await createServerSupabaseClient()

    // Verify listing exists and is active
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, userId, status, priceInCents, quantity, title')
      .eq('id', validatedData.listingId)
      .single()

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    if (listing.status !== 'active') {
      return NextResponse.json(
        { error: 'Listing is not active' },
        { status: 400 }
      )
    }

    if (listing.userId === user.id) {
      return NextResponse.json(
        { error: 'You cannot make an offer on your own listing' },
        { status: 400 }
      )
    }

    if (validatedData.quantity > listing.quantity) {
      return NextResponse.json(
        { error: 'Requested quantity exceeds available tickets' },
        { status: 400 }
      )
    }

    // Check for existing pending offer from this user on this listing
    const { data: existingOffer } = await supabase
      .from('offers')
      .select('id')
      .eq('listingId', validatedData.listingId)
      .eq('buyerId', user.id)
      .eq('status', 'pending')
      .single()

    if (existingOffer) {
      return NextResponse.json(
        { error: 'You already have a pending offer on this listing' },
        { status: 400 }
      )
    }

    // Create the offer
    const { data: offer, error: createError } = await supabase
      .from('offers')
      .insert({
        listingId: validatedData.listingId,
        buyerId: user.id,
        offerPriceInCents: validatedData.offerPriceInCents,
        quantity: validatedData.quantity,
        messageTemplate: validatedData.messageTemplate,
        customMessage: validatedData.customMessage,
        status: 'pending'
      })
      .select(`
        *,
        listing:listings (
          id,
          title,
          eventName,
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

    if (createError) {
      console.error('Create offer error:', createError)
      return NextResponse.json(
        { error: 'Failed to create offer' },
        { status: 500 }
      )
    }

    return createResponse({
      message: 'Offer created successfully',
      offer
    })

  } catch (error) {
    console.error('Create offer error:', error)
    
    if (error instanceof z.ZodError) {
      return createErrorResponse('Invalid input: ' + error.errors.map(e => e.message).join(', '), 400)
    }

    return createErrorResponse('Internal server error', 500)
  }
}
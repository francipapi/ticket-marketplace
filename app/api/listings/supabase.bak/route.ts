import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createResponse, createErrorResponse, requireAuth } from '@/lib/api-helpers'
import { ensureUserSync } from '@/lib/ensure-user-sync'
import { z } from 'zod'

const createListingSchema = z.object({
  title: z.string().min(3).max(100),
  eventName: z.string().min(3),
  eventDate: z.string().datetime(),
  venue: z.string().optional(),
  priceInCents: z.number().min(100), // Minimum $1.00
  quantity: z.number().min(1).max(10),
  description: z.string().optional(),
  // File info from upload
  ticketPath: z.string().optional(),
  originalFileName: z.string().optional(),
  fileType: z.string().optional(),
  fileSize: z.number().optional(),
})

// GET /api/listings/supabase - Browse listings
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const search = searchParams.get('search') || ''
    
    const offset = (page - 1) * limit

    let query = supabase
      .from('listings')
      .select(`
        *,
        user:users!userId (
          id,
          username,
          email
        )
      `)
      .eq('status', 'active')
      .order('createdAt', { ascending: false })

    // Add search filter if provided
    if (search) {
      query = query.or(`title.ilike.%${search}%,eventName.ilike.%${search}%`)
    }

    const { data: listings, error, count } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Supabase listings query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch listings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      listings: listings || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Get listings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/listings/supabase - Create new listing
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (!user) {
      return createErrorResponse('Unauthorized', 401)
    }

    const body = await request.json()
    const validatedData = createListingSchema.parse(body)

    const supabase = await createClient()

    // Convert eventDate string to Date object
    const eventDate = new Date(validatedData.eventDate)

    // First check if we have proper auth
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      console.error('No authenticated user found')
      return createErrorResponse('Not authenticated', 401)
    }

    // Ensure user record exists (in case trigger failed)
    try {
      await ensureUserSync(authUser.id, authUser.email!)
    } catch (syncError) {
      console.error('User sync failed:', syncError)
      // Continue anyway - the user might already exist
    }

    // Log for debugging
    console.log('Creating listing for user:', {
      appUserId: user.id,
      supabaseAuthId: authUser.id,
      userSupabaseId: user.supabaseId
    })

    const { data: listing, error } = await supabase
      .from('listings')
      .insert({
        userId: user.id,
        title: validatedData.title,
        eventName: validatedData.eventName,
        eventDate: eventDate.toISOString(),
        venue: validatedData.venue,
        priceInCents: validatedData.priceInCents,
        quantity: validatedData.quantity,
        description: validatedData.description,
        ticketPath: validatedData.ticketPath,
        originalFileName: validatedData.originalFileName,
        fileType: validatedData.fileType,
        fileSize: validatedData.fileSize,
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      console.error('Create listing error details:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      
      // Check for RLS policy violations
      if (error.code === '42501') {
        return createErrorResponse('Permission denied. Please ensure you are properly authenticated.', 403)
      }
      
      return NextResponse.json(
        { error: error.message || 'Failed to create listing' },
        { status: 500 }
      )
    }

    return createResponse({
      message: 'Listing created successfully',
      listing
    })

  } catch (error) {
    console.error('Create listing error:', error)
    
    if (error instanceof z.ZodError) {
      return createErrorResponse('Invalid input: ' + error.errors.map(e => e.message).join(', '), 400)
    }

    return createErrorResponse('Internal server error', 500)
  }
}
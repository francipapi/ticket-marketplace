// Enhanced Listings API Route
// Uses the new service layer for listing operations

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { 
  createResponse, 
  createErrorResponse, 
  withAuthAndValidation,
  withAuth,
  logRequest,
  handleApiError 
} from '@/lib/api-helpers-enhanced'
import { getDatabaseService } from '@/lib/services/factory'

// Request validation schemas
const CreateListingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  eventName: z.string().min(1, 'Event name is required').max(200, 'Event name too long'),
  eventDate: z.union([
    z.string().transform((str) => new Date(str)),
    z.date()
  ]),
  venue: z.string().optional(),
  priceInCents: z.number().min(100, 'Minimum price is $1.00').max(10000000, 'Maximum price is $100,000'),
  quantity: z.number().min(1, 'Minimum quantity is 1').max(100, 'Maximum quantity is 100'),
  description: z.string().optional(),
  ticketPath: z.string().optional(),
  originalFileName: z.string().optional(),
  fileType: z.string().optional(),
  fileSize: z.number().optional()
})

const UpdateListingSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  eventName: z.string().min(1).max(200).optional(),
  eventDate: z.union([
    z.string().transform((str) => new Date(str)),
    z.date()
  ]).optional(),
  venue: z.string().optional(),
  priceInCents: z.number().min(100).max(10000000).optional(),
  quantity: z.number().min(1).max(100).optional(),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SOLD', 'DELISTED']).optional()
})

const ListingFiltersSchema = z.object({
  userId: z.string().optional(),
  status: z.string().optional(),
  eventName: z.string().optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
  eventDateFrom: z.string().transform((str) => new Date(str)).optional(),
  eventDateTo: z.string().transform((str) => new Date(str)).optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0)
})

type CreateListingRequest = z.infer<typeof CreateListingSchema>
type ListingFiltersRequest = z.infer<typeof ListingFiltersSchema>

// Create new listing
export async function POST(request: NextRequest) {
  const requestId = logRequest(request, { endpoint: 'POST /api/listings/enhanced' })
  
  try {
    // Authenticate and validate request
    const result = await withAuthAndValidation(request, CreateListingSchema, {
      requestId,
      logAuth: true,
      logValidation: true
    })
    
    if (!result.success) {
      return createErrorResponse(result.error, 400, { requestId })
    }
    
    const { user, data } = result
    
    return await handleApiError(async () => {
      console.log(`📝 Creating listing "${data.title}" for user ${user.id} [${requestId}]`)
      
      // Get database service
      const dbService = getDatabaseService()
      
      // Create listing
      const listing = await dbService.listings.create({
        userId: user.id,
        title: data.title,
        eventName: data.eventName,
        eventDate: typeof data.eventDate === 'string' ? new Date(data.eventDate) : data.eventDate,
        venue: data.venue,
        priceInCents: data.priceInCents,
        quantity: data.quantity,
        description: data.description,
        ticketPath: data.ticketPath,
        originalFileName: data.originalFileName,
        fileType: data.fileType,
        fileSize: data.fileSize
      })
      
      const responseData = {
        listing: {
          ...listing,
          priceFormatted: `$${(listing.priceInCents / 100).toFixed(2)}`,
          eventDateFormatted: listing.eventDate.toLocaleDateString(),
          createdAtFormatted: listing.createdAt.toLocaleString()
        },
        actions: {
          view: `/api/listings/enhanced/${listing.id}`,
          edit: `/api/listings/enhanced/${listing.id}`,
          delete: `/api/listings/enhanced/${listing.id}`,
          viewOffers: `/api/offers/enhanced?listingId=${listing.id}`
        }
      }
      
      console.log(`✅ Listing created successfully [${requestId}]: ${listing.id}`)
      
      return createResponse(responseData, { 
        message: 'Listing created successfully',
        requestId 
      })
    }, 'Create listing operation', requestId)
    
  } catch (error: any) {
    console.error(`❌ Create listing failed [${requestId}]:`, error)
    
    return createErrorResponse(
      {
        code: 'LISTING_CREATION_FAILED',
        message: 'Failed to create listing',
        details: error.message
      },
      500,
      { requestId }
    )
  }
}

// Get listings with filtering
export async function GET(request: NextRequest) {
  const requestId = logRequest(request, { endpoint: 'GET /api/listings/enhanced' })
  
  try {
    // Get URL parameters
    const url = new URL(request.url)
    const filters = {
      userId: url.searchParams.get('userId') || undefined,
      status: url.searchParams.get('status') || undefined,
      eventName: url.searchParams.get('eventName') || undefined,
      priceMin: url.searchParams.get('priceMin') ? parseInt(url.searchParams.get('priceMin')!) : undefined,
      priceMax: url.searchParams.get('priceMax') ? parseInt(url.searchParams.get('priceMax')!) : undefined,
      eventDateFrom: url.searchParams.get('eventDateFrom') || undefined,
      eventDateTo: url.searchParams.get('eventDateTo') || undefined,
      limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 20,
      offset: url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!) : 0
    }
    
    // Validate filters
    const validationResult = ListingFiltersSchema.safeParse(filters)
    if (!validationResult.success) {
      return createErrorResponse('Invalid filter parameters', 400, { requestId })
    }
    
    const validatedFilters = validationResult.data
    
    // Optional authentication - some listings may be public
    const authResult = await withAuth({ requestId, logAuth: true, required: false })
    const currentUser = authResult.success ? authResult.user : null
    
    return await handleApiError(async () => {
      console.log(`🔍 Finding listings with filters [${requestId}]:`, validatedFilters)
      
      // Get database service
      const dbService = getDatabaseService()
      
      // Get listings
      const paginatedListings = await dbService.listings.findMany(validatedFilters)
      
      // Format listings for response
      const formattedListings = paginatedListings.items.map(listing => ({
        ...listing,
        priceFormatted: `$${(listing.priceInCents / 100).toFixed(2)}`,
        eventDateFormatted: listing.eventDate.toLocaleDateString(),
        createdAtFormatted: listing.createdAt.toLocaleString(),
        isOwner: currentUser?.id === listing.userId,
        actions: {
          view: `/api/listings/enhanced/${listing.id}`,
          ...(currentUser?.id === listing.userId && {
            edit: `/api/listings/enhanced/${listing.id}`,
            delete: `/api/listings/enhanced/${listing.id}`,
            viewOffers: `/api/offers/enhanced?listingId=${listing.id}`
          }),
          ...(currentUser && currentUser.id !== listing.userId && {
            makeOffer: `/api/offers/enhanced`,
            viewOffers: `/api/offers/enhanced?listingId=${listing.id}`
          })
        }
      }))
      
      const responseData = {
        listings: formattedListings,
        pagination: {
          total: paginatedListings.total,
          limit: paginatedListings.limit,
          offset: paginatedListings.offset,
          hasMore: paginatedListings.hasMore,
          currentPage: Math.floor(paginatedListings.offset / paginatedListings.limit) + 1,
          totalPages: Math.ceil(paginatedListings.total / paginatedListings.limit)
        },
        filters: validatedFilters,
        meta: {
          resultCount: formattedListings.length,
          isAuthenticated: !!currentUser,
          canCreateListing: !!currentUser
        }
      }
      
      console.log(`✅ Found ${formattedListings.length} listings [${requestId}]`)
      
      return createResponse(responseData, { 
        message: `Found ${formattedListings.length} listings`,
        requestId 
      })
    }, 'Get listings operation', requestId)
    
  } catch (error: any) {
    console.error(`❌ Get listings failed [${requestId}]:`, error)
    
    return createErrorResponse(
      {
        code: 'LISTINGS_RETRIEVAL_FAILED',
        message: 'Failed to retrieve listings',
        details: error.message
      },
      500,
      { requestId }
    )
  }
}
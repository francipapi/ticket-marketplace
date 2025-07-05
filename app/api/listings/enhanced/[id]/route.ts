// Individual Listing API Route
// CRUD operations for individual listings using the new service layer

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

// Request validation schema for updates
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

// type UpdateListingRequest = z.infer<typeof UpdateListingSchema> // Keep for future use

// Get individual listing
export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = logRequest(request, { endpoint: 'GET /api/listings/enhanced/[id]' })
  const { id } = await params
  
  try {
    // Optional authentication - public listings can be viewed by anyone
    const authResult = await withAuth({ requestId, logAuth: true, required: false })
    const currentUser = authResult.success ? authResult.user : null
    
    return await handleApiError(async () => {
      console.log(`🔍 Getting listing ${id} [${requestId}]`)
      
      // Get database service
      const dbService = getDatabaseService()
      
      // Get listing
      const listing = await dbService.listings.findById(id)
      
      if (!listing) {
        return createErrorResponse(
          {
            code: 'LISTING_NOT_FOUND',
            message: 'Listing not found'
          },
          404,
          { requestId }
        )
      }
      
      // Increment view count (async, don't wait)
      dbService.listings.incrementViews(id).catch(error => 
        console.error('Failed to increment views:', error)
      )
      
      // Check if current user is the owner
      const isOwner = currentUser?.id === listing.userId
      
      // Get related data if user is authenticated
      let offers = null
      if (currentUser) {
        try {
          const offerResults = await dbService.offers.findByListingId(id, { limit: 5 })
          offers = {
            total: offerResults.total,
            recent: offerResults.items.slice(0, 3).map(offer => ({
              id: offer.id,
              offerPriceFormatted: `$${(offer.offerPriceInCents / 100).toFixed(2)}`,
              quantity: offer.quantity,
              status: offer.status,
              messageTemplate: offer.messageTemplate,
              createdAt: offer.createdAt,
              isFromCurrentUser: offer.buyerId === currentUser.id
            }))
          }
        } catch (error) {
          console.error('Failed to fetch offers:', error)
        }
      }
      
      const responseData = {
        listing: {
          ...listing,
          priceFormatted: `$${(listing.priceInCents / 100).toFixed(2)}`,
          eventDateFormatted: listing.eventDate.toLocaleDateString(),
          createdAtFormatted: listing.createdAt.toLocaleString(),
          isOwner,
          viewCount: listing.views || 0
        },
        offers,
        permissions: {
          canEdit: isOwner,
          canDelete: isOwner,
          canMakeOffer: currentUser && !isOwner,
          canViewOffers: !!currentUser
        },
        actions: {
          ...(isOwner && {
            edit: `/api/listings/enhanced/${id}`,
            delete: `/api/listings/enhanced/${id}`,
            viewAllOffers: `/api/offers/enhanced?listingId=${id}`,
            updateStatus: `/api/listings/enhanced/${id}`
          }),
          ...(currentUser && !isOwner && {
            makeOffer: `/api/offers/enhanced`,
            viewPublicOffers: `/api/offers/enhanced?listingId=${id}`
          })
        },
        meta: {
          isAuthenticated: !!currentUser,
          viewedAt: new Date().toISOString(),
          relatedListings: `/api/listings/enhanced?eventName=${encodeURIComponent(listing.eventName)}`
        }
      }
      
      console.log(`✅ Listing retrieved successfully [${requestId}]: ${id}`)
      
      return createResponse(responseData, { 
        message: 'Listing retrieved successfully',
        requestId 
      })
    }, 'Get listing operation', requestId)
    
  } catch (error: any) {
    console.error(`❌ Get listing failed [${requestId}]:`, error)
    
    return createErrorResponse(
      {
        code: 'LISTING_RETRIEVAL_FAILED',
        message: 'Failed to retrieve listing',
        details: error.message
      },
      500,
      { requestId }
    )
  }
}

// Update listing
export async function PATCH(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = logRequest(request, { endpoint: 'PATCH /api/listings/enhanced/[id]' })
  const { id } = await params
  
  try {
    // Authenticate and validate request
    const result = await withAuthAndValidation(request, UpdateListingSchema, {
      requestId,
      logAuth: true,
      logValidation: true
    })
    
    if (!result.success) {
      return createErrorResponse(result.error, 400, { requestId })
    }
    
    const { user, data } = result
    
    return await handleApiError(async () => {
      console.log(`📝 Updating listing ${id} for user ${user.id} [${requestId}]`)
      
      // Get database service
      const dbService = getDatabaseService()
      
      // Check if listing exists and user owns it
      const existingListing = await dbService.listings.findById(id)
      
      if (!existingListing) {
        return createErrorResponse(
          {
            code: 'LISTING_NOT_FOUND',
            message: 'Listing not found'
          },
          404,
          { requestId }
        )
      }
      
      if (existingListing.userId !== user.id) {
        return createErrorResponse(
          {
            code: 'LISTING_ACCESS_DENIED',
            message: 'You can only update your own listings'
          },
          403,
          { requestId }
        )
      }
      
      // Update listing - ensure eventDate is properly converted
      const updateData: any = {
        ...data,
        ...(data.eventDate && {
          eventDate: typeof data.eventDate === 'string' ? new Date(data.eventDate) : data.eventDate
        })
      }
      const updatedListing = await dbService.listings.update(id, updateData)
      
      const responseData = {
        listing: {
          ...updatedListing,
          priceFormatted: `$${(updatedListing.priceInCents / 100).toFixed(2)}`,
          eventDateFormatted: updatedListing.eventDate.toLocaleDateString(),
          updatedAtFormatted: updatedListing.updatedAt?.toLocaleString()
        },
        changes: {
          updatedFields: Object.keys(data),
          updatedAt: new Date().toISOString()
        },
        actions: {
          view: `/api/listings/enhanced/${id}`,
          delete: `/api/listings/enhanced/${id}`,
          viewOffers: `/api/offers/enhanced?listingId=${id}`
        }
      }
      
      console.log(`✅ Listing updated successfully [${requestId}]: ${id}`)
      
      return createResponse(responseData, { 
        message: 'Listing updated successfully',
        requestId 
      })
    }, 'Update listing operation', requestId)
    
  } catch (error: any) {
    console.error(`❌ Update listing failed [${requestId}]:`, error)
    
    return createErrorResponse(
      {
        code: 'LISTING_UPDATE_FAILED',
        message: 'Failed to update listing',
        details: error.message
      },
      500,
      { requestId }
    )
  }
}

// Delete listing
export async function DELETE(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = logRequest(request, { endpoint: 'DELETE /api/listings/enhanced/[id]' })
  const { id } = await params
  
  try {
    // Authenticate user
    const authResult = await withAuthAndValidation(request, z.object({}), {
      requestId,
      logAuth: true,
      authRequired: true
    })
    
    if (!authResult.success) {
      return createErrorResponse(authResult.error, 401, { requestId })
    }
    
    const { user } = authResult
    
    return await handleApiError(async () => {
      console.log(`🗑️ Deleting listing ${id} for user ${user.id} [${requestId}]`)
      
      // Get database service
      const dbService = getDatabaseService()
      
      // Check if listing exists and user owns it
      const existingListing = await dbService.listings.findById(id)
      
      if (!existingListing) {
        return createErrorResponse(
          {
            code: 'LISTING_NOT_FOUND',
            message: 'Listing not found'
          },
          404,
          { requestId }
        )
      }
      
      if (existingListing.userId !== user.id) {
        return createErrorResponse(
          {
            code: 'LISTING_ACCESS_DENIED',
            message: 'You can only delete your own listings'
          },
          403,
          { requestId }
        )
      }
      
      // Check if there are pending offers
      const offers = await dbService.offers.findByListingId(id, { limit: 1 })
      const hasPendingOffers = offers.items.some(offer => offer.status === 'PENDING')
      
      if (hasPendingOffers) {
        return createErrorResponse(
          {
            code: 'LISTING_HAS_PENDING_OFFERS',
            message: 'Cannot delete listing with pending offers. Please respond to all offers first.'
          },
          409,
          { requestId }
        )
      }
      
      // Delete listing
      const deleted = await dbService.listings.delete(id)
      
      if (!deleted) {
        return createErrorResponse(
          {
            code: 'LISTING_DELETE_FAILED',
            message: 'Failed to delete listing'
          },
          500,
          { requestId }
        )
      }
      
      const responseData = {
        deleted: true,
        listingId: id,
        deletedAt: new Date().toISOString(),
        message: 'Listing deleted successfully',
        actions: {
          viewMyListings: `/api/listings/enhanced?userId=${user.id}`,
          createNewListing: `/api/listings/enhanced`
        }
      }
      
      console.log(`✅ Listing deleted successfully [${requestId}]: ${id}`)
      
      return createResponse(responseData, { 
        message: 'Listing deleted successfully',
        requestId 
      })
    }, 'Delete listing operation', requestId)
    
  } catch (error: any) {
    console.error(`❌ Delete listing failed [${requestId}]:`, error)
    
    return createErrorResponse(
      {
        code: 'LISTING_DELETE_FAILED',
        message: 'Failed to delete listing',
        details: error.message
      },
      500,
      { requestId }
    )
  }
}
// Payment Intent Creation API Route
// Creates payment intents using the new service layer

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { 
  createResponse, 
  createErrorResponse, 
  withAuthAndValidation,
  logRequest,
  handleApiError 
} from '@/lib/api-helpers-enhanced'
import { getPaymentService } from '@/lib/services/factory'

// Request validation schema
const CreatePaymentIntentSchema = z.object({
  amount: z.number().min(50, 'Minimum payment amount is $0.50').max(10000000, 'Maximum payment amount is $100,000'),
  sellerId: z.string().min(1, 'Seller ID is required'),
  listingId: z.string().min(1, 'Listing ID is required'),
  offerId: z.string().min(1, 'Offer ID is required'),
  paymentMethod: z.string().optional().default('mock_card_visa'),
  metadata: z.record(z.any()).optional()
})

type CreatePaymentIntentRequest = z.infer<typeof CreatePaymentIntentSchema>

export async function POST(request: NextRequest) {
  const requestId = logRequest(request, { endpoint: 'POST /api/payments/create-intent' })
  
  try {
    // Authenticate and validate request
    const result = await withAuthAndValidation(request, CreatePaymentIntentSchema, {
      requestId,
      logAuth: true,
      logValidation: true
    })
    
    if (!result.success) {
      return createErrorResponse(result.error, 400, { requestId })
    }
    
    const { user, data } = result
    
    return await handleApiError(async () => {
      console.log(`💳 Creating payment intent for user ${user.id} [${requestId}]`)
      
      // Get payment service
      const paymentService = getPaymentService()
      
      // Validate that user is the buyer (additional security check)
      // In a real app, you'd also validate the listing and offer exist
      
      // Create payment intent
      const paymentIntent = await paymentService.createPaymentIntent({
        amount: data.amount,
        sellerId: data.sellerId,
        buyerId: user.id,
        listingId: data.listingId,
        offerId: data.offerId,
        paymentMethod: data.paymentMethod,
        customerIP: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        metadata: data.metadata
      })
      
      const responseData = {
        paymentIntent: {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          status: paymentIntent.status,
          platformFee: paymentIntent.platformFee,
          sellerAmount: paymentIntent.sellerAmount,
          createdAt: paymentIntent.createdAt,
          metadata: paymentIntent.metadata
        },
        nextStep: {
          action: 'process_payment',
          endpoint: '/api/payments/process',
          method: 'POST',
          payload: { paymentIntentId: paymentIntent.id }
        }
      }
      
      console.log(`✅ Payment intent created successfully [${requestId}]: ${paymentIntent.id}`)
      
      return createResponse(responseData, { 
        message: 'Payment intent created successfully',
        requestId 
      })
    }, 'Create payment intent operation', requestId)
    
  } catch (error: any) {
    console.error(`❌ Create payment intent failed [${requestId}]:`, error)
    
    return createErrorResponse(
      {
        code: 'PAYMENT_INTENT_CREATION_FAILED',
        message: 'Failed to create payment intent',
        details: error.message
      },
      500,
      { requestId }
    )
  }
}

export async function GET(request: NextRequest) {
  const requestId = logRequest(request, { endpoint: 'GET /api/payments/create-intent' })
  
  try {
    // Get URL parameters
    const url = new URL(request.url)
    const intentId = url.searchParams.get('intentId')
    
    if (!intentId) {
      return createErrorResponse('Payment intent ID is required', 400, { requestId })
    }
    
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
      console.log(`🔍 Getting payment intent ${intentId} for user ${user.id} [${requestId}]`)
      
      // Get payment service
      const paymentService = getPaymentService()
      
      // Get payment status
      const paymentStatus = await paymentService.getPaymentStatus(intentId)
      
      // Security check: ensure user is involved in this payment
      // In a real app, you'd validate user is either buyer or seller
      
      const responseData = {
        paymentIntent: paymentStatus,
        userRole: 'buyer', // In real app, determine from payment and user relationship
        actions: getAvailableActions(paymentStatus.status)
      }
      
      console.log(`✅ Payment intent retrieved successfully [${requestId}]: ${intentId}`)
      
      return createResponse(responseData, { 
        message: 'Payment intent retrieved successfully',
        requestId 
      })
    }, 'Get payment intent operation', requestId)
    
  } catch (error: any) {
    console.error(`❌ Get payment intent failed [${requestId}]:`, error)
    
    return createErrorResponse(
      {
        code: 'PAYMENT_INTENT_RETRIEVAL_FAILED',
        message: 'Failed to retrieve payment intent',
        details: error.message
      },
      500,
      { requestId }
    )
  }
}

// Helper function to determine available actions based on payment status
function getAvailableActions(status: string): string[] {
  switch (status) {
    case 'requires_payment_method':
      return ['process_payment', 'cancel_payment']
    case 'processing':
      return ['check_status']
    case 'succeeded':
      return ['view_receipt']
    case 'failed':
      return ['retry_payment', 'cancel_payment']
    case 'canceled':
      return ['create_new_payment']
    default:
      return []
  }
}
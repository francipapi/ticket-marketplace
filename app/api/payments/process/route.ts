// Payment Processing API Route
// Processes payments using the new service layer

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
const ProcessPaymentSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment intent ID is required'),
  confirmPayment: z.boolean().optional().default(true)
})

type ProcessPaymentRequest = z.infer<typeof ProcessPaymentSchema>

export async function POST(request: NextRequest) {
  const requestId = logRequest(request, { endpoint: 'POST /api/payments/process' })
  
  try {
    // Authenticate and validate request
    const result = await withAuthAndValidation(request, ProcessPaymentSchema, {
      requestId,
      logAuth: true,
      logValidation: true
    })
    
    if (!result.success) {
      return createErrorResponse(result.error, 400, { requestId })
    }
    
    const { user, data } = result
    
    return await handleApiError(async () => {
      console.log(`⚡ Processing payment ${data.paymentIntentId} for user ${user.id} [${requestId}]`)
      
      // Get payment service
      const paymentService = getPaymentService()
      
      // First, get the current payment status to validate
      const currentStatus = await paymentService.getPaymentStatus(data.paymentIntentId)
      
      // Security check: ensure user is the buyer
      // In a real app, you'd validate this from the payment intent metadata
      console.log(`🔍 Current payment status: ${currentStatus.status}`)
      
      if (currentStatus.status !== 'requires_payment_method') {
        return createErrorResponse(
          {
            code: 'PAYMENT_INVALID_STATUS',
            message: `Payment cannot be processed. Current status: ${currentStatus.status}`,
            details: { currentStatus: currentStatus.status, allowedStatus: 'requires_payment_method' }
          },
          409,
          { requestId }
        )
      }
      
      // Process the payment
      const processedPayment = await paymentService.processPayment(data.paymentIntentId)
      
      // Determine result based on payment status
      const isSuccess = processedPayment.status === 'succeeded'
      const responseData = {
        paymentIntent: {
          id: processedPayment.id,
          status: processedPayment.status,
          amount: processedPayment.amount,
          platformFee: processedPayment.platformFee,
          sellerAmount: processedPayment.sellerAmount,
          processedAt: processedPayment.processedAt,
          failureReason: processedPayment.failureReason,
          timeline: processedPayment.timeline
        },
        result: {
          success: isSuccess,
          message: isSuccess 
            ? 'Payment processed successfully'
            : `Payment failed: ${processedPayment.failureReason}`,
          nextSteps: isSuccess 
            ? ['Transaction will be recorded', 'Seller will be paid within 24 hours', 'You will receive a receipt']
            : ['Please try again', 'Contact support if issue persists']
        },
        ...(isSuccess && {
          receipt: {
            transactionId: processedPayment.id,
            amount: `$${(processedPayment.amount / 100).toFixed(2)}`,
            platformFee: `$${(processedPayment.platformFee / 100).toFixed(2)}`,
            total: `$${(processedPayment.amount / 100).toFixed(2)}`,
            processedAt: processedPayment.processedAt,
            paymentMethod: processedPayment.metadata?.paymentMethod || 'Card'
          }
        })
      }
      
      console.log(`${isSuccess ? '✅' : '❌'} Payment processing ${isSuccess ? 'succeeded' : 'failed'} [${requestId}]: ${processedPayment.id}`)
      
      return createResponse(responseData, { 
        message: isSuccess ? 'Payment processed successfully' : 'Payment processing completed',
        requestId 
      })
    }, 'Process payment operation', requestId)
    
  } catch (error: any) {
    console.error(`❌ Process payment failed [${requestId}]:`, error)
    
    // Determine error type for better user experience
    let errorCode = 'PAYMENT_PROCESSING_FAILED'
    let statusCode = 500
    
    if (error.message?.includes('not found')) {
      errorCode = 'PAYMENT_NOT_FOUND'
      statusCode = 404
    } else if (error.message?.includes('already processed')) {
      errorCode = 'PAYMENT_ALREADY_PROCESSED'
      statusCode = 409
    }
    
    return createErrorResponse(
      {
        code: errorCode,
        message: 'Failed to process payment',
        details: error.message
      },
      statusCode,
      { requestId }
    )
  }
}

// Get payment processing status
export async function GET(request: NextRequest) {
  const requestId = logRequest(request, { endpoint: 'GET /api/payments/process' })
  
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
      console.log(`📊 Getting payment processing status ${intentId} for user ${user.id} [${requestId}]`)
      
      // Get payment service
      const paymentService = getPaymentService()
      
      // Get payment status with full details
      const paymentStatus = await paymentService.getPaymentStatus(intentId)
      
      // Security check: ensure user is involved in this payment
      // In a real app, you'd validate user is either buyer or seller
      
      const responseData = {
        paymentIntent: paymentStatus,
        processing: {
          isProcessing: paymentStatus.status === 'processing',
          isCompleted: ['succeeded', 'failed', 'canceled'].includes(paymentStatus.status),
          canRetry: paymentStatus.status === 'failed',
          estimatedCompletion: paymentStatus.status === 'processing' 
            ? new Date(Date.now() + 5000).toISOString() // Mock: 5 seconds
            : null
        },
        timeline: paymentStatus.timeline || [],
        actions: getAvailableProcessingActions(paymentStatus.status)
      }
      
      console.log(`✅ Payment processing status retrieved [${requestId}]: ${intentId} (${paymentStatus.status})`)
      
      return createResponse(responseData, { 
        message: 'Payment processing status retrieved successfully',
        requestId 
      })
    }, 'Get payment processing status operation', requestId)
    
  } catch (error: any) {
    console.error(`❌ Get payment processing status failed [${requestId}]:`, error)
    
    return createErrorResponse(
      {
        code: 'PAYMENT_STATUS_RETRIEVAL_FAILED',
        message: 'Failed to retrieve payment processing status',
        details: error.message
      },
      500,
      { requestId }
    )
  }
}

// Helper function to determine available processing actions
function getAvailableProcessingActions(status: string): Array<{
  action: string
  label: string
  endpoint: string
  method: string
}> {
  const baseActions = []
  
  switch (status) {
    case 'requires_payment_method':
      baseActions.push({
        action: 'process',
        label: 'Process Payment',
        endpoint: '/api/payments/process',
        method: 'POST'
      })
      break
    case 'processing':
      baseActions.push({
        action: 'check_status',
        label: 'Check Status',
        endpoint: '/api/payments/process',
        method: 'GET'
      })
      break
    case 'succeeded':
      baseActions.push({
        action: 'view_receipt',
        label: 'View Receipt',
        endpoint: '/api/payments/receipt',
        method: 'GET'
      })
      break
    case 'failed':
      baseActions.push({
        action: 'retry',
        label: 'Retry Payment',
        endpoint: '/api/payments/create-intent',
        method: 'POST'
      })
      break
  }
  
  return baseActions
}
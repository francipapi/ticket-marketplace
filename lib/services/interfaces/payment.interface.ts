// Payment Service Interfaces for Ticket Marketplace
// Provides abstraction layer for payment processing (Mock, Stripe)

export interface PaymentIntent {
  id: string
  amount: number
  sellerId: string
  buyerId: string
  status: 'requires_payment_method' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  platformFee: number
  sellerAmount: number
  createdAt: Date
  processedAt?: Date
  sellerPaidAt?: Date
  sellerPayoutId?: string
  failureReason?: string
  metadata?: PaymentMetadata
  timeline?: PaymentTimelineEvent[]
}

export interface PaymentMetadata {
  listingId: string
  offerId: string
  paymentMethod?: string
  customerIP?: string
  userAgent?: string
  [key: string]: any
}

export interface PaymentTimelineEvent {
  event: 'payment_intent_created' | 'payment_processing_started' | 'payment_succeeded' | 'payment_failed' | 'seller_payout_completed'
  timestamp: Date
  description: string
  metadata?: Record<string, any>
}

export interface PaymentStatus {
  id: string
  status: 'requires_payment_method' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  amount: number
  platformFee: number
  sellerAmount: number
  createdAt: Date
  processedAt?: Date
  sellerPaidAt?: Date
  sellerPayoutId?: string
  failureReason?: string
  timeline?: PaymentTimelineEvent[]
}

export interface MockPayment extends PaymentIntent {
  // Mock-specific fields
  mockProcessingTimeMs?: number
  mockFailureRate?: number
  mockPayoutDelayMs?: number
}

export interface PaymentAnalytics {
  totalPayments: number
  totalVolume: number
  totalPlatformFees: number
  totalSellerPayouts: number
  successRate: number
  averageProcessingTime: number
  averagePayoutTime: number
  failureReasons: Array<{
    reason: string
    count: number
    percentage: number
  }>
  paymentsByStatus: Array<{
    status: string
    count: number
    percentage: number
  }>
  dailyStats: Array<{
    date: string
    count: number
    volume: number
    successRate: number
  }>
}

export interface CreatePaymentIntentData {
  amount: number
  sellerId: string
  buyerId: string
  listingId: string
  offerId: string
  paymentMethod?: string
  customerIP?: string
  userAgent?: string
  metadata?: Record<string, any>
}

export interface PaymentFilters {
  sellerId?: string
  buyerId?: string
  status?: string
  dateFrom?: Date
  dateTo?: Date
  minAmount?: number
  maxAmount?: number
  limit?: number
  offset?: number
}

export interface PaymentService {
  // Core payment operations
  createPaymentIntent(data: CreatePaymentIntentData): Promise<PaymentIntent>
  processPayment(intentId: string): Promise<PaymentIntent>
  getPaymentStatus(intentId: string): Promise<PaymentStatus>
  cancelPayment(intentId: string): Promise<PaymentIntent>
  
  // Payment history and analytics
  getPaymentHistory(filters?: PaymentFilters): Promise<PaymentIntent[]>
  getPaymentAnalytics(filters?: PaymentFilters): Promise<PaymentAnalytics>
  
  // Mock-specific methods (only available in mock implementation)
  simulatePayment?(intentId: string): Promise<MockPayment>
  setFailureRate?(rate: number): void
  setProcessingTime?(timeMs: number): void
  setPayoutDelay?(delayMs: number): void
  
  // Webhook simulation (for testing)
  simulateWebhook?(intentId: string, event: string): Promise<any>
  
  // Utility methods
  calculatePlatformFee(amount: number): number
  calculateSellerAmount(amount: number): number
  validatePaymentAmount(amount: number): boolean
  
  // Service health and monitoring
  getServiceStatus(): Promise<{
    healthy: boolean
    responseTime: number
    uptime: number
    version: string
  }>
}

// Error types for payment processing
export class PaymentError extends Error {
  constructor(
    message: string,
    public code: string,
    public intentId?: string,
    public statusCode: number = 400
  ) {
    super(message)
    this.name = 'PaymentError'
  }
}

export class PaymentNotFoundError extends PaymentError {
  constructor(intentId: string) {
    super(`Payment intent not found: ${intentId}`, 'PAYMENT_NOT_FOUND', intentId, 404)
  }
}

export class PaymentAlreadyProcessedError extends PaymentError {
  constructor(intentId: string, currentStatus: string) {
    super(`Payment already processed: ${currentStatus}`, 'PAYMENT_ALREADY_PROCESSED', intentId, 409)
  }
}

export class PaymentProcessingError extends PaymentError {
  constructor(intentId: string, reason: string) {
    super(`Payment processing failed: ${reason}`, 'PAYMENT_PROCESSING_ERROR', intentId, 402)
  }
}

export class InvalidPaymentAmountError extends PaymentError {
  constructor(amount: number) {
    super(`Invalid payment amount: ${amount}`, 'INVALID_PAYMENT_AMOUNT', undefined, 400)
  }
}

// Configuration interface for payment services
export interface PaymentServiceConfig {
  platformFeePercent: number
  minPaymentAmount: number
  maxPaymentAmount: number
  defaultCurrency: string
  allowedPaymentMethods: string[]
  
  // Mock-specific config
  mockFailureRate?: number
  mockProcessingTimeMs?: number
  mockPayoutDelayMs?: number
  
  // Stripe-specific config (for future implementation)
  stripeSecretKey?: string
  stripeWebhookSecret?: string
  stripeApiVersion?: string
}

// Type guards
export function isPaymentIntent(obj: any): obj is PaymentIntent {
  return obj && typeof obj.id === 'string' && typeof obj.amount === 'number' && obj.status
}

export function isMockPayment(obj: any): obj is MockPayment {
  return isPaymentIntent(obj) && (
    (obj as MockPayment).mockProcessingTimeMs !== undefined || 
    (obj as MockPayment).mockFailureRate !== undefined
  )
}

export function isPaymentError(error: any): error is PaymentError {
  return error instanceof PaymentError
}
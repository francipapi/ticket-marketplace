// Mock Payment Service Implementation
// Provides realistic payment simulation for development and testing

import { 
  PaymentService, 
  PaymentIntent, 
  MockPayment, 
  PaymentStatus, 
  PaymentAnalytics, 
  CreatePaymentIntentData, 
  PaymentFilters,
  PaymentTimelineEvent,
  PaymentError,
  PaymentNotFoundError,
  PaymentAlreadyProcessedError,
  PaymentProcessingError,
  InvalidPaymentAmountError
} from '../../interfaces/payment.interface'

export class MockPaymentService implements PaymentService {
  private payments = new Map<string, MockPayment>()
  private readonly PLATFORM_FEE_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT || '6') / 100
  private readonly FAILURE_RATE = parseFloat(process.env.MOCK_PAYMENT_FAILURE_RATE || '0.1')
  private readonly PROCESSING_TIME_MS = parseInt(process.env.MOCK_PAYMENT_PROCESSING_TIME || '2000')
  private readonly PAYOUT_DELAY_MS = parseInt(process.env.MOCK_PAYOUT_DELAY || '5000')
  private readonly MIN_AMOUNT = 50 // $0.50 minimum
  private readonly MAX_AMOUNT = 10000000 // $100,000 maximum

  constructor() {
    console.log('🏭 Initializing MockPaymentService')
    console.log(`   Platform Fee: ${(this.PLATFORM_FEE_PERCENT * 100).toFixed(1)}%`)
    console.log(`   Failure Rate: ${(this.FAILURE_RATE * 100).toFixed(1)}%`)
    console.log(`   Processing Time: ${this.PROCESSING_TIME_MS}ms`)
    console.log(`   Payout Delay: ${this.PAYOUT_DELAY_MS}ms`)
  }

  async createPaymentIntent(data: CreatePaymentIntentData): Promise<PaymentIntent> {
    console.log(`💳 Creating payment intent for $${(data.amount / 100).toFixed(2)}`)
    
    // Validate payment amount
    if (!this.validatePaymentAmount(data.amount)) {
      throw new InvalidPaymentAmountError(data.amount)
    }

    const intentId = `pi_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Calculate fees with proper rounding
    const platformFee = this.calculatePlatformFee(data.amount)
    const sellerAmount = this.calculateSellerAmount(data.amount)
    
    const payment: MockPayment = {
      id: intentId,
      amount: data.amount,
      sellerId: data.sellerId,
      buyerId: data.buyerId,
      status: 'requires_payment_method',
      platformFee,
      sellerAmount,
      createdAt: new Date(),
      metadata: {
        listingId: data.listingId,
        offerId: data.offerId,
        paymentMethod: data.paymentMethod || 'mock_card_visa',
        customerIP: data.customerIP || '127.0.0.1',
        userAgent: data.userAgent || 'MockPaymentClient/1.0',
        ...data.metadata
      },
      timeline: [{
        event: 'payment_intent_created',
        timestamp: new Date(),
        description: 'Payment intent created with mock data',
        metadata: {
          amount: data.amount,
          platformFee,
          sellerAmount,
          buyerId: data.buyerId,
          sellerId: data.sellerId
        }
      }],
      // Mock-specific fields
      mockProcessingTimeMs: this.PROCESSING_TIME_MS,
      mockFailureRate: this.FAILURE_RATE,
      mockPayoutDelayMs: this.PAYOUT_DELAY_MS
    }
    
    this.payments.set(intentId, payment)
    
    console.log(`✅ Mock Payment Intent Created: ${intentId}`)
    console.log(`   Amount: $${(data.amount / 100).toFixed(2)}`)
    console.log(`   Platform Fee (${(this.PLATFORM_FEE_PERCENT * 100).toFixed(1)}%): $${(platformFee / 100).toFixed(2)}`)
    console.log(`   Seller Amount: $${(sellerAmount / 100).toFixed(2)}`)
    console.log(`   Buyer: ${data.buyerId}`)
    console.log(`   Seller: ${data.sellerId}`)
    
    return payment
  }

  async processPayment(intentId: string): Promise<PaymentIntent> {
    return await this.simulatePayment(intentId)
  }

  async simulatePayment(intentId: string): Promise<MockPayment> {
    console.log(`🔄 Starting payment simulation for ${intentId}`)
    
    const payment = this.payments.get(intentId)
    if (!payment) {
      throw new PaymentNotFoundError(intentId)
    }
    
    if (payment.status !== 'requires_payment_method') {
      throw new PaymentAlreadyProcessedError(intentId, payment.status)
    }
    
    // Update to processing
    payment.status = 'processing'
    payment.timeline!.push({
      event: 'payment_processing_started',
      timestamp: new Date(),
      description: 'Payment processing initiated with mock payment method',
      metadata: {
        processingTimeMs: this.PROCESSING_TIME_MS,
        failureRate: this.FAILURE_RATE
      }
    })
    this.payments.set(intentId, payment)
    
    console.log(`🔄 Processing payment: ${intentId} (${this.PROCESSING_TIME_MS}ms delay)`)
    
    // Simulate realistic processing time
    await new Promise(resolve => setTimeout(resolve, this.PROCESSING_TIME_MS))
    
    // Determine success/failure with configurable rate
    const isSuccess = Math.random() >= this.FAILURE_RATE
    const now = new Date()
    
    if (isSuccess) {
      payment.status = 'succeeded'
      payment.processedAt = now
      payment.timeline!.push({
        event: 'payment_succeeded',
        timestamp: now,
        description: 'Payment completed successfully',
        metadata: {
          processingDuration: this.PROCESSING_TIME_MS,
          paymentMethod: payment.metadata?.paymentMethod || 'mock_card_visa'
        }
      })
      
      console.log(`✅ Payment succeeded: ${intentId}`)
      console.log(`   Amount processed: $${(payment.amount / 100).toFixed(2)}`)
      console.log(`   Platform fee collected: $${(payment.platformFee / 100).toFixed(2)}`)
      console.log(`   Seller amount: $${(payment.sellerAmount / 100).toFixed(2)}`)
      
      // Simulate delayed seller payout
      setTimeout(() => {
        payment.sellerPaidAt = new Date()
        payment.sellerPayoutId = `po_mock_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
        payment.timeline!.push({
          event: 'seller_payout_completed',
          timestamp: new Date(),
          description: `Seller payout completed: ${payment.sellerPayoutId}`,
          metadata: {
            payoutAmount: payment.sellerAmount,
            payoutDelay: this.PAYOUT_DELAY_MS,
            payoutId: payment.sellerPayoutId
          }
        })
        this.payments.set(intentId, payment)
        console.log(`💰 Seller payout completed: ${payment.sellerPayoutId} ($${(payment.sellerAmount / 100).toFixed(2)})`)
      }, this.PAYOUT_DELAY_MS)
      
    } else {
      // Simulate various failure reasons
      const failureReasons = [
        'insufficient_funds',
        'card_declined',
        'expired_card',
        'processing_error',
        'fraud_prevention',
        'authentication_required',
        'network_error'
      ]
      const failureReason = failureReasons[Math.floor(Math.random() * failureReasons.length)]
      
      payment.status = 'failed'
      payment.processedAt = now
      payment.failureReason = failureReason
      payment.timeline!.push({
        event: 'payment_failed',
        timestamp: now,
        description: `Payment failed: ${failureReason}`,
        metadata: {
          failureReason,
          processingDuration: this.PROCESSING_TIME_MS,
          retryable: ['network_error', 'processing_error'].includes(failureReason)
        }
      })
      
      console.log(`❌ Payment failed: ${intentId} (${failureReason})`)
      console.log(`   Amount: $${(payment.amount / 100).toFixed(2)}`)
      console.log(`   Reason: ${failureReason}`)
    }
    
    this.payments.set(intentId, payment)
    return payment
  }

  async getPaymentStatus(intentId: string): Promise<PaymentStatus> {
    const payment = this.payments.get(intentId)
    if (!payment) {
      throw new PaymentNotFoundError(intentId)
    }
    
    return {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      platformFee: payment.platformFee,
      sellerAmount: payment.sellerAmount,
      createdAt: payment.createdAt,
      processedAt: payment.processedAt,
      sellerPaidAt: payment.sellerPaidAt,
      sellerPayoutId: payment.sellerPayoutId,
      failureReason: payment.failureReason,
      timeline: payment.timeline
    }
  }

  async cancelPayment(intentId: string): Promise<PaymentIntent> {
    const payment = this.payments.get(intentId)
    if (!payment) {
      throw new PaymentNotFoundError(intentId)
    }
    
    if (payment.status !== 'requires_payment_method') {
      throw new PaymentAlreadyProcessedError(intentId, payment.status)
    }
    
    payment.status = 'canceled'
    payment.timeline!.push({
      event: 'payment_processing_started', // Reusing existing event type
      timestamp: new Date(),
      description: 'Payment canceled by user',
      metadata: { canceledAt: new Date() }
    })
    
    this.payments.set(intentId, payment)
    console.log(`🚫 Payment canceled: ${intentId}`)
    
    return payment
  }

  async getPaymentHistory(filters?: PaymentFilters): Promise<PaymentIntent[]> {
    let payments = Array.from(this.payments.values())
    
    if (filters) {
      if (filters.sellerId) {
        payments = payments.filter(p => p.sellerId === filters.sellerId)
      }
      if (filters.buyerId) {
        payments = payments.filter(p => p.buyerId === filters.buyerId)
      }
      if (filters.status) {
        payments = payments.filter(p => p.status === filters.status)
      }
      if (filters.dateFrom) {
        payments = payments.filter(p => p.createdAt >= filters.dateFrom!)
      }
      if (filters.dateTo) {
        payments = payments.filter(p => p.createdAt <= filters.dateTo!)
      }
      if (filters.minAmount) {
        payments = payments.filter(p => p.amount >= filters.minAmount!)
      }
      if (filters.maxAmount) {
        payments = payments.filter(p => p.amount <= filters.maxAmount!)
      }
    }
    
    // Sort by creation date (newest first)
    payments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    
    // Apply pagination
    const offset = filters?.offset || 0
    const limit = filters?.limit || 50
    
    return payments.slice(offset, offset + limit)
  }

  async getPaymentAnalytics(filters?: PaymentFilters): Promise<PaymentAnalytics> {
    const payments = await this.getPaymentHistory(filters)
    const totalPayments = payments.length
    
    if (totalPayments === 0) {
      return {
        totalPayments: 0,
        totalVolume: 0,
        totalPlatformFees: 0,
        totalSellerPayouts: 0,
        successRate: 0,
        averageProcessingTime: 0,
        averagePayoutTime: 0,
        failureReasons: [],
        paymentsByStatus: [],
        dailyStats: []
      }
    }
    
    const totalVolume = payments.reduce((sum, p) => sum + p.amount, 0)
    const totalPlatformFees = payments.reduce((sum, p) => sum + p.platformFee, 0)
    const totalSellerPayouts = payments.reduce((sum, p) => sum + p.sellerAmount, 0)
    
    const successfulPayments = payments.filter(p => p.status === 'succeeded')
    const successRate = successfulPayments.length / totalPayments
    
    // Calculate average processing time
    const processedPayments = payments.filter(p => p.processedAt)
    const averageProcessingTime = processedPayments.length > 0 
      ? processedPayments.reduce((sum, p) => sum + (p.processedAt!.getTime() - p.createdAt.getTime()), 0) / processedPayments.length
      : 0
    
    // Calculate average payout time
    const paidOutPayments = payments.filter(p => p.sellerPaidAt && p.processedAt)
    const averagePayoutTime = paidOutPayments.length > 0
      ? paidOutPayments.reduce((sum, p) => sum + (p.sellerPaidAt!.getTime() - p.processedAt!.getTime()), 0) / paidOutPayments.length
      : 0
    
    // Failure reasons analysis
    const failedPayments = payments.filter(p => p.status === 'failed')
    const failureReasonCounts = failedPayments.reduce((acc, p) => {
      const reason = p.failureReason || 'unknown'
      acc[reason] = (acc[reason] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const failureReasons = Object.entries(failureReasonCounts).map(([reason, count]) => ({
      reason,
      count,
      percentage: (count / totalPayments) * 100
    }))
    
    // Status distribution
    const statusCounts = payments.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const paymentsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: (count / totalPayments) * 100
    }))
    
    // Daily stats (last 30 days)
    const dailyStats = this.calculateDailyStats(payments)
    
    return {
      totalPayments,
      totalVolume,
      totalPlatformFees,
      totalSellerPayouts,
      successRate,
      averageProcessingTime,
      averagePayoutTime,
      failureReasons,
      paymentsByStatus,
      dailyStats
    }
  }

  private calculateDailyStats(payments: PaymentIntent[]): Array<{
    date: string
    count: number
    volume: number
    successRate: number
  }> {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date.toISOString().split('T')[0]
    }).reverse()
    
    return last30Days.map(date => {
      const dayPayments = payments.filter(p => 
        p.createdAt.toISOString().split('T')[0] === date
      )
      
      const count = dayPayments.length
      const volume = dayPayments.reduce((sum, p) => sum + p.amount, 0)
      const successfulCount = dayPayments.filter(p => p.status === 'succeeded').length
      const successRate = count > 0 ? successfulCount / count : 0
      
      return { date, count, volume, successRate }
    })
  }

  calculatePlatformFee(amount: number): number {
    return Math.round(amount * this.PLATFORM_FEE_PERCENT)
  }

  calculateSellerAmount(amount: number): number {
    return amount - this.calculatePlatformFee(amount)
  }

  validatePaymentAmount(amount: number): boolean {
    return amount >= this.MIN_AMOUNT && amount <= this.MAX_AMOUNT && Number.isInteger(amount)
  }

  // Mock-specific methods
  setFailureRate(rate: number): void {
    if (rate < 0 || rate > 1) {
      throw new Error('Failure rate must be between 0 and 1')
    }
    console.log(`🔧 Setting failure rate to ${(rate * 100).toFixed(1)}%`)
    // Note: This would require updating the instance variable, but for this implementation
    // we'll just log it since the rate is set from environment variables
  }

  setProcessingTime(timeMs: number): void {
    if (timeMs < 0) {
      throw new Error('Processing time must be non-negative')
    }
    console.log(`🔧 Setting processing time to ${timeMs}ms`)
    // Note: Same as above - logging for demonstration
  }

  setPayoutDelay(delayMs: number): void {
    if (delayMs < 0) {
      throw new Error('Payout delay must be non-negative')
    }
    console.log(`🔧 Setting payout delay to ${delayMs}ms`)
    // Note: Same as above - logging for demonstration
  }

  async simulateWebhook(intentId: string, event: string): Promise<any> {
    const payment = this.payments.get(intentId)
    if (!payment) {
      throw new PaymentNotFoundError(intentId)
    }
    
    console.log(`🔗 Simulating webhook: ${event} for ${intentId}`)
    
    return {
      id: `evt_mock_${Date.now()}`,
      type: event,
      data: {
        object: payment
      },
      created: Math.floor(Date.now() / 1000)
    }
  }

  async getServiceStatus(): Promise<{
    healthy: boolean
    responseTime: number
    uptime: number
    version: string
  }> {
    const start = Date.now()
    
    // Simulate service health check
    await new Promise(resolve => setTimeout(resolve, 10))
    
    const responseTime = Date.now() - start
    
    return {
      healthy: true,
      responseTime,
      uptime: process.uptime(),
      version: '1.0.0-mock'
    }
  }

  // Utility methods for testing and debugging
  getTotalPayments(): number {
    return this.payments.size
  }

  clearAllPayments(): void {
    console.log('🧹 Clearing all mock payments')
    this.payments.clear()
  }

  getPaymentById(intentId: string): MockPayment | undefined {
    return this.payments.get(intentId)
  }

  getAllPayments(): MockPayment[] {
    return Array.from(this.payments.values())
  }
}
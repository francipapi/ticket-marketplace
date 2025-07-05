#!/usr/bin/env tsx
// Test script for Mock Payment Service
// Validates all payment service functionality

import { MockPaymentService } from '../lib/services/implementations/mock-payment/payment.service'
import { CreatePaymentIntentData } from '../lib/services/interfaces/payment.interface'

async function testPaymentService() {
  console.log('🧪 Testing Mock Payment Service')
  console.log('=' .repeat(50))
  
  const paymentService = new MockPaymentService()
  let allTestsPassed = true
  
  try {
    // Test 1: Service Status
    console.log('\n📊 Test 1: Service Status')
    const status = await paymentService.getServiceStatus()
    console.log('✅ Service status:', status)
    
    // Test 2: Create Payment Intent
    console.log('\n💳 Test 2: Create Payment Intent')
    const paymentData: CreatePaymentIntentData = {
      amount: 5000, // $50.00
      sellerId: 'seller_123',
      buyerId: 'buyer_456',
      listingId: 'listing_789',
      offerId: 'offer_012',
      paymentMethod: 'mock_card_visa',
      customerIP: '192.168.1.1',
      userAgent: 'TestClient/1.0'
    }
    
    const paymentIntent = await paymentService.createPaymentIntent(paymentData)
    console.log('✅ Payment intent created:', {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      status: paymentIntent.status,
      platformFee: paymentIntent.platformFee,
      sellerAmount: paymentIntent.sellerAmount
    })
    
    // Test 3: Get Payment Status (before processing)
    console.log('\n📋 Test 3: Get Payment Status (Initial)')
    const initialStatus = await paymentService.getPaymentStatus(paymentIntent.id)
    console.log('✅ Initial status:', {
      id: initialStatus.id,
      status: initialStatus.status,
      timeline: initialStatus.timeline?.length || 0
    })
    
    // Test 4: Process Payment
    console.log('\n⚡ Test 4: Process Payment')
    console.log('Processing payment (this may take a few seconds)...')
    const processedPayment = await paymentService.processPayment(paymentIntent.id)
    console.log('✅ Payment processed:', {
      id: processedPayment.id,
      status: processedPayment.status,
      processedAt: processedPayment.processedAt,
      failureReason: processedPayment.failureReason
    })
    
    // Test 5: Get Payment Status (after processing)
    console.log('\n📋 Test 5: Get Payment Status (After Processing)')
    const finalStatus = await paymentService.getPaymentStatus(paymentIntent.id)
    console.log('✅ Final status:', {
      id: finalStatus.id,
      status: finalStatus.status,
      timeline: finalStatus.timeline?.length || 0,
      timelineEvents: finalStatus.timeline?.map(t => t.event) || []
    })
    
    // Test 6: Create Multiple Payments for Analytics
    console.log('\n📈 Test 6: Create Multiple Payments for Analytics')
    const additionalPayments = []
    
    for (let i = 0; i < 5; i++) {
      const data: CreatePaymentIntentData = {
        amount: Math.floor(Math.random() * 10000) + 1000, // $10 - $110
        sellerId: `seller_${i}`,
        buyerId: `buyer_${i}`,
        listingId: `listing_${i}`,
        offerId: `offer_${i}`
      }
      
      const intent = await paymentService.createPaymentIntent(data)
      additionalPayments.push(intent)
      
      // Process some of them
      if (i % 2 === 0) {
        await paymentService.processPayment(intent.id)
      }
    }
    
    console.log(`✅ Created and processed ${additionalPayments.length} additional payments`)
    
    // Test 7: Payment History
    console.log('\n📚 Test 7: Payment History')
    const history = await paymentService.getPaymentHistory({ limit: 10 })
    console.log('✅ Payment history:', {
      totalPayments: history.length,
      statuses: history.map(p => p.status),
      amounts: history.map(p => `$${(p.amount / 100).toFixed(2)}`)
    })
    
    // Test 8: Payment Analytics
    console.log('\n📊 Test 8: Payment Analytics')
    const analytics = await paymentService.getPaymentAnalytics()
    console.log('✅ Payment analytics:', {
      totalPayments: analytics.totalPayments,
      totalVolume: `$${(analytics.totalVolume / 100).toFixed(2)}`,
      totalPlatformFees: `$${(analytics.totalPlatformFees / 100).toFixed(2)}`,
      successRate: `${(analytics.successRate * 100).toFixed(1)}%`,
      averageProcessingTime: `${analytics.averageProcessingTime.toFixed(0)}ms`,
      paymentsByStatus: analytics.paymentsByStatus.map(s => `${s.status}: ${s.count}`),
      failureReasons: analytics.failureReasons.map(f => `${f.reason}: ${f.count}`)
    })
    
    // Test 9: Payment Amount Validation
    console.log('\n🔍 Test 9: Payment Amount Validation')
    const validAmounts = [50, 100, 1000, 5000, 100000] // Valid amounts in cents
    const invalidAmounts = [0, 25, -100, 100000000] // Invalid amounts
    
    console.log('Valid amounts:')
    validAmounts.forEach(amount => {
      const isValid = paymentService.validatePaymentAmount(amount)
      console.log(`  $${(amount / 100).toFixed(2)}: ${isValid ? '✅' : '❌'}`)
    })
    
    console.log('Invalid amounts:')
    invalidAmounts.forEach(amount => {
      const isValid = paymentService.validatePaymentAmount(amount)
      console.log(`  $${(amount / 100).toFixed(2)}: ${isValid ? '✅' : '❌'}`)
    })
    
    // Test 10: Fee Calculations
    console.log('\n🧮 Test 10: Fee Calculations')
    const testAmounts = [1000, 5000, 10000, 25000] // $10, $50, $100, $250
    
    testAmounts.forEach(amount => {
      const platformFee = paymentService.calculatePlatformFee(amount)
      const sellerAmount = paymentService.calculateSellerAmount(amount)
      console.log(`  $${(amount / 100).toFixed(2)} → Platform: $${(platformFee / 100).toFixed(2)}, Seller: $${(sellerAmount / 100).toFixed(2)}`)
    })
    
    // Test 11: Error Handling
    console.log('\n🚨 Test 11: Error Handling')
    
    try {
      await paymentService.getPaymentStatus('invalid_id')
      console.log('❌ Should have thrown PaymentNotFoundError')
      allTestsPassed = false
    } catch (error: any) {
      console.log('✅ PaymentNotFoundError handled correctly:', error.message)
    }
    
    try {
      await paymentService.processPayment(paymentIntent.id) // Already processed
      console.log('❌ Should have thrown PaymentAlreadyProcessedError')
      allTestsPassed = false
    } catch (error: any) {
      console.log('✅ PaymentAlreadyProcessedError handled correctly:', error.message)
    }
    
    // Test 12: Webhook Simulation
    console.log('\n🔗 Test 12: Webhook Simulation')
    const webhook = await paymentService.simulateWebhook(paymentIntent.id, 'payment.succeeded')
    console.log('✅ Webhook simulated:', {
      id: webhook.id,
      type: webhook.type,
      hasData: !!webhook.data
    })
    
    // Test 13: Service Utility Methods
    console.log('\n🛠️ Test 13: Service Utility Methods')
    const totalPayments = paymentService.getTotalPayments()
    const allPayments = paymentService.getAllPayments()
    console.log('✅ Utility methods:', {
      totalPayments,
      allPaymentsCount: allPayments.length,
      match: totalPayments === allPayments.length
    })
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    allTestsPassed = false
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50))
  if (allTestsPassed) {
    console.log('🎉 All MockPaymentService tests PASSED!')
    console.log('✅ Payment service is ready for integration')
  } else {
    console.log('❌ Some tests FAILED!')
    console.log('🔧 Please fix the issues before proceeding')
    process.exit(1)
  }
  
  // Wait a bit to see if seller payout completes
  console.log('\n⏳ Waiting for seller payout to complete...')
  await new Promise(resolve => setTimeout(resolve, 6000))
  
  const finalPayment = paymentService.getPaymentById(paymentService.getAllPayments()[0]?.id)
  if (finalPayment?.sellerPaidAt) {
    console.log('✅ Seller payout completed successfully!')
    console.log(`   Payout ID: ${finalPayment.sellerPayoutId}`)
    console.log(`   Timeline events: ${finalPayment.timeline?.length || 0}`)
  } else {
    console.log('⏳ Seller payout still pending (this is normal for failed payments)')
  }
  
  console.log('\n🏁 MockPaymentService test complete!')
}

// Run the test
if (require.main === module) {
  testPaymentService().catch(console.error)
}

export { testPaymentService }
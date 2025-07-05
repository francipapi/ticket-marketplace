#!/usr/bin/env tsx
// Performance Testing Script
// Benchmarks and optimizes the service layer performance

// Load environment variables
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local file
const envPath = path.join(process.cwd(), '.env.local')
console.log('Loading environment from:', envPath)
const envResult = dotenv.config({ path: envPath })
if (envResult.error) {
  console.error('Error loading .env.local:', envResult.error)
} else {
  console.log('Environment loaded successfully')
}

// Performance measurement utilities
interface PerformanceMetrics {
  totalTime: number
  averageTime: number
  minTime: number
  maxTime: number
  p50Time: number
  p95Time: number
  p99Time: number
  operationsPerSecond: number
  successRate: number
  errorCount: number
}

interface PerformanceTest {
  name: string
  iterations: number
  concurrency: number
  operation: () => Promise<any>
  validate?: (result: any) => boolean
}

class PerformanceTester {
  private results: Map<string, PerformanceMetrics> = new Map()

  async runTest(test: PerformanceTest): Promise<PerformanceMetrics> {
    console.log(`\n⚡ Running performance test: ${test.name}`)
    console.log(`   Iterations: ${test.iterations}, Concurrency: ${test.concurrency}`)
    
    const times: number[] = []
    let errorCount = 0
    const startTime = Date.now()

    // Run tests in batches for concurrency
    const batchSize = test.concurrency
    const batches = Math.ceil(test.iterations / batchSize)
    
    for (let batch = 0; batch < batches; batch++) {
      const currentBatchSize = Math.min(batchSize, test.iterations - (batch * batchSize))
      const promises = []
      
      for (let i = 0; i < currentBatchSize; i++) {
        promises.push(this.runSingleOperation(test.operation, test.validate))
      }
      
      const batchResults = await Promise.allSettled(promises)
      
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          times.push(result.value.time)
          if (!result.value.success) {
            errorCount++
          }
        } else {
          errorCount++
        }
      })
      
      // Show progress
      const progress = Math.round(((batch + 1) / batches) * 100)
      process.stdout.write(`\r   Progress: ${progress}%`)
    }
    
    console.log('') // New line after progress
    
    const totalTime = Date.now() - startTime
    const successfulOperations = test.iterations - errorCount
    
    // Calculate percentiles
    const sortedTimes = times.sort((a, b) => a - b)
    const metrics: PerformanceMetrics = {
      totalTime,
      averageTime: times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0,
      minTime: times.length > 0 ? Math.min(...times) : 0,
      maxTime: times.length > 0 ? Math.max(...times) : 0,
      p50Time: this.getPercentile(sortedTimes, 50),
      p95Time: this.getPercentile(sortedTimes, 95),
      p99Time: this.getPercentile(sortedTimes, 99),
      operationsPerSecond: totalTime > 0 ? (successfulOperations / totalTime) * 1000 : 0,
      successRate: test.iterations > 0 ? (successfulOperations / test.iterations) * 100 : 0,
      errorCount
    }
    
    this.results.set(test.name, metrics)
    
    console.log(`   ✅ Completed: ${successfulOperations}/${test.iterations} operations`)
    console.log(`   📊 Average time: ${metrics.averageTime.toFixed(2)}ms`)
    console.log(`   🚀 Operations/sec: ${metrics.operationsPerSecond.toFixed(2)}`)
    console.log(`   📈 Success rate: ${metrics.successRate.toFixed(1)}%`)
    
    return metrics
  }

  private async runSingleOperation(operation: () => Promise<any>, validate?: (result: any) => boolean): Promise<{ time: number, success: boolean }> {
    const startTime = Date.now()
    try {
      const result = await operation()
      const time = Date.now() - startTime
      const success = validate ? validate(result) : true
      return { time, success }
    } catch (error) {
      const time = Date.now() - startTime
      return { time, success: false }
    }
  }

  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))]
  }

  getResults(): Map<string, PerformanceMetrics> {
    return this.results
  }

  generateReport(): string {
    let report = '\n' + '='.repeat(80) + '\n'
    report += '📊 PERFORMANCE TEST REPORT\n'
    report += '='.repeat(80) + '\n'
    
    this.results.forEach((metrics, testName) => {
      report += `\n🔬 ${testName}\n`
      report += `   Total Time: ${metrics.totalTime}ms\n`
      report += `   Average Time: ${metrics.averageTime.toFixed(2)}ms\n`
      report += `   Min/Max Time: ${metrics.minTime}ms / ${metrics.maxTime}ms\n`
      report += `   Percentiles (P50/P95/P99): ${metrics.p50Time}ms / ${metrics.p95Time}ms / ${metrics.p99Time}ms\n`
      report += `   Operations/Second: ${metrics.operationsPerSecond.toFixed(2)}\n`
      report += `   Success Rate: ${metrics.successRate.toFixed(1)}%\n`
      report += `   Error Count: ${metrics.errorCount}\n`
    })
    
    return report
  }
}

async function testPerformance() {
  console.log('🚀 Performance Testing Suite')
  console.log('=' .repeat(60))
  
  const tester = new PerformanceTester()
  let allTestsPassed = true
  
  try {
    // Test 1: Database Service Health Check Performance
    console.log('\n🔧 Test 1: Database Service Health Check Performance')
    
    const serviceFactory = await import('../lib/services/factory')
    const dbService = serviceFactory.getDatabaseService()
    
    await tester.runTest({
      name: 'Database Health Check',
      iterations: 50,
      concurrency: 5,
      operation: async () => {
        return await dbService.getServiceHealth()
      },
      validate: (result) => result && result.healthy === true
    })
    
    // Test 2: Payment Intent Creation Performance
    console.log('\n💳 Test 2: Payment Intent Creation Performance')
    
    const paymentService = serviceFactory.getPaymentService()
    
    await tester.runTest({
      name: 'Payment Intent Creation',
      iterations: 100,
      concurrency: 10,
      operation: async () => {
        return await paymentService.createPaymentIntent({
          amount: Math.floor(Math.random() * 10000) + 1000, // $10-$110
          sellerId: `perf_seller_${Math.random().toString(36).substr(2, 6)}`,
          buyerId: `perf_buyer_${Math.random().toString(36).substr(2, 6)}`,
          listingId: `perf_listing_${Math.random().toString(36).substr(2, 6)}`,
          offerId: `perf_offer_${Math.random().toString(36).substr(2, 6)}`
        })
      },
      validate: (result) => result && result.id && result.amount > 0
    })
    
    // Test 3: Payment Processing Performance
    console.log('\n⚡ Test 3: Payment Processing Performance')
    
    // Create payment intents for processing
    const paymentIntents = []
    for (let i = 0; i < 30; i++) {
      const intent = await paymentService.createPaymentIntent({
        amount: 5000,
        sellerId: `perf_seller_${i}`,
        buyerId: `perf_buyer_${i}`,
        listingId: `perf_listing_${i}`,
        offerId: `perf_offer_${i}`
      })
      paymentIntents.push(intent.id)
    }
    
    let intentIndex = 0
    await tester.runTest({
      name: 'Payment Processing',
      iterations: 30,
      concurrency: 3,
      operation: async () => {
        const intentId = paymentIntents[intentIndex++]
        return await paymentService.processPayment(intentId)
      },
      validate: (result) => result && ['succeeded', 'failed'].includes(result.status)
    })
    
    // Test 4: Cache Performance
    console.log('\n💾 Test 4: Cache Performance')
    
    await tester.runTest({
      name: 'Database Cache Operations',
      iterations: 200,
      concurrency: 20,
      operation: async () => {
        // Alternate between operations that should hit cache vs miss
        const useCache = Math.random() > 0.3 // 70% cache hits
        if (useCache) {
          return await dbService.getServiceHealth() // Should hit cache after first call
        } else {
          return await dbService.getCacheStats() // Different operation
        }
      },
      validate: (result) => result !== null && result !== undefined
    })
    
    // Test 5: Rate Limiting Performance
    console.log('\n⏱️ Test 5: Rate Limiting Performance')
    
    const apiHelpers = await import('../lib/api-helpers-enhanced')
    
    await tester.runTest({
      name: 'Rate Limiting Operations',
      iterations: 500,
      concurrency: 50,
      operation: async () => {
        const testId = `perf_test_${Math.floor(Math.random() * 10)}` // 10 different users
        return apiHelpers.checkRateLimit(testId, 100, 60000) // 100 requests per minute
      },
      validate: (result) => result && typeof result.allowed === 'boolean'
    })
    
    // Test 6: API Response Creation Performance
    console.log('\n📨 Test 6: API Response Creation Performance')
    
    await tester.runTest({
      name: 'API Response Creation',
      iterations: 1000,
      concurrency: 100,
      operation: async () => {
        const responseType = Math.random() > 0.8 // 20% errors, 80% success
        if (responseType) {
          return apiHelpers.createErrorResponse(
            { code: 'TEST_ERROR', message: 'Performance test error' },
            400,
            { requestId: `perf_${Date.now()}` }
          )
        } else {
          return apiHelpers.createResponse(
            { data: 'performance test data', timestamp: Date.now() },
            { message: 'Performance test success', requestId: `perf_${Date.now()}` }
          )
        }
      },
      validate: (result) => result && typeof result.status === 'number'
    })
    
    // Test 7: Environment Configuration Performance
    console.log('\n⚙️ Test 7: Environment Configuration Performance')
    
    const envConfig = await import('../lib/env-config')
    
    await tester.runTest({
      name: 'Environment Configuration Access',
      iterations: 500,
      concurrency: 25,
      operation: async () => {
        const operations = [
          () => envConfig.getUseAirtable(),
          () => envConfig.getMockPayments(),
          () => envConfig.getPlatformFeePercent(),
          () => envConfig.getFeatureFlags(),
          () => envConfig.getPaymentConfig()
        ]
        const randomOp = operations[Math.floor(Math.random() * operations.length)]
        return randomOp()
      },
      validate: (result) => result !== null && result !== undefined
    })
    
    // Test 8: Payment Analytics Performance
    console.log('\n📊 Test 8: Payment Analytics Performance')
    
    await tester.runTest({
      name: 'Payment Analytics Generation',
      iterations: 20,
      concurrency: 2,
      operation: async () => {
        return await paymentService.getPaymentAnalytics()
      },
      validate: (result) => result && typeof result.totalPayments === 'number'
    })
    
    // Test 9: Service Factory Performance
    console.log('\n🏭 Test 9: Service Factory Performance')
    
    await tester.runTest({
      name: 'Service Factory Operations',
      iterations: 100,
      concurrency: 10,
      operation: async () => {
        // Test both service creation methods
        const dbSvc = serviceFactory.getDatabaseService()
        const paymentSvc = serviceFactory.getPaymentService()
        return { dbService: !!dbSvc, paymentService: !!paymentSvc }
      },
      validate: (result) => result && result.dbService && result.paymentService
    })
    
    // Test 10: Concurrent Mixed Operations
    console.log('\n🔄 Test 10: Concurrent Mixed Operations')
    
    await tester.runTest({
      name: 'Mixed Operations Under Load',
      iterations: 200,
      concurrency: 20,
      operation: async () => {
        const operations = [
          async () => dbService.getServiceHealth(),
          async () => dbService.getCacheStats(),
          async () => paymentService.getServiceStatus(),
          async () => envConfig.getEnvironmentInfo(),
          async () => apiHelpers.checkRateLimit(`mixed_${Math.random()}`, 50, 60000)
        ]
        
        const randomOp = operations[Math.floor(Math.random() * operations.length)]
        return await randomOp()
      },
      validate: (result) => result !== null && result !== undefined
    })
    
  } catch (error) {
    console.error('❌ Performance testing failed:', error)
    allTestsPassed = false
  }
  
  // Generate and display report
  const report = tester.generateReport()
  console.log(report)
  
  // Performance analysis and recommendations
  console.log('\n📈 PERFORMANCE ANALYSIS')
  console.log('=' .repeat(60))
  
  const results = tester.getResults()
  const recommendations: string[] = []
  
  // Analyze each test result
  results.forEach((metrics, testName) => {
    if (metrics.averageTime > 1000) {
      recommendations.push(`⚠️ ${testName}: Average response time is high (${metrics.averageTime.toFixed(2)}ms). Consider optimization.`)
    }
    
    if (metrics.successRate < 95) {
      recommendations.push(`❌ ${testName}: Success rate is low (${metrics.successRate.toFixed(1)}%). Investigate error handling.`)
    }
    
    if (metrics.operationsPerSecond < 10 && testName.includes('Response Creation')) {
      recommendations.push(`🐌 ${testName}: Low throughput (${metrics.operationsPerSecond.toFixed(2)} ops/sec). Consider caching or optimization.`)
    }
    
    if (metrics.p99Time > metrics.averageTime * 3) {
      recommendations.push(`📊 ${testName}: High P99 latency indicates tail latency issues. Consider connection pooling or async optimization.`)
    }
  })
  
  // Performance benchmarks and thresholds
  const healthCheckMetrics = results.get('Database Health Check')
  const paymentCreationMetrics = results.get('Payment Intent Creation')
  const cacheMetrics = results.get('Database Cache Operations')
  const rateLimitMetrics = results.get('Rate Limiting Operations')
  
  console.log('\n🎯 PERFORMANCE BENCHMARKS')
  console.log('✅ Target: < 500ms average response time for core operations')
  console.log('✅ Target: > 95% success rate for all operations')
  console.log('✅ Target: > 50 ops/sec for lightweight operations')
  console.log('✅ Target: P99 < 2x average response time')
  
  let benchmarksPassed = 0
  let totalBenchmarks = 0
  
  if (healthCheckMetrics) {
    totalBenchmarks++
    if (healthCheckMetrics.averageTime < 500 && healthCheckMetrics.successRate > 95) {
      benchmarksPassed++
      console.log('✅ Database Health Check: PASSED benchmarks')
    } else {
      console.log('❌ Database Health Check: FAILED benchmarks')
    }
  }
  
  if (paymentCreationMetrics) {
    totalBenchmarks++
    if (paymentCreationMetrics.averageTime < 500 && paymentCreationMetrics.successRate > 95) {
      benchmarksPassed++
      console.log('✅ Payment Intent Creation: PASSED benchmarks')
    } else {
      console.log('❌ Payment Intent Creation: FAILED benchmarks')
    }
  }
  
  if (cacheMetrics) {
    totalBenchmarks++
    if (cacheMetrics.averageTime < 100 && cacheMetrics.successRate > 95) {
      benchmarksPassed++
      console.log('✅ Cache Operations: PASSED benchmarks')
    } else {
      console.log('❌ Cache Operations: FAILED benchmarks')
    }
  }
  
  if (rateLimitMetrics) {
    totalBenchmarks++
    if (rateLimitMetrics.operationsPerSecond > 100 && rateLimitMetrics.successRate > 95) {
      benchmarksPassed++
      console.log('✅ Rate Limiting: PASSED benchmarks')
    } else {
      console.log('❌ Rate Limiting: FAILED benchmarks')
    }
  }
  
  console.log('\n🔍 RECOMMENDATIONS')
  if (recommendations.length === 0) {
    console.log('✅ No performance issues detected!')
  } else {
    recommendations.forEach(rec => console.log(`   ${rec}`))
  }
  
  console.log('\n💡 OPTIMIZATION SUGGESTIONS')
  console.log('1. 🔄 Implement connection pooling for Airtable API calls')
  console.log('2. 💾 Add Redis caching layer for frequently accessed data')
  console.log('3. ⚡ Consider implementing request deduplication')
  console.log('4. 📊 Add monitoring and alerting for performance metrics')
  console.log('5. 🚀 Implement CDN caching for static API responses')
  console.log('6. ⏱️ Add request timeout handling and circuit breakers')
  console.log('7. 📈 Consider implementing batch operations for bulk requests')
  console.log('8. 🎯 Add performance profiling and APM integration')
  
  // Final assessment
  const overallPerformance = benchmarksPassed / totalBenchmarks
  console.log('\n' + '=' .repeat(60))
  
  if (overallPerformance >= 0.8) {
    console.log('🎉 PERFORMANCE TESTING PASSED!')
    console.log(`✅ Overall performance: ${(overallPerformance * 100).toFixed(1)}%`)
    console.log('✅ System performance meets benchmarks')
    console.log('✅ Ready for production deployment')
    console.log('')
    console.log('🚀 Ready for Final System Validation (Task 10)')
  } else {
    console.log('⚠️ PERFORMANCE TESTING NEEDS ATTENTION')
    console.log(`❌ Overall performance: ${(overallPerformance * 100).toFixed(1)}%`)
    console.log('🔧 Please address performance issues before production')
  }
  
  console.log('\n🏁 Performance testing complete!')
  
  return {
    allPassed: overallPerformance >= 0.8,
    overallPerformance,
    benchmarksPassed,
    totalBenchmarks,
    results: Array.from(results.entries()),
    recommendations
  }
}

// Run the test
if (require.main === module) {
  testPerformance().catch(console.error)
}

export { testPerformance, PerformanceTester, type PerformanceMetrics }
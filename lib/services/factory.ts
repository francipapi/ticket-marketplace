// Service Factory for Ticket Marketplace
// Provides centralized service creation with implementation switching

import { DatabaseService } from './interfaces/database.interface'
import { PaymentService } from './interfaces/payment.interface'

// Service implementations will be imported lazily to avoid circular dependencies
type DatabaseServiceClass = new () => DatabaseService
type PaymentServiceClass = new () => PaymentService

// Environment-based service selection
const USE_AIRTABLE = process.env.USE_AIRTABLE === 'true'
const USE_MOCK_PAYMENTS = process.env.MOCK_PAYMENTS === 'true'

// Service instances (singleton pattern)
let databaseServiceInstance: DatabaseService | null = null
let paymentServiceInstance: PaymentService | null = null

// Factory functions
export function getDatabaseService(): DatabaseService {
  if (!databaseServiceInstance) {
    console.log(`🏭 Creating DatabaseService implementation: ${USE_AIRTABLE ? 'Airtable' : 'Prisma'}`)
    
    if (USE_AIRTABLE) {
      // Import Airtable implementation
      const { AirtableDatabaseService } = require('./implementations/airtable/database.service')
      databaseServiceInstance = new AirtableDatabaseService()
    } else {
      // Import Prisma implementation
      const { PrismaDatabaseService } = require('./implementations/prisma/database.service')
      databaseServiceInstance = new PrismaDatabaseService()
    }
    
    console.log(`✅ DatabaseService created successfully`)
  }
  
  // TypeScript assertion since we know it's not null after the if block
  return databaseServiceInstance as DatabaseService
}

export function getPaymentService(): PaymentService {
  if (!paymentServiceInstance) {
    console.log(`🏭 Creating PaymentService implementation: ${USE_MOCK_PAYMENTS ? 'Mock' : 'Stripe'}`)
    
    if (USE_MOCK_PAYMENTS) {
      // Import Mock Payment implementation
      const { MockPaymentService } = require('./implementations/mock-payment/payment.service')
      paymentServiceInstance = new MockPaymentService()
    } else {
      // Import Stripe implementation (future)
      throw new Error('Stripe payment service not implemented yet. Set MOCK_PAYMENTS=true')
    }
    
    console.log(`✅ PaymentService created successfully`)
  }
  
  // TypeScript assertion since we know it's not null after the if block
  return paymentServiceInstance as PaymentService
}

// Service factory class (alternative interface)
export class ServiceFactory {
  private static databaseService: DatabaseService | null = null
  private static paymentService: PaymentService | null = null
  
  static getDatabaseService(): DatabaseService {
    if (!ServiceFactory.databaseService) {
      ServiceFactory.databaseService = getDatabaseService()
    }
    return ServiceFactory.databaseService
  }
  
  static getPaymentService(): PaymentService {
    if (!ServiceFactory.paymentService) {
      ServiceFactory.paymentService = getPaymentService()
    }
    return ServiceFactory.paymentService
  }
  
  // Reset services (useful for testing)
  static resetServices(): void {
    console.log('🔄 Resetting service instances')
    ServiceFactory.databaseService = null
    ServiceFactory.paymentService = null
    databaseServiceInstance = null
    paymentServiceInstance = null
  }
  
  // Get current service configuration
  static getServiceConfig(): {
    databaseImplementation: string
    paymentImplementation: string
    useAirtable: boolean
    useMockPayments: boolean
  } {
    return {
      databaseImplementation: USE_AIRTABLE ? 'Airtable' : 'Prisma',
      paymentImplementation: USE_MOCK_PAYMENTS ? 'Mock' : 'Stripe',
      useAirtable: USE_AIRTABLE,
      useMockPayments: USE_MOCK_PAYMENTS
    }
  }
  
  // Validate service configuration
  static validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (USE_AIRTABLE) {
      const apiKey = process.env.AIRTABLE_API_KEY
      const baseId = process.env.AIRTABLE_BASE_ID
      
      if (!apiKey) {
        errors.push('AIRTABLE_API_KEY is required when USE_AIRTABLE=true')
      }
      if (!baseId) {
        errors.push('AIRTABLE_BASE_ID is required when USE_AIRTABLE=true')
      }
    }
    
    if (USE_MOCK_PAYMENTS) {
      const platformFee = process.env.PLATFORM_FEE_PERCENT
      if (platformFee && (isNaN(Number(platformFee)) || Number(platformFee) < 0 || Number(platformFee) > 100)) {
        errors.push('PLATFORM_FEE_PERCENT must be a number between 0 and 100')
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// Convenience exports
export const createDatabaseService = getDatabaseService
export const createPaymentService = getPaymentService

// Service health check
export async function checkServiceHealth(): Promise<{
  database: { healthy: boolean; implementation: string; responseTime: number }
  payment: { healthy: boolean; implementation: string; responseTime: number }
}> {
  const config = ServiceFactory.getServiceConfig()
  
  // Check database service
  const dbStart = Date.now()
  let dbHealthy = false
  try {
    const dbService = getDatabaseService()
    // Simple health check - try to access the service
    await Promise.resolve(dbService.users)
    dbHealthy = true
  } catch (error) {
    console.error('Database service health check failed:', error)
  }
  const dbTime = Date.now() - dbStart
  
  // Check payment service
  const paymentStart = Date.now()
  let paymentHealthy = false
  try {
    const paymentService = getPaymentService()
    if (paymentService.getServiceStatus) {
      const status = await paymentService.getServiceStatus()
      paymentHealthy = status.healthy
    } else {
      // Fallback health check
      paymentHealthy = true
    }
  } catch (error) {
    console.error('Payment service health check failed:', error)
  }
  const paymentTime = Date.now() - paymentStart
  
  return {
    database: {
      healthy: dbHealthy,
      implementation: config.databaseImplementation,
      responseTime: dbTime
    },
    payment: {
      healthy: paymentHealthy,
      implementation: config.paymentImplementation,
      responseTime: paymentTime
    }
  }
}

// Export environment flags for easy access
export const SERVICE_CONFIG = {
  USE_AIRTABLE,
  USE_MOCK_PAYMENTS,
  DATABASE_IMPLEMENTATION: USE_AIRTABLE ? 'Airtable' : 'Prisma',
  PAYMENT_IMPLEMENTATION: USE_MOCK_PAYMENTS ? 'Mock' : 'Stripe'
} as const
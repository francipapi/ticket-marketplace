// Prisma Database Service Implementation
// Provides backward compatibility wrapper for existing Prisma code

import { DatabaseService } from '../../interfaces/database.interface'
import { PrismaUserService } from './user.service'
import { PrismaListingService } from './listing.service'
import { PrismaOfferService } from './offer.service'
import { PrismaTransactionService } from './transaction.service'

export class PrismaDatabaseService implements DatabaseService {
  public users: PrismaUserService
  public listings: PrismaListingService
  public offers: PrismaOfferService  
  public transactions: PrismaTransactionService

  constructor() {
    console.log('🏭 Initializing PrismaDatabaseService (backward compatibility)')
    this.users = new PrismaUserService()
    this.listings = new PrismaListingService()
    this.offers = new PrismaOfferService()
    this.transactions = new PrismaTransactionService()
    
    console.log('✅ PrismaDatabaseService initialized with all services')
  }

  // Service health check for all services
  async getServiceHealth(): Promise<{
    healthy: boolean
    services: {
      users: { healthy: boolean; responseTime: number }
      listings: { healthy: boolean; responseTime: number }
      offers: { healthy: boolean; responseTime: number }
      transactions: { healthy: boolean; responseTime: number }
    }
    totalResponseTime: number
  }> {
    console.log('🔍 Checking health of all Prisma services')
    
    const start = Date.now()
    
    try {
      // Simple health check for Prisma - try to connect to database
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient()
      
      await prisma.$connect()
      await prisma.$disconnect()
      
      const responseTime = Date.now() - start
      
      console.log(`✅ Prisma health check completed in ${responseTime}ms`)
      
      return {
        healthy: true,
        services: {
          users: { healthy: true, responseTime },
          listings: { healthy: true, responseTime },
          offers: { healthy: true, responseTime },
          transactions: { healthy: true, responseTime }
        },
        totalResponseTime: responseTime
      }
    } catch (error) {
      console.error('❌ Prisma health check failed:', error)
      const responseTime = Date.now() - start
      
      return {
        healthy: false,
        services: {
          users: { healthy: false, responseTime },
          listings: { healthy: false, responseTime },
          offers: { healthy: false, responseTime },
          transactions: { healthy: false, responseTime }
        },
        totalResponseTime: responseTime
      }
    }
  }

  // No-op cache methods (Prisma doesn't use our cache)
  clearAllCaches(): void {
    console.log('🧹 Prisma services do not use caching')
  }

  getCacheStats() {
    return {
      users: { message: 'Prisma services do not use caching' },
      listings: { message: 'Prisma services do not use caching' },
      offers: { message: 'Prisma services do not use caching' },
      transactions: { message: 'Prisma services do not use caching' }
    }
  }
}
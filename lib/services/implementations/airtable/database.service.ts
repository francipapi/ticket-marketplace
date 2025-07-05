// Airtable Database Service Implementation
// Complete implementation with all services

import { DatabaseService } from '../../interfaces/database.interface'
import { AirtableUserService } from './user.service'
import { AirtableListingService } from './listing.service'
import { AirtableOfferService } from './offer.service'
import { AirtableTransactionService } from './transaction.service'

export class AirtableDatabaseService implements DatabaseService {
  public users: AirtableUserService
  public listings: AirtableListingService
  public offers: AirtableOfferService  
  public transactions: AirtableTransactionService

  constructor() {
    console.log('🏭 Initializing AirtableDatabaseService (complete implementation)')
    this.users = new AirtableUserService()
    this.listings = new AirtableListingService()
    this.offers = new AirtableOfferService()
    this.transactions = new AirtableTransactionService()
    
    console.log('✅ AirtableDatabaseService initialized with all services')
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
    console.log('🔍 Checking health of all Airtable services')
    
    const start = Date.now()
    
    try {
      // Check all services in parallel
      const [usersHealth, listingsHealth, offersHealth, transactionsHealth] = await Promise.all([
        this.users.getServiceHealth().catch(error => ({ healthy: false, responseTime: 0, error })),
        this.listings.getServiceHealth().catch(error => ({ healthy: false, responseTime: 0, error })),
        this.offers.getServiceHealth().catch(error => ({ healthy: false, responseTime: 0, error })),
        this.transactions.getServiceHealth().catch(error => ({ healthy: false, responseTime: 0, error }))
      ])
      
      const totalResponseTime = Date.now() - start
      const allHealthy = usersHealth.healthy && listingsHealth.healthy && 
                        offersHealth.healthy && transactionsHealth.healthy
      
      console.log(`✅ Service health check completed in ${totalResponseTime}ms`)
      
      return {
        healthy: allHealthy,
        services: {
          users: { healthy: usersHealth.healthy, responseTime: usersHealth.responseTime },
          listings: { healthy: listingsHealth.healthy, responseTime: listingsHealth.responseTime },
          offers: { healthy: offersHealth.healthy, responseTime: offersHealth.responseTime },
          transactions: { healthy: transactionsHealth.healthy, responseTime: transactionsHealth.responseTime }
        },
        totalResponseTime
      }
    } catch (error) {
      console.error('❌ Service health check failed:', error)
      return {
        healthy: false,
        services: {
          users: { healthy: false, responseTime: 0 },
          listings: { healthy: false, responseTime: 0 },
          offers: { healthy: false, responseTime: 0 },
          transactions: { healthy: false, responseTime: 0 }
        },
        totalResponseTime: Date.now() - start
      }
    }
  }

  // Clear all caches
  clearAllCaches(): void {
    console.log('🧹 Clearing all service caches')
    this.users.clearCache()
    this.listings.clearCache()
    this.offers.clearCache()
    this.transactions.clearCache()
  }

  // Get combined cache statistics
  getCacheStats() {
    return {
      users: this.users.getCacheStats(),
      listings: this.listings.getCacheStats(),
      offers: this.offers.getCacheStats(),
      transactions: this.transactions.getCacheStats()
    }
  }
}
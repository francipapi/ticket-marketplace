// Airtable Transaction Service Implementation
// Provides transaction CRUD operations with caching and rate limiting

import { 
  TransactionService, 
  AppTransaction, 
  CreateTransactionData, 
  UpdateTransactionData, 
  TransactionFilters,
  PaginatedTransactions 
} from '../../interfaces/database.interface'
import { getAirtableClient, AIRTABLE_TABLES, TransactionRecord } from '../../../airtable-client'
import { Record as AirtableRecord } from 'airtable'

export class AirtableTransactionService implements TransactionService {
  private client = getAirtableClient()

  constructor() {
    console.log('🏭 Initializing AirtableTransactionService')
  }

  async create(data: CreateTransactionData): Promise<AppTransaction> {
    console.log(`💰 Creating transaction for offer: ${data.offerId}`)
    
    try {
      // Transform data to Airtable format
      const airtableData = this.client.transformToAirtableFields('transactions', {
        ...data,
        // Ensure linked fields are properly formatted
        offer: [data.offerId], // Convert to linked record array
        status: data.status || 'PENDING',
        createdAt: new Date()
      })

      console.log(`📝 Airtable transaction data:`, airtableData)

      // Create record in Airtable with rate limiting
      const record = await this.client.executeWithRateLimit(async () => {
        const table = this.client.getTable(AIRTABLE_TABLES.TRANSACTIONS)
        return await table.create(airtableData)
      })

      console.log(`✅ Transaction created with ID: ${record.id}`)

      // Transform back to app format
      const transaction = this.transformToAppTransaction(record)

      return transaction
    } catch (error) {
      console.error(`❌ Failed to create transaction:`, error)
      throw new Error(`Failed to create transaction: ${error}`)
    }
  }

  async findById(id: string): Promise<AppTransaction | null> {
    console.log(`🔍 Finding transaction by ID: ${id}`)

    try {
      // Fetch from Airtable with rate limiting
      const record = await this.client.executeWithRateLimit(async () => {
        const table = this.client.getTable(AIRTABLE_TABLES.TRANSACTIONS)
        return await table.find(id)
      })

      console.log(`✅ Transaction found: ${record.id}`)

      // Transform
      const transaction = this.transformToAppTransaction(record)

      return transaction
    } catch (error: any) {
      if (error.statusCode === 404) {
        console.log(`❌ Transaction not found: ${id}`)
        return null
      }
      console.error(`❌ Error finding transaction by ID:`, error)
      throw new Error(`Failed to find transaction: ${error}`)
    }
  }

  async findMany(filters: TransactionFilters): Promise<PaginatedTransactions> {
    console.log(`🔍 Finding transactions with filters:`, filters)

    try {
      // Build filter formula for Airtable
      const filterFormulas = []
      
      if (filters.offerId) {
        filterFormulas.push(`FIND('${filters.offerId}', ARRAYJOIN({offer})) > 0`)
      }
      
      if (filters.status) {
        filterFormulas.push(`{status} = '${filters.status}'`)
      }
      
      if (filters.dateFrom) {
        filterFormulas.push(`{createdAt} >= '${filters.dateFrom.toISOString().split('T')[0]}'`)
      }
      
      if (filters.dateTo) {
        filterFormulas.push(`{createdAt} <= '${filters.dateTo.toISOString().split('T')[0]}'`)
      }

      const filterFormula = filterFormulas.length > 0 
        ? `AND(${filterFormulas.join(', ')})`
        : undefined

      console.log(`📊 Filter formula:`, filterFormula)

      // Fetch records with rate limiting
      const records = await this.client.executeWithRateLimit(async () => {
        const table = this.client.getTable(AIRTABLE_TABLES.TRANSACTIONS)
        const query = table.select({
          ...(filterFormula && { filterByFormula: filterFormula }),
          sort: [{ field: 'createdAt', direction: 'desc' }],
          maxRecords: Math.min(filters.limit || 50, 100) // Cap at 100 for performance
        })
        return await query.all()
      })

      console.log(`✅ Found ${records.length} transactions`)

      // Transform records
      const transactions = records.map(record => this.transformToAppTransaction(record))

      // Apply client-side pagination if needed
      const offset = filters.offset || 0
      const limit = filters.limit || 50
      const paginatedTransactions = transactions.slice(offset, offset + limit)

      return {
        items: paginatedTransactions,
        total: records.length, // Note: This is approximate due to Airtable limitations
        limit,
        offset,
        hasMore: paginatedTransactions.length === limit
      }
    } catch (error) {
      console.error(`❌ Error finding transactions:`, error)
      throw new Error(`Failed to find transactions: ${error}`)
    }
  }

  async findByOfferId(offerId: string): Promise<AppTransaction | null> {
    console.log(`🔍 Finding transaction for offer: ${offerId}`)
    
    try {
      const result = await this.findMany({ offerId, limit: 1 })
      return result.items.length > 0 ? result.items[0] : null
    } catch (error) {
      console.error(`❌ Error finding transaction by offer ID:`, error)
      throw new Error(`Failed to find transaction by offer ID: ${error}`)
    }
  }

  async update(id: string, data: UpdateTransactionData): Promise<AppTransaction> {
    console.log(`📝 Updating transaction: ${id}`)

    try {
      // Transform update data to Airtable format
      const airtableData = this.client.transformToAirtableFields('transactions', {
        ...data,
        updatedAt: new Date()
      })

      console.log(`📝 Update data:`, airtableData)

      // Update record in Airtable with rate limiting
      const record = await this.client.executeWithRateLimit(async () => {
        const table = this.client.getTable(AIRTABLE_TABLES.TRANSACTIONS)
        return await table.update(id, airtableData)
      })

      console.log(`✅ Transaction updated: ${record.id}`)

      // Transform
      const transaction = this.transformToAppTransaction(record)

      return transaction
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new Error(`Transaction not found: ${id}`)
      }
      console.error(`❌ Error updating transaction:`, error)
      throw new Error(`Failed to update transaction: ${error}`)
    }
  }

  async updateStatus(id: string, status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'): Promise<AppTransaction> {
    console.log(`📊 Updating transaction status: ${id} -> ${status}`)
    
    const updateData: UpdateTransactionData = { status }
    
    // If completing, set completion time
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date()
    }
    
    return await this.update(id, updateData)
  }

  async completeTransaction(id: string, stripePaymentId: string): Promise<AppTransaction> {
    console.log(`✅ Completing transaction: ${id} with payment: ${stripePaymentId}`)
    
    try {
      // Update transaction with completion data
      const transaction = await this.update(id, {
        status: 'COMPLETED',
        stripePaymentId,
        completedAt: new Date()
      })
      
      console.log(`✅ Transaction completed: ${id}`)
      return transaction
    } catch (error) {
      console.error(`❌ Error completing transaction:`, error)
      throw new Error(`Failed to complete transaction: ${error}`)
    }
  }

  async failTransaction(id: string, reason?: string): Promise<AppTransaction> {
    console.log(`❌ Failing transaction: ${id}${reason ? ` - ${reason}` : ''}`)
    
    try {
      // Update transaction status to failed
      const transaction = await this.updateStatus(id, 'FAILED')
      
      console.log(`✅ Transaction failed: ${id}`)
      return transaction
    } catch (error) {
      console.error(`❌ Error failing transaction:`, error)
      throw new Error(`Failed to fail transaction: ${error}`)
    }
  }

  // Helper methods
  private transformToAppTransaction(record: AirtableRecord<TransactionRecord>): AppTransaction {
    const transformed = this.client.transformFromAirtableFields('transactions', record)
    
    return {
      id: record.id,
      offerId: transformed.offer || '', // Extract from linked field
      amount: transformed.amount || 0,
      platformFee: transformed.platformFee || 0,
      sellerPayout: transformed.sellerPayout || 0,
      status: transformed.status || 'PENDING',
      stripePaymentId: transformed.stripePaymentId,
      completedAt: transformed.completedAt,
      createdAt: transformed.createdAt || new Date()
    }
  }

  // Service health and debugging methods
  async getServiceHealth(): Promise<{
    healthy: boolean
    cacheStats: any
    responseTime: number
  }> {
    const start = Date.now()
    
    try {
      // Test basic connectivity
      await this.client.healthCheck()
      
      const responseTime = Date.now() - start
      
      return {
        healthy: true,
        cacheStats: this.client.getCacheStats(),
        responseTime
      }
    } catch (error) {
      return {
        healthy: false,
        cacheStats: this.client.getCacheStats(),
        responseTime: Date.now() - start
      }
    }
  }

  getCacheStats() {
    return this.client.getCacheStats()
  }

  clearCache(): void {
    console.log('🧹 Clearing transaction cache')
    this.client.clearAllCaches()
  }

  // Transaction analytics and reporting
  async getTransactionStats(filters?: TransactionFilters): Promise<{
    totalTransactions: number
    totalVolume: number
    totalPlatformFees: number
    totalSellerPayouts: number
    averageTransactionAmount: number
    transactionsByStatus: Array<{ status: string; count: number }>
  }> {
    console.log(`📊 Getting transaction statistics`)
    
    try {
      const transactions = await this.findMany({
        ...filters,
        limit: 1000 // Get more records for analytics
      })
      
      const totalTransactions = transactions.items.length
      const totalVolume = transactions.items.reduce((sum, t) => sum + t.amount, 0)
      const totalPlatformFees = transactions.items.reduce((sum, t) => sum + t.platformFee, 0)
      const totalSellerPayouts = transactions.items.reduce((sum, t) => sum + t.sellerPayout, 0)
      const averageTransactionAmount = totalTransactions > 0 ? totalVolume / totalTransactions : 0
      
      // Count by status
      const statusCounts = transactions.items.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      const transactionsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count
      }))
      
      console.log(`✅ Transaction statistics calculated`)
      
      return {
        totalTransactions,
        totalVolume,
        totalPlatformFees,
        totalSellerPayouts,
        averageTransactionAmount,
        transactionsByStatus
      }
    } catch (error) {
      console.error(`❌ Error getting transaction statistics:`, error)
      throw new Error(`Failed to get transaction statistics: ${error}`)
    }
  }
}
// Airtable Offer Service Implementation
// Provides offer CRUD operations with caching and rate limiting

import { 
  OfferService, 
  AppOffer, 
  CreateOfferData, 
  UpdateOfferData, 
  OfferFilters,
  PaginatedOffers 
} from '../../interfaces/database.interface'
import { getAirtableClient, AIRTABLE_TABLES, OfferRecord } from '../../../airtable-client'
import { Record as AirtableRecord } from 'airtable'

export class AirtableOfferService implements OfferService {
  private client = getAirtableClient()

  constructor() {
    console.log('🏭 Initializing AirtableOfferService')
  }

  async create(data: CreateOfferData): Promise<AppOffer> {
    console.log(`💼 Creating offer: ${data.messageTemplate} for listing ${data.listingId}`)
    
    try {
      // Transform data to Airtable format
      const airtableData = this.client.transformToAirtableFields('offers', {
        ...data,
        // Ensure linked fields are properly formatted
        listing: [data.listingId], // Convert to linked record array
        buyer: [data.buyerId], // Convert to linked record array
        status: data.status || 'PENDING',
        createdAt: new Date()
      })

      console.log(`📝 Airtable offer data:`, airtableData)

      // Create record in Airtable with rate limiting
      const record = await this.client.executeWithRateLimit(async () => {
        const table = this.client.getTable(AIRTABLE_TABLES.OFFERS)
        return await table.create(airtableData)
      })

      console.log(`✅ Offer created with ID: ${record.id}`)

      // Transform back to app format
      const offer = this.transformToAppOffer(record)

      return offer
    } catch (error) {
      console.error(`❌ Failed to create offer:`, error)
      throw new Error(`Failed to create offer: ${error}`)
    }
  }

  async findById(id: string): Promise<AppOffer | null> {
    console.log(`🔍 Finding offer by ID: ${id}`)

    try {
      // Fetch from Airtable with rate limiting
      const record = await this.client.executeWithRateLimit(async () => {
        const table = this.client.getTable(AIRTABLE_TABLES.OFFERS)
        return await table.find(id)
      })

      console.log(`✅ Offer found: ${record.id}`)

      // Transform
      const offer = this.transformToAppOffer(record)

      return offer
    } catch (error: any) {
      if (error.statusCode === 404) {
        console.log(`❌ Offer not found: ${id}`)
        return null
      }
      console.error(`❌ Error finding offer by ID:`, error)
      throw new Error(`Failed to find offer: ${error}`)
    }
  }

  async findMany(filters: OfferFilters): Promise<PaginatedOffers> {
    console.log(`🔍 Finding offers with filters:`, filters)

    try {
      // Build filter formula for Airtable
      const filterFormulas = []
      
      if (filters.listingId) {
        console.log(`🔍 DEBUG: Filtering by listingId (record ID): ${filters.listingId}`)
        filterFormulas.push(`FIND("${filters.listingId}", {listing} & '') > 0`)
      }
      
      if ((filters as any).listingPrimaryField) {
        // Filter by the primary field value (title) instead of record ID
        const primaryValue = (filters as any).listingPrimaryField
        console.log(`🔍 DEBUG: Filtering by listing primary field: ${primaryValue}`)
        filterFormulas.push(`FIND("${primaryValue}", {listing}) > 0`)
      }
      
      if (filters.buyerId) {
        console.log(`🔍 DEBUG: Filtering by buyerId (record ID): ${filters.buyerId}`)
        filterFormulas.push(`FIND("${filters.buyerId}", {buyer} & '') > 0`)
      }
      
      if ((filters as any).buyerPrimaryField) {
        // Filter by the primary field value (username/email) instead of record ID
        const primaryValue = (filters as any).buyerPrimaryField
        console.log(`🔍 DEBUG: Filtering by buyer primary field: ${primaryValue}`)
        filterFormulas.push(`FIND("${primaryValue}", {buyer}) > 0`)
      }
      
      if (filters.status) {
        filterFormulas.push(`{status} = '${filters.status}'`)
      }

      const filterFormula = filterFormulas.length > 0 
        ? `AND(${filterFormulas.join(', ')})`
        : undefined

      console.log(`📊 Filter formula:`, filterFormula)

      // Fetch records with rate limiting
      const records = await this.client.executeWithRateLimit(async () => {
        const table = this.client.getTable(AIRTABLE_TABLES.OFFERS)
        const query = table.select({
          ...(filterFormula && { filterByFormula: filterFormula }),
          maxRecords: Math.min(filters.limit || 50, 100) // Cap at 100 for performance
        })
        return await query.all()
      })

      console.log(`✅ Found ${records.length} offers`)

      // Transform records
      const offers = records.map(record => this.transformToAppOffer(record))

      // Apply client-side pagination if needed
      const offset = filters.offset || 0
      const limit = filters.limit || 50
      const paginatedOffers = offers.slice(offset, offset + limit)

      return {
        items: paginatedOffers,
        total: records.length, // Note: This is approximate due to Airtable limitations
        limit,
        offset,
        hasMore: paginatedOffers.length === limit
      }
    } catch (error) {
      console.error(`❌ Error finding offers:`, error)
      throw new Error(`Failed to find offers: ${error}`)
    }
  }

  async findByListingId(listingId: string, filters?: Partial<OfferFilters>): Promise<PaginatedOffers> {
    console.log(`🔍 Finding offers for listing: ${listingId}`)
    
    return await this.findMany({
      ...filters,
      listingId,
      limit: filters?.limit || 50,
      offset: filters?.offset || 0
    })
  }

  async findByListingPrimaryField(listingPrimaryValue: string, filters?: Partial<OfferFilters>): Promise<PaginatedOffers> {
    console.log(`🔍 Finding offers for listing primary field: ${listingPrimaryValue}`)
    
    return await this.findMany({
      ...filters,
      listingPrimaryField: listingPrimaryValue,
      limit: filters?.limit || 50,
      offset: filters?.offset || 0
    })
  }

  async findByBuyerId(buyerId: string, filters?: Partial<OfferFilters>): Promise<PaginatedOffers> {
    console.log(`🔍 Finding offers for buyer: ${buyerId}`)
    
    return await this.findMany({
      ...filters,
      buyerId,
      limit: filters?.limit || 50,
      offset: filters?.offset || 0
    })
  }

  async findByBuyerPrimaryField(buyerPrimaryValue: string, filters?: Partial<OfferFilters>): Promise<PaginatedOffers> {
    console.log(`🔍 Finding offers for buyer primary field: ${buyerPrimaryValue}`)
    
    return await this.findMany({
      ...filters,
      buyerPrimaryField: buyerPrimaryValue,
      limit: filters?.limit || 50,
      offset: filters?.offset || 0
    })
  }

  async update(id: string, data: UpdateOfferData): Promise<AppOffer> {
    console.log(`📝 Updating offer: ${id}`)

    try {
      // Transform update data to Airtable format
      const airtableData = this.client.transformToAirtableFields('offers', {
        ...data,
        updatedAt: new Date()
      })

      console.log(`📝 Update data:`, airtableData)

      // Update record in Airtable with rate limiting
      const record = await this.client.executeWithRateLimit(async () => {
        const table = this.client.getTable(AIRTABLE_TABLES.OFFERS)
        return await table.update(id, airtableData)
      })

      console.log(`✅ Offer updated: ${record.id}`)

      // Transform
      const offer = this.transformToAppOffer(record)

      return offer
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new Error(`Offer not found: ${id}`)
      }
      console.error(`❌ Error updating offer:`, error)
      throw new Error(`Failed to update offer: ${error}`)
    }
  }

  async delete(id: string): Promise<boolean> {
    console.log(`🗑️ Deleting offer: ${id}`)

    try {
      // Delete from Airtable with rate limiting
      await this.client.executeWithRateLimit(async () => {
        const table = this.client.getTable(AIRTABLE_TABLES.OFFERS)
        return await table.destroy(id)
      })

      console.log(`✅ Offer deleted: ${id}`)

      return true
    } catch (error: any) {
      if (error.statusCode === 404) {
        console.log(`❌ Offer not found for deletion: ${id}`)
        return false
      }
      console.error(`❌ Error deleting offer:`, error)
      throw new Error(`Failed to delete offer: ${error}`)
    }
  }

  async updateStatus(id: string, status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'COMPLETED'): Promise<AppOffer> {
    console.log(`📊 Updating offer status: ${id} -> ${status}`)
    
    return await this.update(id, { status })
  }

  async acceptOffer(id: string): Promise<AppOffer> {
    console.log(`✅ Accepting offer: ${id}`)
    
    try {
      // Update offer status to accepted
      const offer = await this.updateStatus(id, 'ACCEPTED')
      
      console.log(`✅ Offer accepted: ${id}`)
      return offer
    } catch (error) {
      console.error(`❌ Error accepting offer:`, error)
      throw new Error(`Failed to accept offer: ${error}`)
    }
  }

  async rejectOffer(id: string): Promise<AppOffer> {
    console.log(`❌ Rejecting offer: ${id}`)
    
    try {
      // Update offer status to rejected
      const offer = await this.updateStatus(id, 'REJECTED')
      
      console.log(`✅ Offer rejected: ${id}`)
      return offer
    } catch (error) {
      console.error(`❌ Error rejecting offer:`, error)
      throw new Error(`Failed to reject offer: ${error}`)
    }
  }

  // Helper methods
  private transformToAppOffer(record: AirtableRecord<OfferRecord>): AppOffer {
    const transformed = this.client.transformFromAirtableFields('offers', record)
    
    return {
      id: record.id,
      listingId: transformed.listing || '', // Extract from linked field
      buyerId: transformed.buyer || '', // Extract from linked field
      offerPriceInCents: transformed.offerPriceInCents || 0,
      quantity: transformed.quantity || 1,
      messageTemplate: transformed.messageTemplate || 'asking_price',
      customMessage: transformed.customMessage,
      status: transformed.status || 'PENDING',
      createdAt: transformed.createdAt || new Date(),
      updatedAt: transformed.updatedAt
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
    console.log('🧹 Clearing offer cache')
    this.client.clearAllCaches()
  }
}
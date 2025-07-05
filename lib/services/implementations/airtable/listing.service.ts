// Airtable Listing Service Implementation
// Provides listing CRUD operations with caching and rate limiting

import { 
  ListingService, 
  AppListing, 
  CreateListingData, 
  UpdateListingData, 
  ListingFilters,
  PaginatedListings 
} from '../../interfaces/database.interface'
import { getAirtableClient, AIRTABLE_TABLES, ListingRecord } from '../../../airtable-client'
import { Record as AirtableRecord } from 'airtable'

export class AirtableListingService implements ListingService {
  private client = getAirtableClient()

  constructor() {
    console.log('🏭 Initializing AirtableListingService')
  }

  async create(data: CreateListingData): Promise<AppListing> {
    console.log(`📝 Creating listing: ${data.title}`)
    
    try {
      // Transform data to Airtable format
      const airtableData = this.client.transformToAirtableFields('listings', {
        ...data,
        // Ensure seller is properly formatted as link field
        seller: [data.userId], // Convert userId to linked record array
        status: data.status || 'ACTIVE',
        views: 0, // Initialize view count
        createdAt: new Date()
      })

      console.log(`📝 Airtable listing data:`, airtableData)

      // Create record in Airtable with rate limiting
      const record = await this.client.executeWithRateLimit(async () => {
        const table = this.client.getTable(AIRTABLE_TABLES.LISTINGS)
        return await table.create(airtableData)
      })

      console.log(`✅ Listing created with ID: ${record.id}`)

      // Transform back to app format
      const listing = this.transformToAppListing(record)

      // Cache the listing
      this.cacheListing(listing)

      return listing
    } catch (error) {
      console.error(`❌ Failed to create listing:`, error)
      throw new Error(`Failed to create listing: ${error}`)
    }
  }

  async findById(id: string): Promise<AppListing | null> {
    console.log(`🔍 Finding listing by ID: ${id}`)

    // Check cache first
    const cacheKey = `listing:id:${id}`
    const cachedListing = this.client.getListingFromCache(cacheKey)
    if (cachedListing) {
      console.log(`⚡ Listing found in cache: ${id}`)
      return cachedListing as AppListing
    }

    try {
      // Fetch from Airtable with rate limiting
      const record = await this.client.executeWithRateLimit(async () => {
        const table = this.client.getTable(AIRTABLE_TABLES.LISTINGS)
        return await table.find(id)
      })

      console.log(`✅ Listing found: ${record.id}`)

      // Transform and cache
      const listing = this.transformToAppListing(record)
      this.cacheListing(listing)

      return listing
    } catch (error: any) {
      if (error.statusCode === 404) {
        console.log(`❌ Listing not found: ${id}`)
        return null
      }
      console.error(`❌ Error finding listing by ID:`, error)
      throw new Error(`Failed to find listing: ${error}`)
    }
  }

  async findMany(filters: ListingFilters): Promise<PaginatedListings> {
    console.log(`🔍 Finding listings with filters:`, filters)

    try {
      // Build filter formula for Airtable
      const filterFormulas = []
      
      if (filters.userId) {
        // For linked record fields, we need to use the primary field value, not record ID
        console.log(`🔍 DEBUG: Filtering by userId (record ID): ${filters.userId}`)
        filterFormulas.push(`FIND("${filters.userId}", {seller} & '') > 0`)
      }
      
      if ((filters as any).userPrimaryField) {
        // Filter by the primary field value (username/email) instead of record ID
        const primaryValue = (filters as any).userPrimaryField
        console.log(`🔍 DEBUG: Filtering by user primary field: ${primaryValue}`)
        filterFormulas.push(`FIND("${primaryValue}", {seller}) > 0`)
      }
      
      if (filters.status) {
        filterFormulas.push(`{status} = '${filters.status}'`)
      }
      
      if (filters.eventName) {
        filterFormulas.push(`SEARCH('${filters.eventName}', {eventName}) > 0`)
      }
      
      if (filters.priceMin) {
        filterFormulas.push(`{price} >= ${filters.priceMin}`)
      }
      
      if (filters.priceMax) {
        filterFormulas.push(`{price} <= ${filters.priceMax}`)
      }
      
      if (filters.eventDateFrom) {
        filterFormulas.push(`{eventDate} >= '${filters.eventDateFrom.toISOString().split('T')[0]}'`)
      }
      
      if (filters.eventDateTo) {
        filterFormulas.push(`{eventDate} <= '${filters.eventDateTo.toISOString().split('T')[0]}'`)
      }

      const filterFormula = filterFormulas.length > 0 
        ? `AND(${filterFormulas.join(', ')})`
        : undefined

      console.log(`📊 Filter formula:`, filterFormula)

      // Fetch records with rate limiting
      const records = await this.client.executeWithRateLimit(async () => {
        const table = this.client.getTable(AIRTABLE_TABLES.LISTINGS)
        const query = table.select({
          ...(filterFormula && { filterByFormula: filterFormula }),
          maxRecords: Math.min(filters.limit || 50, 100) // Cap at 100 for performance
        })
        return await query.all()
      })

      console.log(`✅ Found ${records.length} listings`)

      // Debug: If we have filters.userId but found 0 records, let's try without filter
      if (filters.userId && records.length === 0) {
        console.log(`🔍 DEBUG: No listings found with userId filter, trying query without filters...`)
        
        const debugRecords = await this.client.executeWithRateLimit(async () => {
          const table = this.client.getTable(AIRTABLE_TABLES.LISTINGS)
          const query = table.select({
            maxRecords: 3 // Just get a few to check structure
          })
          return await query.all()
        })
        
        console.log(`🔍 DEBUG: Found ${debugRecords.length} total listings in database`)
        if (debugRecords.length > 0) {
          console.log(`🔍 DEBUG: Sample listing data:`)
          debugRecords.forEach((record, index) => {
            const sellerData = record.get('seller')
            const allFields = record.fields
            console.log(`   Listing ${index + 1}: ID=${record.id}`)
            console.log(`     seller field: ${JSON.stringify(sellerData)}`)
            console.log(`     all fields: ${Object.keys(allFields).join(', ')}`)
          })
        }
      }

      // Transform records
      const listings = records.map(record => this.transformToAppListing(record))

      // Cache listings
      listings.forEach(listing => this.cacheListing(listing))

      // Apply client-side pagination if needed
      const offset = filters.offset || 0
      const limit = filters.limit || 50
      const paginatedListings = listings.slice(offset, offset + limit)

      return {
        items: paginatedListings,
        total: records.length, // Note: This is approximate due to Airtable limitations
        limit,
        offset,
        hasMore: paginatedListings.length === limit
      }
    } catch (error) {
      console.error(`❌ Error finding listings:`, error)
      throw new Error(`Failed to find listings: ${error}`)
    }
  }

  async findByUserId(userId: string, filters?: Partial<ListingFilters>): Promise<PaginatedListings> {
    console.log(`🔍 Finding listings for user: ${userId}`)
    
    return await this.findMany({
      ...filters,
      userId,
      limit: filters?.limit || 50,
      offset: filters?.offset || 0
    })
  }

  async findByUserPrimaryField(userPrimaryValue: string, filters?: Partial<ListingFilters>): Promise<PaginatedListings> {
    console.log(`🔍 Finding listings for user primary field: ${userPrimaryValue}`)
    
    return await this.findMany({
      ...filters,
      userPrimaryField: userPrimaryValue,
      limit: filters?.limit || 50,
      offset: filters?.offset || 0
    })
  }

  async update(id: string, data: UpdateListingData): Promise<AppListing> {
    console.log(`📝 Updating listing: ${id}`)

    try {
      // Transform update data to Airtable format
      const airtableData = this.client.transformToAirtableFields('listings', {
        ...data,
        updatedAt: new Date()
      })

      console.log(`📝 Update data:`, airtableData)

      // Update record in Airtable with rate limiting
      const record = await this.client.executeWithRateLimit(async () => {
        const table = this.client.getTable(AIRTABLE_TABLES.LISTINGS)
        return await table.update(id, airtableData)
      })

      console.log(`✅ Listing updated: ${record.id}`)

      // Transform and update cache
      const listing = this.transformToAppListing(record)
      this.cacheListing(listing)

      return listing
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new Error(`Listing not found: ${id}`)
      }
      console.error(`❌ Error updating listing:`, error)
      throw new Error(`Failed to update listing: ${error}`)
    }
  }

  async delete(id: string): Promise<boolean> {
    console.log(`🗑️ Deleting listing: ${id}`)

    try {
      // Delete from Airtable with rate limiting
      await this.client.executeWithRateLimit(async () => {
        const table = this.client.getTable(AIRTABLE_TABLES.LISTINGS)
        return await table.destroy(id)
      })

      console.log(`✅ Listing deleted: ${id}`)

      // Remove from cache
      this.invalidateListingCache(id)

      return true
    } catch (error: any) {
      if (error.statusCode === 404) {
        console.log(`❌ Listing not found for deletion: ${id}`)
        return false
      }
      console.error(`❌ Error deleting listing:`, error)
      throw new Error(`Failed to delete listing: ${error}`)
    }
  }

  async incrementViews(id: string): Promise<AppListing> {
    console.log(`👁️ Incrementing views for listing: ${id}`)

    try {
      // First get the current listing to get current view count
      const currentListing = await this.findById(id)
      if (!currentListing) {
        throw new Error(`Listing not found: ${id}`)
      }

      const newViews = (currentListing.views || 0) + 1

      // Update with new view count
      return await this.update(id, {
        views: newViews
      })
    } catch (error) {
      console.error(`❌ Error incrementing views:`, error)
      throw new Error(`Failed to increment views: ${error}`)
    }
  }

  async updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'SOLD' | 'DELISTED'): Promise<AppListing> {
    console.log(`📊 Updating listing status: ${id} -> ${status}`)
    
    return await this.update(id, { status })
  }

  // Helper methods
  private transformToAppListing(record: AirtableRecord<ListingRecord>): AppListing {
    const transformed = this.client.transformFromAirtableFields('listings', record)
    
    return {
      id: record.id,
      userId: transformed.seller || '', // Extract from linked field
      title: transformed.title,
      eventName: transformed.eventName,
      eventDate: transformed.eventDate || new Date(),
      venue: transformed.venue,
      priceInCents: transformed.priceInCents || 0,
      quantity: transformed.quantity || 1,
      description: transformed.description,
      ticketPath: transformed.ticketFiles?.[0]?.url, // Extract first file URL
      originalFileName: transformed.ticketFiles?.[0]?.filename,
      fileType: transformed.ticketFiles?.[0]?.type,
      fileSize: transformed.ticketFiles?.[0]?.size,
      status: transformed.status || 'ACTIVE',
      views: transformed.views || 0,
      createdAt: transformed.createdAt || new Date(),
      updatedAt: transformed.updatedAt
    }
  }

  private cacheListing(listing: AppListing): void {
    console.log(`💾 Caching listing: ${listing.id}`)
    
    // Cache by multiple keys for different lookup methods
    this.client.setListingInCache(`listing:id:${listing.id}`, listing)
    this.client.setListingInCache(`listing:title:${listing.title}`, listing)
  }

  private invalidateListingCache(listingId: string): void {
    console.log(`🧹 Invalidating cache for listing: ${listingId}`)
    
    // We need to get the listing first to invalidate all cache keys
    const cacheKey = `listing:id:${listingId}`
    const cachedListing = this.client.getListingFromCache(cacheKey) as AppListing
    
    if (cachedListing) {
      this.client.invalidateListingCache(`listing:id:${listingId}`)
      this.client.invalidateListingCache(`listing:title:${cachedListing.title}`)
    } else {
      // Fallback: just invalidate by ID
      this.client.invalidateListingCache(cacheKey)
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
    console.log('🧹 Clearing listing cache')
    this.client.clearAllCaches()
  }
}
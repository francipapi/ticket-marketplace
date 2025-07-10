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
        views: 0 // Initialize view count
      })

      console.log(`📝 Airtable listing data:`, airtableData)

      // Create record in Airtable with rate limiting
      const record = await this.client.executeWithRateLimit(async () => {
        const table = this.client.getTable(AIRTABLE_TABLES.LISTINGS)
        return await table.create(airtableData)
      })

      console.log(`✅ Listing created with ID: ${(record as any).id}`)

      // Transform back to app format
      const listing = this.transformToAppListing(record as any)

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
      const listing = this.transformToAppListing(record as any)
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
        console.log(`🔍 DEBUG: Filtering by userId (record ID): ${filters.userId}`)
        
        // FIXED: Get user's email first, then filter by email (primary field)
        // This is the root cause fix - Airtable linked records filter by primary field (email), not record ID
        try {
          const userService = (await import('../../factory')).getDatabaseService().users
          const user = await userService.findById(filters.userId)
          
          if (user && user.email) {
            console.log(`🔍 DEBUG: Found user email for filtering: ${user.email}`)
            // Use direct comparison with email (most reliable for Airtable)
            filterFormulas.push(`{seller} = "${user.email}"`)
          } else {
            console.log(`❌ DEBUG: User not found or no email for userId: ${filters.userId}`)
            // If user not found, return empty results instead of erroring
            return {
              items: [],
              total: 0,
              limit: filters.limit || 50,
              offset: filters.offset || 0,
              hasMore: false
            }
          }
        } catch (error) {
          console.error(`❌ Error looking up user for filtering: ${error}`)
          // If lookup fails, return empty results instead of erroring
          return {
            items: [],
            total: 0,
            limit: filters.limit || 50,
            offset: filters.offset || 0,
            hasMore: false
          }
        }
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
      
      if (filters.venue) {
        filterFormulas.push(`SEARCH('${filters.venue}', {venue}) > 0`)
      }
      
      if (filters.ticketType) {
        filterFormulas.push(`SEARCH('${filters.ticketType}', {title}) > 0`)
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

      // Transform records
      const listings = records.map(record => this.transformToAppListing(record as any))

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
      userId: userPrimaryValue,
      limit: filters?.limit || 50,
      offset: filters?.offset || 0
    })
  }

  async update(id: string, data: UpdateListingData): Promise<AppListing> {
    console.log(`📝 Updating listing: ${id}`)

    try {
      // Transform update data to Airtable format
      const airtableData = this.client.transformToAirtableFields('listings', data)

      console.log(`📝 Update data:`, airtableData)

      // Update record in Airtable with rate limiting
      const record = await this.client.executeWithRateLimit(async () => {
        const table = this.client.getTable(AIRTABLE_TABLES.LISTINGS)
        return await table.update(id, airtableData)
      })

      console.log(`✅ Listing updated: ${record.id}`)

      // Transform and update cache
      const listing = this.transformToAppListing(record as any)
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
    
    // Clear cache before updating to ensure fresh data
    this.invalidateListingCache(id)
    
    const updatedListing = await this.update(id, { status })
    
    return updatedListing
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
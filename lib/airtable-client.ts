// Airtable Client with Rate Limiting and Connection Management
// Provides centralized Airtable API access with performance optimizations

import Airtable, { FieldSet, Record } from 'airtable'
import PQueue from 'p-queue'
import NodeCache from 'node-cache'

// Configuration from environment variables (lazy-loaded)
function getAirtableApiKey(): string {
  const apiKey = process.env.AIRTABLE_API_KEY
  if (!apiKey) {
    throw new Error('AIRTABLE_API_KEY environment variable is required')
  }
  return apiKey
}

function getAirtableBaseId(): string {
  const baseId = process.env.AIRTABLE_BASE_ID
  if (!baseId) {
    throw new Error('AIRTABLE_BASE_ID environment variable is required')
  }
  return baseId
}

const AIRTABLE_RATE_LIMIT_PER_SEC = parseInt(process.env.AIRTABLE_RATE_LIMIT_PER_SEC || '5')
const CACHE_TTL_USERS = parseInt(process.env.CACHE_TTL_USERS || '300000') // 5 minutes
const CACHE_TTL_LISTINGS = parseInt(process.env.CACHE_TTL_LISTINGS || '60000') // 1 minute
const CACHE_MAX_SIZE = parseInt(process.env.CACHE_MAX_SIZE || '1000')

// Airtable table names
export const AIRTABLE_TABLES = {
  USERS: 'Users',
  LISTINGS: 'Listings', 
  OFFERS: 'Offers',
  TRANSACTIONS: 'Transactions'
} as const

// Airtable field mappings
// Based on CLAUDE.md documentation:
// - Users, Transactions: Use camelCase field names
// - Listings, Offers: Use Capitalized field names with spaces
export const AIRTABLE_FIELD_MAPPINGS = {
  users: {
    // Users table uses camelCase
    clerkId: 'clerkId',
    email: 'email', 
    username: 'username',
    rating: 'rating',
    isVerified: 'isVerified',
    totalSales: 'totalSales',
    stripeAccountId: 'stripeAccountId'
  },
  listings: {
    // Listings table - based on CLAUDE.md actual field names
    title: 'title',
    eventName: 'eventName', 
    eventDate: 'eventDate',
    priceInCents: 'price', // price field stores cents
    quantity: 'quantity',
    status: 'status',
    seller: 'seller', // Link to Users table
    ticketFiles: 'ticketFiles',
    description: 'description',
    venue: 'venue',
    views: 'views'
  },
  offers: {
    // Offers table - based on CLAUDE.md actual field names
    offerCode: 'offerCode',
    listing: 'listing', // Link to Listings table
    buyer: 'buyer', // Link to Users table  
    offerPriceInCents: 'offerPrice', // offerPrice field stores cents
    quantity: 'quantity',
    status: 'status',
    messageTemplate: 'message',
    customMessage: 'customMessage'
  },
  transactions: {
    // Transactions table - actual fields from Airtable  
    transactionId: 'transactionId', // Formula field
    offer: 'offer', // Link to Offers table
    amount: 'amount',
    status: 'status',
    stripePaymentId: 'stripePaymentId',
    completedAt: 'completedAt'
  }
} as const

export type AirtableTableName = keyof typeof AIRTABLE_FIELD_MAPPINGS

// User record type
export interface UserRecord extends FieldSet {
  'clerkId': string
  'email': string
  'username': string
  'rating'?: number
  'isVerified'?: boolean
  'totalSales'?: number
  'stripeAccountId'?: string
  // Note: createdTime is automatically provided by Airtable API as metadata
}

// Listing record type  
export interface ListingRecord extends FieldSet {
  'title': string
  'eventName': string
  'eventDate': string
  'price': number // Stores price in cents
  'quantity': number
  'status': 'ACTIVE' | 'INACTIVE' | 'SOLD' | 'DELISTED'
  'seller': string[] // Link field - array of record IDs
  'ticketFiles'?: Array<{
    id: string
    url: string
    filename: string
    size: number
    type: string
  }>
  'description'?: string
  'venue'?: string
  'views'?: number
}

// Offer record type
export interface OfferRecord extends FieldSet {
  'offerCode'?: string // Formula field
  'listing': string[] // Link field
  'buyer': string[] // Link field  
  'offerPrice': number // Stores price in cents
  'quantity': number
  'status': 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'COMPLETED'
  'message': 'Buy at asking price' | 'Make offer' | 'Check availability'
  'customMessage'?: string
}

// Transaction record type
export interface TransactionRecord extends FieldSet {
  'transactionId'?: string // Formula field
  'offer': string[] // Link field
  'amount': number
  'status': 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
  'stripePaymentId'?: string
  'completedAt'?: string
}

export class AirtableClient {
  private base: Airtable.Base | null = null
  private queue: PQueue
  private userCache: NodeCache
  private listingCache: NodeCache
  private initialized = false

  constructor() {
    console.log('🏭 Initializing AirtableClient')

    // Initialize rate limiting queue (5 requests per second)
    this.queue = new PQueue({
      interval: 1000, // 1 second
      intervalCap: AIRTABLE_RATE_LIMIT_PER_SEC
    })

    // Initialize caches
    this.userCache = new NodeCache({
      stdTTL: CACHE_TTL_USERS / 1000, // Convert to seconds
      maxKeys: CACHE_MAX_SIZE,
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false // For better performance
    })

    this.listingCache = new NodeCache({
      stdTTL: CACHE_TTL_LISTINGS / 1000,
      maxKeys: CACHE_MAX_SIZE,
      checkperiod: 60,
      useClones: false
    })

    console.log(`✅ AirtableClient configured`)
    console.log(`   Rate limit: ${AIRTABLE_RATE_LIMIT_PER_SEC} req/sec`)
    console.log(`   Cache TTL: Users ${CACHE_TTL_USERS / 1000}s, Listings ${CACHE_TTL_LISTINGS / 1000}s`)
    console.log(`   Cache size limit: ${CACHE_MAX_SIZE} entries`)
  }

  private initialize(): void {
    if (!this.initialized) {
      const apiKey = getAirtableApiKey()
      const baseId = getAirtableBaseId()
      
      console.log('🔌 Connecting to Airtable base:', baseId.substring(0, 8) + '...')
      
      Airtable.configure({
        endpointUrl: 'https://api.airtable.com',
        apiKey: apiKey
      })

      this.base = Airtable.base(baseId)
      this.initialized = true
      
      console.log('✅ Airtable connection established')
    }
  }

  // Generic method to execute Airtable operations with rate limiting
  async executeWithRateLimit<T>(operation: () => Promise<T>): Promise<T> {
    this.initialize()
    
    const result = await this.queue.add(async (): Promise<T> => {
      const start = Date.now()
      try {
        const operationResult = await operation()
        const duration = Date.now() - start
        console.log(`⚡ Airtable operation completed in ${duration}ms`)
        return operationResult
      } catch (error) {
        const duration = Date.now() - start
        console.error(`❌ Airtable operation failed after ${duration}ms:`, error)
        throw error
      }
    })
    
    return result as T
  }

  // Get table reference
  getTable(tableName: string) {
    this.initialize()
    if (!this.base) {
      throw new Error('Airtable base not initialized')
    }
    return this.base(tableName)
  }

  // Cache management methods
  getCacheStats() {
    return {
      users: this.userCache.getStats(),
      listings: this.listingCache.getStats(),
      queueSize: this.queue.size,
      queuePending: this.queue.pending
    }
  }

  // User cache methods
  getUserFromCache(key: string) {
    return this.userCache.get(key)
  }

  setUserInCache(key: string, data: any) {
    this.userCache.set(key, data)
  }

  invalidateUserCache(key: string) {
    this.userCache.del(key)
  }

  // Listing cache methods  
  getListingFromCache(key: string) {
    return this.listingCache.get(key)
  }

  setListingInCache(key: string, data: any) {
    this.listingCache.set(key, data)
  }

  invalidateListingCache(key: string) {
    this.listingCache.del(key)
  }

  // Clear all caches
  clearAllCaches() {
    console.log('🧹 Clearing all Airtable caches')
    this.userCache.flushAll()
    this.listingCache.flushAll()
  }

  // Health check
  async healthCheck(): Promise<{
    connected: boolean
    queueSize: number
    cacheStats: any
    responseTime: number
  }> {
    const start = Date.now()
    
    try {
      this.initialize()
      
      // Try a simple operation to test connection
      await this.executeWithRateLimit(async () => {
        const table = this.getTable(AIRTABLE_TABLES.USERS)
        // Just get first record to test connection
        const records = await table.select({ maxRecords: 1 }).firstPage()
        return records
      })
      
      const responseTime = Date.now() - start
      
      return {
        connected: true,
        queueSize: this.queue.size,
        cacheStats: this.getCacheStats(),
        responseTime
      }
    } catch (error) {
      console.error('Airtable health check failed:', error)
      return {
        connected: false,
        queueSize: this.queue.size,
        cacheStats: this.getCacheStats(),
        responseTime: Date.now() - start
      }
    }
  }

  // Field transformation utilities
  transformToAirtableFields<T extends AirtableTableName>(
    tableName: T, 
    data: { [key: string]: any }
  ): { [key: string]: any } {
    const mapping = AIRTABLE_FIELD_MAPPINGS[tableName]
    const transformed: { [key: string]: any } = {}
    
    for (const [apiField, airtableField] of Object.entries(mapping)) {
      if (data[apiField] !== undefined) {
        let value = data[apiField]
        
        // Special handling for dates
        if (apiField.includes('Date') || apiField.includes('At')) {
          if (value instanceof Date) {
            // For eventDate field, use just the date part (YYYY-MM-DD)
            if (airtableField === 'eventDate') {
              value = value.toISOString().split('T')[0]
            } else {
              value = value.toISOString()
            }
          } else if (typeof value === 'string') {
            // Ensure proper date format
            const dateObj = new Date(value)
            if (airtableField === 'eventDate') {
              value = dateObj.toISOString().split('T')[0]
            } else {
              value = dateObj.toISOString()
            }
          }
        }
        
        // Special handling for linked records (should be arrays)
        if (airtableField === 'seller' || airtableField === 'buyer' || 
            airtableField === 'listing' || airtableField === 'offer') {
          if (typeof value === 'string') {
            value = [value] // Convert to array
          }
        }
        
        // Special handling for message template - API uses snake_case, Airtable uses human readable
        if (apiField === 'messageTemplate' && airtableField === 'message') {
          const messageMapping: { [key: string]: string } = {
            'asking_price': 'Buy at asking price',
            'make_offer': 'Make offer', 
            'check_availability': 'Check availability'
          }
          value = messageMapping[value] || value
        }
        
        transformed[airtableField] = value
      }
    }
    
    return transformed
  }

  transformFromAirtableFields<T extends AirtableTableName>(
    tableName: T,
    record: any
  ): { [key: string]: any } {
    const mapping = AIRTABLE_FIELD_MAPPINGS[tableName]
    const transformed: { [key: string]: any } = {}
    
    for (const [apiField, airtableField] of Object.entries(mapping)) {
      if (record.get && record.get(airtableField) !== undefined) {
        let value = record.get(airtableField)
        
        // Special handling for linked records (convert from arrays)
        if (airtableField === 'seller' || airtableField === 'buyer' || 
            airtableField === 'listing' || airtableField === 'offer') {
          if (Array.isArray(value) && value.length > 0) {
            value = value[0] // Take first linked record
          }
        }
        
        // Special handling for dates
        if (apiField.includes('Date') || apiField.includes('At')) {
          if (typeof value === 'string') {
            value = new Date(value)
          }
        }
        
        // Special handling for message template - Airtable uses human readable, API uses snake_case
        if (airtableField === 'message' && apiField === 'messageTemplate') {
          const reverseMessageMapping: { [key: string]: string } = {
            'Buy at asking price': 'asking_price',
            'Make offer': 'make_offer',
            'Check availability': 'check_availability'
          }
          value = reverseMessageMapping[value] || value
        }
        
        transformed[apiField] = value
      }
    }
    
    // Always include the Airtable record ID
    if (record.id) {
      transformed.id = record.id
    }
    
    return transformed
  }

  // Connection management
  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting from Airtable')
    
    // Wait for queue to finish
    await this.queue.onIdle()
    
    // Clear caches
    this.clearAllCaches()
    
    // Reset connection
    this.base = null
    this.initialized = false
    
    console.log('✅ Airtable disconnected')
  }
}

// Singleton instance
let airtableClientInstance: AirtableClient | null = null

export function getAirtableClient(): AirtableClient {
  if (!airtableClientInstance) {
    airtableClientInstance = new AirtableClient()
  }
  return airtableClientInstance
}

// Export for direct usage
export default getAirtableClient
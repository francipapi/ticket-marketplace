// Airtable User Service Implementation
// Provides user CRUD operations with caching and rate limiting

import { UserService, AppUser, CreateUserData, UpdateUserData } from '../../interfaces/database.interface'
import { getAirtableClient, AIRTABLE_TABLES, UserRecord } from '../../../airtable-client'
import { Record as AirtableRecord } from 'airtable'

export class AirtableUserService implements UserService {
  private client = getAirtableClient()

  constructor() {
    console.log('🏭 Initializing AirtableUserService')
  }

  async create(data: CreateUserData): Promise<AppUser> {
    console.log(`👤 Creating user: ${data.email}`)
    
    try {
      // Transform data to Airtable format
      const airtableData = this.client.transformToAirtableFields('users', {
        ...data,
        rating: data.rating || 5.0,
        isVerified: data.isVerified || false,
        totalSales: data.totalSales || 0
        // Note: createdTime is automatically added by Airtable API
      })

      console.log(`📝 Airtable data:`, airtableData)

      // Create record in Airtable with rate limiting
      const record = await this.client.executeWithRateLimit(async () => {
        const table = this.client.getTable(AIRTABLE_TABLES.USERS)
        return await table.create(airtableData)
      })

      console.log(`✅ User created with ID: ${record.id}`)

      // Transform back to app format
      const user = this.transformToAppUser(record)

      // Cache the user
      this.cacheUser(user)

      return user
    } catch (error) {
      console.error(`❌ Failed to create user:`, error)
      throw new Error(`Failed to create user: ${error}`)
    }
  }

  async findById(id: string): Promise<AppUser | null> {
    console.log(`🔍 Finding user by ID: ${id}`)

    // Check cache first
    const cacheKey = `user:id:${id}`
    const cachedUser = this.client.getUserFromCache(cacheKey)
    if (cachedUser) {
      console.log(`⚡ User found in cache: ${id}`)
      return cachedUser as AppUser
    }

    try {
      // Fetch from Airtable with rate limiting
      const record = await this.client.executeWithRateLimit(async () => {
        const table = this.client.getTable(AIRTABLE_TABLES.USERS)
        return await table.find(id)
      })

      console.log(`✅ User found: ${record.id}`)

      // Transform and cache
      const user = this.transformToAppUser(record)
      this.cacheUser(user)

      return user
    } catch (error: any) {
      if (error.statusCode === 404) {
        console.log(`❌ User not found: ${id}`)
        return null
      }
      console.error(`❌ Error finding user by ID:`, error)
      throw new Error(`Failed to find user: ${error}`)
    }
  }

  async findByClerkId(clerkId: string): Promise<AppUser | null> {
    console.log(`🔍 Finding user by Clerk ID: ${clerkId}`)

    // Check cache first
    const cacheKey = `user:clerk:${clerkId}`
    const cachedUser = this.client.getUserFromCache(cacheKey)
    if (cachedUser) {
      console.log(`⚡ User found in cache by Clerk ID: ${clerkId}`)
      return cachedUser as AppUser
    }

    try {
      // Search by Clerk ID with rate limiting
      const records = await this.client.executeWithRateLimit(async () => {
        const table = this.client.getTable(AIRTABLE_TABLES.USERS)
        return await table.select({
          filterByFormula: `{clerkId} = '${clerkId}'`,
          maxRecords: 1
        }).firstPage()
      })

      if (records.length === 0) {
        console.log(`❌ User not found by Clerk ID: ${clerkId}`)
        return null
      }

      console.log(`✅ User found by Clerk ID: ${records[0].id}`)

      // Transform and cache
      const user = this.transformToAppUser(records[0])
      this.cacheUser(user)

      return user
    } catch (error) {
      console.error(`❌ Error finding user by Clerk ID:`, error)
      throw new Error(`Failed to find user by Clerk ID: ${error}`)
    }
  }

  async findByEmail(email: string): Promise<AppUser | null> {
    console.log(`🔍 Finding user by email: ${email}`)

    // Check cache first
    const cacheKey = `user:email:${email}`
    const cachedUser = this.client.getUserFromCache(cacheKey)
    if (cachedUser) {
      console.log(`⚡ User found in cache by email: ${email}`)
      return cachedUser as AppUser
    }

    try {
      // Search by email with rate limiting
      const records = await this.client.executeWithRateLimit(async () => {
        const table = this.client.getTable(AIRTABLE_TABLES.USERS)
        return await table.select({
          filterByFormula: `{email} = '${email}'`,
          maxRecords: 1
        }).firstPage()
      })

      if (records.length === 0) {
        console.log(`❌ User not found by email: ${email}`)
        return null
      }

      console.log(`✅ User found by email: ${records[0].id}`)

      // Transform and cache
      const user = this.transformToAppUser(records[0])
      this.cacheUser(user)

      return user
    } catch (error) {
      console.error(`❌ Error finding user by email:`, error)
      throw new Error(`Failed to find user by email: ${error}`)
    }
  }

  async update(id: string, data: UpdateUserData): Promise<AppUser> {
    console.log(`📝 Updating user: ${id}`)

    try {
      // Transform update data to Airtable format
      const airtableData = this.client.transformToAirtableFields('users', {
        ...data,
        updatedAt: new Date()
      })

      console.log(`📝 Update data:`, airtableData)

      // Update record in Airtable with rate limiting
      const record = await this.client.executeWithRateLimit(async () => {
        const table = this.client.getTable(AIRTABLE_TABLES.USERS)
        return await table.update(id, airtableData)
      })

      console.log(`✅ User updated: ${record.id}`)

      // Transform and update cache
      const user = this.transformToAppUser(record)
      this.cacheUser(user)

      return user
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new Error(`User not found: ${id}`)
      }
      console.error(`❌ Error updating user:`, error)
      throw new Error(`Failed to update user: ${error}`)
    }
  }

  async delete(id: string): Promise<boolean> {
    console.log(`🗑️ Deleting user: ${id}`)

    try {
      // Delete from Airtable with rate limiting
      await this.client.executeWithRateLimit(async () => {
        const table = this.client.getTable(AIRTABLE_TABLES.USERS)
        return await table.destroy(id)
      })

      console.log(`✅ User deleted: ${id}`)

      // Remove from cache
      this.invalidateUserCache(id)

      return true
    } catch (error: any) {
      if (error.statusCode === 404) {
        console.log(`❌ User not found for deletion: ${id}`)
        return false
      }
      console.error(`❌ Error deleting user:`, error)
      throw new Error(`Failed to delete user: ${error}`)
    }
  }

  async incrementTotalSales(id: string, amount: number): Promise<AppUser> {
    console.log(`💰 Incrementing total sales for user ${id} by $${(amount / 100).toFixed(2)}`)

    try {
      // First get the current user to get current total
      const currentUser = await this.findById(id)
      if (!currentUser) {
        throw new Error(`User not found: ${id}`)
      }

      const newTotalSales = (currentUser.totalSales || 0) + amount

      // Update with new total
      return await this.update(id, {
        totalSales: newTotalSales
      })
    } catch (error) {
      console.error(`❌ Error incrementing total sales:`, error)
      throw new Error(`Failed to increment total sales: ${error}`)
    }
  }

  // Helper methods
  private transformToAppUser(record: AirtableRecord<UserRecord>): AppUser {
    const transformed = this.client.transformFromAirtableFields('users', record)
    
    return {
      id: record.id,
      clerkId: transformed.clerkId,
      email: transformed.email,
      username: transformed.username,
      rating: transformed.rating || 5.0,
      isVerified: transformed.isVerified || false,
      totalSales: transformed.totalSales || 0,
      stripeAccountId: transformed.stripeAccountId,
      createdAt: new Date((record as any).createdTime || new Date().toISOString()),
      updatedAt: new Date() // Airtable doesn't provide automatic updatedAt, so use current time
    }
  }

  private cacheUser(user: AppUser): void {
    console.log(`💾 Caching user: ${user.id}`)
    
    // Cache by multiple keys for different lookup methods
    this.client.setUserInCache(`user:id:${user.id}`, user)
    this.client.setUserInCache(`user:clerk:${user.clerkId}`, user)
    this.client.setUserInCache(`user:email:${user.email}`, user)
  }

  private invalidateUserCache(userId: string): void {
    console.log(`🧹 Invalidating cache for user: ${userId}`)
    
    // We need to get the user first to invalidate all cache keys
    const cacheKey = `user:id:${userId}`
    const cachedUser = this.client.getUserFromCache(cacheKey) as AppUser
    
    if (cachedUser) {
      this.client.invalidateUserCache(`user:id:${userId}`)
      this.client.invalidateUserCache(`user:clerk:${cachedUser.clerkId}`)
      this.client.invalidateUserCache(`user:email:${cachedUser.email}`)
    } else {
      // Fallback: just invalidate by ID
      this.client.invalidateUserCache(cacheKey)
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
    console.log('🧹 Clearing user cache')
    this.client.clearAllCaches()
  }
}
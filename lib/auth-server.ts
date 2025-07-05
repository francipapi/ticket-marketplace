// Enhanced Clerk Server-Side Authentication
// Provides server-side authentication with auto-user creation in Airtable

import { auth, clerkClient } from '@clerk/nextjs/server'
import { getDatabaseService } from './services/factory'
import { AppUser } from './services/interfaces/database.interface'

export interface AuthResult {
  success: boolean
  user?: AppUser
  error?: string
  clerkUserId?: string
}

export class AuthService {
  private static dbService = getDatabaseService()

  /**
   * Require authentication and return user data
   * Creates user in database if they don't exist
   */
  static async requireAuth(): Promise<AppUser> {
    console.log('🔐 Requiring authentication')
    
    const { userId } = await auth()
    if (!userId) {
      console.log('❌ No user ID found in request')
      throw new Error('Authentication required')
    }

    console.log(`🔍 User authenticated with Clerk ID: ${userId}`)

    try {
      // Try to find existing user in database
      let user = await this.dbService.users.findByClerkId(userId)
      
      if (user) {
        console.log(`✅ Existing user found: ${user.id} (${user.email})`)
        return user
      }

      // User doesn't exist, create from Clerk data
      console.log(`👤 Creating new user from Clerk data: ${userId}`)
      user = await this.createUserFromClerk(userId)
      
      console.log(`✅ New user created: ${user.id} (${user.email})`)
      return user
      
    } catch (error) {
      console.error('❌ Error in requireAuth:', error)
      throw new Error(`Authentication failed: ${error}`)
    }
  }

  /**
   * Get current user without throwing if not authenticated
   * Returns null if not authenticated
   */
  static async getCurrentUser(): Promise<AppUser | null> {
    console.log('🔍 Getting current user')
    
    try {
      const { userId } = await auth()
      if (!userId) {
        console.log('❌ No authentication found')
        return null
      }

      console.log(`🔍 User authenticated with Clerk ID: ${userId}`)

      // Try to find existing user
      let user = await this.dbService.users.findByClerkId(userId)
      
      if (user) {
        console.log(`✅ Current user found: ${user.id} (${user.email})`)
        return user
      }

      // Auto-create user if they don't exist
      console.log(`👤 Auto-creating user from Clerk data: ${userId}`)
      user = await this.createUserFromClerk(userId)
      
      console.log(`✅ User auto-created: ${user.id} (${user.email})`)
      return user
      
    } catch (error) {
      console.error('❌ Error getting current user:', error)
      return null
    }
  }

  /**
   * Get authentication result with detailed information
   */
  static async getAuthResult(): Promise<AuthResult> {
    try {
      const user = await this.requireAuth()
      return {
        success: true,
        user,
        clerkUserId: user.clerkId
      }
    } catch (error: any) {
      console.error('❌ Authentication failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Check if current request is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const { userId } = await auth()
      return !!userId
    } catch (error) {
      console.error('❌ Error checking authentication:', error)
      return false
    }
  }

  /**
   * Get Clerk user ID without database lookup
   */
  static async getClerkUserId(): Promise<string | null> {
    try {
      const { userId } = await auth()
      return userId
    } catch (error) {
      console.error('❌ Error getting Clerk user ID:', error)
      return null
    }
  }

  /**
   * Sync user data from Clerk to database
   * Useful for updating user information
   */
  static async syncUserWithClerk(clerkUserId: string): Promise<AppUser> {
    console.log(`🔄 Syncing user with Clerk: ${clerkUserId}`)
    
    try {
      // Get latest data from Clerk
      const clerkUser = await clerkClient.users.getUser(clerkUserId)
      
      // Find existing user in database
      const existingUser = await this.dbService.users.findByClerkId(clerkUserId)
      
      if (existingUser) {
        // Update existing user with latest Clerk data
        const updatedUser = await this.dbService.users.update(existingUser.id, {
          email: clerkUser.emailAddresses[0]?.emailAddress || existingUser.email,
          username: clerkUser.username || clerkUser.firstName || existingUser.username
        })
        
        console.log(`✅ User synced: ${updatedUser.id}`)
        return updatedUser
      } else {
        // Create new user
        return await this.createUserFromClerk(clerkUserId)
      }
      
    } catch (error) {
      console.error('❌ Error syncing user with Clerk:', error)
      throw new Error(`Failed to sync user: ${error}`)
    }
  }

  /**
   * Create user in database from Clerk data
   */
  private static async createUserFromClerk(clerkUserId: string): Promise<AppUser> {
    console.log(`👤 Creating user from Clerk data: ${clerkUserId}`)
    
    try {
      // Get user data from Clerk
      const clerkUser = await clerkClient.users.getUser(clerkUserId)
      
      // Extract email address
      const primaryEmail = clerkUser.emailAddresses.find(email => email.id === clerkUser.primaryEmailAddressId)
      const email = primaryEmail?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress
      
      if (!email) {
        throw new Error('No email address found for user')
      }

      // Generate username from available data
      let username = clerkUser.username
      if (!username) {
        username = clerkUser.firstName || email.split('@')[0] || 'user'
      }

      // Create user in database
      const userData = {
        clerkId: clerkUserId,
        email: email,
        username: username,
        rating: 5.0, // Default rating
        isVerified: !!clerkUser.emailAddresses.find(email => email.verification?.status === 'verified'),
        totalSales: 0
      }

      console.log(`📝 Creating user with data:`, {
        clerkId: userData.clerkId,
        email: userData.email,
        username: userData.username,
        isVerified: userData.isVerified
      })

      const user = await this.dbService.users.create(userData)
      
      console.log(`✅ User created successfully: ${user.id}`)
      return user
      
    } catch (error) {
      console.error('❌ Error creating user from Clerk:', error)
      throw new Error(`Failed to create user: ${error}`)
    }
  }

  /**
   * Delete user from database (but not from Clerk)
   */
  static async deleteUser(userId: string): Promise<boolean> {
    console.log(`🗑️ Deleting user: ${userId}`)
    
    try {
      const deleted = await this.dbService.users.delete(userId)
      if (deleted) {
        console.log(`✅ User deleted: ${userId}`)
      } else {
        console.log(`❌ User not found for deletion: ${userId}`)
      }
      return deleted
    } catch (error) {
      console.error('❌ Error deleting user:', error)
      throw new Error(`Failed to delete user: ${error}`)
    }
  }

  /**
   * Update user profile information
   */
  static async updateUserProfile(userId: string, updates: {
    username?: string
    rating?: number
    isVerified?: boolean
  }): Promise<AppUser> {
    console.log(`📝 Updating user profile: ${userId}`)
    
    try {
      const updatedUser = await this.dbService.users.update(userId, updates)
      console.log(`✅ User profile updated: ${userId}`)
      return updatedUser
    } catch (error) {
      console.error('❌ Error updating user profile:', error)
      throw new Error(`Failed to update user profile: ${error}`)
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(userId: string): Promise<{
    user: AppUser
    listingsCount?: number
    offersCount?: number
    transactionsCount?: number
  }> {
    console.log(`📊 Getting user statistics: ${userId}`)
    
    try {
      const user = await this.dbService.users.findById(userId)
      if (!user) {
        throw new Error('User not found')
      }

      // TODO: Add listing/offer/transaction counts when those services are implemented
      const stats = {
        user,
        listingsCount: 0, // Will be implemented in Task 5
        offersCount: 0,   // Will be implemented in Task 5
        transactionsCount: 0 // Will be implemented in Task 5
      }

      console.log(`✅ User statistics retrieved: ${userId}`)
      return stats
      
    } catch (error) {
      console.error('❌ Error getting user statistics:', error)
      throw new Error(`Failed to get user statistics: ${error}`)
    }
  }

  /**
   * Middleware helper for protecting routes
   */
  static async protectRoute(): Promise<{ user: AppUser; clerkUserId: string }> {
    try {
      const user = await this.requireAuth()
      return { user, clerkUserId: user.clerkId }
    } catch (error) {
      throw new Error('Route protection failed: ' + error)
    }
  }
}

// Export convenience functions
export const requireAuth = AuthService.requireAuth
export const getCurrentUser = AuthService.getCurrentUser
export const getAuthResult = AuthService.getAuthResult
export const isAuthenticated = AuthService.isAuthenticated
export const syncUserWithClerk = AuthService.syncUserWithClerk

// Legacy support - keep the existing AppUser type export
export type { AppUser }
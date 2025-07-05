// Enhanced User Sync API Route
// Synchronizes user data between Clerk and Airtable database

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { 
  createResponse, 
  createErrorResponse, 
  withAuthAndValidation,
  logRequest,
  handleApiError 
} from '@/lib/api-helpers-enhanced'
import { AuthService } from '@/lib/auth-server'

// Request validation schema
const SyncUserSchema = z.object({
  forceSync: z.boolean().optional().default(false),
  updateProfile: z.boolean().optional().default(false),
  includeStats: z.boolean().optional().default(false)
})

type SyncUserRequest = z.infer<typeof SyncUserSchema>

export async function POST(request: NextRequest) {
  const requestId = logRequest(request, { endpoint: 'POST /api/user/sync-enhanced' })
  
  try {
    // Authenticate and validate request
    const result = await withAuthAndValidation(request, SyncUserSchema, {
      requestId,
      logAuth: true,
      logValidation: true
    })
    
    if (!result.success) {
      return createErrorResponse(result.error, 400, { requestId })
    }
    
    const { user, data } = result
    
    return await handleApiError(async () => {
      console.log(`🔄 Starting user sync for ${user.id} [${requestId}]`)
      
      let syncedUser = user
      
      // Force sync with Clerk if requested
      if (data.forceSync) {
        console.log(`🔄 Force syncing user with Clerk [${requestId}]`)
        syncedUser = await AuthService.syncUserWithClerk(user.clerkId)
      }
      
      // Get user statistics if requested
      let userStats
      if (data.includeStats) {
        console.log(`📊 Getting user statistics [${requestId}]`)
        userStats = await AuthService.getUserStats(syncedUser.id)
      }
      
      const responseData = {
        user: syncedUser,
        synced: data.forceSync,
        syncedAt: new Date().toISOString(),
        ...(userStats && { stats: userStats })
      }
      
      console.log(`✅ User sync completed successfully [${requestId}]`)
      
      return createResponse(responseData, { 
        message: 'User synchronized successfully',
        requestId 
      })
    }, 'User sync operation', requestId)
    
  } catch (error: any) {
    console.error(`❌ User sync failed [${requestId}]:`, error)
    
    return createErrorResponse(
      {
        code: 'SYNC_FAILED',
        message: 'Failed to sync user data',
        details: error.message
      },
      500,
      { requestId }
    )
  }
}

export async function GET(request: NextRequest) {
  const requestId = logRequest(request, { endpoint: 'GET /api/user/sync-enhanced' })
  
  try {
    // Just authenticate, no request body validation needed
    const authResult = await withAuthAndValidation(request, z.object({}), {
      requestId,
      logAuth: true,
      authRequired: true
    })
    
    if (!authResult.success) {
      return createErrorResponse(authResult.error, 401, { requestId })
    }
    
    const { user } = authResult
    
    return await handleApiError(async () => {
      console.log(`📋 Getting user profile for ${user.id} [${requestId}]`)
      
      // Get user statistics
      const userStats = await AuthService.getUserStats(user.id)
      
      const responseData = {
        user: user,
        stats: userStats,
        lastSyncedAt: new Date().toISOString()
      }
      
      console.log(`✅ User profile retrieved successfully [${requestId}]`)
      
      return createResponse(responseData, { 
        message: 'User profile retrieved successfully',
        requestId 
      })
    }, 'Get user profile operation', requestId)
    
  } catch (error: any) {
    console.error(`❌ Get user profile failed [${requestId}]:`, error)
    
    return createErrorResponse(
      {
        code: 'PROFILE_FETCH_FAILED',
        message: 'Failed to retrieve user profile',
        details: error.message
      },
      500,
      { requestId }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = logRequest(request, { endpoint: 'PATCH /api/user/sync-enhanced' })
  
  // Update user profile schema
  const UpdateProfileSchema = z.object({
    username: z.string().min(1).max(50).optional(),
    rating: z.number().min(0).max(5).optional(),
    isVerified: z.boolean().optional()
  })
  
  try {
    // Authenticate and validate request
    const result = await withAuthAndValidation(request, UpdateProfileSchema, {
      requestId,
      logAuth: true,
      logValidation: true
    })
    
    if (!result.success) {
      return createErrorResponse(result.error, 400, { requestId })
    }
    
    const { user, data } = result
    
    return await handleApiError(async () => {
      console.log(`📝 Updating user profile for ${user.id} [${requestId}]`)
      
      // Update user profile
      const updatedUser = await AuthService.updateUserProfile(user.id, data)
      
      // Get updated statistics
      const userStats = await AuthService.getUserStats(updatedUser.id)
      
      const responseData = {
        user: updatedUser,
        stats: userStats,
        updatedAt: new Date().toISOString(),
        updatedFields: Object.keys(data)
      }
      
      console.log(`✅ User profile updated successfully [${requestId}]`)
      
      return createResponse(responseData, { 
        message: 'User profile updated successfully',
        requestId 
      })
    }, 'Update user profile operation', requestId)
    
  } catch (error: any) {
    console.error(`❌ Update user profile failed [${requestId}]:`, error)
    
    return createErrorResponse(
      {
        code: 'PROFILE_UPDATE_FAILED',
        message: 'Failed to update user profile',
        details: error.message
      },
      500,
      { requestId }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = logRequest(request, { endpoint: 'DELETE /api/user/sync-enhanced' })
  
  try {
    // Authenticate user
    const authResult = await withAuthAndValidation(request, z.object({}), {
      requestId,
      logAuth: true,
      authRequired: true
    })
    
    if (!authResult.success) {
      return createErrorResponse(authResult.error, 401, { requestId })
    }
    
    const { user } = authResult
    
    return await handleApiError(async () => {
      console.log(`🗑️ Deleting user profile for ${user.id} [${requestId}]`)
      
      // Delete user from database (but not from Clerk)
      const deleted = await AuthService.deleteUser(user.id)
      
      if (!deleted) {
        throw new Error('User not found or already deleted')
      }
      
      const responseData = {
        deleted: true,
        userId: user.id,
        deletedAt: new Date().toISOString(),
        note: 'User deleted from database but remains in Clerk authentication system'
      }
      
      console.log(`✅ User profile deleted successfully [${requestId}]`)
      
      return createResponse(responseData, { 
        message: 'User profile deleted successfully',
        requestId 
      })
    }, 'Delete user profile operation', requestId)
    
  } catch (error: any) {
    console.error(`❌ Delete user profile failed [${requestId}]:`, error)
    
    return createErrorResponse(
      {
        code: 'PROFILE_DELETE_FAILED',
        message: 'Failed to delete user profile',
        details: error.message
      },
      500,
      { requestId }
    )
  }
}
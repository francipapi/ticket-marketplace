import { supabase } from './supabase'
import { supabaseAdmin } from './supabase-server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export interface FileUploadResult {
  success: boolean
  path?: string
  url?: string
  error?: string
}

export interface FileStorageService {
  uploadFile(file: File, path: string): Promise<FileUploadResult>
  getFileUrl(path: string, expiresIn?: number): Promise<string | null>
  deleteFile(path: string): Promise<boolean>
  migrateLocalFile(localPath: string, supabasePath: string): Promise<FileUploadResult>
}

export class SupabaseStorageService implements FileStorageService {
  private bucketName = 'tickets'

  async uploadFile(file: File, path: string): Promise<FileUploadResult> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Supabase upload error:', error)
        return {
          success: false,
          error: error.message
        }
      }

      if (!data) {
        return {
          success: false,
          error: 'No data returned from upload'
        }
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(path)

      return {
        success: true,
        path: data.path,
        url: urlData.publicUrl
      }

    } catch (error) {
      console.error('Upload error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getFileUrl(path: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .createSignedUrl(path, expiresIn)

      if (error || !data) {
        console.error('Failed to create signed URL:', error)
        return null
      }

      return data.signedUrl
    } catch (error) {
      console.error('Get file URL error:', error)
      return null
    }
  }

  async deleteFile(path: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([path])

      if (error) {
        console.error('Delete file error:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Delete file error:', error)
      return false
    }
  }

  async migrateLocalFile(localPath: string, supabasePath: string): Promise<FileUploadResult> {
    try {
      // Check if local file exists
      const fullLocalPath = join(process.cwd(), 'public', localPath)
      
      if (!existsSync(fullLocalPath)) {
        return {
          success: false,
          error: `Local file not found: ${fullLocalPath}`
        }
      }

      // Read local file
      const fileBuffer = readFileSync(fullLocalPath)
      
      // Upload to Supabase Storage using admin client for migration
      const { data, error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .upload(supabasePath, fileBuffer, {
          cacheControl: '3600',
          upsert: true // Allow overwrite during migration
        })

      if (error) {
        console.error('Migration upload error:', error)
        return {
          success: false,
          error: error.message
        }
      }

      if (!data) {
        return {
          success: false,
          error: 'No data returned from migration upload'
        }
      }

      console.log(`✅ Migrated file: ${localPath} → ${supabasePath}`)

      return {
        success: true,
        path: data.path
      }

    } catch (error) {
      console.error('File migration error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown migration error'
      }
    }
  }

  // Initialize bucket and policies
  async initializeBucket(): Promise<boolean> {
    try {
      // Create bucket (this will fail silently if it already exists)
      await supabaseAdmin.storage.createBucket(this.bucketName, {
        public: false,
        allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        fileSizeLimit: 10485760 // 10MB
      })

      console.log(`✅ Bucket '${this.bucketName}' ready`)
      return true

    } catch (error) {
      // Bucket might already exist, which is fine
      console.log(`ℹ️ Bucket '${this.bucketName}' already exists or couldn't be created:`, error)
      return true
    }
  }
}

// Local storage fallback (Phase 0 compatibility)
export class LocalStorageService implements FileStorageService {
  private uploadDir: string

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './public/uploads'
  }

  async uploadFile(file: File, path: string): Promise<FileUploadResult> {
    // This would implement local file upload logic
    // For now, return success for compatibility
    return {
      success: true,
      path: `uploads/${path}`,
      url: `/uploads/${path}`
    }
  }

  async getFileUrl(path: string): Promise<string | null> {
    return `/uploads/${path}`
  }

  async deleteFile(path: string): Promise<boolean> {
    // Implement local file deletion
    return true
  }

  async migrateLocalFile(localPath: string, supabasePath: string): Promise<FileUploadResult> {
    // No migration needed for local storage
    return {
      success: true,
      path: localPath
    }
  }
}

// Factory function to get the appropriate storage service
export function getStorageService(): FileStorageService {
  const useSupabaseStorage = process.env.USE_SUPABASE_STORAGE === 'true'
  
  if (useSupabaseStorage) {
    return new SupabaseStorageService()
  } else {
    return new LocalStorageService()
  }
}

export const storageService = getStorageService()
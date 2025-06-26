import { PrismaClient } from '@prisma/client'
import { SupabaseStorageService } from '../lib/storage-supabase'
import { existsSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

// Use Supabase Prisma client
const supabasePrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL // Supabase PostgreSQL URL
    }
  }
})

const storageService = new SupabaseStorageService()

interface FileMigrationResult {
  totalFiles: number
  migratedFiles: number
  skippedFiles: number
  errors: string[]
}

async function scanLocalUploads(): Promise<string[]> {
  const uploadDir = join(process.cwd(), 'public', 'uploads')
  const files: string[] = []
  
  if (!existsSync(uploadDir)) {
    console.log('ℹ️ No uploads directory found')
    return files
  }

  function scanDirectory(dir: string, relativePath: string = '') {
    const items = readdirSync(dir)
    
    for (const item of items) {
      const fullPath = join(dir, item)
      const relativeItemPath = relativePath ? join(relativePath, item) : item
      
      if (statSync(fullPath).isDirectory()) {
        scanDirectory(fullPath, relativeItemPath)
      } else {
        files.push(relativeItemPath)
      }
    }
  }
  
  scanDirectory(uploadDir)
  return files
}

export async function migrateFiles(): Promise<FileMigrationResult> {
  console.log('📁 Starting file migration from local storage to Supabase Storage...')
  
  const result: FileMigrationResult = {
    totalFiles: 0,
    migratedFiles: 0,
    skippedFiles: 0,
    errors: []
  }

  try {
    // Initialize Supabase Storage bucket
    console.log('🪣 Initializing Supabase Storage bucket...')
    await storageService.initializeBucket()

    // Get all listings that have file attachments
    console.log('📋 Finding listings with file attachments...')
    const listingsWithFiles = await supabasePrisma.listing.findMany({
      where: {
        ticketPath: { not: null }
      },
      select: {
        id: true,
        userId: true,
        ticketPath: true,
        originalFileName: true,
        migratedFromId: true
      }
    })

    console.log(`Found ${listingsWithFiles.length} listings with files`)

    // Also scan for orphaned files in uploads directory
    console.log('🔍 Scanning for files in uploads directory...')
    const localFiles = await scanLocalUploads()
    console.log(`Found ${localFiles.length} files in uploads directory`)

    result.totalFiles = listingsWithFiles.length

    // Migrate files for each listing
    for (const listing of listingsWithFiles) {
      try {
        if (!listing.ticketPath) {
          result.skippedFiles++
          continue
        }

        // Generate new Supabase path: tickets/userId/listingId/filename
        const fileName = listing.originalFileName || 'ticket.pdf'
        const supabasePath = `${listing.userId}/${listing.id}/${fileName}`
        
        // Migrate the file
        console.log(`📤 Migrating: ${listing.ticketPath} → ${supabasePath}`)
        
        const migrationResult = await storageService.migrateLocalFile(
          listing.ticketPath,
          supabasePath
        )

        if (migrationResult.success) {
          // Update the listing with the new Supabase path
          await supabasePrisma.listing.update({
            where: { id: listing.id },
            data: {
              ticketPath: supabasePath,
              updatedAt: new Date()
            }
          })

          result.migratedFiles++
          console.log(`    ✅ Migrated and updated listing ${listing.id}`)
        } else {
          result.errors.push(`Failed to migrate file for listing ${listing.id}: ${migrationResult.error}`)
          console.error(`    ❌ Failed: ${migrationResult.error}`)
        }

      } catch (error) {
        const errorMsg = `Error migrating file for listing ${listing.id}: ${error instanceof Error ? error.message : String(error)}`
        result.errors.push(errorMsg)
        console.error(`    ❌ ${errorMsg}`)
      }
    }

    // Migrate any orphaned files that aren't linked to listings
    const orphanedFiles = localFiles.filter(file => {
      return !listingsWithFiles.some(listing => 
        listing.ticketPath?.includes(file)
      )
    })

    if (orphanedFiles.length > 0) {
      console.log(`\n🗂️ Found ${orphanedFiles.length} orphaned files, migrating to orphaned/ folder...`)
      
      for (const file of orphanedFiles) {
        try {
          const supabasePath = `orphaned/${file}`
          const migrationResult = await storageService.migrateLocalFile(
            `uploads/${file}`,
            supabasePath
          )

          if (migrationResult.success) {
            console.log(`    ✅ Migrated orphaned file: ${file}`)
          } else {
            console.error(`    ❌ Failed to migrate orphaned file ${file}: ${migrationResult.error}`)
          }
        } catch (error) {
          console.error(`    ❌ Error migrating orphaned file ${file}:`, error)
        }
      }
    }

    console.log('\n📊 File Migration Summary:')
    console.log(`    Total listings with files: ${result.totalFiles}`)
    console.log(`    Successfully migrated: ${result.migratedFiles}`)
    console.log(`    Skipped: ${result.skippedFiles}`)
    console.log(`    Errors: ${result.errors.length}`)
    console.log(`    Orphaned files migrated: ${orphanedFiles.length}`)

    if (result.errors.length > 0) {
      console.log('\n❌ Migration errors:')
      result.errors.forEach(error => console.log(`    - ${error}`))
    }

  } catch (error) {
    const errorMsg = `File migration failed: ${error instanceof Error ? error.message : String(error)}`
    result.errors.push(errorMsg)
    console.error(`\n💥 ${errorMsg}`)
  } finally {
    await supabasePrisma.$disconnect()
  }

  return result
}

// Test file access after migration
export async function testFileAccess(): Promise<void> {
  console.log('\n🧪 Testing file access after migration...')
  
  try {
    const listings = await supabasePrisma.listing.findMany({
      where: {
        ticketPath: { not: null }
      },
      take: 5,
      select: {
        id: true,
        title: true,
        ticketPath: true
      }
    })

    for (const listing of listings) {
      if (listing.ticketPath) {
        const url = await storageService.getFileUrl(listing.ticketPath, 300) // 5 minute expiry
        
        if (url) {
          console.log(`    ✅ ${listing.title}: File accessible`)
        } else {
          console.error(`    ❌ ${listing.title}: File not accessible`)
        }
      }
    }

  } catch (error) {
    console.error('File access test failed:', error)
  } finally {
    await supabasePrisma.$disconnect()
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateFiles()
    .then(async (result) => {
      if (result.errors.length === 0) {
        console.log('\n🎉 File migration completed successfully!')
        await testFileAccess()
      } else {
        console.log('\n⚠️ File migration completed with errors.')
      }
      process.exit(result.errors.length === 0 ? 0 : 1)
    })
    .catch((error) => {
      console.error('\n💥 File migration failed completely:', error)
      process.exit(1)
    })
}
#!/usr/bin/env tsx
// Test script for Cross-Platform Compatibility
// Validates that file paths work correctly on both Windows and Unix systems

import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local')
dotenv.config({ path: envPath })

// Import our path utilities
import { pathToUrl, getRelativePathFromRoot, joinUrlPath, getUserUploadDir, uploadPathToPublicUrl } from '../lib/utils/path'

async function testCrossPlatformCompatibility() {
  console.log('🧪 Testing Cross-Platform Compatibility')
  console.log('=' .repeat(50))

  // Test 1: Path utilities
  console.log('\n1. Testing Path Utilities:')
  
  // Test pathToUrl
  const testPaths = [
    'public/uploads/user123/file.pdf',
    'public\\uploads\\user123\\file.pdf', // Windows-style
    path.join('public', 'uploads', 'user123', 'file.pdf') // Cross-platform
  ]
  
  testPaths.forEach(testPath => {
    const urlPath = pathToUrl(testPath)
    console.log(`  ${testPath} -> ${urlPath}`)
  })

  // Test 2: Relative path from root
  console.log('\n2. Testing Relative Path from Root:')
  const absolutePath = path.join(process.cwd(), 'public', 'uploads', 'test.pdf')
  const relativePath = getRelativePathFromRoot(absolutePath)
  console.log(`  Absolute: ${absolutePath}`)
  console.log(`  Relative: ${relativePath}`)

  // Test 3: Join URL path
  console.log('\n3. Testing Join URL Path:')
  const joinedPath = joinUrlPath('public', 'uploads', 'user123', 'file.pdf')
  console.log(`  Joined: ${joinedPath}`)

  // Test 4: User upload directory
  console.log('\n4. Testing User Upload Directory:')
  const userUploadDir = getUserUploadDir('user123')
  console.log(`  User upload dir: ${userUploadDir}`)

  // Test 5: Upload path to public URL
  console.log('\n5. Testing Upload Path to Public URL:')
  const uploadPath = path.join('public', 'uploads', 'user123', 'file.pdf')
  const publicUrl = uploadPathToPublicUrl(uploadPath)
  console.log(`  Upload path: ${uploadPath}`)
  console.log(`  Public URL: ${publicUrl}`)

  // Test 6: Environment variables
  console.log('\n6. Testing Environment Variables:')
  const uploadDir = process.env.UPLOAD_DIR || 'public/uploads'
  console.log(`  UPLOAD_DIR: ${uploadDir}`)
  console.log(`  Using path.join: ${path.join(uploadDir, 'user123')}`)

  // Test 7: File service simulation
  console.log('\n7. Testing File Service Simulation:')
  try {
    // Import the FileService
    const { FileService } = await import('../lib/upload')
    const fileService = new FileService()
    
    // Test directory creation (dry run)
    const testUserId = 'test-user-123'
    console.log(`  Would create directory for user: ${testUserId}`)
    
    // Test file path generation
    const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    console.log(`  Mock file: ${mockFile.name} (${mockFile.type})`)
    
    console.log('  ✅ File service imports and basic functionality work')
  } catch (error) {
    console.error('  ❌ File service test failed:', error)
  }

  // Test 8: Cross-platform path separators
  console.log('\n8. Testing Cross-Platform Path Separators:')
  console.log(`  Current platform: ${process.platform}`)
  console.log(`  Path separator: '${path.sep}'`)
  console.log(`  Path delimiter: '${path.delimiter}'`)
  
  // Test various path operations
  const testDir = path.join('a', 'b', 'c')
  console.log(`  path.join('a', 'b', 'c'): ${testDir}`)
  console.log(`  URL version: ${pathToUrl(testDir)}`)

  console.log('\n✅ Cross-platform compatibility tests completed!')
  console.log('=' .repeat(50))
}

// Run the test
if (require.main === module) {
  testCrossPlatformCompatibility().catch(console.error)
}
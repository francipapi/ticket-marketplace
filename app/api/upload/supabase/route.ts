import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-helpers'
import { storageService } from '@/lib/storage-supabase'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await requireAuth()

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, JPEG, and PNG files are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    // Generate unique file path: userId/listingId/filename
    const listingId = uuidv4()
    const fileName = `${Date.now()}-${file.name}`
    const filePath = `${user.id}/${listingId}/${fileName}`

    // Upload to Supabase Storage
    const uploadResult = await storageService.uploadFile(file, filePath)

    if (!uploadResult.success) {
      console.error('File upload error:', uploadResult.error)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      file: {
        path: uploadResult.path,
        originalName: file.name,
        size: file.size,
        type: file.type,
        listingId // For creating the listing
      }
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
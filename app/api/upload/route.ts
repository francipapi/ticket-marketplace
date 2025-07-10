import { NextRequest, NextResponse } from 'next/server';
import { fileService } from '@/lib/upload';
import { requireAuth } from '@/lib/auth-server';
import { withErrorHandling } from '@/lib/api-helpers-enhanced';

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    console.log('📤 Upload API called')
    const user = await requireAuth();
    console.log('✅ User authenticated:', user.id)

    const formData = await request.formData();
    console.log('📋 FormData keys:', Array.from(formData.keys()))
    
    // Handle both single file and multiple files
    const files = formData.getAll('files') as File[];
    const singleFile = formData.get('file') as File;
    
    // Use files array if available, otherwise single file
    const filesToProcess = files.length > 0 ? files : (singleFile ? [singleFile] : []);
    console.log('📁 Files to process:', filesToProcess.length)
    console.log('📁 File details:', filesToProcess.map(f => ({ name: f.name, type: f.type, size: f.size })))

    if (filesToProcess.length === 0) {
      console.log('❌ No files found in FormData')
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Validate file types and sizes
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    for (const file of filesToProcess) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.type}. Only PDF, JPEG, PNG, GIF, and WebP files are allowed.` },
          { status: 400 }
        );
      }

      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `File size too large: ${file.name}. Maximum size is 10MB.` },
          { status: 400 }
        );
      }
    }

    // Save files
    const uploadedFiles = [];
    for (const file of filesToProcess) {
      try {
        const uploadedFile = await fileService.saveFile(file, user.id, {
          addWatermark: file.type.startsWith('image/'),
        });
        uploadedFiles.push(uploadedFile);
      } catch (error) {
        console.error('Error uploading file:', file.name, error);
        return NextResponse.json(
          { error: `Failed to upload file: ${file.name}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      uploadedFiles,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
    });
  });
}
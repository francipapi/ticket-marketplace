import { NextRequest, NextResponse } from 'next/server';
import { fileService } from '@/lib/upload';
import { requireAuth } from '@/lib/auth-server';
import { withErrorHandling } from '@/lib/api-helpers-enhanced';

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const user = await requireAuth();

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, JPEG, and PNG files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Save file
    const uploadedFile = await fileService.saveFile(file, user.id, {
      addWatermark: file.type.startsWith('image/'),
    });

    return NextResponse.json({
      file: uploadedFile,
      message: 'File uploaded successfully',
    });
  });
}
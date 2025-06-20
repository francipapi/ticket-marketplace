import { NextRequest } from 'next/server';
import { fileService } from '@/lib/upload';
import { createResponse, createErrorResponse, withAuth } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    const authResult = await withAuth(request);
    if (!authResult.success) {
      return createErrorResponse(authResult.error, 401);
    }

    const { user } = authResult;

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return createErrorResponse('No file provided');
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return createErrorResponse('Invalid file type. Only PDF, JPEG, and PNG files are allowed.');
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return createErrorResponse('File size too large. Maximum size is 10MB.');
    }

    // Save file
    const uploadedFile = await fileService.saveFile(file, user.id, {
      addWatermark: file.type.startsWith('image/'),
    });

    return createResponse({
      file: uploadedFile,
      message: 'File uploaded successfully',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return createErrorResponse('Failed to upload file', 500);
  }
}
import { NextRequest } from 'next/server';
import { createResponse, createErrorResponse, withAuth } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const authResult = await withAuth(request);
  if (!authResult.success) {
    return createErrorResponse(authResult.error, 401);
  }

  return createResponse({ user: authResult.user });
}
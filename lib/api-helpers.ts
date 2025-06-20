import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';
import { getAuthUser, AuthUser } from './auth';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export function createResponse<T>(data: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data });
}

export function createErrorResponse(error: string, status = 400): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error }, { status });
}

export async function withValidation<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json();
    const validatedData = schema.parse(body);
    return { success: true, data: validatedData };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'errors' in error) {
      const message = (error.errors as Array<{ message: string }>).map((e) => e.message).join(', ');
      return { success: false, error: message };
    }
    return { success: false, error: 'Invalid request data' };
  }
}

export async function withAuth(
  request: NextRequest
): Promise<{ success: true; user: AuthUser } | { success: false; error: string }> {
  const user = await getAuthUser(request);
  if (!user) {
    return { success: false, error: 'Authentication required' };
  }
  return { success: true, user };
}

export async function withAuthAndValidation<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<
  | { success: true; user: AuthUser; data: T }
  | { success: false; error: string }
> {
  const authResult = await withAuth(request);
  if (!authResult.success) {
    return authResult;
  }

  const validationResult = await withValidation(request, schema);
  if (!validationResult.success) {
    return validationResult;
  }

  return {
    success: true,
    user: authResult.user,
    data: validationResult.data,
  };
}
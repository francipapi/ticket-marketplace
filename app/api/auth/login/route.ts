import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { authService } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';
import { createResponse, createErrorResponse, withValidation } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    const validation = await withValidation(request, loginSchema);
    if (!validation.success) {
      return createErrorResponse(validation.error);
    }

    const { email, password } = validation.data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return createErrorResponse('Invalid email or password', 401);
    }

    // Verify password
    const isValidPassword = await authService.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return createErrorResponse('Invalid email or password', 401);
    }

    // Generate JWT token
    const userResponse = {
      id: user.id,
      email: user.email,
      username: user.username,
    };
    const token = authService.generateToken(userResponse);

    // Create response with cookie
    const response = createResponse({
      user: userResponse,
      token,
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
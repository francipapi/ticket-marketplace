import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { authService } from '@/lib/auth';
import { registerSchema } from '@/lib/validations';
import { createResponse, createErrorResponse, withValidation } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    const validation = await withValidation(request, registerSchema);
    if (!validation.success) {
      return createErrorResponse(validation.error);
    }

    const { email, username, password } = validation.data;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return createErrorResponse('User with this email or username already exists');
    }

    // Create new user
    const passwordHash = await authService.hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });

    // Generate JWT token
    const token = authService.generateToken(user);

    // Create response with cookie
    const response = createResponse({
      user,
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
    console.error('Registration error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
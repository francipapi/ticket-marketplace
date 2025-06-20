import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthUser {
  id: string;
  email: string;
  username: string;
}

export class AuthService {
  private jwtSecret = process.env.JWT_SECRET!;
  
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }
  
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
  
  generateToken(user: AuthUser): string {
    return jwt.sign(
      { userId: user.id, email: user.email, username: user.username },
      this.jwtSecret,
      { expiresIn: '7d' }
    );
  }
  
  verifyToken(token: string): AuthUser | null {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as { userId: string; email: string; username: string };
      return {
        id: payload.userId,
        email: payload.email,
        username: payload.username,
      };
    } catch {
      return null;
    }
  }
  
  // Migration helper - mark users as needing Supabase migration
  async markForMigration(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { migrationStatus: 'pending' },
    });
  }
}

export const authService = new AuthService();

// Middleware for protected routes
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  
  const user = authService.verifyToken(token);
  if (!user) return null;
  
  // Verify user still exists in database
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, username: true },
  });
  
  return dbUser;
}
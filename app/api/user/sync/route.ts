import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getDatabaseService } from '@/lib/services/factory';
import { withErrorHandling } from '@/lib/api-helpers-enhanced';

export async function GET() {
  return withErrorHandling(async () => {
    const clerkUser = await currentUser();
    
    if (!clerkUser) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        user: null
      }, { status: 401 });
    }

    const dbService = getDatabaseService();

    // Check if user exists in database
    let user = await dbService.users.findByClerkId(clerkUser.id);
    
    if (!user) {
      // Create the user
      const email = clerkUser.emailAddresses[0]?.emailAddress || 'no-email@example.com';
      let username = clerkUser.username || clerkUser.firstName || email.split('@')[0] || 'user';
      
      // Make username unique if needed by appending a timestamp
      const existingUser = await dbService.users.findByEmail(email);
      if (existingUser) {
        username = `${username}_${Date.now()}`;
      }
      
      try {
        user = await dbService.users.create({
          email,
          username,
          clerkId: clerkUser.id,
        });
      } catch (createError: any) {
        console.error('Failed to create user:', createError);
        return NextResponse.json({
          error: 'Failed to create user',
          details: createError.message
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        clerkId: user.clerkId,
        rating: user.rating,
        isVerified: user.isVerified,
        totalSales: user.totalSales,
      }
    });
  });
}
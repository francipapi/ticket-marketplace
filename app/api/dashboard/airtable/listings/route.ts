import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { getDatabaseService } from '@/lib/services/factory';
import { handleDatabaseError } from '@/services/database.service';

export async function GET(request: NextRequest) {
  try {
    // Use getAuth with request for App Router
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get database service instance
    const dbService = getDatabaseService();
    
    // Get user from database
    const user = await dbService.users.findByClerkId(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's listings using the optimized service layer
    console.log('Fetching listings for user:', { userId: user.id, username: user.username });
    
    // Try filtering by primary field (username) instead of record ID
    const listingsResult = await (dbService.listings as any).findByUserPrimaryField(user.username, {
      limit: 50,
      offset: 0
    });
    
    console.log(`✅ Found ${listingsResult.items.length} listings using service layer`);
    const listings = listingsResult.items;

    return NextResponse.json({ listings });
  } catch (error) {
    console.error('Error fetching user listings:', error);
    return NextResponse.json(
      { error: handleDatabaseError(error) },
      { status: 500 }
    );
  }
}
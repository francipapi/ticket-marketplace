import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { getDatabaseService } from '@/lib/services/factory';
import { handleDatabaseError } from '@/services/database.service';

export async function GET(request: NextRequest) {
  try {
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

    // Get offers sent by the user using the optimized service layer
    console.log('Fetching sent offers for user:', { userId: user.id, username: user.username });
    
    // Try filtering by primary field (username) instead of record ID
    const offersResult = await (dbService.offers as any).findByBuyerPrimaryField(user.username, {
      limit: 50,
      offset: 0
    });
    
    console.log(`✅ Found ${offersResult.items.length} sent offers using service layer`);
    const offers = offersResult.items;

    return NextResponse.json({ offers });
  } catch (error) {
    console.error('Error fetching sent offers:', error);
    return NextResponse.json(
      { error: handleDatabaseError(error) },
      { status: 500 }
    );
  }
}
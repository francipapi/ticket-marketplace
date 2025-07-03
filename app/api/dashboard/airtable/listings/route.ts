import { NextRequest, NextResponse } from 'next/server';
import { auth, getAuth } from '@clerk/nextjs/server';
import { db, handleDatabaseError } from '@/services/database.service';
import { getTables, recordToObject } from '@/lib/airtable';

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

    // Get user from Airtable
    const user = await db.getUserByClerkId(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's listings
    const tables = getTables();
    const records = await tables.listings
      .select({
        filterByFormula: `SEARCH('${user.id}', ARRAYJOIN({seller}))`,
        sort: [{ field: 'eventDate', direction: 'desc' }],
      })
      .all();
    
    const listings = records.map(recordToObject);

    return NextResponse.json({ listings });
  } catch (error) {
    console.error('Error fetching user listings:', error);
    return NextResponse.json(
      { error: handleDatabaseError(error) },
      { status: 500 }
    );
  }
}
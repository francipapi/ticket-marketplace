import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db, handleDatabaseError } from '@/services/database.service';
import { getTables, recordToObject } from '@/lib/airtable';

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    
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

    // Get user's listings first
    const tables = getTables();
    const listingRecords = await tables.listings
      .select({
        filterByFormula: `SEARCH('${user.id}', ARRAYJOIN({seller}))`,
      })
      .all();
    
    const listingIds = listingRecords.map(r => r.id);

    if (listingIds.length === 0) {
      return NextResponse.json({ offers: [] });
    }

    // Get offers for user's listings
    const offerRecords = await tables.offers
      .select({
        filterByFormula: `OR(${listingIds.map(id => `SEARCH('${id}', ARRAYJOIN({listing}))`).join(',')})`,
        sort: [{ field: 'createdAt', direction: 'desc' }],
      })
      .all();
    
    const offers = offerRecords.map(recordToObject);

    return NextResponse.json({ offers });
  } catch (error) {
    console.error('Error fetching received offers:', error);
    return NextResponse.json(
      { error: handleDatabaseError(error) },
      { status: 500 }
    );
  }
}
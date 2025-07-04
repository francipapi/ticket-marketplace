import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { db } from '@/services/database.service';
import { getTables, recordToObject } from '@/lib/airtable';

export async function GET(request: NextRequest) {
  try {
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

    const tables = getTables();
    
    // Get the most recent listings (regardless of seller)
    const recentListings = await tables.listings
      .select({ 
        maxRecords: 5,
        // Don't sort by createdAt since it may not exist as a field
      })
      .firstPage();
    
    // Get the most recent offers (regardless of buyer)
    const recentOffers = await tables.offers
      .select({ 
        maxRecords: 5,
        // Don't sort by createdAt since it may not exist as a field
      })
      .firstPage();

    return NextResponse.json({
      currentUser: {
        id: user.id,
        username: user.username,
        clerkId: user.clerkId
      },
      recentListings: recentListings.map(r => ({
        id: r.id,
        createdTime: r._rawJson?.createdTime,
        fields: r.fields,
        // Show seller field specifically
        sellerField: r.fields.seller,
        sellerType: typeof r.fields.seller,
        sellerIsArray: Array.isArray(r.fields.seller),
        allFieldNames: Object.keys(r.fields)
      })),
      recentOffers: recentOffers.map(r => ({
        id: r.id,
        createdTime: r._rawJson?.createdTime,
        fields: r.fields,
        // Show buyer field specifically
        buyerField: r.fields.buyer,
        buyerType: typeof r.fields.buyer,
        buyerIsArray: Array.isArray(r.fields.buyer),
        allFieldNames: Object.keys(r.fields)
      })),
      debugInfo: {
        timestamp: new Date().toISOString(),
        searchingForUserId: user.id
      }
    });
  } catch (error) {
    console.error('Error in raw data debug:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debug data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
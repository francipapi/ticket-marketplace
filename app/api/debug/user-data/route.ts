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
    
    // Get ALL listings to see their structure
    const allListings = await tables.listings
      .select({ maxRecords: 10 })
      .firstPage();
    
    // Get ALL offers to see their structure
    const allOffers = await tables.offers
      .select({ maxRecords: 10 })
      .firstPage();
    
    // Try different filter approaches
    const testFilters = [
      `{seller} = '${user.id}'`,
      `SEARCH('${user.id}', ARRAYJOIN({seller}))`,
      `{sellerId} = '${user.id}'`,
      `{userId} = '${user.id}'`,
      `{user} = '${user.id}'`,
    ];
    
    const filterResults = {};
    
    for (const filter of testFilters) {
      try {
        const results = await tables.listings
          .select({
            filterByFormula: filter,
            maxRecords: 5,
          })
          .firstPage();
        
        filterResults[filter] = {
          count: results.length,
          records: results.map(r => ({ id: r.id, fields: r.fields }))
        };
      } catch (error) {
        filterResults[filter] = {
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        clerkId: user.clerkId
      },
      sampleListings: allListings.map(r => ({
        id: r.id,
        fields: r.fields,
        fieldKeys: Object.keys(r.fields)
      })),
      sampleOffers: allOffers.map(r => ({
        id: r.id,
        fields: r.fields,
        fieldKeys: Object.keys(r.fields)
      })),
      filterTests: filterResults
    });
  } catch (error) {
    console.error('Error in user data debug:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debug data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
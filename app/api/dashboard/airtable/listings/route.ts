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
    console.log('Fetching listings for user:', { userId: user.id, username: user.username });
    
    const tables = getTables();
    
    // Research shows FIND() works better than SEARCH() for linked record IDs
    // Try different approaches based on Airtable documentation
    const filterOptions = [
      // Approach 1: FIND with ARRAYJOIN (most reliable for record IDs)
      `FIND('${user.id}', ARRAYJOIN({seller})) > 0`,
      // Approach 2: SEARCH with ARRAYJOIN
      `SEARCH('${user.id}', ARRAYJOIN({seller}))`,
      // Approach 3: Direct comparison if single linked record
      `{seller} = '${user.id}'`,
      // Approach 4: FIND with comma separator (in case ARRAYJOIN uses commas)
      `FIND('${user.id}', ARRAYJOIN({seller}, ',')) > 0`,
    ];
    
    let records = [];
    let successfulFilter = null;
    
    for (const filterFormula of filterOptions) {
      try {
        console.log('Trying filter formula:', filterFormula);
        
        const testRecords = await tables.listings
          .select({
            filterByFormula: filterFormula,
          })
          .all();
        
        if (testRecords.length > 0) {
          records = testRecords;
          successfulFilter = filterFormula;
          console.log(`✅ SUCCESS: Found ${testRecords.length} listings with filter: ${filterFormula}`);
          break;
        } else {
          console.log(`❌ No records found with filter: ${filterFormula}`);
        }
      } catch (error) {
        console.warn(`❌ Filter failed: ${filterFormula}`, error);
      }
    }
    
    // If Airtable filtering fails, fall back to manual filtering
    if (records.length === 0) {
      console.log('🔄 Airtable filtering failed, falling back to manual filtering...');
      
      const allRecords = await tables.listings.select().all();
      console.log(`Total listings in database: ${allRecords.length}`);
      
      records = allRecords.filter(record => {
        const listing = recordToObject(record);
        
        // Handle different seller field formats
        if (Array.isArray(listing.seller)) {
          return listing.seller.includes(user.id);
        } else if (typeof listing.seller === 'string') {
          return listing.seller === user.id;
        }
        return false;
      });
      
      console.log(`✅ Manual filtering found ${records.length} listings for user ${user.id}`);
    }
    
    console.log('Found listing records:', records.length);
    const listings = records.map(recordToObject);
    console.log('Processed listings:', listings.map(l => ({ id: l.id, title: l.title, seller: l.seller })));

    return NextResponse.json({ listings });
  } catch (error) {
    console.error('Error fetching user listings:', error);
    return NextResponse.json(
      { error: handleDatabaseError(error) },
      { status: 500 }
    );
  }
}
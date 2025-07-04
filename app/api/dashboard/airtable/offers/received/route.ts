import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { db, handleDatabaseError } from '@/services/database.service';
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

    // Get user's listings first using improved filtering
    const tables = getTables();
    
    // Use the same filtering approach as in the listings route
    const listingFilterOptions = [
      `FIND('${user.id}', ARRAYJOIN({seller})) > 0`,
      `SEARCH('${user.id}', ARRAYJOIN({seller}))`,
      `{seller} = '${user.id}'`,
      `FIND('${user.id}', ARRAYJOIN({seller}, ',')) > 0`,
    ];
    
    let listingRecords = [];
    
    for (const filterFormula of listingFilterOptions) {
      try {
        console.log('Trying listing filter for received offers:', filterFormula);
        const testRecords = await tables.listings
          .select({
            filterByFormula: filterFormula,
            maxRecords: 100,
          })
          .all();
        
        if (testRecords.length > 0) {
          listingRecords = testRecords;
          console.log(`✅ Found ${testRecords.length} listings with filter: ${filterFormula}`);
          break;
        } else {
          console.log(`❌ No listings found with filter: ${filterFormula}`);
        }
      } catch (error) {
        console.warn(`❌ Listing filter failed: ${filterFormula}`, error);
      }
    }
    
    // If Airtable filtering fails, fall back to manual filtering
    if (listingRecords.length === 0) {
      console.log('🔄 Airtable listing filtering failed, trying manual filtering...');
      
      try {
        const allListingRecords = await tables.listings.select().all();
        console.log(`Total listings in database: ${allListingRecords.length}`);
        
        listingRecords = allListingRecords.filter(record => {
          const listing = recordToObject(record);
          
          if (Array.isArray(listing.seller)) {
            return listing.seller.includes(user.id);
          } else if (typeof listing.seller === 'string') {
            return listing.seller === user.id;
          }
          return false;
        });
        
        console.log(`✅ Manual filtering found ${listingRecords.length} listings for user ${user.id}`);
      } catch (manualError) {
        console.error('Manual listing filtering failed:', manualError);
      }
    }
    
    const listingIds = listingRecords.map(r => r.id);

    if (listingIds.length === 0) {
      return NextResponse.json({ offers: [] });
    }

    // Get offers for user's listings
    console.log('User listings found:', listingIds.length, 'listings:', listingIds);
    
    let offerRecords = [];
    if (listingIds.length > 0) {
      // Try different filtering approaches for offers
      const offerFilterOptions = [
        // Single listing case
        ...(listingIds.length === 1 ? [
          `FIND('${listingIds[0]}', ARRAYJOIN({listing})) > 0`,
          `SEARCH('${listingIds[0]}', ARRAYJOIN({listing}))`,
          `{listing} = '${listingIds[0]}'`,
        ] : []),
        // Multiple listings case
        ...(listingIds.length > 1 ? [
          `OR(${listingIds.map(id => `FIND('${id}', ARRAYJOIN({listing})) > 0`).join(',')})`,
          `OR(${listingIds.map(id => `SEARCH('${id}', ARRAYJOIN({listing}))`).join(',')})`,
        ] : [])
      ];
      
      for (const filterFormula of offerFilterOptions) {
        try {
          console.log('Trying offer filter for received offers:', filterFormula);
        
          
          const testRecords = await tables.offers
            .select({
              filterByFormula: filterFormula,
              maxRecords: 100,
            })
            .all();
          
          if (testRecords.length > 0) {
            offerRecords = testRecords;
            console.log(`✅ Found ${testRecords.length} offers with filter: ${filterFormula}`);
            break;
          } else {
            console.log(`❌ No offers found with filter: ${filterFormula}`);
          }
        } catch (error) {
          console.warn(`❌ Offer filter failed: ${filterFormula}`, error);
        }
      }
      
      // If Airtable filtering fails, fall back to manual filtering
      if (offerRecords.length === 0) {
        console.log('🔄 Airtable offer filtering failed, trying manual filtering...');
        
        try {
          const allOfferRecords = await tables.offers.select().all();
          console.log(`Total offers in database: ${allOfferRecords.length}`);
          
          offerRecords = allOfferRecords.filter(record => {
            const offer = recordToObject(record);
            
            if (Array.isArray(offer.listing)) {
              return offer.listing.some(listingId => listingIds.includes(listingId));
            } else if (typeof offer.listing === 'string') {
              return listingIds.includes(offer.listing);
            }
            return false;
          });
          
          console.log(`✅ Manual filtering found ${offerRecords.length} offers for user's listings`);
        } catch (manualError) {
          console.error('Manual offer filtering failed:', manualError);
        }
      }
    }
    
    const offers = offerRecords.map(recordToObject);
    
    // Fetch listing details for each offer to show event names
    const offersWithListings = await Promise.all(
      offers.map(async (offer) => {
        let listingInfo = null;
        
        if (offer.listing && offer.listing[0]) {
          try {
            const listingRecord = await tables.listings.find(offer.listing[0]);
            listingInfo = recordToObject(listingRecord);
          } catch (error) {
            console.warn('Failed to fetch listing for offer:', offer.id, error);
          }
        }
        
        return {
          ...offer,
          listingInfo
        };
      })
    );

    return NextResponse.json({ offers: offersWithListings });
  } catch (error) {
    console.error('Error fetching received offers:', error);
    return NextResponse.json(
      { error: handleDatabaseError(error) },
      { status: 500 }
    );
  }
}
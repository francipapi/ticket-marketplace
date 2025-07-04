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

    // Get offers sent by the user
    console.log('Fetching sent offers for user:', { userId: user.id, username: user.username });
    
    // Try direct database service method first
    let offers = await db.getOffersByBuyer(user.id);
    console.log('Found sent offers via db service:', offers.length, offers.map(o => ({ id: o.id, status: o.status, buyer: o.buyer })));
    
    // Fetch listing details for each offer
    const tables = getTables();
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
    
    offers = offersWithListings;
    
    // If no offers found, try alternative direct query
    if (offers.length === 0) {
      
      // Use improved filtering based on Airtable API research
      const filterOptions = [
        `FIND('${user.id}', ARRAYJOIN({buyer})) > 0`,
        `SEARCH('${user.id}', ARRAYJOIN({buyer}))`,
        `{buyer} = '${user.id}'`,
        `FIND('${user.id}', ARRAYJOIN({buyer}, ',')) > 0`,
      ];
      
      for (const filterFormula of filterOptions) {
        try {
          console.log('Trying offers filter:', filterFormula);
          const records = await tables.offers
            .select({
              filterByFormula: filterFormula,
              maxRecords: 100,
            })
            .all();
          
          if (records.length > 0) {
            offers = records.map(recordToObject);
          
          // Fetch listing details for alternative query results
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
          
          offers = offersWithListings;
            console.log(`✅ Found ${records.length} offers with filter: ${filterFormula}`);
            break;
          } else {
            console.log(`❌ No offers found with filter: ${filterFormula}`);
          }
        } catch (error) {
          console.warn(`❌ Offers filter failed: ${filterFormula}`, error);
        }
      }
      
      // If still no offers found, try manual filtering
      if (offers.length === 0) {
        console.log('🔄 Airtable offers filtering failed, trying manual filtering...');
        
        try {
          const allOfferRecords = await tables.offers.select().all();
          console.log(`Total offers in database: ${allOfferRecords.length}`);
          
          const filteredOffers = allOfferRecords.filter(record => {
            const offer = recordToObject(record);
            
            if (Array.isArray(offer.buyer)) {
              return offer.buyer.includes(user.id);
            } else if (typeof offer.buyer === 'string') {
              return offer.buyer === user.id;
            }
            return false;
          });
          
          offers = filteredOffers.map(recordToObject);
          
          // Fetch listing details for manual filtering results
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
          
          offers = offersWithListings;
          console.log(`✅ Manual filtering found ${offers.length} offers for user ${user.id}`);
        } catch (manualError) {
          console.error('Manual offers filtering failed:', manualError);
        }
      }
    }

    return NextResponse.json({ offers });
  } catch (error) {
    console.error('Error fetching sent offers:', error);
    return NextResponse.json(
      { error: handleDatabaseError(error) },
      { status: 500 }
    );
  }
}
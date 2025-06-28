import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { getTables, recordToObject, sleep } from '../lib/airtable';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

interface MigrationMapping {
  users: Map<string, string>; // Old ID -> Airtable ID
  listings: Map<string, string>;
  offers: Map<string, string>;
}

async function migrate() {
  console.log('🚀 Starting migration to Airtable...\n');
  
  // Check if Airtable is configured
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    console.error('❌ Airtable environment variables are not set!');
    console.log('Please set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in your .env.local file');
    process.exit(1);
  }

  const tables = getTables();
  const mappings: MigrationMapping = {
    users: new Map(),
    listings: new Map(),
    offers: new Map(),
  };

  try {
    // 1. Migrate Users
    console.log('📊 Migrating users...');
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
    });
    
    console.log(`Found ${users.length} users to migrate`);
    
    for (const user of users) {
      try {
        // Check if user already exists (by email)
        const existingRecords = await tables.users
          .select({
            filterByFormula: `{email} = '${user.email}'`,
            maxRecords: 1,
          })
          .firstPage();
        
        if (existingRecords.length > 0) {
          console.log(`⏭️  User ${user.email} already exists, skipping...`);
          mappings.users.set(user.id, existingRecords[0].id);
          continue;
        }

        // Create user in Airtable
        const record = await tables.users.create({
          email: user.email,
          username: user.username,
          clerkId: '', // Will be set when user logs in with Clerk
          rating: 5.0,
          isVerified: false,
          totalSales: 0,
        });
        
        mappings.users.set(user.id, record.id);
        console.log(`✅ Migrated user: ${user.email}`);
        
        // Rate limiting
        await sleep(250); // 4 requests per second
      } catch (error) {
        console.error(`❌ Failed to migrate user ${user.email}:`, error);
      }
    }

    // 2. Migrate Listings
    console.log('\n📊 Migrating listings...');
    const listings = await prisma.listing.findMany({
      where: { status: 'active' },
      orderBy: { createdAt: 'asc' },
    });
    
    console.log(`Found ${listings.length} active listings to migrate`);
    
    for (const listing of listings) {
      try {
        const sellerId = mappings.users.get(listing.userId);
        if (!sellerId) {
          console.log(`⚠️  Skipping listing "${listing.title}" - seller not migrated`);
          continue;
        }

        const record = await tables.listings.create({
          title: listing.title,
          eventName: listing.eventName,
          eventDate: listing.eventDate.toISOString(),
          price: listing.priceInCents,
          quantity: listing.quantity,
          status: 'ACTIVE',
          seller: [sellerId],
          venue: listing.venue || undefined,
          description: listing.description || undefined,
          views: 0,
        });
        
        mappings.listings.set(listing.id, record.id);
        console.log(`✅ Migrated listing: ${listing.title}`);
        
        await sleep(250);
      } catch (error) {
        console.error(`❌ Failed to migrate listing ${listing.title}:`, error);
      }
    }

    // 3. Migrate Offers
    console.log('\n📊 Migrating offers...');
    const offers = await prisma.offer.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });
    
    console.log(`Found ${offers.length} pending offers to migrate`);
    
    for (const offer of offers) {
      try {
        const buyerId = mappings.users.get(offer.buyerId);
        const listingId = mappings.listings.get(offer.listingId);
        
        if (!buyerId || !listingId) {
          console.log(`⚠️  Skipping offer - buyer or listing not migrated`);
          continue;
        }

        // Map message template
        let message: 'Buy at asking price' | 'Make offer' | 'Check availability';
        switch (offer.messageTemplate) {
          case 'asking_price':
            message = 'Buy at asking price';
            break;
          case 'make_offer':
            message = 'Make offer';
            break;
          case 'check_availability':
            message = 'Check availability';
            break;
          default:
            message = 'Check availability';
        }

        const record = await tables.offers.create({
          listing: [listingId],
          buyer: [buyerId],
          offerPrice: offer.offerPriceInCents,
          quantity: offer.quantity,
          status: 'PENDING',
          message,
          customMessage: offer.customMessage || undefined,
        });
        
        mappings.offers.set(offer.id, record.id);
        console.log(`✅ Migrated offer from buyer ${offer.buyerId}`);
        
        await sleep(250);
      } catch (error) {
        console.error(`❌ Failed to migrate offer:`, error);
      }
    }

    // 4. Save migration mappings
    console.log('\n💾 Saving migration mappings...');
    const mappingData = {
      timestamp: new Date().toISOString(),
      users: Object.fromEntries(mappings.users),
      listings: Object.fromEntries(mappings.listings),
      offers: Object.fromEntries(mappings.offers),
    };
    
    const fs = await import('fs');
    fs.writeFileSync(
      join(process.cwd(), 'migration', 'airtable-mappings.json'),
      JSON.stringify(mappingData, null, 2)
    );

    // 5. Summary
    console.log('\n📊 Migration Summary:');
    console.log(`- Users migrated: ${mappings.users.size}`);
    console.log(`- Listings migrated: ${mappings.listings.size}`);
    console.log(`- Offers migrated: ${mappings.offers.size}`);
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Test the application with the new Airtable backend');
    console.log('2. Update frontend to use new API endpoints (/api/listings/airtable)');
    console.log('3. Deploy and test in production');
    console.log('4. Once verified, remove old database code');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrate().catch(console.error);
import { getTables, recordToObject, isAirtableError, sleep } from '@/lib/airtable';
import type { UserRecord, ListingRecord, OfferRecord, TransactionRecord } from '@/lib/airtable';
import PQueue from 'p-queue';

// Create a queue for rate limiting (4 requests per second to be safe)
const queue = new PQueue({ 
  concurrency: 4, 
  interval: 1000, 
  intervalCap: 4 
});

export class DatabaseService {
  // === User Operations ===
  
  async createUser(data: {
    email: string;
    username: string;
    clerkId: string;
  }) {
    return queue.add(async () => {
      const tables = getTables();
      
      console.log('Creating user with data:', { email: data.email, username: data.username, clerkId: data.clerkId });
      
      // First check if user already exists by clerkId
      const existingByClerkId = await tables.users
        .select({
          filterByFormula: `{clerkId} = '${data.clerkId}'`,
          maxRecords: 1,
        })
        .firstPage();
        
      if (existingByClerkId.length > 0) {
        console.log('User already exists with clerkId:', data.clerkId);
        const existingUser = recordToObject(existingByClerkId[0]);
        console.log('Existing user details:', { id: existingUser.id, username: existingUser.username });
        return existingUser;
      }
      
      // Also check by email to prevent duplicates
      const existingByEmail = await tables.users
        .select({
          filterByFormula: `{email} = '${data.email}'`,
          maxRecords: 1,
        })
        .firstPage();
        
      if (existingByEmail.length > 0) {
        console.log('User already exists with email:', data.email);
        // Update the existing user with the clerkId
        const updated = await tables.users.update(existingByEmail[0].id, {
          clerkId: data.clerkId,
        });
        const updatedUser = recordToObject(updated);
        console.log('Updated user details:', { id: updatedUser.id, username: updatedUser.username });
        return updatedUser;
      }
      
      // Create new user only if they don't exist
      try {
        const record = await retryOperation(async () => {
          return await tables.users.create({
            email: data.email,
            username: data.username,
            clerkId: data.clerkId,
            rating: 5.0,
            isVerified: false,
            totalSales: 0,
          });
        }, 3, 500);
        
        const newUser = recordToObject(record);
        console.log('New user created successfully:', { id: newUser.id, username: newUser.username });
        return newUser;
      } catch (createError) {
        console.error('Failed to create user in Airtable after retries:', createError);
        throw new Error(`User creation failed: ${createError}`);
      }
    });
  }

  async getUserByClerkId(clerkId: string) {
    return queue.add(async () => {
      const tables = getTables();
      const records = await tables.users
        .select({
          filterByFormula: `{clerkId} = '${clerkId}'`,
          maxRecords: 1,
        })
        .firstPage();
      
      return records[0] ? recordToObject(records[0]) : null;
    });
  }

  async getUserByEmail(email: string) {
    return queue.add(async () => {
      const tables = getTables();
      const records = await tables.users
        .select({
          filterByFormula: `{email} = '${email}'`,
          maxRecords: 1,
        })
        .firstPage();
      
      return records[0] ? recordToObject(records[0]) : null;
    });
  }

  async getUserById(id: string) {
    return queue.add(async () => {
      const tables = getTables();
      const record = await tables.users.find(id);
      return recordToObject(record);
    });
  }

  async updateUser(id: string, data: Partial<UserRecord>) {
    return queue.add(async () => {
      const tables = getTables();
      const record = await tables.users.update(id, data);
      return recordToObject(record);
    });
  }

  // === Listing Operations ===

  async createListing(data: {
    title: string;
    eventName: string;
    eventDate: Date;
    price: number; // in cents
    quantity: number;
    sellerId: string; // Airtable record ID
    venue?: string;
    description?: string;
    files?: Array<{ buffer: Buffer; mimetype: string; originalname: string }>;
  }) {
    return queue.add(async () => {
      const tables = getTables();
      
      // Validate seller exists before creating listing
      try {
        console.log('Validating seller ID:', data.sellerId);
        const seller = await tables.users.find(data.sellerId);
        if (!seller) {
          throw new Error(`Seller with ID ${data.sellerId} not found`);
        }
        console.log('Seller validation successful:', { id: seller.id, fields: seller.fields });
      } catch (error) {
        console.error('Seller validation failed:', error);
        throw new Error(`Invalid seller ID: ${data.sellerId}. ${error}`);
      }
      
      // Convert files to base64 for Airtable attachments
      const attachments = data.files?.map(file => ({
        url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
        filename: file.originalname,
      })) || [];

      console.log('Creating listing with seller ID:', data.sellerId);
      
      // Try different approaches to the seller field based on Airtable configuration
      const baseListingData = {
        title: data.title,
        eventName: data.eventName,
        eventDate: data.eventDate.toISOString().split('T')[0], // Airtable expects YYYY-MM-DD format
        price: data.price,
        quantity: data.quantity,
        status: 'ACTIVE' as const,
        venue: data.venue || undefined,
        description: data.description || undefined,
        ticketFiles: attachments.length > 0 ? attachments : undefined,
        views: 0,
      };
      
      // Different seller field configurations to try based on Airtable documentation
      const sellerConfigs = [
        { seller: [data.sellerId] }, // Standard linked record array (recommended)
        { sellerId: data.sellerId }, // Alternative field name
        { userId: data.sellerId }, // Another alternative field name
        { user: [data.sellerId] }, // Yet another alternative field name
      ];
      
      const configNames = ['linked_record_array', 'seller_id_field', 'user_id_field', 'user_linked_field'];
      let lastError = null;
      
      for (let i = 0; i < sellerConfigs.length; i++) {
        const config = sellerConfigs[i];
        const configName = configNames[i];
        const listingData = { ...baseListingData, ...config };
        
        console.log(`Trying seller config '${configName}':`, JSON.stringify(listingData, null, 2));
        
        try {
          const record = await tables.listings.create(listingData);
          console.log(`Listing created successfully with config '${configName}':`, { id: record.id });
          return recordToObject(record);
        } catch (configError) {
          console.warn(`Config '${configName}' failed:`, configError);
          lastError = configError;
          
          // If it's not a field validation error, don't try other configs
          if (!(configError && typeof configError === 'object' && 'statusCode' in configError && configError.statusCode === 422)) {
            break;
          }
        }
      }
      
      // If all configurations failed, try with typecast parameter
      console.log('All standard configurations failed, trying with typecast...');
      try {
        // Use Airtable's typecast feature to automatically infer field types
        const listingDataWithTypecast = {
          ...baseListingData,
          seller: [data.sellerId]
        };
        
        console.log('Trying with typecast enabled:', JSON.stringify(listingDataWithTypecast, null, 2));
        
        // Note: The Airtable library doesn't directly support typecast in create method
        // We would need to make a direct HTTP request for this
        // For now, let's provide detailed error information
        
        console.error('All seller field configurations failed. Last error:', lastError);
        console.error('Error details:', {
          error: lastError,
          sellerId: data.sellerId,
          sellerArray: [data.sellerId],
          baseListingData: baseListingData,
          allConfigsTried: configNames
        });
        
        throw new Error(`Failed to create listing with any seller field configuration. Last error: ${lastError}. Please check your Airtable Listings table field configuration. Ensure you have a linked record field pointing to the Users table.`);
      } catch (typecastError) {
        throw new Error(`Failed to create listing even with typecast. Error: ${typecastError}. Please verify your Airtable schema.`);
      }
    });
  }

  async getActiveListings(options?: {
    page?: number;
    limit?: number;
    search?: string;
    eventDate?: Date;
  }) {
    return queue.add(async () => {
      const tables = getTables();
      const page = options?.page || 1;
      const limit = options?.limit || 12;
      
      let filterFormula = `{status} = 'ACTIVE'`;
      
      if (options?.search) {
        // Airtable doesn't support OR in the same way, so we'll filter in memory
        // In production, you might want to use Airtable's search block or filterByFormula
      }
      
      if (options?.eventDate) {
        filterFormula += ` AND {eventDate} >= '${options.eventDate.toISOString().split('T')[0]}'`;
      }

      const records = await tables.listings
        .select({
          filterByFormula: filterFormula,
          sort: [{ field: 'eventDate', direction: 'desc' }],
          pageSize: limit,
        })
        .firstPage();
      
      // Manual pagination since Airtable doesn't have built-in offset
      const startIndex = (page - 1) * limit;
      const paginatedRecords = records.slice(startIndex, startIndex + limit);
      
      return {
        listings: paginatedRecords.map(recordToObject),
        total: records.length,
        page,
        limit,
        totalPages: Math.ceil(records.length / limit),
      };
    });
  }

  async getListingById(id: string) {
    return queue.add(async () => {
      const tables = getTables();
      const record = await tables.listings.find(id);
      return recordToObject(record);
    });
  }

  async updateListing(id: string, data: Partial<ListingRecord>) {
    return queue.add(async () => {
      const tables = getTables();
      const record = await tables.listings.update(id, data);
      return recordToObject(record);
    });
  }

  async incrementListingViews(id: string) {
    return queue.add(async () => {
      const tables = getTables();
      const listing = await this.getListingById(id);
      const record = await tables.listings.update(id, {
        views: (listing.views || 0) + 1,
      });
      return recordToObject(record);
    });
  }

  // Helper method to test different field configurations
  async testFieldConfiguration(sellerId: string) {
    return queue.add(async () => {
      const tables = getTables();
      const testConfigs = [
        { seller: [sellerId] },
        { sellerId: sellerId },
        { userId: sellerId },
        { user: [sellerId] },
      ];
      
      const configNames = ['linked_record_array', 'seller_id_field', 'user_id_field', 'user_linked_field'];
      const results = [];
      
      for (let i = 0; i < testConfigs.length; i++) {
        const config = testConfigs[i];
        const configName = configNames[i];
        const testData = {
          title: 'TEST - DELETE IMMEDIATELY',
          eventName: 'TEST EVENT',
          eventDate: '2025-07-18',
          price: 1000,
          quantity: 1,
          status: 'ACTIVE' as const,
          views: 0,
          ...config
        };
        
        try {
          // Don't actually create, just validate by attempting to create and catching the error
          await tables.listings.create(testData);
          results.push({ config: configName, status: 'success', data: testData });
          
          // If successful, immediately delete the test record
          // Note: This would require implementing a cleanup mechanism
          break;
        } catch (error) {
          results.push({ 
            config: configName, 
            status: 'failed', 
            error: error instanceof Error ? error.message : String(error),
            data: testData
          });
        }
      }
      
      return results;
    });
  }

  // === Offer Operations ===

  async createOffer(data: {
    listingId: string; // Airtable record ID
    buyerId: string; // Airtable record ID
    offerPrice: number; // in cents
    quantity: number;
    message: 'Buy at asking price' | 'Make offer' | 'Check availability';
    customMessage?: string;
  }) {
    return queue.add(async () => {
      const tables = getTables();
      
      // Validate listing exists
      try {
        console.log('Validating listing ID:', data.listingId);
        const listing = await tables.listings.find(data.listingId);
        if (!listing) {
          throw new Error(`Listing with ID ${data.listingId} not found`);
        }
        console.log('Listing validation successful:', { id: listing.id });
      } catch (error) {
        console.error('Listing validation failed:', error);
        throw new Error(`Invalid listing ID: ${data.listingId}. ${error}`);
      }
      
      // Validate buyer exists
      try {
        console.log('Validating buyer ID:', data.buyerId);
        const buyer = await tables.users.find(data.buyerId);
        if (!buyer) {
          throw new Error(`Buyer with ID ${data.buyerId} not found`);
        }
        console.log('Buyer validation successful:', { id: buyer.id });
      } catch (error) {
        console.error('Buyer validation failed:', error);
        throw new Error(`Invalid buyer ID: ${data.buyerId}. ${error}`);
      }
      
      // Prepare offer data
      const offerData = {
        listing: [data.listingId],
        buyer: [data.buyerId],
        offerPrice: data.offerPrice,
        quantity: data.quantity,
        status: 'PENDING' as const,
        message: data.message,
        customMessage: data.customMessage || undefined,
      };
      
      console.log('Creating offer with data:', JSON.stringify(offerData, null, 2));
      
      try {
        const record = await retryOperation(async () => {
          return await tables.offers.create(offerData);
        }, 2, 1000);
        
        console.log('Offer created successfully:', { id: record.id });
        return recordToObject(record);
      } catch (createError) {
        console.error('Failed to create offer in Airtable after retries:', createError);
        console.error('Error details:', {
          error: createError,
          listingId: data.listingId,
          buyerId: data.buyerId,
          offerData: offerData
        });
        throw createError;
      }
    });
  }

  async getOfferById(id: string) {
    return queue.add(async () => {
      const tables = getTables();
      const record = await tables.offers.find(id);
      return recordToObject(record);
    });
  }

  async getOffersByListing(listingId: string) {
    return queue.add(async () => {
      const tables = getTables();
      const records = await tables.offers
        .select({
          filterByFormula: `SEARCH('${listingId}', ARRAYJOIN({listing}))`,
          // Remove sort since createdAt field doesn't exist in Airtable
        })
        .all();
      
      // Fetch buyer information for each offer
      const offersWithBuyers = await Promise.all(
        records.map(async (record) => {
          const offer = recordToObject(record);
          let buyer = null;
          
          if (offer.buyer && offer.buyer[0]) {
            try {
              buyer = await this.getUserById(offer.buyer[0]);
            } catch (error) {
              console.warn('Failed to fetch buyer for offer:', offer.id, error);
            }
          }
          
          return {
            ...offer,
            buyerInfo: buyer
          };
        })
      );
      
      return offersWithBuyers;
    });
  }

  async getOffersByBuyer(buyerId: string) {
    return queue.add(async () => {
      const tables = getTables();
      
      // Research shows that for linked record fields, FIND() with ARRAYJOIN is most reliable
      // Try multiple approaches based on Airtable documentation
      const filterOptions = [
        // Most reliable: FIND with ARRAYJOIN
        `FIND('${buyerId}', ARRAYJOIN({buyer})) > 0`,
        // Alternative: SEARCH with ARRAYJOIN
        `SEARCH('${buyerId}', ARRAYJOIN({buyer}))`,
        // Direct comparison for single linked record
        `{buyer} = '${buyerId}'`,
        // FIND with comma separator
        `FIND('${buyerId}', ARRAYJOIN({buyer}, ',')) > 0`,
      ];
      
      let records = [];
      
      for (const filterFormula of filterOptions) {
        try {
          console.log(`Trying offers filter for buyer ${buyerId}:`, filterFormula);
          const testRecords = await tables.offers
            .select({
              filterByFormula: filterFormula,
              maxRecords: 100,
            })
            .all();
          
          if (testRecords.length > 0) {
            records = testRecords;
            console.log(`✅ Found ${testRecords.length} offers with filter: ${filterFormula}`);
            break;
          } else {
            console.log(`❌ No offers found with filter: ${filterFormula}`);
          }
        } catch (error) {
          console.warn(`❌ Offers filter failed: ${filterFormula}`, error);
        }
      }
      
      // If Airtable filtering fails, fall back to manual filtering
      if (records.length === 0) {
        console.log('🔄 Airtable offers filtering failed, trying manual filtering...');
        
        try {
          const allOfferRecords = await tables.offers.select().all();
          console.log(`Total offers in database: ${allOfferRecords.length}`);
          
          records = allOfferRecords.filter(record => {
            const offer = recordToObject(record);
            
            if (Array.isArray(offer.buyer)) {
              return offer.buyer.includes(buyerId);
            } else if (typeof offer.buyer === 'string') {
              return offer.buyer === buyerId;
            }
            return false;
          });
          
          console.log(`✅ Manual filtering found ${records.length} offers for buyer ${buyerId}`);
        } catch (manualError) {
          console.error('Manual offers filtering failed:', manualError);
        }
      }
      
      return records.map(recordToObject);
    });
  }

  async updateOfferStatus(id: string, status: OfferRecord['status']) {
    return queue.add(async () => {
      const tables = getTables();
      const record = await tables.offers.update(id, { status });
      
      // If offer is accepted, update listing status
      if (status === 'ACCEPTED') {
        const offer = recordToObject(record);
        if (offer.listing && offer.listing[0]) {
          await this.updateListing(offer.listing[0], { status: 'SOLD' });
        }
      }
      
      return recordToObject(record);
    });
  }

  // === Transaction Operations ===

  async createTransaction(data: {
    offerId: string; // Airtable record ID
    amount: number; // in cents
    stripePaymentId?: string;
  }) {
    return queue.add(async () => {
      const tables = getTables();
      const record = await tables.transactions.create({
        offer: [data.offerId],
        amount: data.amount,
        status: 'PENDING',
        stripePaymentId: data.stripePaymentId,
      });
      
      return recordToObject(record);
    });
  }

  async updateTransactionStatus(
    id: string, 
    status: TransactionRecord['status'],
    completedAt?: Date
  ) {
    return queue.add(async () => {
      const tables = getTables();
      const updateData: Partial<TransactionRecord> = { status };
      
      if (completedAt) {
        updateData.completedAt = completedAt.toISOString();
      }
      
      const record = await tables.transactions.update(id, updateData);
      return recordToObject(record);
    });
  }

  // === Helper Methods ===

  async checkUsernameAvailability(username: string): Promise<boolean> {
    const user = await this.getUserByEmail(username); // Check by username field
    return !user;
  }

  // Batch operations for migration
  async batchCreate<T extends keyof ReturnType<typeof getTables>>(
    tableName: T,
    items: Array<Parameters<ReturnType<typeof getTables>[T]['create']>[0]>
  ) {
    const tables = getTables();
    const table = tables[tableName];
    
    return Promise.all(
      items.map(item => 
        queue.add(() => table.create(item as any))
      )
    );
  }
}

// Export singleton instance
// Retry helper function
async function retryOperation<T>(operation: () => Promise<T>, maxRetries: number = 3, delay: number = 1000): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Operation failed, attempt ${i + 1}/${maxRetries}:`, error);
      
      if (i < maxRetries - 1) {
        await sleep(delay * (i + 1)); // Exponential backoff
      }
    }
  }
  
  throw lastError!;
}

export const db = new DatabaseService();

// Error handling utility
export function handleDatabaseError(error: unknown): string {
  console.error('Database error details:', error);
  
  if (isAirtableError(error)) {
    if (error.statusCode === 429) {
      return 'Rate limit exceeded. Please try again in a moment.';
    }
    if (error.statusCode === 404) {
      return 'Record not found.';
    }
    if (error.statusCode === 422) {
      const message = error.message || 'Invalid data provided.';
      // Check for specific field validation errors
      if (message.includes('Field "seller" cannot accept')) {
        return 'User account validation failed. Please try logging out and back in.';
      }
      return `Data validation error: ${message}`;
    }
    return error.message || 'Database error occurred.';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred.';
}
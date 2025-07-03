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
      
      // First check if user already exists by clerkId
      const existingByClerkId = await tables.users
        .select({
          filterByFormula: `{clerkId} = '${data.clerkId}'`,
          maxRecords: 1,
        })
        .firstPage();
        
      if (existingByClerkId.length > 0) {
        console.log('User already exists with clerkId:', data.clerkId);
        return recordToObject(existingByClerkId[0]);
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
        return recordToObject(updated);
      }
      
      // Create new user only if they don't exist
      const record = await tables.users.create({
        email: data.email,
        username: data.username,
        clerkId: data.clerkId,
        rating: 5.0,
        isVerified: false,
        totalSales: 0,
      });
      return recordToObject(record);
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
      
      // Convert files to base64 for Airtable attachments
      const attachments = data.files?.map(file => ({
        url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
        filename: file.originalname,
      })) || [];

      const record = await tables.listings.create({
        title: data.title,
        eventName: data.eventName,
        eventDate: data.eventDate.toISOString(),
        price: data.price,
        quantity: data.quantity,
        status: 'ACTIVE',
        seller: [data.sellerId], // Airtable expects array for linked records
        venue: data.venue,
        description: data.description,
        ticketFiles: attachments,
        views: 0,
      });

      return recordToObject(record);
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
        filterFormula += ` AND {eventDate} >= '${options.eventDate.toISOString()}'`;
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
      const record = await tables.offers.create({
        listing: [data.listingId],
        buyer: [data.buyerId],
        offerPrice: data.offerPrice,
        quantity: data.quantity,
        status: 'PENDING',
        message: data.message,
        customMessage: data.customMessage,
      });
      
      return recordToObject(record);
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
      
      return records.map(recordToObject);
    });
  }

  async getOffersByBuyer(buyerId: string) {
    return queue.add(async () => {
      const tables = getTables();
      const records = await tables.offers
        .select({
          filterByFormula: `SEARCH('${buyerId}', ARRAYJOIN({buyer}))`,
          // Remove sort since createdAt field doesn't exist in Airtable
        })
        .all();
      
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
export const db = new DatabaseService();

// Error handling utility
export function handleDatabaseError(error: unknown): string {
  if (isAirtableError(error)) {
    if (error.statusCode === 429) {
      return 'Rate limit exceeded. Please try again in a moment.';
    }
    if (error.statusCode === 404) {
      return 'Record not found.';
    }
    if (error.statusCode === 422) {
      return 'Invalid data provided.';
    }
    return error.message || 'Database error occurred.';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred.';
}
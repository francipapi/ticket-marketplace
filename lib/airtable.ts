import Airtable from 'airtable';
import type { FieldSet } from 'airtable';

// Initialize Airtable - will use environment variables
let base: Airtable.Base | null = null;

// Initialize base only when environment variables are available
export function getAirtableBase() {
  if (!base) {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    
    if (!apiKey) {
      console.error('AIRTABLE_API_KEY is not set in environment variables');
    }
    if (!baseId) {
      console.error('AIRTABLE_BASE_ID is not set in environment variables');
    }
    
    if (apiKey && baseId) {
      base = new Airtable({ apiKey }).base(baseId);
    }
  }
  return base;
}

// Type definitions for our Airtable records
export interface UserRecord extends FieldSet {
  email: string;
  username: string;
  clerkId: string;
  rating?: number;
  isVerified?: boolean;
  totalSales?: number;
  stripeAccountId?: string;
  createdAt?: string;
}

export interface ListingRecord extends FieldSet {
  title: string;
  eventName: string;
  eventDate: string;
  price: number; // in cents
  quantity: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SOLD' | 'DELISTED';
  seller?: string[]; // Array of record IDs linking to Users (optional in case field is misconfigured)
  sellerId?: string; // Alternative field name
  userId?: string; // Alternative field name
  venue?: string;
  description?: string;
  ticketFiles?: Array<{
    id: string;
    url: string;
    filename: string;
    size: number;
    type: string;
  }>;
  views?: number;
  createdAt?: string;
}

export interface OfferRecord extends FieldSet {
  offerCode?: string; // Formula field
  listing: string[]; // Array of record IDs linking to Listings
  buyer: string[]; // Array of record IDs linking to Users
  offerPrice: number; // in cents
  quantity: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'COMPLETED';
  message: 'Buy at asking price' | 'Make offer' | 'Check availability';
  customMessage?: string;
  createdAt?: string;
}

export interface TransactionRecord extends FieldSet {
  transactionId?: string; // Formula field
  offer: string[]; // Array of record IDs linking to Offers
  amount: number; // in cents
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  stripePaymentId?: string;
  completedAt?: string;
  createdAt?: string;
}

// Table names as constants
export const TABLE_NAMES = {
  USERS: 'Users',
  LISTINGS: 'Listings',
  OFFERS: 'Offers',
  TRANSACTIONS: 'Transactions',
} as const;

// Helper to get typed table references
export function getTables() {
  const airtableBase = getAirtableBase();
  if (!airtableBase) {
    throw new Error('Airtable not initialized. Check your environment variables.');
  }

  return {
    users: airtableBase<UserRecord>(TABLE_NAMES.USERS),
    listings: airtableBase<ListingRecord>(TABLE_NAMES.LISTINGS),
    offers: airtableBase<OfferRecord>(TABLE_NAMES.OFFERS),
    transactions: airtableBase<TransactionRecord>(TABLE_NAMES.TRANSACTIONS),
  };
}

// Helper to convert Airtable record to plain object
export function recordToObject<T extends FieldSet>(
  record: Airtable.Record<T>
): T & { id: string; createdAt: string } {
  return {
    id: record.id,
    ...record.fields,
    createdAt: record._rawJson?.createdTime || new Date().toISOString(),
  } as T & { id: string; createdAt: string };
}

// Helper to handle Airtable errors
export function isAirtableError(error: unknown): error is { statusCode?: number; message?: string } {
  return typeof error === 'object' && error !== null && 'statusCode' in error;
}

// Rate limiting helper for Airtable (5 requests per second limit)
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
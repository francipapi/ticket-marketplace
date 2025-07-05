// Prisma Listing Service Implementation (Stub)
// TODO: Implement actual Prisma integration when needed

import { 
  ListingService, 
  AppListing, 
  CreateListingData, 
  UpdateListingData,
  ListingFilters,
  PaginatedListings 
} from '../../interfaces/database.interface'

export class PrismaListingService implements ListingService {
  constructor() {
    console.log('🏭 Initializing PrismaListingService (stub implementation)')
  }

  async create(data: CreateListingData): Promise<AppListing> {
    throw new Error('PrismaListingService not implemented yet. Use AirtableListingService instead.')
  }

  async findById(id: string): Promise<AppListing | null> {
    throw new Error('PrismaListingService not implemented yet. Use AirtableListingService instead.')
  }

  async findMany(filters: ListingFilters): Promise<PaginatedListings> {
    throw new Error('PrismaListingService not implemented yet. Use AirtableListingService instead.')
  }

  async findByUserId(userId: string, filters?: Partial<ListingFilters>): Promise<PaginatedListings> {
    throw new Error('PrismaListingService not implemented yet. Use AirtableListingService instead.')
  }

  async update(id: string, data: UpdateListingData): Promise<AppListing> {
    throw new Error('PrismaListingService not implemented yet. Use AirtableListingService instead.')
  }

  async delete(id: string): Promise<boolean> {
    throw new Error('PrismaListingService not implemented yet. Use AirtableListingService instead.')
  }

  async incrementViews(id: string): Promise<AppListing> {
    throw new Error('PrismaListingService not implemented yet. Use AirtableListingService instead.')
  }

  async updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'SOLD' | 'DELISTED'): Promise<AppListing> {
    throw new Error('PrismaListingService not implemented yet. Use AirtableListingService instead.')
  }
}
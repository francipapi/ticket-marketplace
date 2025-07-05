// Prisma Offer Service Implementation (Stub)
// TODO: Implement actual Prisma integration when needed

import { 
  OfferService, 
  AppOffer, 
  CreateOfferData, 
  UpdateOfferData,
  OfferFilters,
  PaginatedOffers 
} from '../../interfaces/database.interface'

export class PrismaOfferService implements OfferService {
  constructor() {
    console.log('🏭 Initializing PrismaOfferService (stub implementation)')
  }

  async create(data: CreateOfferData): Promise<AppOffer> {
    throw new Error('PrismaOfferService not implemented yet. Use AirtableOfferService instead.')
  }

  async findById(id: string): Promise<AppOffer | null> {
    throw new Error('PrismaOfferService not implemented yet. Use AirtableOfferService instead.')
  }

  async findMany(filters: OfferFilters): Promise<PaginatedOffers> {
    throw new Error('PrismaOfferService not implemented yet. Use AirtableOfferService instead.')
  }

  async findByListingId(listingId: string, filters?: Partial<OfferFilters>): Promise<PaginatedOffers> {
    throw new Error('PrismaOfferService not implemented yet. Use AirtableOfferService instead.')
  }

  async findByBuyerId(buyerId: string, filters?: Partial<OfferFilters>): Promise<PaginatedOffers> {
    throw new Error('PrismaOfferService not implemented yet. Use AirtableOfferService instead.')
  }

  async update(id: string, data: UpdateOfferData): Promise<AppOffer> {
    throw new Error('PrismaOfferService not implemented yet. Use AirtableOfferService instead.')
  }

  async delete(id: string): Promise<boolean> {
    throw new Error('PrismaOfferService not implemented yet. Use AirtableOfferService instead.')
  }

  async updateStatus(id: string, status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'COMPLETED'): Promise<AppOffer> {
    throw new Error('PrismaOfferService not implemented yet. Use AirtableOfferService instead.')
  }

  async acceptOffer(id: string): Promise<AppOffer> {
    throw new Error('PrismaOfferService not implemented yet. Use AirtableOfferService instead.')
  }

  async rejectOffer(id: string): Promise<AppOffer> {
    throw new Error('PrismaOfferService not implemented yet. Use AirtableOfferService instead.')
  }
}
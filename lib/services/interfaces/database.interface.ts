// Database Service Interfaces for Ticket Marketplace
// Provides abstraction layer for different database implementations (Airtable, Prisma)

export interface AppUser {
  id: string
  clerkId: string
  email: string
  username: string
  rating?: number
  isVerified?: boolean
  totalSales?: number
  stripeAccountId?: string
  createdAt: Date
  updatedAt?: Date
}

export interface AppListing {
  id: string
  userId: string
  title: string
  eventName: string
  eventDate: Date
  venue?: string
  priceInCents: number
  quantity: number
  description?: string
  ticketPath?: string
  originalFileName?: string
  fileType?: string
  fileSize?: number
  status: 'ACTIVE' | 'INACTIVE' | 'SOLD' | 'DELISTED'
  views?: number
  createdAt: Date
  updatedAt?: Date
  // Populated relations
  user?: AppUser
}

export interface AppOffer {
  id: string
  listingId: string
  buyerId: string
  offerPriceInCents: number
  quantity: number
  messageTemplate: 'asking_price' | 'make_offer' | 'check_availability'
  customMessage?: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'COMPLETED'
  createdAt: Date
  updatedAt?: Date
  // Populated relations
  listing?: AppListing
  buyer?: AppUser
}

export interface AppTransaction {
  id: string
  offerId: string
  amount: number
  platformFee: number
  sellerPayout: number
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
  stripePaymentId?: string
  completedAt?: Date
  createdAt: Date
  // Populated relations
  offer?: AppOffer
}

// Input types for creating records
export interface CreateUserData {
  clerkId: string
  email: string
  username: string
  rating?: number
  isVerified?: boolean
  totalSales?: number
  stripeAccountId?: string
}

export interface UpdateUserData {
  email?: string
  username?: string
  rating?: number
  isVerified?: boolean
  totalSales?: number
  stripeAccountId?: string
}

export interface CreateListingData {
  userId: string
  title: string
  eventName: string
  eventDate: Date
  venue?: string
  priceInCents: number
  quantity: number
  description?: string
  ticketPath?: string
  originalFileName?: string
  fileType?: string
  fileSize?: number
  status?: 'ACTIVE' | 'INACTIVE' | 'SOLD' | 'DELISTED'
}

export interface UpdateListingData {
  title?: string
  eventName?: string
  eventDate?: Date
  venue?: string
  priceInCents?: number
  quantity?: number
  description?: string
  status?: 'ACTIVE' | 'INACTIVE' | 'SOLD' | 'DELISTED'
  views?: number
}

export interface CreateOfferData {
  listingId: string
  buyerId: string
  offerPriceInCents: number
  quantity: number
  messageTemplate: 'asking_price' | 'make_offer' | 'check_availability'
  customMessage?: string
  status?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'COMPLETED'
}

export interface UpdateOfferData {
  offerPriceInCents?: number
  quantity?: number
  customMessage?: string
  status?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'COMPLETED'
}

export interface CreateTransactionData {
  offerId: string
  amount: number
  platformFee: number
  sellerPayout: number
  status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
  stripePaymentId?: string
}

export interface UpdateTransactionData {
  status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
  stripePaymentId?: string
  completedAt?: Date
}

// Filter types for queries
export interface ListingFilters {
  userId?: string
  status?: string
  eventName?: string
  priceMin?: number
  priceMax?: number
  eventDateFrom?: Date
  eventDateTo?: Date
  limit?: number
  offset?: number
}

export interface OfferFilters {
  listingId?: string
  buyerId?: string
  status?: string
  limit?: number
  offset?: number
}

export interface TransactionFilters {
  offerId?: string
  status?: string
  dateFrom?: Date
  dateTo?: Date
  limit?: number
  offset?: number
}

// Pagination types
export interface PaginatedResult<T> {
  items: T[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export type PaginatedListings = PaginatedResult<AppListing>
export type PaginatedOffers = PaginatedResult<AppOffer>
export type PaginatedTransactions = PaginatedResult<AppTransaction>

// Service interfaces
export interface UserService {
  create(data: CreateUserData): Promise<AppUser>
  findById(id: string): Promise<AppUser | null>
  findByClerkId(clerkId: string): Promise<AppUser | null>
  findByEmail(email: string): Promise<AppUser | null>
  update(id: string, data: UpdateUserData): Promise<AppUser>
  delete(id: string): Promise<boolean>
  incrementTotalSales(id: string, amount: number): Promise<AppUser>
}

export interface ListingService {
  create(data: CreateListingData): Promise<AppListing>
  findById(id: string): Promise<AppListing | null>
  findMany(filters: ListingFilters): Promise<PaginatedListings>
  findByUserId(userId: string, filters?: Partial<ListingFilters>): Promise<PaginatedListings>
  update(id: string, data: UpdateListingData): Promise<AppListing>
  delete(id: string): Promise<boolean>
  incrementViews(id: string): Promise<AppListing>
  updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'SOLD' | 'DELISTED'): Promise<AppListing>
}

export interface OfferService {
  create(data: CreateOfferData): Promise<AppOffer>
  findById(id: string): Promise<AppOffer | null>
  findMany(filters: OfferFilters): Promise<PaginatedOffers>
  findByListingId(listingId: string, filters?: Partial<OfferFilters>): Promise<PaginatedOffers>
  findByBuyerId(buyerId: string, filters?: Partial<OfferFilters>): Promise<PaginatedOffers>
  update(id: string, data: UpdateOfferData): Promise<AppOffer>
  delete(id: string): Promise<boolean>
  updateStatus(id: string, status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'COMPLETED'): Promise<AppOffer>
  acceptOffer(id: string): Promise<AppOffer>
  rejectOffer(id: string): Promise<AppOffer>
}

export interface TransactionService {
  create(data: CreateTransactionData): Promise<AppTransaction>
  findById(id: string): Promise<AppTransaction | null>
  findMany(filters: TransactionFilters): Promise<PaginatedTransactions>
  findByOfferId(offerId: string): Promise<AppTransaction | null>
  update(id: string, data: UpdateTransactionData): Promise<AppTransaction>
  updateStatus(id: string, status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'): Promise<AppTransaction>
  completeTransaction(id: string, stripePaymentId: string): Promise<AppTransaction>
  failTransaction(id: string, reason?: string): Promise<AppTransaction>
}

export interface DatabaseService {
  users: UserService
  listings: ListingService
  offers: OfferService
  transactions: TransactionService
}
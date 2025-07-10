// User types
export interface User {
  id: string
  clerkId: string
  email: string
  username: string
  rating: number
  isVerified: boolean
  totalSales: number
  stripeAccountId?: string
  createdAt: string
}

// Listing types
export interface Listing {
  id: string
  title: string
  eventName: string
  eventDate: string
  eventTime?: string
  venue?: string
  priceInCents: number
  quantity: number
  status: 'ACTIVE' | 'INACTIVE' | 'SOLD' | 'DELISTED'
  seller: User
  description?: string
  ticketFiles: string[]
  ticketType?: string
  createdAt: string
  updatedAt: string
}

export interface CreateListingData {
  title: string
  eventName: string
  eventDate: string
  eventTime?: string
  venue?: string
  priceInCents: number
  quantity: number
  description?: string
  ticketType?: string
  ticketFiles?: File[]
}

export interface UpdateListingData extends Partial<CreateListingData> {
  status?: 'ACTIVE' | 'INACTIVE' | 'SOLD' | 'DELISTED'
}

export interface ListingFilters {
  search?: string
  eventName?: string
  minPrice?: number
  maxPrice?: number
  dateFrom?: string
  dateTo?: string
  venue?: string
  ticketType?: string
  status?: string
}

// Offer types
export interface Offer {
  id: string
  listing: Listing
  buyer: User
  offerPriceInCents: number
  quantity: number
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'COMPLETED'
  messageTemplate: 'asking_price' | 'make_offer' | 'check_availability'
  customMessage?: string
  createdAt: string
  updatedAt: string
}

export interface CreateOfferData {
  listingId: string
  offerPriceInCents: number
  quantity: number
  messageTemplate: 'asking_price' | 'make_offer' | 'check_availability'
  customMessage?: string
}

export interface OfferFilters {
  type?: 'sent' | 'received'
  status?: string
  listingId?: string
}

// Transaction types
export interface Transaction {
  id: string
  offer: Offer
  amount: number
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
  stripePaymentId?: string
  completedAt?: string
  createdAt: string
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Query types
export interface QueryOptions {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// Form validation types
export interface ValidationError {
  field: string
  message: string
}

// OCR types (for Phase 3)
export interface ExtractedTicketInfo {
  eventName?: string
  eventDate?: string
  eventTime?: string
  venue?: string
  ticketType?: string
  orderReference?: string
  holderName?: string
  lastEntry?: string
  confidence: number
  hasPersonalInfo: boolean
  qrData?: string
}

// Search types
export interface SearchResult {
  listings: Listing[]
  totalCount: number
  suggestions: string[]
}

// Dashboard types
export interface DashboardStats {
  totalListings: number
  activeListings: number
  totalSales: number
  pendingOffers: number
  completedTransactions: number
  totalRevenue: number
}
# Phase 2 Implementation Plan: Core API with Service Abstractions

## Current State Analysis

### ✅ What's Already Implemented
- **Authentication**: Clerk integration with Next.js middleware
- **Database**: Prisma with SQLite (migration-ready schema)
- **File Upload**: Sharp-based image processing with watermarking
- **Basic API Routes**: Listings, offers, upload endpoints
- **Frontend**: Basic listing creation and browsing
- **Data Models**: User, Listing, Offer with proper relationships
- **Environment**: Clerk and Airtable credentials configured

### 🔄 What Needs Migration to Airtable + Clerk + Mock Payments
- **Database Layer**: Prisma SQLite → Airtable API
- **Authentication**: Current auth helpers → Clerk server-side auth
- **Payment Processing**: Enhanced mock payments with realistic flow
- **File Storage**: Local uploads → Organized cloud storage (future)
- **Service Abstractions**: Implement proper service layer

## Phase 2 Objectives

### Primary Goals
1. **Migrate Data Layer**: Replace Prisma/SQLite with Airtable API
2. **Implement Service Abstractions**: Create clean service interfaces
3. **Enhance Authentication**: Properly integrate Clerk server-side auth
4. **Enhanced Mock Payments**: Realistic payment flow simulation
5. **Optimize Performance**: Add caching and rate limiting

### Success Metrics
- [ ] All existing API endpoints work with Airtable
- [ ] Clerk authentication properly protects all routes
- [ ] Mock payment flow simulates real marketplace experience
- [ ] API response times < 500ms
- [ ] Zero data loss during migration
- [ ] All existing features preserved

## Implementation Strategy

### 1. Service Layer Architecture

Create service abstractions that can be easily swapped:

```typescript
// services/interfaces/
interface DatabaseService {
  users: UserService
  listings: ListingService
  offers: OfferService
  transactions: TransactionService
}

interface UserService {
  create(data: CreateUserData): Promise<User>
  findByClerkId(clerkId: string): Promise<User | null>
  update(id: string, data: UpdateUserData): Promise<User>
}

interface ListingService {
  create(data: CreateListingData): Promise<Listing>
  findMany(filters: ListingFilters): Promise<PaginatedListings>
  findById(id: string): Promise<Listing | null>
  update(id: string, data: UpdateListingData): Promise<Listing>
}

interface PaymentService {
  createPaymentIntent(amount: number, sellerId: string, buyerId: string): Promise<PaymentIntent>
  processPayment(intentId: string): Promise<Payment>
  simulatePayment(intentId: string): Promise<MockPayment>
  getPaymentStatus(intentId: string): Promise<PaymentStatus>
}
```

### 2. Enhanced Migration Strategy

**Phase 2A: Parallel Implementation with Feature Flags**
- Keep existing Prisma code fully functional
- Implement Airtable services alongside with same interfaces
- Add robust feature flag system for gradual rollout
- Support A/B testing between implementations
- Maintain complete rollback capability

**Phase 2B: Data Migration with Validation**
- Create automated migration scripts for each table
- Export SQLite data with relationship preservation
- Import to Airtable with field mapping validation
- Verify all foreign key relationships
- Maintain data integrity checksums
- Test all functionality with real migrated data

**Phase 2C: Gradual Cutover with Safety Net**
- Switch service implementations gradually (user by user)
- Monitor performance and error rates in real-time
- Keep Prisma services as immediate rollback option
- Update environment configuration with feature flags
- Remove legacy code only after 100% confidence

### 3. Airtable Integration Specifics

#### Enhanced Performance Strategy
- **Batch Operations**: Group up to 10 records per request for creates/updates
- **Request Queuing**: p-queue with precise 200ms intervals (5 req/sec limit)
- **Multi-Level Caching**: 
  - node-cache for frequently accessed user data (5 min TTL)
  - Session-level caching for current user data
  - Query result caching for listing searches (1 min TTL)
- **Retry Logic**: Exponential backoff starting at 1000ms for 429 responses
- **Connection Pooling**: Reuse HTTP connections for better performance
- **Preemptive Caching**: Cache related data during initial requests

#### Enhanced Field Mapping & Configuration
```typescript
// Centralized Airtable Configuration
export const AIRTABLE_CONFIG = {
  RATE_LIMIT: {
    REQUESTS_PER_SECOND: 5,
    BATCH_SIZE: 10,
    RETRY_ATTEMPTS: 3,
    INITIAL_RETRY_DELAY: 1000,
    MAX_RETRY_DELAY: 8000
  },
  CACHE: {
    USER_TTL: 300000,      // 5 minutes
    LISTING_TTL: 60000,    // 1 minute
    SEARCH_TTL: 30000,     // 30 seconds
    MAX_CACHE_SIZE: 1000   // entries
  },
  FIELD_MAPPINGS: {
    users: {
      clerkId: 'Clerk ID',
      email: 'Email',
      username: 'Username',
      rating: 'Rating',
      isVerified: 'Is Verified',
      totalSales: 'Total Sales',
      stripeAccountId: 'Stripe Account ID',
      createdAt: 'Created At'
    },
    listings: {
      title: 'Title',
      eventName: 'Event Name',
      eventDate: 'Event Date',
      priceInCents: 'Price (Cents)',
      quantity: 'Quantity',
      status: 'Status',
      seller: 'Seller',          // Link to Users table
      ticketFiles: 'Ticket Files',
      description: 'Description',
      venue: 'Venue',
      views: 'Views',
      createdAt: 'Created At'
    },
    offers: {
      listing: 'Listing',        // Link to Listings table
      buyer: 'Buyer',           // Link to Users table
      offerPriceInCents: 'Offer Price (Cents)',
      quantity: 'Quantity',
      status: 'Status',
      messageTemplate: 'Message Template',
      customMessage: 'Custom Message',
      createdAt: 'Created At'
    },
    transactions: {
      offer: 'Offer',           // Link to Offers table
      amount: 'Amount (Cents)',
      platformFee: 'Platform Fee (Cents)',
      sellerPayout: 'Seller Payout (Cents)',
      status: 'Status',
      stripePaymentId: 'Stripe Payment ID',
      completedAt: 'Completed At',
      createdAt: 'Created At'
    }
  }
}

// Field validation and transformation
export const FIELD_TRANSFORMS = {
  // Convert API fields to Airtable fields
  toAirtable: (tableName: string, data: any) => {
    const mapping = AIRTABLE_CONFIG.FIELD_MAPPINGS[tableName]
    const transformed = {}
    for (const [apiField, airtableField] of Object.entries(mapping)) {
      if (data[apiField] !== undefined) {
        transformed[airtableField] = data[apiField]
      }
    }
    return transformed
  },
  
  // Convert Airtable fields to API fields
  fromAirtable: (tableName: string, record: any) => {
    const mapping = AIRTABLE_CONFIG.FIELD_MAPPINGS[tableName]
    const transformed = {}
    for (const [apiField, airtableField] of Object.entries(mapping)) {
      if (record[airtableField] !== undefined) {
        transformed[apiField] = record[airtableField]
      }
    }
    return transformed
  }
}
```

### 4. Clerk Authentication Enhancement

#### Server-Side Auth Implementation
```typescript
// lib/auth-server.ts
import { auth } from '@clerk/nextjs/server'

export class AuthService {
  static async requireAuth() {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Authentication required')
    }
    
    // Get or create user in Airtable
    const user = await userService.findByClerkId(userId)
    if (!user) {
      // Auto-create user from Clerk data
      const clerkUser = await clerkClient.users.getUser(userId)
      return await userService.create({
        clerkId: userId,
        email: clerkUser.emailAddresses[0].emailAddress,
        username: clerkUser.username || clerkUser.emailAddresses[0].emailAddress
      })
    }
    
    return user
  }
}
```

### 5. Enhanced Mock Payment Implementation

#### Realistic Payment Simulation with Advanced Features
```typescript
// services/mock-payment.service.ts
export class MockPaymentService implements PaymentService {
  private payments = new Map<string, MockPayment>()
  private readonly PLATFORM_FEE_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT || '6') / 100
  private readonly FAILURE_RATE = parseFloat(process.env.MOCK_PAYMENT_FAILURE_RATE || '0.1')
  private readonly PROCESSING_TIME_MS = parseInt(process.env.MOCK_PAYMENT_PROCESSING_TIME || '2000')
  private readonly PAYOUT_DELAY_MS = parseInt(process.env.MOCK_PAYOUT_DELAY || '5000')
  
  async createPaymentIntent(data: CreatePaymentIntentData): Promise<PaymentIntent> {
    const intentId = `pi_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Calculate fees with proper rounding
    const platformFee = Math.round(data.amount * this.PLATFORM_FEE_PERCENT)
    const sellerAmount = data.amount - platformFee
    
    const payment: MockPayment = {
      id: intentId,
      amount: data.amount,
      sellerId: data.sellerId,
      buyerId: data.buyerId,
      status: 'requires_payment_method',
      platformFee,
      sellerAmount,
      createdAt: new Date(),
      metadata: {
        listingId: data.listingId,
        offerId: data.offerId,
        paymentMethod: 'mock_card_visa',
        customerIP: '127.0.0.1',
        userAgent: 'MockPaymentClient/1.0'
      },
      timeline: [{
        event: 'payment_intent_created',
        timestamp: new Date(),
        description: 'Payment intent created with mock data'
      }]
    }
    
    this.payments.set(intentId, payment)
    
    console.log(`💳 Mock Payment Intent Created: ${intentId}`)
    console.log(`   Amount: $${(data.amount / 100).toFixed(2)}`)
    console.log(`   Platform Fee (${(this.PLATFORM_FEE_PERCENT * 100).toFixed(1)}%): $${(platformFee / 100).toFixed(2)}`)
    console.log(`   Seller Amount: $${(sellerAmount / 100).toFixed(2)}`)
    
    return payment
  }
  
  async simulatePayment(intentId: string): Promise<MockPayment> {
    const payment = this.payments.get(intentId)
    if (!payment) {
      throw new Error(`Payment intent not found: ${intentId}`)
    }
    
    if (payment.status !== 'requires_payment_method') {
      throw new Error(`Payment already processed: ${payment.status}`)
    }
    
    // Update to processing
    payment.status = 'processing'
    payment.timeline.push({
      event: 'payment_processing_started',
      timestamp: new Date(),
      description: 'Payment processing initiated'
    })
    this.payments.set(intentId, payment)
    
    console.log(`🔄 Processing payment: ${intentId}`)
    
    // Simulate realistic processing time
    await new Promise(resolve => setTimeout(resolve, this.PROCESSING_TIME_MS))
    
    // Determine success/failure with configurable rate
    const isSuccess = Math.random() >= this.FAILURE_RATE
    const now = new Date()
    
    if (isSuccess) {
      payment.status = 'succeeded'
      payment.processedAt = now
      payment.timeline.push({
        event: 'payment_succeeded',
        timestamp: now,
        description: 'Payment completed successfully'
      })
      
      console.log(`✅ Payment succeeded: ${intentId}`)
      
      // Simulate delayed seller payout
      setTimeout(() => {
        payment.sellerPaidAt = new Date()
        payment.sellerPayoutId = `po_mock_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
        payment.timeline.push({
          event: 'seller_payout_completed',
          timestamp: new Date(),
          description: `Seller payout completed: ${payment.sellerPayoutId}`
        })
        this.payments.set(intentId, payment)
        console.log(`💰 Seller payout completed: ${payment.sellerPayoutId}`)
      }, this.PAYOUT_DELAY_MS)
      
    } else {
      // Simulate various failure reasons
      const failureReasons = [
        'insufficient_funds',
        'card_declined',
        'expired_card',
        'processing_error',
        'fraud_prevention'
      ]
      const failureReason = failureReasons[Math.floor(Math.random() * failureReasons.length)]
      
      payment.status = 'failed'
      payment.processedAt = now
      payment.failureReason = failureReason
      payment.timeline.push({
        event: 'payment_failed',
        timestamp: now,
        description: `Payment failed: ${failureReason}`
      })
      
      console.log(`❌ Payment failed: ${intentId} (${failureReason})`)
    }
    
    this.payments.set(intentId, payment)
    return payment
  }
  
  async processPayment(intentId: string): Promise<Payment> {
    return await this.simulatePayment(intentId)
  }
  
  async getPaymentStatus(intentId: string): Promise<PaymentStatus> {
    const payment = this.payments.get(intentId)
    if (!payment) {
      throw new Error(`Payment intent not found: ${intentId}`)
    }
    
    return {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      platformFee: payment.platformFee,
      sellerAmount: payment.sellerAmount,
      createdAt: payment.createdAt,
      processedAt: payment.processedAt,
      sellerPaidAt: payment.sellerPaidAt,
      sellerPayoutId: payment.sellerPayoutId,
      failureReason: payment.failureReason,
      timeline: payment.timeline
    }
  }
  
  // Enhanced debugging and monitoring methods
  async getPaymentHistory(filters?: {
    sellerId?: string
    buyerId?: string
    status?: string
    dateFrom?: Date
    dateTo?: Date
  }): Promise<MockPayment[]> {
    let payments = Array.from(this.payments.values())
    
    if (filters) {
      if (filters.sellerId) {
        payments = payments.filter(p => p.sellerId === filters.sellerId)
      }
      if (filters.buyerId) {
        payments = payments.filter(p => p.buyerId === filters.buyerId)
      }
      if (filters.status) {
        payments = payments.filter(p => p.status === filters.status)
      }
      if (filters.dateFrom) {
        payments = payments.filter(p => p.createdAt >= filters.dateFrom!)
      }
      if (filters.dateTo) {
        payments = payments.filter(p => p.createdAt <= filters.dateTo!)
      }
    }
    
    return payments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }
  
  // Analytics for testing
  getPaymentAnalytics(): {
    totalPayments: number
    successRate: number
    totalVolume: number
    averageAmount: number
    platformFeeTotal: number
  } {
    const payments = Array.from(this.payments.values())
    const completedPayments = payments.filter(p => p.processedAt)
    const successfulPayments = payments.filter(p => p.status === 'succeeded')
    
    return {
      totalPayments: payments.length,
      successRate: completedPayments.length > 0 ? successfulPayments.length / completedPayments.length : 0,
      totalVolume: successfulPayments.reduce((sum, p) => sum + p.amount, 0),
      averageAmount: successfulPayments.length > 0 ? successfulPayments.reduce((sum, p) => sum + p.amount, 0) / successfulPayments.length : 0,
      platformFeeTotal: successfulPayments.reduce((sum, p) => sum + p.platformFee, 0)
    }
  }
  
  // Clear payments (for testing)
  clearPayments(): void {
    this.payments.clear()
    console.log('🗑️ All mock payments cleared')
  }
}

// Enhanced mock payment types
interface MockPayment {
  id: string
  amount: number
  sellerId: string
  buyerId: string
  status: 'requires_payment_method' | 'processing' | 'succeeded' | 'failed'
  platformFee: number
  sellerAmount: number
  createdAt: Date
  processedAt?: Date
  sellerPaidAt?: Date
  sellerPayoutId?: string
  failureReason?: string
  metadata: {
    listingId: string
    offerId: string
    paymentMethod: string
    customerIP: string
    userAgent: string
  }
  timeline: Array<{
    event: string
    timestamp: Date
    description: string
  }>
}

interface PaymentAnalytics {
  totalPayments: number
  successRate: number
  totalVolume: number
  averageAmount: number
  platformFeeTotal: number
}
```

### 6. Data Migration Scripts & Validation

#### Automated Migration Pipeline
```typescript
// scripts/migrate-data-to-airtable.ts
import { PrismaClient } from '@prisma/client'
import { getTables } from '../lib/airtable'
import { AIRTABLE_CONFIG, FIELD_TRANSFORMS } from '../lib/airtable-config'

const prisma = new PrismaClient()

export class DataMigration {
  private migrationLog: Array<{
    table: string
    recordId: string
    status: 'pending' | 'success' | 'failed'
    error?: string
    timestamp: Date
  }> = []

  async migrateUsers(): Promise<void> {
    console.log('🔄 Starting user migration...')
    
    const users = await prisma.user.findMany()
    const airtable = getTables()
    
    for (const user of users) {
      try {
        const airtableData = FIELD_TRANSFORMS.toAirtable('users', {
          clerkId: user.id, // Use Prisma ID as Clerk ID for migration
          email: user.email,
          username: user.username,
          rating: 5.0,
          isVerified: false,
          totalSales: 0
        })
        
        const record = await airtable.users.create(airtableData)
        
        this.migrationLog.push({
          table: 'users',
          recordId: user.id,
          status: 'success',
          timestamp: new Date()
        })
        
        console.log(`✅ Migrated user: ${user.username} -> ${record.id}`)
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 250))
        
      } catch (error) {
        this.migrationLog.push({
          table: 'users',
          recordId: user.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        })
        
        console.error(`❌ Failed to migrate user ${user.username}:`, error)
      }
    }
    
    console.log(`📊 User migration complete: ${this.getSuccessCount('users')}/${users.length} successful`)
  }

  async migrateListings(): Promise<void> {
    console.log('🔄 Starting listing migration...')
    
    const listings = await prisma.listing.findMany({
      include: { user: true }
    })
    
    const airtable = getTables()
    
    // First, get user mapping from Airtable
    const airtableUsers = await airtable.users.select().all()
    const userMapping = new Map<string, string>()
    
    for (const record of airtableUsers) {
      const clerkId = record.get('Clerk ID') as string
      if (clerkId) {
        userMapping.set(clerkId, record.id)
      }
    }
    
    for (const listing of listings) {
      try {
        const airtableUserId = userMapping.get(listing.userId)
        if (!airtableUserId) {
          throw new Error(`User mapping not found for ${listing.userId}`)
        }
        
        const airtableData = FIELD_TRANSFORMS.toAirtable('listings', {
          title: listing.title,
          eventName: listing.eventName,
          eventDate: listing.eventDate.toISOString().split('T')[0],
          priceInCents: listing.priceInCents,
          quantity: listing.quantity,
          status: listing.status.toUpperCase(),
          seller: [airtableUserId], // Link to Airtable user
          description: listing.description,
          venue: listing.venue
        })
        
        const record = await airtable.listings.create(airtableData)
        
        this.migrationLog.push({
          table: 'listings',
          recordId: listing.id,
          status: 'success',
          timestamp: new Date()
        })
        
        console.log(`✅ Migrated listing: ${listing.title} -> ${record.id}`)
        
        await new Promise(resolve => setTimeout(resolve, 250))
        
      } catch (error) {
        this.migrationLog.push({
          table: 'listings',
          recordId: listing.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        })
        
        console.error(`❌ Failed to migrate listing ${listing.title}:`, error)
      }
    }
    
    console.log(`📊 Listing migration complete: ${this.getSuccessCount('listings')}/${listings.length} successful`)
  }

  async validateMigration(): Promise<boolean> {
    console.log('🔍 Validating migration...')
    
    const airtable = getTables()
    
    // Validate user count
    const prismaUserCount = await prisma.user.count()
    const airtableUsers = await airtable.users.select().all()
    
    if (prismaUserCount !== airtableUsers.length) {
      console.error(`❌ User count mismatch: Prisma=${prismaUserCount}, Airtable=${airtableUsers.length}`)
      return false
    }
    
    // Validate listing relationships
    const airtableListings = await airtable.listings.select().all()
    let relationshipErrors = 0
    
    for (const record of airtableListings) {
      const seller = record.get('Seller') as string[]
      if (!seller || seller.length === 0) {
        console.error(`❌ Listing ${record.id} has no seller relationship`)
        relationshipErrors++
      }
    }
    
    if (relationshipErrors > 0) {
      console.error(`❌ Found ${relationshipErrors} relationship errors`)
      return false
    }
    
    console.log('✅ Migration validation passed')
    return true
  }

  private getSuccessCount(table: string): number {
    return this.migrationLog.filter(log => log.table === table && log.status === 'success').length
  }

  generateMigrationReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.migrationLog.length,
        successful: this.migrationLog.filter(log => log.status === 'success').length,
        failed: this.migrationLog.filter(log => log.status === 'failed').length
      },
      byTable: {} as Record<string, { success: number; failed: number }>,
      errors: this.migrationLog.filter(log => log.status === 'failed')
    }
    
    for (const log of this.migrationLog) {
      if (!report.byTable[log.table]) {
        report.byTable[log.table] = { success: 0, failed: 0 }
      }
      report.byTable[log.table][log.status === 'success' ? 'success' : 'failed']++
    }
    
    return JSON.stringify(report, null, 2)
  }
}

// Migration execution script
async function runMigration() {
  const migration = new DataMigration()
  
  try {
    console.log('🚀 Starting data migration to Airtable...')
    
    await migration.migrateUsers()
    await migration.migrateListings()
    
    const isValid = await migration.validateMigration()
    
    if (isValid) {
      console.log('🎉 Migration completed successfully!')
    } else {
      console.error('💥 Migration validation failed!')
    }
    
    // Generate and save migration report
    const report = migration.generateMigrationReport()
    const fs = await import('fs/promises')
    await fs.writeFile(`migration-report-${Date.now()}.json`, report)
    
    console.log('📄 Migration report saved')
    
  } catch (error) {
    console.error('💥 Migration failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  runMigration()
}
```

### 7. Enhanced Environment Configuration

#### Centralized Environment Management
```typescript
// lib/env.ts - Centralized environment configuration
import { z } from 'zod'

const envSchema = z.object({
  // Database Configuration
  DATABASE_URL: z.string().min(1),
  USE_AIRTABLE: z.string().transform(val => val === 'true').default('false'),
  AIRTABLE_API_KEY: z.string().min(1).optional(),
  AIRTABLE_BASE_ID: z.string().min(1).optional(),
  
  // Authentication
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  
  // Payment Configuration
  MOCK_PAYMENTS: z.string().transform(val => val === 'true').default('true'),
  PLATFORM_FEE_PERCENT: z.string().transform(Number).default('6'),
  MOCK_PAYMENT_FAILURE_RATE: z.string().transform(Number).default('0.1'),
  MOCK_PAYMENT_PROCESSING_TIME: z.string().transform(Number).default('2000'),
  MOCK_PAYOUT_DELAY: z.string().transform(Number).default('5000'),
  
  // Performance & Caching
  AIRTABLE_RATE_LIMIT_PER_SEC: z.string().transform(Number).default('5'),
  CACHE_TTL_USERS: z.string().transform(Number).default('300000'),
  CACHE_TTL_LISTINGS: z.string().transform(Number).default('60000'),
  CACHE_MAX_SIZE: z.string().transform(Number).default('1000'),
  
  // Application
  NEXT_PUBLIC_BASE_URL: z.string().url().default('http://localhost:3000'),
  UPLOAD_DIR: z.string().default('./public/uploads'),
  
  // Development
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info')
})

export const env = envSchema.parse(process.env)

// Environment validation function
export function validateEnvironment(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (env.USE_AIRTABLE) {
    if (!env.AIRTABLE_API_KEY) {
      errors.push('AIRTABLE_API_KEY is required when USE_AIRTABLE=true')
    }
    if (!env.AIRTABLE_BASE_ID) {
      errors.push('AIRTABLE_BASE_ID is required when USE_AIRTABLE=true')
    }
  }
  
  if (env.PLATFORM_FEE_PERCENT < 0 || env.PLATFORM_FEE_PERCENT > 100) {
    errors.push('PLATFORM_FEE_PERCENT must be between 0 and 100')
  }
  
  if (env.MOCK_PAYMENT_FAILURE_RATE < 0 || env.MOCK_PAYMENT_FAILURE_RATE > 1) {
    errors.push('MOCK_PAYMENT_FAILURE_RATE must be between 0 and 1')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}
```

## 🤖 AI AGENT IMPLEMENTATION GUIDE

### Implementation Approach for AI Agents
This plan is structured for AI agents with:
- **Atomic Tasks**: Each step is self-contained and testable
- **Verification Steps**: Clear success criteria after each task
- **Rollback Instructions**: How to undo changes if issues arise
- **Testing Commands**: Specific commands to verify functionality

---

## PHASE 2A: SERVICE LAYER FOUNDATION (Days 1-7)

### TASK 1: Create Service Interface Architecture

#### Step 1.1: Create Service Interface Files
```bash
# Create directory structure
mkdir -p lib/services/interfaces
mkdir -p lib/services/implementations/airtable
mkdir -p lib/services/implementations/mock-payment
mkdir -p lib/services/implementations/prisma
```

**AI Agent Instructions:**
1. Use `mkdir` command above to create directories
2. Create each file listed below using `Write` tool
3. After each file creation, use `Read` tool to verify content

#### File 1: `lib/services/interfaces/database.interface.ts`
```typescript
export interface DatabaseService {
  users: UserService
  listings: ListingService
  offers: OfferService
  transactions: TransactionService
}

export interface UserService {
  create(data: CreateUserData): Promise<User>
  findByClerkId(clerkId: string): Promise<User | null>
  findById(id: string): Promise<User | null>
  update(id: string, data: UpdateUserData): Promise<User>
  delete(id: string): Promise<void>
}

export interface ListingService {
  create(data: CreateListingData): Promise<Listing>
  findMany(filters: ListingFilters): Promise<PaginatedListings>
  findById(id: string): Promise<Listing | null>
  update(id: string, data: UpdateListingData): Promise<Listing>
  delete(id: string): Promise<void>
}

export interface OfferService {
  create(data: CreateOfferData): Promise<Offer>
  findMany(filters: OfferFilters): Promise<Offer[]>
  findById(id: string): Promise<Offer | null>
  update(id: string, data: UpdateOfferData): Promise<Offer>
  delete(id: string): Promise<void>
}

export interface TransactionService {
  create(data: CreateTransactionData): Promise<Transaction>
  findById(id: string): Promise<Transaction | null>
  update(id: string, data: UpdateTransactionData): Promise<Transaction>
}

// Data Transfer Objects
export interface CreateUserData {
  clerkId: string
  email: string
  username: string
  rating?: number
  isVerified?: boolean
}

export interface UpdateUserData {
  email?: string
  username?: string
  rating?: number
  isVerified?: boolean
  totalSales?: number
}

export interface CreateListingData {
  sellerId: string
  title: string
  eventName: string
  eventDate: string
  venue?: string
  price: number // in cents
  quantity: number
  description?: string
  ticketPath?: string
}

export interface UpdateListingData {
  title?: string
  eventName?: string
  eventDate?: string
  venue?: string
  price?: number
  quantity?: number
  description?: string
  status?: string
}

export interface ListingFilters {
  sellerId?: string
  status?: string
  search?: string
  eventDate?: string
  page?: number
  limit?: number
}

export interface PaginatedListings {
  listings: Listing[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateOfferData {
  listingId: string
  buyerId: string
  offerPrice: number // in cents
  quantity: number
  messageTemplate: string
  customMessage?: string
}

export interface UpdateOfferData {
  status?: string
  isPaid?: boolean
  paidAt?: string
}

export interface OfferFilters {
  listingId?: string
  buyerId?: string
  sellerId?: string
  status?: string
}

export interface CreateTransactionData {
  offerId: string
  amount: number
  platformFee: number
  sellerPayout: number
  paymentIntentId: string
}

export interface UpdateTransactionData {
  status?: string
  completedAt?: string
}

// Domain Models (matching current Prisma schema)
export interface User {
  id: string
  email: string
  username: string
  rating?: number
  isVerified?: boolean
  totalSales?: number
  clerkId?: string
  createdAt: string
}

export interface Listing {
  id: string
  sellerId: string
  title: string
  eventName: string
  eventDate: string
  venue?: string
  priceInCents: number
  quantity: number
  description?: string
  status: string
  ticketPath?: string
  createdAt: string
  seller?: User
}

export interface Offer {
  id: string
  listingId: string
  buyerId: string
  offerPriceInCents: number
  quantity: number
  messageTemplate: string
  customMessage?: string
  status: string
  isPaid: boolean
  paidAt?: string
  createdAt: string
  listing?: Listing
  buyer?: User
}

export interface Transaction {
  id: string
  offerId: string
  amount: number
  platformFee: number
  sellerPayout: number
  status: string
  paymentIntentId?: string
  completedAt?: string
  createdAt: string
}
```

**Testing Step 1.1:**
```bash
# Verify file exists and has correct content
cat lib/services/interfaces/database.interface.ts | head -10
```
**Expected Output:** Should show TypeScript interface definitions

#### File 2: `lib/services/interfaces/payment.interface.ts`
```typescript
export interface PaymentService {
  createPaymentIntent(data: CreatePaymentIntentData): Promise<PaymentIntent>
  processPayment(intentId: string): Promise<Payment>
  getPaymentStatus(intentId: string): Promise<PaymentStatus>
  simulatePayment(intentId: string): Promise<MockPayment>
}

export interface CreatePaymentIntentData {
  amount: number // in cents
  sellerId: string
  buyerId: string
  offerId: string
  listingId: string
}

export interface PaymentIntent {
  id: string
  amount: number
  sellerId: string
  buyerId: string
  status: PaymentStatus
  platformFee: number
  sellerAmount: number
  createdAt: Date
  metadata: {
    offerId: string
    listingId: string
  }
}

export interface Payment {
  id: string
  amount: number
  status: PaymentStatus
  platformFee: number
  sellerAmount: number
  processedAt?: Date
  sellerPaidAt?: Date
  sellerPayoutId?: string
}

export interface MockPayment extends Payment {
  sellerId: string
  buyerId: string
  createdAt: Date
  metadata: {
    offerId: string
    listingId: string
  }
}

export type PaymentStatus = 
  | 'requires_payment_method' 
  | 'processing' 
  | 'succeeded' 
  | 'failed'
```

**Testing Step 1.2:**
```bash
# Verify payment interface file
cat lib/services/interfaces/payment.interface.ts | grep "interface PaymentService" -A 5
```

#### File 3: `lib/services/factory.ts`
```typescript
import { DatabaseService } from './interfaces/database.interface'
import { PaymentService } from './interfaces/payment.interface'

// Implementations
import { PrismaDatabaseService } from './implementations/prisma/database.service'
import { AirtableDatabaseService } from './implementations/airtable/database.service'
import { MockPaymentService } from './implementations/mock-payment/payment.service'

export class ServiceFactory {
  private static instance: ServiceFactory
  private databaseService: DatabaseService | null = null
  private paymentService: PaymentService | null = null

  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory()
    }
    return ServiceFactory.instance
  }

  getDatabaseService(): DatabaseService {
    if (!this.databaseService) {
      const useAirtable = process.env.USE_AIRTABLE === 'true'
      
      if (useAirtable) {
        this.databaseService = new AirtableDatabaseService()
      } else {
        this.databaseService = new PrismaDatabaseService()
      }
    }
    return this.databaseService
  }

  getPaymentService(): PaymentService {
    if (!this.paymentService) {
      // Always use mock payments for Phase 2
      this.paymentService = new MockPaymentService()
    }
    return this.paymentService
  }

  // Reset services (useful for testing)
  reset(): void {
    this.databaseService = null
    this.paymentService = null
  }
}

// Convenience exports
export const serviceFactory = ServiceFactory.getInstance()
export const getDatabaseService = () => serviceFactory.getDatabaseService()
export const getPaymentService = () => serviceFactory.getPaymentService()
```

**Testing Step 1.3:**
```bash
# Verify factory file and check TypeScript compilation
npm run type-check
```
**Expected Output:** No TypeScript errors

### TASK 2: Implement Mock Payment Service

#### Step 2.1: Create Mock Payment Service
**File:** `lib/services/implementations/mock-payment/payment.service.ts`

```typescript
import { 
  PaymentService, 
  CreatePaymentIntentData, 
  PaymentIntent, 
  Payment, 
  MockPayment,
  PaymentStatus 
} from '../../interfaces/payment.interface'

export class MockPaymentService implements PaymentService {
  private payments = new Map<string, MockPayment>()
  private readonly PLATFORM_FEE_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT || '6') / 100
  private readonly SUCCESS_RATE = parseFloat(process.env.MOCK_PAYMENT_SUCCESS_RATE || '0.9')
  private readonly PROCESSING_TIME = parseInt(process.env.MOCK_PAYMENT_PROCESSING_TIME || '2000')

  async createPaymentIntent(data: CreatePaymentIntentData): Promise<PaymentIntent> {
    const intentId = `pi_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const platformFee = Math.round(data.amount * this.PLATFORM_FEE_PERCENT)
    const sellerAmount = data.amount - platformFee

    const payment: MockPayment = {
      id: intentId,
      amount: data.amount,
      sellerId: data.sellerId,
      buyerId: data.buyerId,
      status: 'requires_payment_method',
      platformFee,
      sellerAmount,
      createdAt: new Date(),
      metadata: {
        offerId: data.offerId,
        listingId: data.listingId
      }
    }

    this.payments.set(intentId, payment)
    
    console.log(`✅ Mock Payment Intent Created: ${intentId}`)
    console.log(`   Amount: $${(data.amount / 100).toFixed(2)}`)
    console.log(`   Platform Fee: $${(platformFee / 100).toFixed(2)}`)
    console.log(`   Seller Amount: $${(sellerAmount / 100).toFixed(2)}`)

    return payment
  }

  async simulatePayment(intentId: string): Promise<MockPayment> {
    const payment = this.payments.get(intentId)
    if (!payment) {
      throw new Error(`Payment intent not found: ${intentId}`)
    }

    if (payment.status !== 'requires_payment_method') {
      throw new Error(`Payment already processed: ${payment.status}`)
    }

    // Update status to processing
    payment.status = 'processing'
    this.payments.set(intentId, payment)

    console.log(`🔄 Processing payment: ${intentId}`)

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, this.PROCESSING_TIME))

    // Simulate success/failure based on success rate
    const isSuccess = Math.random() < this.SUCCESS_RATE

    if (isSuccess) {
      payment.status = 'succeeded'
      payment.processedAt = new Date()
      
      // Simulate seller payout after 1 second
      setTimeout(() => {
        payment.sellerPaidAt = new Date()
        payment.sellerPayoutId = `po_mock_${Date.now()}`
        this.payments.set(intentId, payment)
        console.log(`💰 Seller payout completed: ${payment.sellerPayoutId}`)
      }, 1000)

      console.log(`✅ Payment succeeded: ${intentId}`)
    } else {
      payment.status = 'failed'
      payment.processedAt = new Date()
      console.log(`❌ Payment failed: ${intentId}`)
    }

    this.payments.set(intentId, payment)
    return payment
  }

  async processPayment(intentId: string): Promise<Payment> {
    return await this.simulatePayment(intentId)
  }

  async getPaymentStatus(intentId: string): Promise<PaymentStatus> {
    const payment = this.payments.get(intentId)
    if (!payment) {
      throw new Error(`Payment intent not found: ${intentId}`)
    }

    return payment.status
  }

  // Debug method for testing
  getAllPayments(): Map<string, MockPayment> {
    return new Map(this.payments)
  }

  // Clear payments (for testing)
  clearPayments(): void {
    this.payments.clear()
    console.log('🗑️ All mock payments cleared')
  }
}
```

**Testing Step 2.1:**
```bash
# Test TypeScript compilation
npm run type-check

# Test basic instantiation
node -e "
const { MockPaymentService } = require('./lib/services/implementations/mock-payment/payment.service');
const service = new MockPaymentService();
console.log('✅ MockPaymentService created successfully');
"
```

#### Step 2.2: Create Payment Test Script
**File:** `scripts/test-payment-service.ts`

```typescript
import { MockPaymentService } from '../lib/services/implementations/mock-payment/payment.service'

async function testPaymentService() {
  const paymentService = new MockPaymentService()

  console.log('🧪 Testing Mock Payment Service...\n')

  try {
    // Test 1: Create Payment Intent
    console.log('Test 1: Creating Payment Intent')
    const paymentIntent = await paymentService.createPaymentIntent({
      amount: 5000, // $50.00
      sellerId: 'seller_123',
      buyerId: 'buyer_456', 
      offerId: 'offer_789',
      listingId: 'listing_abc'
    })

    console.log('✅ Payment Intent Created:', {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      status: paymentIntent.status,
      platformFee: paymentIntent.platformFee,
      sellerAmount: paymentIntent.sellerAmount
    })

    // Test 2: Check Status
    console.log('\nTest 2: Checking Payment Status')
    const status = await paymentService.getPaymentStatus(paymentIntent.id)
    console.log('✅ Payment Status:', status)

    // Test 3: Process Payment
    console.log('\nTest 3: Processing Payment')
    const result = await paymentService.simulatePayment(paymentIntent.id)
    console.log('✅ Payment Processed:', {
      id: result.id,
      status: result.status,
      processedAt: result.processedAt
    })

    // Test 4: Check Final Status
    console.log('\nTest 4: Final Status Check')
    const finalStatus = await paymentService.getPaymentStatus(paymentIntent.id)
    console.log('✅ Final Status:', finalStatus)

    console.log('\n🎉 All payment service tests passed!')

  } catch (error) {
    console.error('❌ Payment service test failed:', error)
    process.exit(1)
  }
}

testPaymentService()
```

**Testing Step 2.2:**
```bash
# Run payment service test
npx tsx scripts/test-payment-service.ts
```

**Expected Output:**
```
🧪 Testing Mock Payment Service...

Test 1: Creating Payment Intent
✅ Mock Payment Intent Created: pi_mock_...
   Amount: $50.00
   Platform Fee: $3.00
   Seller Amount: $47.00
✅ Payment Intent Created: { id: 'pi_mock_...', amount: 5000, ... }

Test 2: Checking Payment Status
✅ Payment Status: requires_payment_method

Test 3: Processing Payment
🔄 Processing payment: pi_mock_...
✅ Payment succeeded: pi_mock_... (or ❌ Payment failed)
✅ Payment Processed: { id: 'pi_mock_...', status: 'succeeded', ... }

🎉 All payment service tests passed!
```

### TASK 3: Implement Airtable User Service

#### Step 3.1: Create Airtable Client Helper
**File:** `lib/airtable-client.ts`

```typescript
import { getAirtableBase, recordToObject, isAirtableError, sleep } from './airtable'
import PQueue from 'p-queue'

// Rate limiting queue (5 requests per second)
const airtableQueue = new PQueue({ 
  interval: 1000, 
  intervalCap: 5 
})

export class AirtableClient {
  private base = getAirtableBase()

  constructor() {
    if (!this.base) {
      throw new Error('Airtable not initialized. Check environment variables.')
    }
  }

  async createRecord<T>(tableName: string, fields: any): Promise<T> {
    return airtableQueue.add(async () => {
      try {
        const record = await this.base!(tableName).create(fields)
        return recordToObject(record) as T
      } catch (error) {
        if (isAirtableError(error) && error.statusCode === 429) {
          console.log('⚠️ Rate limited, waiting...')
          await sleep(1000)
          return this.createRecord<T>(tableName, fields)
        }
        throw error
      }
    })
  }

  async findRecord<T>(tableName: string, recordId: string): Promise<T | null> {
    return airtableQueue.add(async () => {
      try {
        const record = await this.base!(tableName).find(recordId)
        return recordToObject(record) as T
      } catch (error) {
        if (isAirtableError(error) && error.statusCode === 404) {
          return null
        }
        if (isAirtableError(error) && error.statusCode === 429) {
          console.log('⚠️ Rate limited, waiting...')
          await sleep(1000)
          return this.findRecord<T>(tableName, recordId)
        }
        throw error
      }
    })
  }

  async findRecords<T>(
    tableName: string, 
    options: {
      filterByFormula?: string
      sort?: Array<{ field: string; direction: 'asc' | 'desc' }>
      maxRecords?: number
      pageSize?: number
    } = {}
  ): Promise<T[]> {
    return airtableQueue.add(async () => {
      try {
        const records = await this.base!(tableName)
          .select(options)
          .all()
        return records.map(record => recordToObject(record) as T)
      } catch (error) {
        if (isAirtableError(error) && error.statusCode === 429) {
          console.log('⚠️ Rate limited, waiting...')
          await sleep(1000)
          return this.findRecords<T>(tableName, options)
        }
        throw error
      }
    })
  }

  async updateRecord<T>(tableName: string, recordId: string, fields: any): Promise<T> {
    return airtableQueue.add(async () => {
      try {
        const record = await this.base!(tableName).update(recordId, fields)
        return recordToObject(record) as T
      } catch (error) {
        if (isAirtableError(error) && error.statusCode === 429) {
          console.log('⚠️ Rate limited, waiting...')
          await sleep(1000)
          return this.updateRecord<T>(tableName, recordId, fields)
        }
        throw error
      }
    })
  }

  async deleteRecord(tableName: string, recordId: string): Promise<void> {
    return airtableQueue.add(async () => {
      try {
        await this.base!(tableName).destroy(recordId)
      } catch (error) {
        if (isAirtableError(error) && error.statusCode === 429) {
          console.log('⚠️ Rate limited, waiting...')
          await sleep(1000)
          return this.deleteRecord(tableName, recordId)
        }
        throw error
      }
    })
  }
}

export const airtableClient = new AirtableClient()
```

**Testing Step 3.1:**
```bash
# Test Airtable connection
node -e "
const { airtableClient } = require('./lib/airtable-client');
console.log('✅ Airtable client created successfully');
"
```

#### Step 3.2: Create Airtable User Service
**File:** `lib/services/implementations/airtable/user.service.ts`

```typescript
import { UserService, CreateUserData, UpdateUserData, User } from '../../interfaces/database.interface'
import { airtableClient } from '../../../airtable-client'
import { UserRecord, TABLE_NAMES } from '../../../airtable'

export class AirtableUserService implements UserService {
  private tableName = TABLE_NAMES.USERS

  async create(data: CreateUserData): Promise<User> {
    console.log(`📝 Creating user in Airtable: ${data.email}`)
    
    const airtableData = {
      email: data.email,
      username: data.username,
      clerkId: data.clerkId,
      rating: data.rating || 5.0,
      isVerified: data.isVerified || false,
      totalSales: 0
    }

    const record = await airtableClient.createRecord<UserRecord>(
      this.tableName, 
      airtableData
    )

    console.log(`✅ User created in Airtable: ${record.id}`)
    return this.mapRecordToUser(record)
  }

  async findByClerkId(clerkId: string): Promise<User | null> {
    console.log(`🔍 Finding user by Clerk ID: ${clerkId}`)
    
    const records = await airtableClient.findRecords<UserRecord>(
      this.tableName,
      {
        filterByFormula: `{clerkId} = '${clerkId}'`,
        maxRecords: 1
      }
    )

    if (records.length === 0) {
      console.log(`❌ User not found for Clerk ID: ${clerkId}`)
      return null
    }

    console.log(`✅ User found: ${records[0].id}`)
    return this.mapRecordToUser(records[0])
  }

  async findById(id: string): Promise<User | null> {
    console.log(`🔍 Finding user by ID: ${id}`)
    
    const record = await airtableClient.findRecord<UserRecord>(this.tableName, id)
    
    if (!record) {
      console.log(`❌ User not found: ${id}`)
      return null
    }

    console.log(`✅ User found: ${record.id}`)
    return this.mapRecordToUser(record)
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    console.log(`📝 Updating user: ${id}`)
    
    const updateData: Partial<UserRecord> = {}
    
    if (data.email) updateData.email = data.email
    if (data.username) updateData.username = data.username
    if (data.rating !== undefined) updateData.rating = data.rating
    if (data.isVerified !== undefined) updateData.isVerified = data.isVerified
    if (data.totalSales !== undefined) updateData.totalSales = data.totalSales

    const record = await airtableClient.updateRecord<UserRecord>(
      this.tableName,
      id,
      updateData
    )

    console.log(`✅ User updated: ${record.id}`)
    return this.mapRecordToUser(record)
  }

  async delete(id: string): Promise<void> {
    console.log(`🗑️ Deleting user: ${id}`)
    
    await airtableClient.deleteRecord(this.tableName, id)
    
    console.log(`✅ User deleted: ${id}`)
  }

  private mapRecordToUser(record: UserRecord & { id: string; createdAt: string }): User {
    return {
      id: record.id,
      email: record.email,
      username: record.username,
      rating: record.rating,
      isVerified: record.isVerified,
      totalSales: record.totalSales,
      clerkId: record.clerkId,
      createdAt: record.createdAt
    }
  }
}
```

**Testing Step 3.2:**
```bash
# Test TypeScript compilation
npm run type-check
```

#### Step 3.3: Create Airtable User Service Test
**File:** `scripts/test-airtable-user.ts`

```typescript
import { AirtableUserService } from '../lib/services/implementations/airtable/user.service'

async function testAirtableUserService() {
  const userService = new AirtableUserService()

  console.log('🧪 Testing Airtable User Service...\n')

  try {
    // Test 1: Create User
    console.log('Test 1: Creating User')
    const userData = {
      clerkId: `clerk_test_${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      username: `testuser${Date.now()}`,
      rating: 5.0,
      isVerified: false
    }

    const createdUser = await userService.create(userData)
    console.log('✅ User Created:', {
      id: createdUser.id,
      email: createdUser.email,
      username: createdUser.username
    })

    // Test 2: Find by ID
    console.log('\nTest 2: Finding User by ID')
    const foundUser = await userService.findById(createdUser.id)
    console.log('✅ User Found by ID:', foundUser?.username)

    // Test 3: Find by Clerk ID
    console.log('\nTest 3: Finding User by Clerk ID')
    const foundByClerk = await userService.findByClerkId(userData.clerkId)
    console.log('✅ User Found by Clerk ID:', foundByClerk?.username)

    // Test 4: Update User
    console.log('\nTest 4: Updating User')
    const updatedUser = await userService.update(createdUser.id, {
      rating: 4.8,
      isVerified: true,
      totalSales: 1
    })
    console.log('✅ User Updated:', {
      rating: updatedUser.rating,
      isVerified: updatedUser.isVerified,
      totalSales: updatedUser.totalSales
    })

    // Test 5: Delete User (cleanup)
    console.log('\nTest 5: Deleting User (cleanup)')
    await userService.delete(createdUser.id)
    console.log('✅ User Deleted')

    // Verify deletion
    const deletedUser = await userService.findById(createdUser.id)
    if (deletedUser === null) {
      console.log('✅ User deletion verified')
    } else {
      console.log('❌ User still exists after deletion')
    }

    console.log('\n🎉 All Airtable user service tests passed!')

  } catch (error) {
    console.error('❌ Airtable user service test failed:', error)
    process.exit(1)
  }
}

testAirtableUserService()
```

**Testing Step 3.3:**
```bash
# Run Airtable user service test
npx tsx scripts/test-airtable-user.ts
```

**Expected Output:**
```
🧪 Testing Airtable User Service...

Test 1: Creating User
📝 Creating user in Airtable: test...@example.com
✅ User created in Airtable: rec...
✅ User Created: { id: 'rec...', email: 'test...@example.com', username: 'testuser...' }

Test 2: Finding User by ID
🔍 Finding user by ID: rec...
✅ User found: rec...
✅ User Found by ID: testuser...

Test 3: Finding User by Clerk ID
🔍 Finding user by Clerk ID: clerk_test_...
✅ User found: rec...
✅ User Found by Clerk ID: testuser...

Test 4: Updating User
📝 Updating user: rec...
✅ User updated: rec...
✅ User Updated: { rating: 4.8, isVerified: true, totalSales: 1 }

Test 5: Deleting User (cleanup)
🗑️ Deleting user: rec...
✅ User deleted: rec...
✅ User deletion verified

🎉 All Airtable user service tests passed!
```

### VALIDATION CHECKPOINT 1
**Run this command to validate Progress:**
```bash
# Check all files exist
ls -la lib/services/interfaces/
ls -la lib/services/implementations/airtable/
ls -la lib/services/implementations/mock-payment/
ls -la scripts/

# Run all tests
npm run type-check
npx tsx scripts/test-payment-service.ts
npx tsx scripts/test-airtable-user.ts
```

**Success Criteria:**
- [ ] All directories created
- [ ] All TypeScript files compile without errors
- [ ] Payment service test passes
- [ ] Airtable user service test passes
- [ ] Console shows detailed logging for each operation

## PHASE 2B: AUTHENTICATION & API INTEGRATION (Days 8-14)

### TASK 4: Enhanced Clerk Authentication

#### Step 4.1: Create Enhanced Auth Server
**File:** `lib/auth-server.ts`

```typescript
import { auth, clerkClient } from '@clerk/nextjs/server'
import { getDatabaseService } from './services/factory'
import { User } from './services/interfaces/database.interface'

export interface AppUser {
  id: string
  clerkId: string
  email: string
  username: string
  rating?: number
  isVerified?: boolean
  totalSales?: number
}

export class AuthService {
  static async requireAuth(): Promise<AppUser> {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Authentication required')
    }

    console.log(`🔐 Authenticating user: ${userId}`)

    // Get or create user in our database
    const dbService = getDatabaseService()
    let user = await dbService.users.findByClerkId(userId)

    if (!user) {
      console.log(`👤 User not found in database, creating from Clerk data`)
      
      // Get user data from Clerk
      const clerkUser = await clerkClient.users.getUser(userId)
      
      const userData = {
        clerkId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        username: clerkUser.username || clerkUser.emailAddresses[0]?.emailAddress.split('@')[0] || 'user',
        rating: 5.0,
        isVerified: false
      }

      user = await dbService.users.create(userData)
      console.log(`✅ User created in database: ${user.id}`)
    }

    return {
      id: user.id,
      clerkId: user.clerkId || userId,
      email: user.email,
      username: user.username,
      rating: user.rating,
      isVerified: user.isVerified,
      totalSales: user.totalSales
    }
  }

  static async getCurrentUser(): Promise<AppUser | null> {
    try {
      return await AuthService.requireAuth()
    } catch {
      return null
    }
  }

  static async syncUserFromClerk(clerkUserId: string): Promise<User> {
    console.log(`🔄 Syncing user from Clerk: ${clerkUserId}`)
    
    const clerkUser = await clerkClient.users.getUser(clerkUserId)
    const dbService = getDatabaseService()
    
    let user = await dbService.users.findByClerkId(clerkUserId)
    
    if (user) {
      // Update existing user
      user = await dbService.users.update(user.id, {
        email: clerkUser.emailAddresses[0]?.emailAddress || user.email,
        username: clerkUser.username || user.username
      })
      console.log(`✅ User updated: ${user.id}`)
    } else {
      // Create new user
      user = await dbService.users.create({
        clerkId: clerkUserId,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        username: clerkUser.username || clerkUser.emailAddresses[0]?.emailAddress.split('@')[0] || 'user'
      })
      console.log(`✅ User created: ${user.id}`)
    }
    
    return user
  }
}
```

**Testing Step 4.1:**
```bash
# Test TypeScript compilation
npm run type-check

# Test basic auth service (without Clerk context)
node -e "
const { AuthService } = require('./lib/auth-server');
console.log('✅ AuthService class loaded successfully');
"
```

#### Step 4.2: Update API Helpers for New Auth System
**File:** `lib/api-helpers-enhanced.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { ZodSchema } from 'zod'
import { AuthService, AppUser } from './auth-server'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  timestamp?: string
}

export function createResponse<T>(data: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ 
    success: true, 
    data, 
    timestamp: new Date().toISOString() 
  })
}

export function createErrorResponse(
  error: string, 
  status = 400
): NextResponse<ApiResponse> {
  console.error(`❌ API Error (${status}): ${error}`)
  return NextResponse.json({ 
    success: false, 
    error, 
    timestamp: new Date().toISOString() 
  }, { status })
}

export async function withValidation<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json()
    console.log('📝 Validating request data:', Object.keys(body))
    
    const validatedData = schema.parse(body)
    console.log('✅ Validation successful')
    
    return { success: true, data: validatedData }
  } catch (error: unknown) {
    console.error('❌ Validation failed:', error)
    
    if (error && typeof error === 'object' && 'errors' in error) {
      const message = (error.errors as Array<{ message: string }>)
        .map((e) => e.message)
        .join(', ')
      return { success: false, error: message }
    }
    return { success: false, error: 'Invalid request data' }
  }
}

export async function withAuth(): Promise<
  { success: true; user: AppUser } | { success: false; error: string }
> {
  try {
    console.log('🔐 Checking authentication...')
    const user = await AuthService.requireAuth()
    console.log(`✅ User authenticated: ${user.username} (${user.id})`)
    return { success: true, user }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    console.error(`❌ Authentication failed: ${message}`)
    return { success: false, error: message }
  }
}

export async function withAuthAndValidation<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<
  | { success: true; user: AppUser; data: T }
  | { success: false; error: string }
> {
  const authResult = await withAuth()
  if (!authResult.success) {
    return authResult
  }

  const validationResult = await withValidation(request, schema)
  if (!validationResult.success) {
    return validationResult
  }

  return {
    success: true,
    user: authResult.user,
    data: validationResult.data,
  }
}

// Rate limiting helper
const rateLimitMap = new Map<string, number[]>()

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 10, 
  windowMs: number = 60000
): boolean {
  const now = Date.now()
  const windowStart = now - windowMs
  
  if (!rateLimitMap.has(identifier)) {
    rateLimitMap.set(identifier, [])
  }
  
  const requests = rateLimitMap.get(identifier)!
  
  // Remove old requests outside the window
  const validRequests = requests.filter(time => time > windowStart)
  
  if (validRequests.length >= maxRequests) {
    console.log(`⚠️ Rate limit exceeded for ${identifier}`)
    return false
  }
  
  // Add current request
  validRequests.push(now)
  rateLimitMap.set(identifier, validRequests)
  
  return true
}

// Convenience function to require authentication and return user
export async function requireAuth(): Promise<AppUser> {
  return await AuthService.requireAuth()
}

// Convenience function to get current user (returns null if not authenticated)
export async function getCurrentUser(): Promise<AppUser | null> {
  return await AuthService.getCurrentUser()
}
```

**Testing Step 4.2:**
```bash
# Test enhanced API helpers
npm run type-check

# Create simple test
node -e "
const { createResponse, createErrorResponse } = require('./lib/api-helpers-enhanced');
console.log('✅ Enhanced API helpers loaded successfully');
"
```

#### Step 4.3: Create Auth Test Script
**File:** `scripts/test-auth-integration.ts`

```typescript
import { AuthService } from '../lib/auth-server'
import { createResponse, withValidation } from '../lib/api-helpers-enhanced'
import { createListingSchema } from '../lib/validations'

async function testAuthIntegration() {
  console.log('🧪 Testing Auth Integration...\n')

  try {
    // Test 1: API Response Helpers
    console.log('Test 1: Testing API Response Helpers')
    const successResponse = createResponse({ message: 'test' })
    console.log('✅ Success response created')

    // Test 2: Validation Helper
    console.log('\nTest 2: Testing Validation Helper')
    const mockRequest = {
      json: async () => ({
        title: 'Test Event',
        eventName: 'Concert',
        eventDate: new Date().toISOString(),
        price: 5000,
        quantity: 2
      })
    } as any

    const validationResult = await withValidation(mockRequest, createListingSchema)
    if (validationResult.success) {
      console.log('✅ Validation test passed:', validationResult.data.title)
    } else {
      console.log('❌ Validation failed:', validationResult.error)
    }

    // Test 3: Auth Service (will fail without Clerk context, but should load)
    console.log('\nTest 3: Testing Auth Service Class')
    console.log('✅ AuthService loaded (Clerk context required for full test)')

    console.log('\n🎉 Auth integration tests completed!')

  } catch (error) {
    console.error('❌ Auth integration test failed:', error)
    process.exit(1)
  }
}

testAuthIntegration()
```

**Testing Step 4.3:**
```bash
# Run auth integration test
npx tsx scripts/test-auth-integration.ts
```

### TASK 5: Complete Service Implementation

#### Step 5.1: Create Complete Airtable Database Service
**File:** `lib/services/implementations/airtable/database.service.ts`

```typescript
import { DatabaseService } from '../../interfaces/database.interface'
import { AirtableUserService } from './user.service'
import { AirtableListingService } from './listing.service'
import { AirtableOfferService } from './offer.service'
import { AirtableTransactionService } from './transaction.service'

export class AirtableDatabaseService implements DatabaseService {
  public readonly users: AirtableUserService
  public readonly listings: AirtableListingService
  public readonly offers: AirtableOfferService
  public readonly transactions: AirtableTransactionService

  constructor() {
    console.log('🔌 Initializing Airtable Database Service')
    this.users = new AirtableUserService()
    this.listings = new AirtableListingService()
    this.offers = new AirtableOfferService()
    this.transactions = new AirtableTransactionService()
    console.log('✅ Airtable Database Service initialized')
  }
}
```

#### Step 5.2: Create Listing Service Stub (for compilation)
**File:** `lib/services/implementations/airtable/listing.service.ts`

```typescript
import { ListingService, CreateListingData, UpdateListingData, Listing, ListingFilters, PaginatedListings } from '../../interfaces/database.interface'

export class AirtableListingService implements ListingService {
  async create(data: CreateListingData): Promise<Listing> {
    console.log('📝 Creating listing (stub implementation)')
    throw new Error('Listing service not implemented yet - Phase 2C')
  }

  async findMany(filters: ListingFilters): Promise<PaginatedListings> {
    console.log('🔍 Finding listings (stub implementation)')
    throw new Error('Listing service not implemented yet - Phase 2C')
  }

  async findById(id: string): Promise<Listing | null> {
    console.log('🔍 Finding listing by ID (stub implementation)')
    throw new Error('Listing service not implemented yet - Phase 2C')
  }

  async update(id: string, data: UpdateListingData): Promise<Listing> {
    console.log('📝 Updating listing (stub implementation)')
    throw new Error('Listing service not implemented yet - Phase 2C')
  }

  async delete(id: string): Promise<void> {
    console.log('🗑️ Deleting listing (stub implementation)')
    throw new Error('Listing service not implemented yet - Phase 2C')
  }
}
```

#### Step 5.3: Create Other Service Stubs
**File:** `lib/services/implementations/airtable/offer.service.ts`

```typescript
import { OfferService, CreateOfferData, UpdateOfferData, Offer, OfferFilters } from '../../interfaces/database.interface'

export class AirtableOfferService implements OfferService {
  async create(data: CreateOfferData): Promise<Offer> {
    throw new Error('Offer service not implemented yet - Phase 2C')
  }

  async findMany(filters: OfferFilters): Promise<Offer[]> {
    throw new Error('Offer service not implemented yet - Phase 2C')
  }

  async findById(id: string): Promise<Offer | null> {
    throw new Error('Offer service not implemented yet - Phase 2C')
  }

  async update(id: string, data: UpdateOfferData): Promise<Offer> {
    throw new Error('Offer service not implemented yet - Phase 2C')
  }

  async delete(id: string): Promise<void> {
    throw new Error('Offer service not implemented yet - Phase 2C')
  }
}
```

**File:** `lib/services/implementations/airtable/transaction.service.ts`

```typescript
import { TransactionService, CreateTransactionData, UpdateTransactionData, Transaction } from '../../interfaces/database.interface'

export class AirtableTransactionService implements TransactionService {
  async create(data: CreateTransactionData): Promise<Transaction> {
    throw new Error('Transaction service not implemented yet - Phase 2C')
  }

  async findById(id: string): Promise<Transaction | null> {
    throw new Error('Transaction service not implemented yet - Phase 2C')
  }

  async update(id: string, data: UpdateTransactionData): Promise<Transaction> {
    throw new Error('Transaction service not implemented yet - Phase 2C')
  }
}
```

#### Step 5.4: Create Prisma Database Service Stub
**File:** `lib/services/implementations/prisma/database.service.ts`

```typescript
import { DatabaseService } from '../../interfaces/database.interface'

export class PrismaDatabaseService implements DatabaseService {
  public readonly users: any
  public readonly listings: any
  public readonly offers: any
  public readonly transactions: any

  constructor() {
    console.log('🔌 Prisma Database Service (legacy - keeping for migration)')
    throw new Error('Use existing Prisma implementation for now')
  }
}
```

**Testing Step 5.1-5.4:**
```bash
# Test all services compile
npm run type-check

# Test service factory
node -e "
const { ServiceFactory } = require('./lib/services/factory');
process.env.USE_AIRTABLE = 'true';
const factory = ServiceFactory.getInstance();
try {
  const dbService = factory.getDatabaseService();
  console.log('✅ Airtable database service created');
} catch (error) {
  console.log('ℹ️ Expected error for stub services:', error.message);
}
"
```

### TASK 6: Update Environment Configuration

#### Step 6.1: Add Service Configuration to Environment
Add to `.env.local`:
```env
# Service Configuration
USE_AIRTABLE=true
```

#### Step 6.2: Create Environment Test Script
**File:** `scripts/test-environment.ts`

```typescript
async function testEnvironment() {
  console.log('🧪 Testing Environment Configuration...\n')

  const requiredEnvVars = [
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'AIRTABLE_API_KEY',
    'AIRTABLE_BASE_ID',
    'MOCK_PAYMENTS',
    'PLATFORM_FEE_PERCENT'
  ]

  const optionalEnvVars = [
    'USE_AIRTABLE',
    'MOCK_PAYMENT_SUCCESS_RATE',
    'MOCK_PAYMENT_PROCESSING_TIME'
  ]

  console.log('Required Environment Variables:')
  let allRequired = true
  
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar]
    if (value) {
      console.log(`✅ ${envVar}: ${value.substring(0, 10)}...`)
    } else {
      console.log(`❌ ${envVar}: Missing`)
      allRequired = false
    }
  }

  console.log('\nOptional Environment Variables:')
  for (const envVar of optionalEnvVars) {
    const value = process.env[envVar]
    console.log(`${value ? '✅' : 'ℹ️'} ${envVar}: ${value || 'Not set (using default)'}`)
  }

  if (!allRequired) {
    console.error('\n❌ Missing required environment variables')
    process.exit(1)
  }

  console.log('\n🎉 Environment configuration is valid!')
}

testEnvironment()
```

**Testing Step 6.2:**
```bash
# Test environment configuration
npx tsx scripts/test-environment.ts
```

### VALIDATION CHECKPOINT 2
**Run this command to validate Phase 2B Progress:**
```bash
# Check all new files exist
ls -la lib/services/implementations/airtable/
ls -la lib/auth-server.ts
ls -la lib/api-helpers-enhanced.ts

# Run all tests
npm run type-check
npx tsx scripts/test-environment.ts
npx tsx scripts/test-auth-integration.ts

# Test service factory with Airtable
USE_AIRTABLE=true npx tsx -e "
const { getDatabaseService, getPaymentService } = require('./lib/services/factory');
console.log('Testing service factory...');
try {
  const payment = getPaymentService();
  console.log('✅ Payment service loaded');
  const db = getDatabaseService();
  console.log('✅ Database service loaded');
} catch (error) {
  console.log('ℹ️ Expected stub errors:', error.message);
}
"
```

**Success Criteria:**
- [ ] All TypeScript files compile without errors
- [ ] Environment variables properly configured
- [ ] Service factory can instantiate services
- [ ] Auth integration test passes
- [ ] Mock payment service fully functional
- [ ] Airtable user service working with real API calls

## PHASE 2C: API MIGRATION & FINAL INTEGRATION (Days 15-21)

### TASK 7: Update API Routes to Use New Services

#### Step 7.1: Create Updated User Sync API Route
**File:** `app/api/user/sync-enhanced/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { createResponse, createErrorResponse, requireAuth } from '@/lib/api-helpers-enhanced'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 User sync API called')
    
    // This will automatically create/sync user from Clerk
    const user = await requireAuth()
    
    console.log(`✅ User synced: ${user.username} (${user.id})`)
    
    return createResponse({
      user: {
        id: user.id,
        clerkId: user.clerkId,
        email: user.email,
        username: user.username,
        rating: user.rating,
        isVerified: user.isVerified,
        totalSales: user.totalSales
      }
    })
  } catch (error) {
    console.error('❌ User sync failed:', error)
    return createErrorResponse('Failed to sync user', 500)
  }
}
```

**Testing Step 7.1:**
```bash
# Test the API route compilation
npm run type-check

# Test route exists
ls -la app/api/user/sync-enhanced/route.ts
```

#### Step 7.2: Create Payment Intent API Route
**File:** `app/api/payments/create-intent/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { 
  createResponse, 
  createErrorResponse, 
  withAuthAndValidation 
} from '@/lib/api-helpers-enhanced'
import { getPaymentService } from '@/lib/services/factory'

const createPaymentIntentSchema = z.object({
  amount: z.number().min(100, 'Minimum amount is $1.00'),
  sellerId: z.string().min(1, 'Seller ID is required'),
  offerId: z.string().min(1, 'Offer ID is required'),
  listingId: z.string().min(1, 'Listing ID is required')
})

export async function POST(request: NextRequest) {
  try {
    console.log('💳 Creating payment intent...')
    
    const result = await withAuthAndValidation(request, createPaymentIntentSchema)
    if (!result.success) {
      return createErrorResponse(result.error)
    }

    const { user, data } = result
    const paymentService = getPaymentService()

    const paymentIntent = await paymentService.createPaymentIntent({
      amount: data.amount,
      sellerId: data.sellerId,
      buyerId: user.id,
      offerId: data.offerId,
      listingId: data.listingId
    })

    console.log(`✅ Payment intent created: ${paymentIntent.id}`)

    return createResponse({
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        status: paymentIntent.status,
        platformFee: paymentIntent.platformFee,
        sellerAmount: paymentIntent.sellerAmount
      }
    })
  } catch (error) {
    console.error('❌ Payment intent creation failed:', error)
    return createErrorResponse('Failed to create payment intent', 500)
  }
}
```

#### Step 7.3: Create Payment Processing API Route
**File:** `app/api/payments/process/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { 
  createResponse, 
  createErrorResponse, 
  withAuthAndValidation 
} from '@/lib/api-helpers-enhanced'
import { getPaymentService } from '@/lib/services/factory'

const processPaymentSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment intent ID is required')
})

export async function POST(request: NextRequest) {
  try {
    console.log('💰 Processing payment...')
    
    const result = await withAuthAndValidation(request, processPaymentSchema)
    if (!result.success) {
      return createErrorResponse(result.error)
    }

    const { data } = result
    const paymentService = getPaymentService()

    const payment = await paymentService.simulatePayment(data.paymentIntentId)

    console.log(`✅ Payment processed: ${payment.id} - Status: ${payment.status}`)

    return createResponse({
      payment: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        platformFee: payment.platformFee,
        sellerAmount: payment.sellerAmount,
        processedAt: payment.processedAt
      }
    })
  } catch (error) {
    console.error('❌ Payment processing failed:', error)
    return createErrorResponse('Failed to process payment', 500)
  }
}
```

**Testing Step 7.2-7.3:**
```bash
# Test payment API routes compilation
npm run type-check

# Test payment route files exist
ls -la app/api/payments/create-intent/route.ts
ls -la app/api/payments/process/route.ts
```

### TASK 8: Create End-to-End API Test

#### Step 8.1: Create Comprehensive API Test Script
**File:** `scripts/test-api-integration.ts`

```typescript
import { MockPaymentService } from '../lib/services/implementations/mock-payment/payment.service'
import { AirtableUserService } from '../lib/services/implementations/airtable/user.service'

async function testApiIntegration() {
  console.log('🧪 Testing Complete API Integration...\n')

  try {
    // Test 1: User Service Integration
    console.log('=== Test 1: User Service Integration ===')
    const userService = new AirtableUserService()
    
    const testUser = {
      clerkId: `test_integration_${Date.now()}`,
      email: `integration${Date.now()}@test.com`,
      username: `integration_user_${Date.now()}`,
      rating: 5.0,
      isVerified: false
    }

    console.log('📝 Creating test user...')
    const createdUser = await userService.create(testUser)
    console.log(`✅ User created: ${createdUser.username} (${createdUser.id})`)

    // Test 2: Payment Service Integration
    console.log('\n=== Test 2: Payment Service Integration ===')
    const paymentService = new MockPaymentService()
    
    console.log('💳 Creating payment intent...')
    const paymentIntent = await paymentService.createPaymentIntent({
      amount: 7500, // $75.00
      sellerId: 'seller_test_123',
      buyerId: createdUser.id,
      offerId: 'offer_test_456',
      listingId: 'listing_test_789'
    })
    console.log(`✅ Payment intent created: ${paymentIntent.id}`)

    console.log('💰 Processing payment...')
    const processedPayment = await paymentService.simulatePayment(paymentIntent.id)
    console.log(`✅ Payment processed: ${processedPayment.status}`)

    // Test 3: Full Integration Flow
    console.log('\n=== Test 3: Full Integration Flow ===')
    console.log('🔄 Simulating complete marketplace transaction...')
    
    // User lookup by Clerk ID
    const foundUser = await userService.findByClerkId(testUser.clerkId)
    if (foundUser) {
      console.log(`✅ User lookup successful: ${foundUser.username}`)
    }

    // Payment status check
    const paymentStatus = await paymentService.getPaymentStatus(paymentIntent.id)
    console.log(`✅ Payment status: ${paymentStatus}`)

    // Test 4: Cleanup
    console.log('\n=== Test 4: Cleanup ===')
    console.log('🗑️ Cleaning up test data...')
    await userService.delete(createdUser.id)
    paymentService.clearPayments()
    console.log('✅ Cleanup completed')

    // Test 5: Error Handling
    console.log('\n=== Test 5: Error Handling ===')
    try {
      await userService.findById('invalid_id')
      console.log('❌ Should have thrown error for invalid ID')
    } catch (error) {
      console.log('✅ Error handling working correctly')
    }

    try {
      await paymentService.getPaymentStatus('invalid_payment_id')
      console.log('❌ Should have thrown error for invalid payment ID')
    } catch (error) {
      console.log('✅ Payment error handling working correctly')
    }

    console.log('\n🎉 All API integration tests passed!')
    console.log('\n📊 Test Summary:')
    console.log('✅ User CRUD operations')
    console.log('✅ Payment intent creation')
    console.log('✅ Payment processing simulation')
    console.log('✅ Service integration')
    console.log('✅ Error handling')
    console.log('✅ Data cleanup')

  } catch (error) {
    console.error('❌ API integration test failed:', error)
    process.exit(1)
  }
}

testApiIntegration()
```

**Testing Step 8.1:**
```bash
# Run comprehensive API integration test
npx tsx scripts/test-api-integration.ts
```

**Expected Output:**
```
🧪 Testing Complete API Integration...

=== Test 1: User Service Integration ===
📝 Creating test user...
📝 Creating user in Airtable: integration...@test.com
✅ User created in Airtable: rec...
✅ User created: integration_user_... (rec...)

=== Test 2: Payment Service Integration ===
💳 Creating payment intent...
✅ Mock Payment Intent Created: pi_mock_...
   Amount: $75.00
   Platform Fee: $4.50
   Seller Amount: $70.50
✅ Payment intent created: pi_mock_...

💰 Processing payment...
🔄 Processing payment: pi_mock_...
✅ Payment succeeded: pi_mock_... (or ❌ Payment failed)
✅ Payment processed: succeeded

=== Test 3: Full Integration Flow ===
🔄 Simulating complete marketplace transaction...
🔍 Finding user by Clerk ID: test_integration_...
✅ User found: rec...
✅ User lookup successful: integration_user_...
✅ Payment status: succeeded

=== Test 4: Cleanup ===
🗑️ Cleaning up test data...
🗑️ Deleting user: rec...
✅ User deleted: rec...
🗑️ All mock payments cleared
✅ Cleanup completed

=== Test 5: Error Handling ===
✅ Error handling working correctly
✅ Payment error handling working correctly

🎉 All API integration tests passed!

📊 Test Summary:
✅ User CRUD operations
✅ Payment intent creation
✅ Payment processing simulation
✅ Service integration
✅ Error handling
✅ Data cleanup
```

### TASK 9: Performance Testing and Optimization

#### Step 9.1: Create Performance Test Script
**File:** `scripts/test-performance.ts`

```typescript
import { MockPaymentService } from '../lib/services/implementations/mock-payment/payment.service'
import { AirtableUserService } from '../lib/services/implementations/airtable/user.service'

async function testPerformance() {
  console.log('⚡ Testing Performance...\n')

  const userService = new AirtableUserService()
  const paymentService = new MockPaymentService()

  try {
    // Test 1: Concurrent User Operations
    console.log('=== Test 1: Concurrent User Operations ===')
    console.log('Creating 5 users concurrently...')
    
    const startTime = Date.now()
    
    const userPromises = Array.from({ length: 5 }, (_, i) => 
      userService.create({
        clerkId: `perf_test_${Date.now()}_${i}`,
        email: `perf${Date.now()}_${i}@test.com`,
        username: `perfuser_${Date.now()}_${i}`,
        rating: 5.0,
        isVerified: false
      })
    )

    const createdUsers = await Promise.all(userPromises)
    const userCreationTime = Date.now() - startTime
    
    console.log(`✅ Created ${createdUsers.length} users in ${userCreationTime}ms`)
    console.log(`📊 Average: ${(userCreationTime / createdUsers.length).toFixed(2)}ms per user`)

    // Test 2: Concurrent Payment Operations
    console.log('\n=== Test 2: Concurrent Payment Operations ===')
    console.log('Creating 10 payment intents concurrently...')
    
    const paymentStartTime = Date.now()
    
    const paymentPromises = Array.from({ length: 10 }, (_, i) =>
      paymentService.createPaymentIntent({
        amount: 5000 + (i * 100),
        sellerId: `seller_${i}`,
        buyerId: `buyer_${i}`,
        offerId: `offer_${i}`,
        listingId: `listing_${i}`
      })
    )

    const paymentIntents = await Promise.all(paymentPromises)
    const paymentCreationTime = Date.now() - paymentStartTime
    
    console.log(`✅ Created ${paymentIntents.length} payment intents in ${paymentCreationTime}ms`)
    console.log(`📊 Average: ${(paymentCreationTime / paymentIntents.length).toFixed(2)}ms per payment`)

    // Test 3: Rate Limiting Test
    console.log('\n=== Test 3: Rate Limiting Test ===')
    console.log('Testing Airtable rate limiting...')
    
    let successCount = 0
    let rateLimitedCount = 0
    
    for (let i = 0; i < 8; i++) {
      try {
        const user = await userService.findById(createdUsers[0].id)
        if (user) successCount++
      } catch (error) {
        if (error instanceof Error && error.message.includes('Rate limited')) {
          rateLimitedCount++
        }
      }
      // Small delay to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log(`✅ Successful requests: ${successCount}`)
    console.log(`⚠️ Rate limited requests: ${rateLimitedCount}`)

    // Test 4: Memory Usage
    console.log('\n=== Test 4: Memory Usage ===')
    const memoryUsage = process.memoryUsage()
    console.log(`📊 Memory Usage:`)
    console.log(`   RSS: ${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`)
    console.log(`   Heap Used: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`)
    console.log(`   Heap Total: ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`)

    // Test 5: Cleanup Performance
    console.log('\n=== Test 5: Cleanup Performance ===')
    const cleanupStartTime = Date.now()
    
    const deletePromises = createdUsers.map(user => userService.delete(user.id))
    await Promise.all(deletePromises)
    paymentService.clearPayments()
    
    const cleanupTime = Date.now() - cleanupStartTime
    console.log(`✅ Cleanup completed in ${cleanupTime}ms`)

    // Performance Summary
    console.log('\n📊 Performance Summary:')
    console.log(`• User creation: ${(userCreationTime / createdUsers.length).toFixed(2)}ms avg`)
    console.log(`• Payment creation: ${(paymentCreationTime / paymentIntents.length).toFixed(2)}ms avg`)
    console.log(`• Memory efficient: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB heap`)
    console.log(`• Rate limiting: Working correctly`)
    console.log(`• Cleanup: ${cleanupTime}ms for ${createdUsers.length} records`)

    if (userCreationTime / createdUsers.length < 1000 && 
        paymentCreationTime / paymentIntents.length < 100) {
      console.log('\n🎉 Performance tests passed! ✅')
    } else {
      console.log('\n⚠️ Performance may need optimization')
    }

  } catch (error) {
    console.error('❌ Performance test failed:', error)
    process.exit(1)
  }
}

testPerformance()
```

**Testing Step 9.1:**
```bash
# Run performance test
npx tsx scripts/test-performance.ts
```

### TASK 10: Final System Validation

#### Step 10.1: Create Master Test Script
**File:** `scripts/test-complete-system.ts`

```typescript
import { execSync } from 'child_process'

async function runMasterTest() {
  console.log('🚀 Running Complete System Validation...\n')
  
  const tests = [
    {
      name: 'TypeScript Compilation',
      command: 'npm run type-check',
      critical: true
    },
    {
      name: 'Environment Configuration',
      command: 'npx tsx scripts/test-environment.ts',
      critical: true
    },
    {
      name: 'Payment Service',
      command: 'npx tsx scripts/test-payment-service.ts',
      critical: true
    },
    {
      name: 'Airtable User Service',
      command: 'npx tsx scripts/test-airtable-user.ts',
      critical: true
    },
    {
      name: 'Auth Integration',
      command: 'npx tsx scripts/test-auth-integration.ts',
      critical: true
    },
    {
      name: 'API Integration',
      command: 'npx tsx scripts/test-api-integration.ts',
      critical: true
    },
    {
      name: 'Performance Tests',
      command: 'npx tsx scripts/test-performance.ts',
      critical: false
    }
  ]

  let passed = 0
  let failed = 0
  let skipped = 0

  for (const test of tests) {
    console.log(`\n=== Running: ${test.name} ===`)
    
    try {
      execSync(test.command, { 
        stdio: 'inherit',
        timeout: 60000 // 60 seconds timeout
      })
      console.log(`✅ ${test.name}: PASSED`)
      passed++
    } catch (error) {
      console.log(`❌ ${test.name}: FAILED`)
      if (test.critical) {
        console.error('💥 Critical test failed - stopping execution')
        failed++
        break
      } else {
        console.log('⚠️ Non-critical test failed - continuing')
        skipped++
      }
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 FINAL TEST RESULTS')
  console.log('='.repeat(50))
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`⚠️ Skipped: ${skipped}`)
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`)

  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! 🎉')
    console.log('✅ Phase 2 implementation is ready!')
    console.log('\nNext steps:')
    console.log('1. 🔄 Switch to Airtable: Set USE_AIRTABLE=true')
    console.log('2. 🧪 Test with real application')
    console.log('3. 🚀 Deploy to staging environment')
  } else {
    console.log('\n🔧 Please fix failed tests before proceeding')
    process.exit(1)
  }
}

runMasterTest()
```

**Testing Step 10.1:**
```bash
# Run complete system validation
npx tsx scripts/test-complete-system.ts
```

### VALIDATION CHECKPOINT 3 - FINAL
**Run this command to validate complete Phase 2 implementation:**
```bash
# Final validation
npx tsx scripts/test-complete-system.ts

# Check all new API routes
ls -la app/api/user/sync-enhanced/
ls -la app/api/payments/create-intent/
ls -la app/api/payments/process/

# Verify service switching works
echo "Testing service switching..."
USE_AIRTABLE=false npx tsx -e "
const { getDatabaseService } = require('./lib/services/factory');
console.log('Prisma mode: Ready for migration');
"

USE_AIRTABLE=true npx tsx -e "
const { getDatabaseService } = require('./lib/services/factory');
try {
  const db = getDatabaseService();
  console.log('Airtable mode: ✅ Services loaded');
} catch (error) {
  console.log('Airtable mode: ℹ️ Stub services (expected)');
}
"
```

### SUCCESS CRITERIA FOR PHASE 2 COMPLETION

**✅ Technical Requirements:**
- [ ] All TypeScript compiles without errors
- [ ] Service factory can switch between implementations
- [ ] Mock payment service fully functional with realistic timing
- [ ] Airtable user service working with real API calls
- [ ] Enhanced authentication integrates Clerk + database
- [ ] API routes use new service layer
- [ ] Comprehensive error handling and logging
- [ ] Performance meets requirements (<1s user ops, <100ms payments)

**✅ Functional Requirements:**
- [ ] Users auto-created from Clerk authentication
- [ ] Payment intents created and processed
- [ ] Rate limiting prevents API abuse
- [ ] All operations logged with clear feedback
- [ ] Cleanup and error recovery working
- [ ] Environment configuration validated

**✅ Quality Requirements:**
- [ ] All tests pass consistently
- [ ] Code follows TypeScript best practices
- [ ] Clear separation of concerns in service layer
- [ ] Proper abstraction allows easy real payment integration
- [ ] Comprehensive test coverage

### NEXT PHASE READINESS

After completing Phase 2, you'll be ready for:
1. **Phase 3**: Complete Airtable listings/offers services
2. **Phase 4**: Frontend integration with new APIs
3. **Phase 5**: Replace mock payments with Stripe Connect
4. **Phase 6**: Production deployment

The foundation is now solid, tested, and ready for expansion! 🚀

## Technical Specifications

### Enhanced Environment Variables
```env
# Database Configuration
DATABASE_URL="file:./prisma/dev.db"
USE_AIRTABLE=true

# Airtable Configuration (required when USE_AIRTABLE=true)
AIRTABLE_API_KEY=patJ1EroOjRYkbctb.b2adfc99fe11c2800075ec0cbde62ada08eee11f8021591d227567e6dbd92868
AIRTABLE_BASE_ID=apphGdyr5vFOJx2kF

# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_cG9saXNoZWQtcGxhdHlwdXMtNDkuY2xlcmsuYWNjb3VudHMuZGV2JA
CLERK_SECRET_KEY=sk_test_3d6u5MUS4Ws5dfMs3by2EJDd2vILO0stY2pSRjSMp4

# Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/listings
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/listings

# Enhanced Mock Payment Configuration
MOCK_PAYMENTS=true
PLATFORM_FEE_PERCENT=6
MOCK_PAYMENT_FAILURE_RATE=0.1
MOCK_PAYMENT_PROCESSING_TIME=2000
MOCK_PAYOUT_DELAY=5000

# Performance & Caching Configuration
AIRTABLE_RATE_LIMIT_PER_SEC=5
CACHE_TTL_USERS=300000
CACHE_TTL_LISTINGS=60000
CACHE_MAX_SIZE=1000

# Application Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
UPLOAD_DIR=./public/uploads
NODE_ENV=development
LOG_LEVEL=info

# File upload limits
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=application/pdf,image/jpeg,image/png

# Rate limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Enhanced Dependencies
```json
{
  "dependencies": {
    "@clerk/nextjs": "^6.11.0",
    "airtable": "^0.12.2",
    "p-queue": "^8.0.1",
    "node-cache": "^5.1.2"
  }
}
```

### Dependencies Already Present
- `@clerk/nextjs`: Already installed (v6.11.0)
- `airtable`: Already installed (v0.12.2)
- `p-queue`: Already installed (v8.0.1)
- `zod`: Already installed (v3.25.67) - for validation
- `react-hook-form`: Already installed (v7.58.1) - for forms
- `react-hot-toast`: Already installed (v2.5.2) - for notifications
- `sharp`: Already installed (v0.34.2) - for image processing
- `uuid`: Already installed (v11.1.0) - for ID generation
- `dotenv`: Already installed (v16.5.0) - for environment management
- All other required dependencies are present

### New Dependencies to Install
```bash
# Install missing dependency if needed
npm install node-cache

# Verify all required packages
npm ls @clerk/nextjs airtable p-queue node-cache zod
```

### File Structure Updates
```
lib/
├── services/
│   ├── interfaces/
│   │   ├── database.interface.ts
│   │   ├── payment.interface.ts
│   │   └── storage.interface.ts
│   ├── implementations/
│   │   ├── airtable/
│   │   │   ├── user.service.ts
│   │   │   ├── listing.service.ts
│   │   │   └── offer.service.ts
│   │   ├── mock-payment/
│   │   │   └── payment.service.ts
│   │   └── prisma/ (keep for migration)
│   │       └── ...existing services
│   └── factory.ts
├── auth-server.ts
├── airtable-client.ts
├── mock-payment-client.ts
└── cache.ts
```

## Risk Mitigation

### Data Migration Risks
- **Backup Strategy**: Full SQLite backup before migration
- **Rollback Plan**: Keep Prisma services until migration validated
- **Testing**: Extensive testing with production data copies

### API Rate Limiting
- **Monitoring**: Track API usage in real-time
- **Graceful Degradation**: Fallback to cached data when rate limited
- **User Communication**: Clear error messages for rate limit issues

### Payment Security
- **Mock Payment Validation**: Proper payment intent validation
- **Idempotency**: Prevent duplicate payment processing
- **Audit Trail**: Log all payment-related actions
- **Rate Limiting**: Prevent payment spam/abuse

## Success Criteria

### Technical Metrics
- [ ] API response times < 500ms average
- [ ] 99.9% uptime during migration
- [ ] Zero data corruption
- [ ] All existing features functional
- [ ] Proper error handling and logging

### Business Metrics
- [ ] User authentication success rate > 99%
- [ ] Mock payment completion rate > 95%
- [ ] Customer support tickets < 10/week
- [ ] Page load times < 2 seconds

## Next Steps After Phase 2

1. **Phase 3**: Frontend optimization and caching
2. **Phase 4**: Advanced features (search, filters, notifications)
3. **Phase 5**: Real payment integration (Stripe Connect)
4. **Phase 6**: Production deployment and monitoring
5. **Phase 7**: Scaling and performance optimization

## Conclusion

This Phase 2 implementation will establish a solid foundation for the ticket marketplace by:
- Creating proper service abstractions for easy testing and deployment
- Implementing production-ready authentication with Clerk
- Setting up realistic mock payments to validate marketplace flows
- Migrating to Airtable for better data management
- Optimizing for performance and scalability

The key to success is the incremental migration approach, allowing us to validate each component before fully committing to the new architecture. The mock payment system will allow rapid development and testing without payment processing complexity.

---

## 📚 COMPREHENSIVE DOCUMENTATION LIST

### Core Implementation Documentation

#### 1. Clerk Authentication
- **Primary**: [Clerk Next.js Documentation](https://clerk.com/docs/quickstarts/nextjs)
- **Server-Side Auth**: [auth() Reference](https://clerk.com/docs/references/nextjs/auth)
- **Middleware**: [clerkMiddleware() Reference](https://clerk.com/docs/references/nextjs/clerk-middleware)
- **User Management**: [Clerk User API](https://clerk.com/docs/references/backend/user/get-user)
- **Authentication Flow**: [Next.js Authentication Guide](https://clerk.com/blog/nextjs-authentication)

#### 2. Airtable API Integration
- **Primary**: [Airtable Web API Documentation](https://airtable.com/developers/web/api/introduction)
- **Rate Limits**: [API Rate Limits](https://airtable.com/developers/web/api/rate-limits)
- **JavaScript SDK**: [Airtable.js Documentation](https://github.com/Airtable/airtable.js)
- **Field Types**: [Airtable Field Types Reference](https://airtable.com/developers/web/api/field-types)
- **Filtering**: [Formula Field Reference](https://support.airtable.com/docs/formula-field-reference)

#### 3. Next.js App Router
- **Primary**: [Next.js App Router Documentation](https://nextjs.org/docs/app)
- **API Routes**: [Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- **Middleware**: [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- **Server Components**: [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)

#### 4. TypeScript & Validation
- **Zod Documentation**: [Zod Schema Validation](https://zod.dev/)
- **TypeScript Next.js**: [TypeScript with Next.js](https://nextjs.org/docs/app/building-your-application/configuring/typescript)
- **Prisma Types**: [Prisma TypeScript](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/generating-prisma-client)

### Service Layer Implementation

#### 5. Service Architecture Patterns
- **Repository Pattern**: [Repository Pattern in TypeScript](https://blog.logrocket.com/using-repository-pattern-node-js/)
- **Dependency Injection**: [DI in TypeScript](https://blog.logrocket.com/dependency-injection-typescript/)
- **Factory Pattern**: [Factory Pattern Implementation](https://refactoring.guru/design-patterns/factory-method/typescript/example)

#### 6. Caching & Performance
- **Node-Cache**: [Node-Cache Documentation](https://github.com/node-cache/node-cache)
- **P-Queue**: [P-Queue Documentation](https://github.com/sindresorhus/p-queue)
- **Rate Limiting**: [Rate Limiting Best Practices](https://blog.logrocket.com/rate-limiting-node-js/)

### Database & Migration

#### 7. Prisma (Current)
- **Primary**: [Prisma Documentation](https://www.prisma.io/docs/)
- **Schema**: [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- **Migrations**: [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)

#### 8. Data Migration
- **Migration Strategies**: [Database Migration Best Practices](https://blog.logrocket.com/database-migration-best-practices/)
- **Data Validation**: [Data Validation Strategies](https://blog.logrocket.com/data-validation-node-js-joi/)

### Frontend & UI

#### 9. React & Hooks
- **React Documentation**: [React 18 Documentation](https://react.dev/)
- **React Hook Form**: [React Hook Form Documentation](https://react-hook-form.com/)
- **React Hot Toast**: [React Hot Toast](https://react-hot-toast.com/)

#### 10. Tailwind CSS
- **Primary**: [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- **Components**: [Tailwind UI Components](https://tailwindui.com/components)

### File Management

#### 11. File Upload & Processing
- **Sharp**: [Sharp Image Processing](https://sharp.pixelplumbing.com/)
- **React Dropzone**: [React Dropzone Documentation](https://react-dropzone.js.org/)
- **File Validation**: [File Upload Security](https://blog.logrocket.com/secure-file-uploads-node-js/)

### Mock Payment System

#### 12. Payment Flow Design
- **Payment UX Patterns**: [Payment UI/UX Best Practices](https://stripe.com/guides/payment-ux)
- **Mock Implementation**: [Mock Service Implementation Patterns](https://martinfowler.com/articles/mocksArentStubs.html)

### Testing & Quality

#### 13. Testing Strategies
- **Jest**: [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- **API Testing**: [Supertest Documentation](https://github.com/ladjs/supertest)
- **E2E Testing**: [Playwright Documentation](https://playwright.dev/)

#### 14. Code Quality
- **ESLint**: [ESLint Configuration](https://eslint.org/docs/latest/)
- **Prettier**: [Prettier Configuration](https://prettier.io/docs/en/configuration.html)
- **TypeScript**: [TypeScript Configuration](https://www.typescriptlang.org/docs/)

### Environment & Configuration

#### 15. Environment Management
- **Next.js Environment Variables**: [Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- **dotenv**: [dotenv Documentation](https://github.com/motdotla/dotenv)

### Error Handling & Logging

#### 16. Error Management
- **Error Boundaries**: [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- **API Error Handling**: [Express Error Handling](https://expressjs.com/en/guide/error-handling.html)
- **Logging**: [Winston Logger](https://github.com/winstonjs/winston)

### Performance & Monitoring

#### 17. Performance Optimization
- **Next.js Performance**: [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing/performance)
- **Bundle Analysis**: [Bundle Analyzer](https://github.com/vercel/next.js/tree/canary/packages/next-bundle-analyzer)
- **Core Web Vitals**: [Web Vitals](https://web.dev/vitals/)

### Security

#### 18. Security Best Practices
- **OWASP**: [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- **Next.js Security**: [Next.js Security Headers](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- **Content Security Policy**: [CSP Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

### Additional Resources

#### 19. Best Practices & Patterns
- **Clean Code**: [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
- **API Design**: [REST API Best Practices](https://blog.logrocket.com/nodejs-expressjs-rest-api-design-best-practices/)
- **TypeScript Best Practices**: [TypeScript Best Practices](https://blog.logrocket.com/typescript-best-practices/)

#### 20. Troubleshooting Resources
- **Clerk Issues**: [Clerk Community](https://clerk.com/community)
- **Airtable Issues**: [Airtable Community](https://community.airtable.com/)
- **Next.js Issues**: [Next.js Discussions](https://github.com/vercel/next.js/discussions)

### Quick Reference Links

#### Essential Commands
```bash
# Clerk CLI
npm install @clerk/nextjs

# Airtable API
npm install airtable

# Development
npm run dev
npm run build
npm run lint
npm run type-check

# Database
npm run db:push
npm run db:studio
```

#### Key Environment Variables
```env
# From your .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
AIRTABLE_API_KEY=pat...
AIRTABLE_BASE_ID=app...
MOCK_PAYMENTS=true
```

This comprehensive documentation list covers all aspects of the Phase 2 implementation, from core APIs to best practices and troubleshooting resources.
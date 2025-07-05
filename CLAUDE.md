# Claude Development Guidelines

## 🚨 CRITICAL: Phase 2 Implementation Protocol

**YOU ARE IMPLEMENTING PHASE 2 OF THE TICKET MARKETPLACE PROJECT**

**Primary Reference**: Follow `/initial.md` step-by-step implementation guide
**Current Phase**: Service Layer Foundation with Airtable + Clerk + Mock Payments
**Implementation Approach**: Atomic tasks with mandatory testing after each step

### Implementation Rules:
1. **Follow initial.md Exactly**: Every file path, content, and test command is provided
2. **Test After Every Step**: Use the provided test commands to verify each operation
3. **Use Provided Code**: Copy the exact TypeScript code from initial.md
4. **Validate Continuously**: Run validation checkpoints at specified intervals
5. **Log Everything**: All operations should have detailed console logging

### Current Environment Status:
- ✅ Clerk authentication configured
- ✅ Airtable API credentials ready
- ✅ Mock payments enabled
- ✅ All required dependencies installed

## Research Requirements

**IMPORTANT: Always research documentation online before implementing manual solutions.**

When working with external APIs, services, or frameworks:

1. **Research First**: Always look up the official documentation online before implementing workarounds
2. **Use Official Methods**: Prefer documented API methods over manual alternatives
3. **Verify Syntax**: Check the correct syntax and parameters for API calls
4. **Test Approaches**: Try multiple documented approaches before falling back to manual solutions

This approach ensures:
- Better compatibility with service updates
- More reliable and maintainable code
- Proper usage of API features
- Fewer unexpected errors

## Project Context

This is a ticket marketplace application using:
- **Frontend**: Next.js 15 with React
- **Authentication**: Clerk (server-side integration with auto user creation)
- **Database**: Airtable (replacing Prisma/SQLite in Phase 2)
- **Payments**: Mock Payment Service (realistic simulation for development)
- **Styling**: Tailwind CSS
- **Architecture**: Service Layer Pattern with Factory Pattern for implementation switching

### Phase 2 Architecture:
```
lib/services/
├── interfaces/           # Service contracts
│   ├── database.interface.ts
│   └── payment.interface.ts
├── implementations/
│   ├── airtable/        # Airtable implementations
│   ├── mock-payment/    # Mock payment service
│   └── prisma/          # Legacy (for migration)
└── factory.ts           # Service factory for switching implementations
```

## Database Schema

### 🚨 **CRITICAL: Airtable Field Naming Convention**

**Field naming follows a strict convention based on table type:**

**Users, Transactions, and other non-primary tables:**
- Use **camelCase** field names (e.g., `clerkId`, `totalSales`, `isVerified`, `createdAt`)
- No spaces, no capital letters at start
- Multi-word fields use camelCase: `stripeAccountId`, `platformFee`

**Listings and Offers tables (primary entity tables):**
- Use **Capitalized** field names with spaces (e.g., `"Event Name"`, `"Price (Cents)"`, `"Created At"`)
- Traditional Airtable naming with proper capitalization

**In Airtable API filterByFormula:**
- Always wrap field names in curly brackets: `{clerkId}`, `{Event Name}`
- Use exact field name as stored in Airtable
- Examples:
  ```javascript
  // Users table
  filterByFormula: `{clerkId} = '${userId}'`
  
  // Listings table  
  filterByFormula: `{Event Name} = '${eventName}'`
  
  // Offers table
  filterByFormula: `FIND('${listingId}', ARRAYJOIN({Listing})) > 0`
  ```

**⚠️ Common Mistakes:**
- Don't use `{Clerk ID}` → Use `{clerkId}`
- Don't use `{clerk id}` → Use `{clerkId}` 
- Don't mix conventions between tables

### Airtable Tables:
- **Users**: Contains user profiles with Clerk integration
  - clerkId (Text) - Primary link to Clerk authentication
  - email (Email)
  - username (Text)
  - rating (Number) - Default 5.0
  - isVerified (Checkbox) - Default false
  - totalSales (Number) - Default 0
  
- **Listings**: Ticket listings with linked seller field
  - title (Text)
  - eventName (Text)
  - eventDate (Date)
  - price (Number) - Price in cents
  - quantity (Number)
  - status (Single select) - ACTIVE, INACTIVE, SOLD, DELISTED
  - seller (Link to Users table)
  - description (Long text)
  - ticketFiles (Attachment)

- **Offers**: Purchase offers with linked buyer and listing fields
  - listing (Link to Listings table)
  - buyer (Link to Users table)
  - offerPrice (Number) - Price in cents
  - quantity (Number)
  - status (Single select) - PENDING, ACCEPTED, REJECTED, EXPIRED, COMPLETED
  - message (Single select) - Buy at asking price, Make offer, Check availability
  - customMessage (Long text)

- **Transactions**: Payment records
  - offer (Link to Offers table)
  - amount (Number) - Total amount in cents
  - status (Single select) - PENDING, PROCESSING, COMPLETED, FAILED, REFUNDED
  - stripePaymentId (Text) - For future Stripe integration
  - completedAt (Date)

### Key Field Types:
- **Linked record fields** use arrays of record IDs (e.g., `[recordId]`)
- **Date fields** expect YYYY-MM-DD format
- **Price fields** store values in cents (never dollars to avoid floating point errors)
- **Money calculations** always use integers (cents) throughout the application

### Field Mapping Reference:
The correct field mappings are defined in `/lib/airtable-client.ts`:

```typescript
// Users table (camelCase)
users: {
  clerkId: 'clerkId',
  email: 'email', 
  username: 'username',
  rating: 'rating',
  isVerified: 'isVerified',
  totalSales: 'totalSales',
  stripeAccountId: 'stripeAccountId',
  createdAt: 'createdAt'
}

// Listings table (Capitalized)
listings: {
  title: 'Title',
  eventName: 'Event Name', 
  eventDate: 'Event Date',
  priceInCents: 'Price (Cents)',
  seller: 'Seller', // Link field
  // ... other fields
}

// Offers table (Capitalized)  
offers: {
  listing: 'Listing', // Link field
  buyer: 'Buyer', // Link field
  offerPriceInCents: 'Offer Price (Cents)',
  status: 'Status',
  // ... other fields
}
```

## Phase 2 Implementation Guidelines

### 🎯 Current Implementation Focus
**You are implementing the Service Layer Foundation (Phase 2A-2C)**

### Mandatory Implementation Steps:
1. **Create Service Interfaces First** - Define contracts before implementations
2. **Implement Mock Payment Service** - Realistic simulation with proper timing
3. **Build Airtable User Service** - Real API integration with rate limiting
4. **Enhanced Clerk Authentication** - Auto user creation from Clerk data
5. **API Route Updates** - Use new service layer architecture
6. **Comprehensive Testing** - Every step must be validated

### Testing Protocol:
- **After each file creation**: Verify with `cat` command
- **After each service**: Run dedicated test script
- **After each phase**: Run validation checkpoint
- **Before completion**: Run master test script

### Service Factory Usage:
```typescript
// Switch between implementations via environment
USE_AIRTABLE=true   // Use Airtable services
USE_AIRTABLE=false  // Use Prisma services (legacy)

// In code
import { getDatabaseService, getPaymentService } from '@/lib/services/factory'
const dbService = getDatabaseService()      // Auto-selects implementation
const paymentService = getPaymentService()  // Always mock in Phase 2
```

## Common Issues and Solutions

### Airtable Rate Limiting (Critical for Phase 2)
**Always use p-queue for rate limiting**:
```typescript
import PQueue from 'p-queue'

// 5 requests per second limit
const airtableQueue = new PQueue({ 
  interval: 1000, 
  intervalCap: 5 
})

// Wrap all Airtable operations
return airtableQueue.add(async () => {
  // Your Airtable API call here
})
```

### Airtable Filtering for Linked Records
Use `FIND()` with `ARRAYJOIN()` for most reliable filtering:
```javascript
// Recommended approach for Phase 2
`FIND('${recordId}', ARRAYJOIN({linkedField})) > 0`

// Alternative approaches if needed
`SEARCH('${recordId}', ARRAYJOIN({linkedField}))`
`{linkedField} = '${recordId}'` // For single linked records
```

### Clerk Server-Side Authentication (Phase 2 Requirement)
```typescript
// Correct Phase 2 pattern
import { auth, clerkClient } from '@clerk/nextjs/server'

export async function requireAuth(): Promise<AppUser> {
  const { userId } = await auth()
  if (!userId) throw new Error('Authentication required')
  
  // Auto-create user in database if not exists
  const dbService = getDatabaseService()
  let user = await dbService.users.findByClerkId(userId)
  
  if (!user) {
    const clerkUser = await clerkClient.users.getUser(userId)
    user = await dbService.users.create({
      clerkId: userId,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      username: clerkUser.username || 'user'
    })
  }
  
  return user
}
```

### Mock Payment Implementation (Phase 2)
```typescript
// Realistic payment simulation
export class MockPaymentService implements PaymentService {
  async createPaymentIntent(data: CreatePaymentIntentData): Promise<PaymentIntent> {
    const intentId = `pi_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const platformFee = Math.round(data.amount * 0.06) // 6% platform fee
    
    // Store in memory map for simulation
    const payment: MockPayment = {
      id: intentId,
      amount: data.amount,
      status: 'requires_payment_method',
      platformFee,
      sellerAmount: data.amount - platformFee,
      // ... other fields
    }
    
    return payment
  }
  
  async simulatePayment(intentId: string): Promise<MockPayment> {
    // Simulate processing time (2 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 90% success rate simulation
    const isSuccess = Math.random() < 0.9
    // Update payment status and return
  }
}
```

### Next.js 15 Async Params
All route parameters are now async:
```javascript
// Correct Next.js 15 syntax
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
```

### Error Handling & Logging (Phase 2 Requirement)
```typescript
// All operations must have detailed logging
try {
  console.log(`🔍 Finding user by Clerk ID: ${clerkId}`)
  const user = await userService.findByClerkId(clerkId)
  if (user) {
    console.log(`✅ User found: ${user.id}`)
  } else {
    console.log(`❌ User not found for Clerk ID: ${clerkId}`)
  }
  return user
} catch (error) {
  console.error(`❌ Error finding user: ${error}`)
  throw error
}
```

### File Structure Validation
Before implementing, ensure these directories exist:
```bash
# Required Phase 2 structure
lib/services/interfaces/
lib/services/implementations/airtable/
lib/services/implementations/mock-payment/
lib/services/implementations/prisma/
scripts/
app/api/user/sync-enhanced/
app/api/payments/create-intent/
app/api/payments/process/
```

### Environment Variables (Phase 2)
```env
# Database Configuration
DATABASE_URL="file:./prisma/dev.db"
USE_AIRTABLE=true

# Airtable Configuration (critical for Phase 2)
AIRTABLE_API_KEY=patJ1EroOjRYkbctb.b2adfc99fe11c2800075ec0cbde62ada08eee11f8021591d227567e6dbd92868
AIRTABLE_BASE_ID=apphGdyr5vFOJx2kF

# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_cG9saXNoZWQtcGxhdHlwdXMtNDkuY2xlcmsuYWNjb3VudHMuZGV2JA
CLERK_SECRET_KEY=sk_test_3d6u5MUS4Ws5dfMs3by2EJDd2vILO0stY2pSRjSMp4

# Enhanced Mock Payment Configuration
MOCK_PAYMENTS=true
PLATFORM_FEE_PERCENT=6
MOCK_PAYMENT_FAILURE_RATE=0.1
MOCK_PAYMENT_PROCESSING_TIME=2000
MOCK_PAYOUT_DELAY=5000

# Performance & Caching (critical for Airtable)
AIRTABLE_RATE_LIMIT_PER_SEC=5
CACHE_TTL_USERS=300000
CACHE_TTL_LISTINGS=60000
CACHE_MAX_SIZE=1000

# Development
NODE_ENV=development
LOG_LEVEL=info
```

## 🚀 ENHANCED PHASE 2 IMPLEMENTATION FEATURES

### Multi-Level Caching Strategy
**CRITICAL: Implement caching to reduce Airtable API calls**

```typescript
// lib/cache.ts - Required implementation
import NodeCache from 'node-cache'
import { env } from './env'

const userCache = new NodeCache({ 
  stdTTL: env.CACHE_TTL_USERS / 1000,  // 5 minutes
  maxKeys: env.CACHE_MAX_SIZE 
})

const listingCache = new NodeCache({ 
  stdTTL: env.CACHE_TTL_LISTINGS / 1000,  // 1 minute
  maxKeys: env.CACHE_MAX_SIZE 
})

export const CacheService = {
  // User caching
  getUserFromCache: (key: string) => userCache.get(key),
  setUserInCache: (key: string, data: any) => userCache.set(key, data),
  
  // Listing caching
  getListingFromCache: (key: string) => listingCache.get(key),
  setListingInCache: (key: string, data: any) => listingCache.set(key, data),
  
  // Cache invalidation
  invalidateUser: (userId: string) => userCache.del(`user:${userId}`),
  invalidateUserByClerkId: (clerkId: string) => userCache.del(`clerk:${clerkId}`),
  
  // Statistics
  getCacheStats: () => ({
    users: userCache.getStats(),
    listings: listingCache.getStats()
  })
}
```

### Enhanced Mock Payment Features
**Implement realistic payment simulation with analytics**

```typescript
// Must include these features in MockPaymentService:
export class MockPaymentService {
  // Required: Configurable failure simulation
  private readonly FAILURE_RATE = parseFloat(process.env.MOCK_PAYMENT_FAILURE_RATE || '0.1')
  
  // Required: Payment timeline tracking
  timeline: Array<{
    event: 'payment_intent_created' | 'payment_processing_started' | 'payment_succeeded' | 'payment_failed' | 'seller_payout_completed'
    timestamp: Date
    description: string
  }>
  
  // Required: Analytics methods
  async getPaymentAnalytics(): Promise<PaymentAnalytics>
  async getPaymentHistory(filters?: PaymentFilters): Promise<MockPayment[]>
  
  // Required: Enhanced failure reasons
  failureReasons = [
    'insufficient_funds',
    'card_declined', 
    'expired_card',
    'processing_error',
    'fraud_prevention'
  ]
}
```

### Data Migration & Validation
**CRITICAL: Must validate all data integrity during migration**

```typescript
// Required migration validation steps:
1. Record count validation (Prisma vs Airtable)
2. Relationship integrity checks (linked records exist)
3. Data type validation (dates, numbers, strings)
4. Field mapping verification
5. Migration report generation

// Example validation
async validateMigration(): Promise<boolean> {
  // Count validation
  const prismaCount = await prisma.user.count()
  const airtableCount = (await airtable.users.select().all()).length
  
  if (prismaCount !== airtableCount) {
    console.error(`❌ Count mismatch: ${prismaCount} vs ${airtableCount}`)
    return false
  }
  
  // Relationship validation
  const listings = await airtable.listings.select().all()
  for (const listing of listings) {
    const seller = listing.get('Seller') as string[]
    if (!seller || seller.length === 0) {
      console.error(`❌ Listing ${listing.id} has no seller`)
      return false
    }
  }
  
  return true
}
```

### Environment Configuration Validation
**Use centralized environment management with validation**

```typescript
// lib/env.ts - Must implement
import { z } from 'zod'

// Required: Environment schema validation
const envSchema = z.object({
  USE_AIRTABLE: z.string().transform(val => val === 'true'),
  AIRTABLE_API_KEY: z.string().min(1).optional(),
  AIRTABLE_BASE_ID: z.string().min(1).optional(),
  PLATFORM_FEE_PERCENT: z.string().transform(Number),
  MOCK_PAYMENT_FAILURE_RATE: z.string().transform(Number)
})

// Required: Environment validation function
export function validateEnvironment(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (env.USE_AIRTABLE && !env.AIRTABLE_API_KEY) {
    errors.push('AIRTABLE_API_KEY required when USE_AIRTABLE=true')
  }
  
  if (env.PLATFORM_FEE_PERCENT < 0 || env.PLATFORM_FEE_PERCENT > 100) {
    errors.push('PLATFORM_FEE_PERCENT must be 0-100')
  }
  
  return { isValid: errors.length === 0, errors }
}
```

### Field Mapping & Configuration
**CRITICAL: Use centralized field mapping for Airtable**

```typescript
// lib/airtable-config.ts - Required implementation
export const AIRTABLE_CONFIG = {
  FIELD_MAPPINGS: {
    users: {
      clerkId: 'Clerk ID',
      email: 'Email',
      username: 'Username',
      rating: 'Rating',
      isVerified: 'Is Verified',
      totalSales: 'Total Sales'
    },
    listings: {
      title: 'Title',
      eventName: 'Event Name',
      eventDate: 'Event Date',
      priceInCents: 'Price (Cents)',
      seller: 'Seller'  // Link field
    }
  }
}

// Required: Field transformation utilities
export const FIELD_TRANSFORMS = {
  toAirtable: (tableName: string, data: any) => {
    // Convert API fields to Airtable field names
  },
  fromAirtable: (tableName: string, record: any) => {
    // Convert Airtable fields to API field names
  }
}
```

## 🚨 CRITICAL SUCCESS CRITERIA

### Phase 2 Completion Requirements:
**ALL of these must pass before Phase 2 is considered complete:**

1. **TypeScript Compilation**: `npm run type-check` must pass with zero errors
2. **Environment Test**: `npx tsx scripts/test-environment.ts` must validate all variables
3. **Payment Service Test**: `npx tsx scripts/test-payment-service.ts` must complete full flow
4. **Airtable User Test**: `npx tsx scripts/test-airtable-user.ts` must create/read/update/delete
5. **Auth Integration Test**: `npx tsx scripts/test-auth-integration.ts` must validate helpers
6. **API Integration Test**: `npx tsx scripts/test-api-integration.ts` must complete end-to-end
7. **Master Test**: `npx tsx scripts/test-complete-system.ts` must show 100% pass rate

### If ANY Test Fails:
1. **STOP implementation immediately**
2. **Fix the failing component**
3. **Re-run the specific test**
4. **Only continue after ALL tests pass**

## 🎯 IMPLEMENTATION CHECKPOINT COMMANDS

### After Creating Service Interfaces (Task 1):
```bash
npm run type-check
ls -la lib/services/interfaces/
cat lib/services/interfaces/database.interface.ts | head -10
```

### After Mock Payment Service (Task 2):
```bash
npm run type-check
npx tsx scripts/test-payment-service.ts
```

### After Airtable User Service (Task 3):
```bash
npm run type-check
npx tsx scripts/test-airtable-user.ts
```

### After Enhanced Auth (Task 4-6):
```bash
npm run type-check
npx tsx scripts/test-environment.ts
npx tsx scripts/test-auth-integration.ts
```

### After API Routes (Task 7-10):
```bash
npm run type-check
npx tsx scripts/test-api-integration.ts
npx tsx scripts/test-complete-system.ts
```

## ⚠️ COMMON MISTAKES TO AVOID

### 1. File Path Errors
- **Use absolute paths** starting from project root
- **Check case sensitivity** (TypeScript vs typescript)
- **Verify directory structure** before creating files

### 2. Import Path Issues
```typescript
// ✅ Correct
import { UserService } from '../../interfaces/database.interface'
import { getDatabaseService } from '@/lib/services/factory'

// ❌ Wrong
import { UserService } from '../database.interface'
import { getDatabaseService } from './factory'
```

### 3. Environment Variable Loading
```typescript
// ✅ Correct - Check environment first
const apiKey = process.env.AIRTABLE_API_KEY
if (!apiKey) {
  throw new Error('AIRTABLE_API_KEY not found')
}

// ❌ Wrong - Don't assume it exists
const apiKey = process.env.AIRTABLE_API_KEY!
```

### 4. Rate Limiting Bypass
```typescript
// ✅ Correct - Always use queue
return airtableQueue.add(async () => {
  return await this.base!(tableName).create(fields)
})

// ❌ Wrong - Direct API calls will be rate limited
return await this.base!(tableName).create(fields)
```

### 5. Money Handling
```typescript
// ✅ Correct - Always use cents
const priceInCents = 5000  // $50.00
const platformFee = Math.round(priceInCents * 0.06)

// ❌ Wrong - Never use dollars/floats
const priceInDollars = 50.00
const platformFee = priceInDollars * 0.06
```

### 6. Error Handling
```typescript
// ✅ Correct - Log everything
try {
  console.log(`🔍 Finding user by ID: ${id}`)
  const user = await userService.findById(id)
  if (user) {
    console.log(`✅ User found: ${user.username}`)
  }
  return user
} catch (error) {
  console.error(`❌ Error finding user: ${error}`)
  throw error
}

// ❌ Wrong - Silent failures
try {
  return await userService.findById(id)
} catch (error) {
  return null
}
```

## 📋 FINAL VALIDATION CHECKLIST

Before marking Phase 2 complete, verify:

### Files Created (All must exist):
- [ ] `lib/services/interfaces/database.interface.ts`
- [ ] `lib/services/interfaces/payment.interface.ts`
- [ ] `lib/services/factory.ts`
- [ ] `lib/services/implementations/mock-payment/payment.service.ts`
- [ ] `lib/airtable-client.ts`
- [ ] `lib/services/implementations/airtable/user.service.ts`
- [ ] `lib/services/implementations/airtable/database.service.ts`
- [ ] `lib/auth-server.ts`
- [ ] `lib/api-helpers-enhanced.ts`
- [ ] `app/api/user/sync-enhanced/route.ts`
- [ ] `app/api/payments/create-intent/route.ts`
- [ ] `app/api/payments/process/route.ts`

### Test Scripts Created (All must exist):
- [ ] `scripts/test-payment-service.ts`
- [ ] `scripts/test-airtable-user.ts`
- [ ] `scripts/test-auth-integration.ts`
- [ ] `scripts/test-environment.ts`
- [ ] `scripts/test-api-integration.ts`
- [ ] `scripts/test-performance.ts`
- [ ] `scripts/test-complete-system.ts`

### Environment Configuration:
- [ ] `USE_AIRTABLE=true` added to `.env.local`
- [ ] All required environment variables present
- [ ] Airtable connection working
- [ ] Clerk authentication configured

### Functional Requirements:
- [ ] Service factory switches implementations correctly
- [ ] Mock payments simulate realistic timing and success rates
- [ ] Airtable user service performs full CRUD operations
- [ ] Authentication auto-creates users from Clerk
- [ ] All operations have detailed console logging
- [ ] Rate limiting prevents API abuse
- [ ] Error handling with proper recovery

### Quality Assurance:
- [ ] TypeScript compiles without warnings
- [ ] All tests pass consistently
- [ ] Performance meets benchmarks
- [ ] Code follows established patterns
- [ ] No hardcoded values (use environment variables)
- [ ] Proper separation of concerns

**ONLY AFTER ALL CHECKBOXES ARE COMPLETE IS PHASE 2 READY** ✅

## 🧪 ENHANCED TESTING REQUIREMENTS

### Additional Test Scripts Required
Beyond the standard test scripts, you must also create:

**Migration Testing:**
```bash
# Test data migration integrity
npx tsx scripts/test-migration.ts

# Test rollback capability
npx tsx scripts/test-rollback.ts
```

**Performance Testing:**
```bash
# Test Airtable API performance
npx tsx scripts/test-airtable-performance.ts

# Test caching effectiveness
npx tsx scripts/test-cache-performance.ts

# Test payment analytics
npx tsx scripts/test-payment-analytics.ts
```

**Integration Testing:**
```bash
# Test feature flag switching
npx tsx scripts/test-feature-flags.ts

# Test environment validation
npx tsx scripts/test-environment-validation.ts
```

### Benchmarking Requirements
**Must achieve these performance targets:**

- **User Operations**: < 1000ms average (including cache misses)
- **Payment Creation**: < 100ms average
- **Airtable API Calls**: Respect 5 req/sec limit with 0 rate limit errors
- **Cache Hit Rate**: > 80% for user lookups
- **Memory Usage**: < 100MB heap for test scenarios
- **Migration Speed**: Process 100 records in < 60 seconds

### Error Handling Validation
**Must handle these scenarios gracefully:**

1. **Airtable Rate Limiting**: Automatic retry with exponential backoff
2. **Network Failures**: Graceful degradation with cached data
3. **Invalid Environment**: Clear error messages with resolution steps
4. **Payment Failures**: Proper status tracking and user feedback
5. **Migration Errors**: Partial rollback and error reporting

### Monitoring & Logging Requirements
**All operations must log:**

- **Request timing** with performance metrics
- **Cache hit/miss rates** for optimization
- **API call counts** to track rate limit usage
- **Error details** with context for debugging
- **Migration progress** with success/failure counts

### Final Validation Checklist Extensions

**Performance Validation:**
- [ ] Cache service implemented and functional
- [ ] Airtable rate limiting working correctly
- [ ] Payment analytics providing accurate data
- [ ] Memory usage within acceptable limits
- [ ] API response times meet benchmarks

**Data Integrity Validation:**
- [ ] Migration scripts create accurate data copies
- [ ] Relationship links maintained correctly
- [ ] Field mappings handle all data types
- [ ] Rollback procedures tested and working
- [ ] Data validation prevents corruption

**Production Readiness:**
- [ ] Environment validation catches all config errors
- [ ] Feature flags allow seamless switching
- [ ] Error handling covers all failure scenarios
- [ ] Logging provides sufficient debugging information
- [ ] Monitoring reveals performance bottlenecks

**AI Agent Readiness:**
- [ ] All code examples in initial.md are copy-paste ready
- [ ] Every test command has expected output documented
- [ ] Error recovery procedures are clearly defined
- [ ] Success criteria are objectively measurable
- [ ] Implementation order prevents dependency conflicts
# Claude Development Guidelines

## 🚨 CRITICAL: Current Phase Status

**Current Phase**: Phase 3 - Frontend UI with Enhanced Features
**Backend**: Phase 2 Complete (Airtable + Clerk + Mock Payments)
**Implementation Approach**: Component-driven development with UI/UX enhancements

### Phase 3 Key Features:
1. **Warwick University Theme**: Purple/gold colors, student-focused messaging
2. **Enhanced Ticket Display**: Event-grouped browsing with rich media
3. **OCR Ticket Upload**: Extract event details from ticket images automatically
4. **Buy Now / Place Bid**: Dual purchase options replacing single "make offer"
5. **Mobile-First Design**: Responsive UI optimized for student mobile usage

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

### Architecture Overview:
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

## Development Guidelines

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

### Airtable Rate Limiting
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
**CRITICAL: Linked record fields must be filtered by PRIMARY FIELD values, NOT record IDs**

Airtable linked record fields internally store record IDs but display and filter by the primary field of the linked table. Always use the primary field value for filtering:

```javascript
// ✅ CORRECT: Filter by primary field values
// Users table primary field = email
`{seller} = "alice@example.com"`

// Listings table primary field = title  
`{listing} = "Concert Ticket"`

// For FIND operations with primary fields
`FIND("alice@example.com", ARRAYJOIN({seller})) > 0`
`FIND("Concert Ticket", ARRAYJOIN({listing})) > 0`
```

```javascript
// ❌ WRONG: These will return 0 results
`{seller} = "recQdwm14dppUN5KH"`  // Record ID filtering fails
`FIND("recQdwm14dppUN5KH", ARRAYJOIN({seller})) > 0`  // Record ID filtering fails
```

**Implementation Pattern for Services:**
```typescript
// Always lookup the primary field value first
if (filters.userId) {
  const userService = (await import('../../factory')).getDatabaseService().users
  const user = await userService.findById(filters.userId)
  
  if (user && user.email) {
    // Use email (primary field) for filtering
    filterFormulas.push(`{seller} = "${user.email}"`)
  }
}

if (filters.listingId) {
  const listingService = (await import('../../factory')).getDatabaseService().listings
  const listing = await listingService.findById(filters.listingId)
  
  if (listing && listing.title) {
    // Use title (primary field) for filtering
    filterFormulas.push(`{listing} = "${listing.title}"`)
  }
}
```

**Primary Fields by Table:**
- **Users**: `email` (Email field)
- **Listings**: `title` (Single line text field)
- **Offers**: `offerCode` (Formula field)
- **Transactions**: `transactionId` (Formula field)

### API Endpoint Consistency
**CRITICAL: All frontend forms must use the correct API endpoints**

During Phase 2 migration, some frontend forms may reference old `/airtable` endpoints. Always use the standard API routes:

```javascript
// ✅ CORRECT API endpoints
POST   /api/listings           // Create listing
GET    /api/listings/{id}      // Get listing
PUT    /api/listings/{id}      // Update listing
DELETE /api/listings/{id}      // Delete listing

GET    /api/offers?type=sent   // Get sent offers
GET    /api/offers?type=received // Get received offers
POST   /api/offers            // Create offer
```

```javascript
// ❌ WRONG: These endpoints don't exist
POST   /api/listings/airtable           // 405 Method Not Allowed
GET    /api/listings/airtable/{id}      // 404 Not Found
PUT    /api/listings/airtable/{id}      // 404 Not Found
```

**Field Name Consistency:**
- Frontend forms should send `priceInCents` not `price`
- API validation schemas expect `priceInCents` for price fields
- Always convert dollars to cents: `Math.round(price * 100)`

**Offer Creation Fields:**
- Use `offerPriceInCents` not `offerPrice`
- Use `messageTemplate` not `message`
- Valid messageTemplate values: `'asking_price'`, `'make_offer'`, `'check_availability'`

### Clerk Server-Side Authentication
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

### Mock Payment Implementation
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

### Error Handling & Logging
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

### Environment Variables
```env
# Database Configuration
DATABASE_URL="file:./prisma/dev.db"
USE_AIRTABLE=true

# Airtable Configuration
AIRTABLE_API_KEY=your_api_key
AIRTABLE_BASE_ID=your_base_id

# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
CLERK_SECRET_KEY=your_secret_key

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

## Best Practices

### Multi-Level Caching Strategy
**Implement caching to reduce Airtable API calls**

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

## Common Mistakes to Avoid

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

## Phase 3 UI/UX Guidelines

### Warwick University Theme
```typescript
// lib/constants/theme.ts
export const theme = {
  colors: {
    primary: {
      purple: '#5B21B6',      // Warwick purple
      gold: '#F59E0B',        // Warwick gold
      darkPurple: '#4C1D95',  // Hover state
      lightGold: '#FCD34D'    // Light accent
    },
    semantic: {
      success: '#10B981',
      error: '#EF4444',
      warning: '#F59E0B',
      info: '#3B82F6'
    }
  },
  gradients: {
    hero: 'bg-gradient-to-br from-purple-700 via-purple-600 to-amber-500',
    card: 'bg-gradient-to-br from-purple-50 to-amber-50'
  }
}
```

### Mobile-First Components
All components must be responsive with mobile breakpoints:
- **Mobile**: < 640px (default)
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

### State Management with TanStack Query
```typescript
// lib/hooks/use-listings.ts
export function useListings(filters?: ListingFilters) {
  return useQuery({
    queryKey: ['listings', filters],
    queryFn: () => fetchListings(filters),
    staleTime: 60 * 1000,        // 1 minute
    cacheTime: 5 * 60 * 1000,    // 5 minutes
    refetchOnWindowFocus: false
  })
}
```

### Form Handling with React Hook Form + Zod
```typescript
const FormSchema = z.object({
  title: z.string().min(5).max(100),
  eventName: z.string().min(3),
  eventDate: z.string().refine(val => new Date(val) > new Date()),
  priceInCents: z.number().min(100),
  quantity: z.number().min(1).max(10),
  ticketFiles: z.array(z.instanceof(File)).min(1).max(5)
})

export function CreateListingForm() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema)
  })
  
  // Multi-step form with progress indicator
  const [step, setStep] = useState(1)
  
  return (
    <Form {...form}>
      {/* Step indicators */}
      <ProgressSteps current={step} total={4} />
      
      {/* Conditional step rendering */}
      {step === 1 && <BasicInfoStep />}
      {step === 2 && <TicketUploadStep />}
      {step === 3 && <PricingStep />}
      {step === 4 && <ReviewStep />}
    </Form>
  )
}
```

### Common UI/UX Pitfalls to Avoid
1. **Mobile Navigation**: Don't hide critical actions in hamburger menus
2. **Form Length**: Break long forms into steps with progress indicators
3. **Loading States**: Always show skeleton screens, not spinners
4. **Error Messages**: Be specific and actionable
5. **Touch Targets**: Minimum 44x44px for mobile
6. **Contrast**: Ensure WCAG AA compliance

### Performance Requirements
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Lighthouse Score**: > 90
- **Bundle Size**: < 200KB (initial)
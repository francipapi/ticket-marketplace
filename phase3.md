# Phase 3: Frontend UI Implementation Plan

## Overview
Phase 3 builds a modern, student-focused frontend for the ticket marketplace using Next.js 15 App Router, Clerk authentication, and a Warwick University-themed design. This plan adapts the original Supabase-based design to work with our Airtable + Clerk backend from Phase 2.

## 🎯 Key Objectives

1. **Warwick University Branding**: Purple/gold theme targeting Warwick students
2. **Mobile-First Design**: Optimized for student mobile usage
3. **Enhanced UX**: Buy Now/Place Bid dual options, event grouping, OCR upload
4. **Real-time Updates**: Live ticket availability and offer status
5. **Performance**: Sub-3s load times with optimistic updates

## 🏗️ Architecture

```
ticket-marketplace/
├── app/
│   ├── (auth)/                    # Public auth routes
│   │   ├── sign-in/
│   │   │   └── [[...sign-in]]/
│   │   │       └── page.tsx      # Clerk SignIn component
│   │   ├── sign-up/
│   │   │   └── [[...sign-up]]/
│   │   │       └── page.tsx      # Clerk SignUp component
│   │   └── layout.tsx            # Minimal auth layout
│   │
│   ├── (main)/                   # Protected main app
│   │   ├── layout.tsx           # Main layout with navbar
│   │   ├── page.tsx             # Homepage
│   │   ├── browse/              
│   │   │   └── page.tsx         # Browse all tickets
│   │   ├── events/              
│   │   │   └── page.tsx         # Browse by event
│   │   ├── listings/
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx     # Listing detail
│   │   │   └── create/
│   │   │       └── page.tsx     # Multi-step create form
│   │   └── dashboard/
│   │       ├── layout.tsx       # Dashboard layout
│   │       ├── page.tsx         # Overview
│   │       ├── listings/
│   │       │   └── page.tsx     # Manage listings
│   │       ├── offers/
│   │       │   └── page.tsx     # Sent/received offers
│   │       ├── purchases/
│   │       │   └── page.tsx     # Bought tickets
│   │       └── sales/
│   │           └── page.tsx     # Sold tickets
│   │
│   ├── api/                     # Existing API routes
│   ├── layout.tsx              # Root layout with providers
│   └── globals.css             # Global styles with Warwick theme
│
├── components/
│   ├── ui/                      # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── skeleton.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   │
│   ├── layout/
│   │   ├── navbar.tsx          # Main navigation
│   │   ├── footer.tsx          # Footer with links
│   │   ├── mobile-nav.tsx      # Mobile hamburger menu
│   │   └── user-menu.tsx       # User dropdown
│   │
│   ├── tickets/
│   │   ├── ticket-card.tsx     # Listing card component
│   │   ├── ticket-grid.tsx     # Responsive grid layout
│   │   ├── event-section.tsx   # Collapsible event group
│   │   ├── ticket-upload.tsx   # OCR upload component
│   │   ├── ticket-preview.tsx  # Upload preview
│   │   └── ticket-filters.tsx  # Filter sidebar
│   │
│   ├── offers/
│   │   ├── buy-now-dialog.tsx  # Instant purchase modal
│   │   ├── place-bid-dialog.tsx # Make offer modal
│   │   ├── offer-card.tsx      # Offer display
│   │   └── offer-timeline.tsx   # Status tracking
│   │
│   ├── dashboard/
│   │   ├── stats-card.tsx      # Metric display card
│   │   ├── activity-feed.tsx   # Recent activity
│   │   ├── listing-table.tsx   # Manage listings
│   │   └── chart.tsx           # Sales analytics
│   │
│   └── shared/
│       ├── loading.tsx          # Loading states
│       ├── error-boundary.tsx   # Error handling
│       ├── empty-state.tsx      # No data states
│       └── search-bar.tsx       # Global search
│
├── lib/
│   ├── hooks/
│   │   ├── use-listings.ts      # Listing queries
│   │   ├── use-offers.ts        # Offer queries
│   │   ├── use-user.ts          # User data & auth
│   │   ├── use-search.ts        # Search functionality
│   │   └── use-debounce.ts      # Debounce utility
│   │
│   ├── utils/
│   │   ├── ocr.ts              # OCR processing
│   │   ├── image-utils.ts      # Image manipulation
│   │   ├── format.ts           # Date/currency formatting
│   │   └── validation.ts       # Form validation helpers
│   │
│   ├── api/
│   │   ├── client.ts           # API client setup
│   │   ├── listings.ts         # Listing API calls
│   │   ├── offers.ts           # Offer API calls
│   │   └── upload.ts           # File upload handling
│   │
│   └── constants/
│       ├── theme.ts            # Warwick colors & theme
│       ├── messages.ts         # UI strings
│       └── routes.ts           # Route constants
│
└── public/
    ├── warwick-logo.svg        # University branding
    ├── hero-bg.jpg            # Homepage hero image
    └── icons/                 # App icons
```

## 🎨 Design System

### Warwick University Theme

```typescript
// lib/constants/theme.ts
export const warwickTheme = {
  colors: {
    primary: {
      50: '#FAF5FF',
      100: '#F3E8FF',
      200: '#E9D5FF',
      300: '#D8B4FE',
      400: '#C084FC',
      500: '#A855F7',
      600: '#9333EA',
      700: '#7E22CE',  // Main purple
      800: '#6B21A8',
      900: '#581C87'
    },
    accent: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#F59E0B',  // Main gold
      600: '#D97706',
      700: '#B45309',
      800: '#92400E',
      900: '#78350F'
    },
    gray: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827'
    }
  },
  
  typography: {
    fonts: {
      sans: 'Inter, system-ui, -apple-system, sans-serif',
      mono: 'JetBrains Mono, monospace'
    },
    sizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem'
    }
  },
  
  spacing: {
    container: {
      padding: '1rem',
      maxWidth: '1280px'
    },
    section: {
      paddingY: '4rem'
    }
  },
  
  borderRadius: {
    sm: '0.375rem',
    DEFAULT: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px'
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
  }
}
```

### Component Library Setup

```bash
# Required dependencies
npm install @tanstack/react-query
npm install @clerk/nextjs
npm install react-hook-form @hookform/resolvers zod
npm install lucide-react
npm install tailwind-merge clsx
npm install date-fns
npm install tesseract.js jsqr
npm install react-dropzone
npm install framer-motion
npm install react-intersection-observer
npm install sonner

# Development dependencies
npm install -D @types/node
npm install -D tailwindcss-animate
```

### Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        purple: warwickTheme.colors.primary,
        gold: warwickTheme.colors.accent,
        gray: warwickTheme.colors.gray
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      }
    }
  },
  plugins: [
    require('tailwindcss-animate')
  ]
}
```

## 🔧 Technical Implementation

### 1. Provider Setup

```tsx
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
})

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <QueryClientProvider client={queryClient}>
            {children}
            <Toaster position="top-center" />
          </QueryClientProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
```

### 2. Authentication Middleware

```typescript
// middleware.ts
import { authMiddleware } from '@clerk/nextjs'

export default authMiddleware({
  publicRoutes: [
    '/',
    '/browse',
    '/events',
    '/listings/(.*)',
    '/api/listings',
    '/sign-in',
    '/sign-up'
  ],
  ignoredRoutes: [
    '/api/webhook/clerk'
  ]
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)']
}
```

### 3. API Client Setup

```typescript
// lib/api/client.ts
import { auth } from '@clerk/nextjs'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

export async function apiClient(
  endpoint: string,
  options: RequestInit = {}
) {
  const { getToken } = auth()
  const token = await getToken()
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, config)
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`)
  }
  
  return response.json()
}
```

### 4. React Query Hooks

```typescript
// lib/hooks/use-listings.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'

export function useListings(filters?: ListingFilters) {
  return useQuery({
    queryKey: ['listings', filters],
    queryFn: () => apiClient('/api/listings', {
      method: 'GET',
      // Convert filters to query params
    })
  })
}

export function useCreateListing() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateListingData) => 
      apiClient('/api/listings', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] })
    }
  })
}
```

### 5. OCR Implementation

```typescript
// lib/utils/ocr.ts
import Tesseract from 'tesseract.js'
import jsQR from 'jsqr'

interface ExtractedTicketInfo {
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

export async function extractTicketInfo(
  imageFile: File
): Promise<ExtractedTicketInfo> {
  try {
    // Try QR code first
    const qrData = await detectQRCode(imageFile)
    
    // Run OCR
    const worker = await Tesseract.createWorker('eng')
    const { data } = await worker.recognize(imageFile)
    await worker.terminate()
    
    // Enhanced patterns for ticket parsing
    const patterns = {
      eventName: [
        /^(.+?)[\n\r]/,  // First line
        /The\s+(.+?)\s+(Party|Concert|Show|Festival|Event)/i,
        /Event:\s*(.+)/i
      ],
      eventDate: [
        /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[,\s]+(\d{1,2}\s+\w+\s+\d{4})/i,
        /(\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/i,
        /Date:\s*(.+)/i
      ],
      eventTime: [
        /(\d{1,2}:\d{2}\s*(AM|PM|GMT[+\-]\d+))/i,
        /Opening\s+time[:\s]+(.+)/i,
        /Doors:\s*(.+)/i
      ],
      venue: [
        /Venue:\s*(.+)/i,
        /Location:\s*(.+)/i,
        /At:\s*(.+)/i
      ],
      ticketType: [
        /(General|VIP|Early|Advance|Student)\s*Entry/i,
        /Ticket\s*name:\s*(.+)/i,
        /Type:\s*(.+)/i
      ],
      orderReference: [
        /Order\s*reference:\s*(\w+)/i,
        /Ref:\s*(\w+)/i,
        /Booking:\s*(\w+)/i
      ],
      holderName: [
        /Name:\s*(.+)/i,
        /Ticket\s*holder:\s*(.+)/i
      ],
      lastEntry: [
        /Last\s*entry:\s*(.+)/i,
        /Entry\s*before:\s*(.+)/i
      ]
    }
    
    const extracted: ExtractedTicketInfo = {
      confidence: data.confidence,
      hasPersonalInfo: false,
      qrData
    }
    
    // Extract fields using patterns
    for (const [field, fieldPatterns] of Object.entries(patterns)) {
      for (const pattern of fieldPatterns) {
        const match = data.text.match(pattern)
        if (match) {
          extracted[field] = match[1].trim()
          break
        }
      }
    }
    
    // Check for personal info
    extracted.hasPersonalInfo = !!(
      extracted.holderName || 
      extracted.orderReference
    )
    
    return extracted
  } catch (error) {
    console.error('OCR Error:', error)
    throw new Error('Failed to process ticket image')
  }
}

async function detectQRCode(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        
        const imageData = ctx.getImageData(
          0, 0, canvas.width, canvas.height
        )
        const code = jsQR(
          imageData.data, 
          imageData.width, 
          imageData.height
        )
        
        resolve(code ? code.data : null)
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}
```

## 📱 Key Components

### 1. Homepage Hero

```tsx
// app/(main)/page.tsx
export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-purple-700 via-purple-600 to-gold-500 text-white">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Tickets for Warwick Students,
              <span className="block text-gold-300">
                by Warwick Students
              </span>
            </h1>
            <p className="text-xl mb-8 text-purple-100">
              Buy and sell event tickets safely within the Warwick community. 
              No more sketchy Facebook posts or WhatsApp groups.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/browse">
                <Button size="lg" className="bg-white text-purple-700">
                  Browse Tickets
                </Button>
              </Link>
              <Link href="/listings/create">
                <Button size="lg" variant="outline" className="border-white text-white">
                  Sell Tickets
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Live Stats */}
        <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <TicketCounter />
        </div>
      </section>
      
      {/* Features */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Upload className="w-8 h-8" />}
              title="1. List Your Tickets"
              description="Upload your tickets with our OCR scanner or manually enter details"
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8" />}
              title="2. Secure Transaction"
              description="Buyers can purchase instantly or make offers. We handle the payment securely"
            />
            <FeatureCard
              icon={<Ticket className="w-8 h-8" />}
              title="3. Transfer Tickets"
              description="Once paid, transfer tickets to the buyer and get your money"
            />
          </div>
        </div>
      </section>
      
      {/* Featured Events */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">
            Upcoming Events at Warwick
          </h2>
          <EventCarousel />
        </div>
      </section>
    </div>
  )
}
```

### 2. Event-Grouped Browse

```tsx
// app/(main)/browse/page.tsx
export default function BrowsePage() {
  const [filters, setFilters] = useState<FilterState>({})
  const [groupBy, setGroupBy] = useState<'event' | 'date'>('event')
  
  const { data: listings, isLoading } = useListings(filters)
  
  // Group listings by event
  const groupedListings = useMemo(() => {
    if (!listings) return {}
    
    return listings.reduce((acc, listing) => {
      const key = groupBy === 'event' 
        ? listing.eventName 
        : format(new Date(listing.eventDate), 'yyyy-MM-dd')
      
      if (!acc[key]) acc[key] = []
      acc[key].push(listing)
      
      return acc
    }, {} as Record<string, Listing[]>)
  }, [listings, groupBy])
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-64 shrink-0">
            <TicketFilters
              filters={filters}
              onChange={setFilters}
            />
          </aside>
          
          {/* Main Content */}
          <main className="flex-1">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">
                Browse Tickets
              </h1>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">By Event</SelectItem>
                  <SelectItem value="date">By Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Listings */}
            {isLoading ? (
              <LoadingSkeleton />
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedListings).map(([key, items]) => (
                  <EventSection
                    key={key}
                    title={key}
                    listings={items}
                    defaultOpen={true}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
```

### 3. Listing Detail with Buy/Bid

```tsx
// app/(main)/listings/[id]/page.tsx
export default function ListingDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params)
  const { data: listing, isLoading } = useListing(id)
  const [showBuyNow, setShowBuyNow] = useState(false)
  const [showPlaceBid, setShowPlaceBid] = useState(false)
  
  if (isLoading) return <LoadingPage />
  if (!listing) return <NotFoundPage />
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <Card>
              <CardContent className="p-0">
                <TicketGallery images={listing.images} />
              </CardContent>
            </Card>
            
            {/* Details */}
            <Card>
              <CardContent className="p-6">
                <h1 className="text-3xl font-bold mb-4">
                  {listing.title}
                </h1>
                
                <div className="space-y-4">
                  <DetailRow
                    icon={<Calendar />}
                    label="Event Date"
                    value={format(new Date(listing.eventDate), 'PPP')}
                  />
                  <DetailRow
                    icon={<MapPin />}
                    label="Venue"
                    value={listing.venue || 'TBA'}
                  />
                  <DetailRow
                    icon={<Ticket />}
                    label="Ticket Type"
                    value={listing.ticketType}
                  />
                  <DetailRow
                    icon={<Users />}
                    label="Quantity"
                    value={`${listing.quantity} tickets`}
                  />
                </div>
                
                <Separator className="my-6" />
                
                <div className="prose max-w-none">
                  <h3>Description</h3>
                  <p>{listing.description}</p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price & Actions */}
            <Card>
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <p className="text-sm text-gray-500">Price</p>
                  <p className="text-4xl font-bold text-purple-700">
                    £{(listing.priceInCents / 100).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">per ticket</p>
                </div>
                
                <div className="space-y-3">
                  <Button
                    size="lg"
                    className="w-full bg-purple-700"
                    onClick={() => setShowBuyNow(true)}
                  >
                    Buy Now
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowPlaceBid(true)}
                  >
                    Place Bid
                  </Button>
                </div>
                
                {/* Urgency Indicator */}
                <div className="mt-4 text-center">
                  <p className="text-sm text-orange-600">
                    <Users className="inline w-4 h-4 mr-1" />
                    3 others viewing this listing
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* Seller Info */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Seller</h3>
                <SellerProfile seller={listing.seller} />
              </CardContent>
            </Card>
            
            {/* Share */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Share</h3>
                <ShareButtons listing={listing} />
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Similar Listings */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">
            Similar Tickets
          </h2>
          <SimilarListings 
            eventName={listing.eventName} 
            excludeId={listing.id} 
          />
        </div>
      </div>
      
      {/* Modals */}
      <BuyNowDialog
        listing={listing}
        open={showBuyNow}
        onClose={() => setShowBuyNow(false)}
      />
      <PlaceBidDialog
        listing={listing}
        open={showPlaceBid}
        onClose={() => setShowPlaceBid(false)}
      />
    </div>
  )
}
```

### 4. OCR Upload Component

```tsx
// components/tickets/ticket-upload.tsx
export function TicketUpload({ 
  onExtracted 
}: { 
  onExtracted: (data: ExtractedTicketInfo) => void 
}) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<number>(0)
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    
    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
    
    // Process with OCR
    setIsProcessing(true)
    try {
      const extracted = await extractTicketInfo(file)
      setConfidence(extracted.confidence)
      onExtracted(extracted)
      
      toast.success('Ticket details extracted successfully!')
    } catch (error) {
      toast.error('Failed to extract ticket details')
    } finally {
      setIsProcessing(false)
    }
  }, [onExtracted])
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  })
  
  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive 
            ? "border-purple-500 bg-purple-50" 
            : "border-gray-300 hover:border-purple-400"
        )}
      >
        <input {...getInputProps()} />
        
        {preview ? (
          <div className="space-y-4">
            <img
              src={preview}
              alt="Ticket preview"
              className="max-h-64 mx-auto rounded"
            />
            {isProcessing && (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" />
                <span>Processing ticket...</span>
              </div>
            )}
            {confidence > 0 && (
              <div className="text-sm">
                <span className="text-gray-600">Confidence: </span>
                <span className={cn(
                  "font-semibold",
                  confidence > 80 ? "text-green-600" :
                  confidence > 60 ? "text-yellow-600" :
                  "text-red-600"
                )}>
                  {confidence.toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        ) : (
          <div>
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-lg font-medium">
              {isDragActive 
                ? "Drop your ticket here" 
                : "Drag & drop your ticket"}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or click to browse
            </p>
            <p className="text-xs text-gray-400 mt-4">
              Supports JPG, PNG, GIF up to 10MB
            </p>
          </div>
        )}
      </div>
      
      {/* Mobile Camera Option */}
      <div className="text-center md:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/*'
            input.capture = 'environment'
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0]
              if (file) onDrop([file])
            }
            input.click()
          }}
        >
          <Camera className="w-4 h-4 mr-2" />
          Take Photo
        </Button>
      </div>
    </div>
  )
}
```

### 5. Multi-Step Create Form

```tsx
// app/(main)/listings/create/page.tsx
const steps = [
  { id: 'upload', label: 'Upload Tickets' },
  { id: 'details', label: 'Event Details' },
  { id: 'pricing', label: 'Set Price' },
  { id: 'review', label: 'Review' }
]

export default function CreateListingPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<CreateListingData>({})
  const createListing = useCreateListing()
  
  const form = useForm<CreateListingSchema>({
    resolver: zodResolver(createListingSchema),
    defaultValues: formData
  })
  
  const onSubmit = async (data: CreateListingSchema) => {
    try {
      await createListing.mutateAsync(data)
      toast.success('Listing created successfully!')
      router.push('/dashboard/listings')
    } catch (error) {
      toast.error('Failed to create listing')
    }
  }
  
  const nextStep = () => {
    const stepFields = getStepFields(currentStep)
    const isValid = form.trigger(stepFields)
    
    if (isValid) {
      setFormData({ ...formData, ...form.getValues() })
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          {/* Progress Steps */}
          <div className="mb-8">
            <StepIndicator
              steps={steps}
              currentStep={currentStep}
            />
          </div>
          
          {/* Form */}
          <Card>
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  {currentStep === 0 && (
                    <UploadStep 
                      form={form}
                      onExtracted={(data) => {
                        // Auto-fill form with OCR data
                        form.setValue('eventName', data.eventName || '')
                        form.setValue('eventDate', data.eventDate || '')
                        form.setValue('venue', data.venue || '')
                      }}
                    />
                  )}
                  
                  {currentStep === 1 && (
                    <DetailsStep form={form} />
                  )}
                  
                  {currentStep === 2 && (
                    <PricingStep form={form} />
                  )}
                  
                  {currentStep === 3 && (
                    <ReviewStep data={form.getValues()} />
                  )}
                  
                  {/* Actions */}
                  <div className="flex justify-between mt-8">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(prev => prev - 1)}
                      disabled={currentStep === 0}
                    >
                      Previous
                    </Button>
                    
                    {currentStep < steps.length - 1 ? (
                      <Button
                        type="button"
                        onClick={nextStep}
                      >
                        Next
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={createListing.isPending}
                      >
                        {createListing.isPending ? (
                          <>
                            <Loader2 className="animate-spin mr-2" />
                            Creating...
                          </>
                        ) : (
                          'Create Listing'
                        )}
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

## 🚀 Implementation Timeline

### Phase 3A: Core Setup (Day 1 - 4 hours)
1. **Install Dependencies** (30 min)
   - TanStack Query, Clerk, React Hook Form
   - Tailwind CSS plugins, shadcn/ui
   - OCR libraries (Tesseract.js, jsqr)

2. **Configure Providers** (1 hour)
   - Set up app/layout.tsx with all providers
   - Configure Clerk authentication
   - Set up TanStack Query client

3. **Theme Setup** (1 hour)
   - Create Warwick color palette
   - Configure Tailwind with theme
   - Set up global styles

4. **Shadcn/UI Setup** (1.5 hours)
   - Install core components
   - Customize with Warwick theme
   - Create component variants

### Phase 3B: Authentication (Day 1 - 3 hours)
1. **Auth Pages** (1 hour)
   - Sign-in page with Clerk
   - Sign-up page with username
   - Password reset flow

2. **Middleware** (1 hour)
   - Configure auth middleware
   - Set up protected routes
   - Handle redirects

3. **User Sync** (1 hour)
   - Auto-create users on first login
   - Sync with Airtable
   - Profile completion flow

### Phase 3C: Homepage & Navigation (Day 2 - 4 hours)
1. **Layout Components** (2 hours)
   - Responsive navbar
   - Mobile navigation
   - Footer with links
   - User menu dropdown

2. **Homepage** (2 hours)
   - Hero section with Warwick branding
   - Live ticket counter
   - How it works section
   - Featured events carousel

### Phase 3D: Browse & Search (Day 2 - 4 hours)
1. **Browse Page** (2 hours)
   - Event-grouped display
   - Collapsible sections
   - Filter sidebar
   - Sort options

2. **Search** (2 hours)
   - Global search with debounce
   - Autocomplete suggestions
   - Search results page
   - Recent searches

### Phase 3E: Listing Details (Day 3 - 4 hours)
1. **Detail Page** (2 hours)
   - Image gallery
   - Listing information
   - Seller profile card
   - Similar tickets

2. **Purchase Modals** (2 hours)
   - Buy Now dialog
   - Place Bid dialog
   - Offer confirmation
   - Success states

### Phase 3F: Create Listing (Day 3 - 4 hours)
1. **Multi-Step Form** (2 hours)
   - Step indicator
   - Form validation
   - Progress saving
   - Review step

2. **OCR Upload** (2 hours)
   - Drag & drop interface
   - OCR processing
   - Field extraction
   - Manual correction

### Phase 3G: Dashboard (Day 4 - 4 hours)
1. **Dashboard Layout** (1 hour)
   - Navigation sidebar
   - Mobile responsive
   - Breadcrumbs

2. **Dashboard Pages** (3 hours)
   - Overview with stats
   - Listings management
   - Offers (sent/received)
   - Purchase history
   - Sales tracking

### Phase 3H: Payment Flow (Day 4 - 3 hours)
1. **Mock Payment UI** (1.5 hours)
   - Payment form
   - Card animation
   - Processing states

2. **Confirmation** (1.5 hours)
   - Success page
   - Receipt generation
   - Email notification trigger

### Phase 3I: Polish (Day 5 - 4 hours)
1. **Loading States** (1 hour)
   - Skeleton screens
   - Loading indicators
   - Suspense boundaries

2. **Error Handling** (1 hour)
   - Error boundaries
   - Toast notifications
   - Retry mechanisms

3. **Performance** (2 hours)
   - Image optimization
   - Bundle analysis
   - Lazy loading
   - PWA manifest

## 📋 Testing Strategy

### Unit Tests
```bash
# Component tests with React Testing Library
npm test -- --coverage

# Test specific component
npm test TicketCard
```

### Integration Tests
```typescript
// __tests__/create-listing.test.tsx
describe('Create Listing Flow', () => {
  it('should extract details from uploaded ticket', async () => {
    // Upload ticket image
    // Verify OCR extraction
    // Check form auto-fill
  })
  
  it('should validate form on each step', async () => {
    // Test step validation
    // Verify error messages
  })
  
  it('should create listing successfully', async () => {
    // Complete all steps
    // Submit form
    // Verify API call
    // Check redirect
  })
})
```

### E2E Tests with Playwright
```typescript
// e2e/purchase-flow.spec.ts
test('complete purchase flow', async ({ page }) => {
  // Browse tickets
  await page.goto('/browse')
  await page.click('[data-testid="ticket-card"]')
  
  // View details
  await expect(page).toHaveURL(/\/listings\//)
  
  // Buy now
  await page.click('button:has-text("Buy Now")')
  await page.fill('[name="quantity"]', '2')
  await page.click('button:has-text("Proceed to Payment")')
  
  // Complete payment
  await page.fill('[name="cardNumber"]', '4242424242424242')
  await page.click('button:has-text("Pay")')
  
  // Verify success
  await expect(page).toHaveURL('/payment/success')
})
```

## 🚨 Common Issues & Solutions

### 1. Clerk + Airtable Sync
**Issue**: User not created in Airtable after Clerk signup
**Solution**: Implement webhook or middleware to sync

```typescript
// app/api/webhook/clerk/route.ts
export async function POST(req: Request) {
  const { type, data } = await req.json()
  
  if (type === 'user.created') {
    // Create user in Airtable
    await createAirtableUser({
      clerkId: data.id,
      email: data.email_addresses[0].email_address,
      username: data.username
    })
  }
  
  return NextResponse.json({ success: true })
}
```

### 2. OCR Accuracy
**Issue**: Poor OCR results from ticket images
**Solution**: Pre-process images and use multiple patterns

```typescript
// Enhance image before OCR
async function preprocessImage(file: File): Promise<File> {
  // Convert to grayscale
  // Increase contrast
  // Remove noise
  // Return processed file
}
```

### 3. Mobile Performance
**Issue**: Slow initial load on mobile
**Solution**: Implement progressive enhancement

```typescript
// Use dynamic imports for heavy components
const TicketGallery = dynamic(
  () => import('@/components/tickets/ticket-gallery'),
  { 
    loading: () => <Skeleton className="h-96" />,
    ssr: false 
  }
)
```

### 4. Real-time Updates
**Issue**: Stale data when multiple users view same listing
**Solution**: Implement polling or websockets

```typescript
// Poll for updates on detail page
useEffect(() => {
  const interval = setInterval(() => {
    queryClient.invalidateQueries(['listing', id])
  }, 5000)
  
  return () => clearInterval(interval)
}, [id])
```

## 📊 Success Metrics

### Performance
- **Lighthouse Score**: > 90
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **API Response Time**: < 500ms

### User Experience
- **Mobile Usage**: > 60%
- **OCR Success Rate**: > 80%
- **Form Completion**: > 70%
- **Payment Success**: > 95%

### Business
- **User Registration**: > 100/week
- **Listing Creation**: > 50/week
- **Transaction Volume**: > £5000/month
- **User Retention**: > 40% monthly

## 🔐 Security Considerations

1. **File Upload Security**
   - Validate file types
   - Scan for malware
   - Limit file size
   - Store securely

2. **OCR Privacy**
   - Blur personal information
   - Don't store extracted data
   - Process client-side when possible

3. **Payment Security**
   - Never store card details
   - Use secure payment tokens
   - Implement 3D Secure

4. **API Security**
   - Rate limiting
   - Request validation
   - CORS configuration
   - Auth token refresh

## 🚀 Deployment Checklist

### Pre-deployment
- [ ] Environment variables configured
- [ ] API endpoints updated
- [ ] Image optimization complete
- [ ] Bundle size < 200KB initial
- [ ] All tests passing
- [ ] Accessibility audit passed

### Deployment
- [ ] Build successful
- [ ] Deploy to Vercel/Netlify
- [ ] Configure custom domain
- [ ] Set up monitoring
- [ ] Enable error tracking
- [ ] Configure CDN

### Post-deployment
- [ ] Smoke tests passing
- [ ] Performance monitoring active
- [ ] User feedback collection
- [ ] Analytics configured
- [ ] SEO optimization
- [ ] Social media cards

## 📚 Additional Resources

### Documentation
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [TanStack Query](https://tanstack.com/query)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)

### Design Resources
- [Warwick Brand Guidelines](https://warwick.ac.uk/brand)
- [Tailwind UI](https://tailwindui.com)
- [Heroicons](https://heroicons.com)
- [Lucide Icons](https://lucide.dev)

### Tools
- [Bundle Analyzer](https://bundlephobia.com)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [TanStack Query DevTools](https://tanstack.com/query/latest/docs/react/devtools)

## 🎯 Final Implementation Notes

1. **Start Simple**: Get basic functionality working before adding enhancements
2. **Mobile First**: Design and test on mobile before desktop
3. **Iterate Quickly**: Deploy early and often for user feedback
4. **Monitor Everything**: Set up comprehensive logging and analytics
5. **User Feedback**: Add feedback widgets on key pages

This implementation plan provides a complete roadmap for Phase 3. The modular approach allows for parallel development and easy testing. Focus on core functionality first, then enhance with OCR and real-time features.
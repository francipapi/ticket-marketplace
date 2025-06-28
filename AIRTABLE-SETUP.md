# Airtable + Clerk Setup Guide

## Quick Start

This guide will help you set up your ticket marketplace with Airtable (database) and Clerk (authentication).

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Create Accounts

1. **Airtable** (Free)
   - Sign up at: https://airtable.com/signup
   - Create a new base called "TicketMarketplace"

2. **Clerk** (Free up to 5,000 users)
   - Sign up at: https://clerk.com/
   - Create a new application

## Step 3: Set Up Airtable Schema

In your Airtable base, create these 4 tables with the exact field names and types:

### Table 1: Users
| Field Name | Field Type | Notes |
|------------|------------|-------|
| email | Email | Primary field |
| username | Single line text | |
| clerkId | Single line text | |
| rating | Number | Format: Decimal, Default: 5.0 |
| isVerified | Checkbox | Default: unchecked |
| totalSales | Number | Format: Integer, Default: 0 |
| stripeAccountId | Single line text | Optional |

### Table 2: Listings
| Field Name | Field Type | Notes |
|------------|------------|-------|
| title | Single line text | Primary field |
| eventName | Single line text | |
| eventDate | Date | Include time toggle: ON |
| price | Number | Format: Integer (cents) |
| quantity | Number | Format: Integer |
| status | Single select | Options: ACTIVE, INACTIVE, SOLD, DELISTED |
| seller | Link to Users | Allow linking to multiple records |
| venue | Single line text | |
| description | Long text | |
| ticketFiles | Attachments | |
| views | Number | Format: Integer, Default: 0 |

### Table 3: Offers
| Field Name | Field Type | Notes |
|------------|------------|-------|
| offerCode | Formula | Primary field, Formula: `CONCATENATE("OFFER-", RECORD_ID())` |
| listing | Link to Listings | Allow linking to multiple records |
| buyer | Link to Users | Allow linking to multiple records |
| offerPrice | Number | Format: Integer (cents) |
| quantity | Number | Format: Integer |
| status | Single select | Options: PENDING, ACCEPTED, REJECTED, EXPIRED, COMPLETED |
| message | Single select | Options: "Buy at asking price", "Make offer", "Check availability" |
| customMessage | Long text | |

### Table 4: Transactions
| Field Name | Field Type | Notes |
|------------|------------|-------|
| transactionId | Formula | Primary field, Formula: `CONCATENATE("TXN-", RECORD_ID())` |
| offer | Link to Offers | Allow linking to multiple records |
| amount | Number | Format: Integer (cents) |
| status | Single select | Options: PENDING, PROCESSING, COMPLETED, FAILED, REFUNDED |
| stripePaymentId | Single line text | |
| completedAt | Date | Include time toggle: ON |

## Step 4: Get Your API Keys

### Airtable:
1. Go to: https://airtable.com/create/tokens
2. Create a new personal access token with these scopes:
   - `data.records:read`
   - `data.records:write`
   - `schema.bases:read`
3. Add your base to the token's access list
4. Copy the token (starts with `pat...`)
5. Get your Base ID from your base URL: `https://airtable.com/appXXXXXXXXXXXXXX/tblXXXXXX`
   - The Base ID is the part that starts with `app` (e.g., `appXXXXXXXXXXXXXX`)
   - Do NOT include the table ID (the part starting with `tbl`)

### Clerk:
1. Go to your Clerk Dashboard
2. Navigate to API Keys
3. Copy:
   - Publishable key (starts with `pk_`)
   - Secret key (starts with `sk_`)

## Step 5: Configure Environment Variables

Copy `.env.airtable.example` to `.env.local`:

```bash
cp .env.airtable.example .env.local
```

Edit `.env.local` and add your keys:

```env
# Airtable
AIRTABLE_API_KEY=patXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_XXXXXX
CLERK_SECRET_KEY=sk_test_XXXXXX
```

## Step 6: Migrate Your Data (Optional)

If you have existing data in the SQLite database:

```bash
npm run migrate:airtable
```

## Step 7: Start Development

```bash
npm run dev
```

Visit http://localhost:3000

## Step 8: Test the New System

1. Sign up for a new account at `/sign-up`
2. Browse listings at `/listings`
3. Create a listing at `/listings/create`
4. View your dashboard at `/dashboard/airtable`

## API Endpoints

The new Airtable-powered endpoints are:
- `GET/POST /api/listings/airtable` - Browse and create listings
- `GET/PUT/DELETE /api/listings/airtable/[id]` - Single listing operations
- `GET /api/dashboard/airtable/listings` - User's listings
- `GET /api/dashboard/airtable/offers/sent` - Sent offers
- `GET /api/dashboard/airtable/offers/received` - Received offers

## Troubleshooting

### "Airtable not initialized" Error
- Make sure your environment variables are set correctly
- Restart your development server after setting environment variables

### "User not found" Error
- New users are automatically created in Airtable when they first interact with the system
- If you migrated data, make sure to update the `clerkId` field for existing users

### Rate Limiting
- Airtable has a rate limit of 5 requests per second
- The system automatically handles this with queuing

## Next Steps

1. Update all frontend pages to use `/airtable` endpoints
2. Remove old Supabase/Prisma code once everything is working
3. Set up Stripe for payments
4. Deploy to production

## Support

- Airtable API Docs: https://airtable.com/developers/web/api/introduction
- Clerk Docs: https://clerk.com/docs
- Report issues: Create an issue in your repository
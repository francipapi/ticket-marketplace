# 🚀 Phase 1 Migration Demo Guide

This guide demonstrates the complete Phase 0 → Phase 1 migration process step by step.

## 📋 Prerequisites Demo

**Current Phase 0 Status:**
```bash
# Check current data in SQLite
npm run migration:export
```

**Expected Output:**
```
📤 Exporting Phase 0 data from SQLite...
  - Exporting users...
    ✅ Exported 4 users
  - Exporting listings...
    ✅ Exported 4 listings  
  - Exporting offers...
    ✅ Exported 5 offers
💾 Data exported to: ./migration/phase0-export.json
✅ Phase 0 data export completed successfully!
```

This confirms you have real data to migrate: **4 users, 4 listings, 5 offers**.

## 🔧 Setup Supabase Project

### 1. Create Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Sign up with GitHub/Google
3. Create new project:
   - **Name**: `ticket-marketplace`
   - **Database Password**: Generate secure password
   - **Region**: Choose closest to you

### 2. Get Credentials
After project creation (takes ~2 minutes):

1. **API Settings** (Settings → API):
   - Copy `Project URL`: `https://xxxxx.supabase.co`
   - Copy `anon/public key`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Copy `service_role key`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep secret!)

2. **Database URL** (Settings → Database):
   - Copy connection string: `postgresql://postgres:[password]@db.xxxxx.supabase.co:5432/postgres`

### 3. Configure Environment
```bash
# Create Supabase environment file
cp .env.supabase.example .env.supabase

# Edit with your credentials
nano .env.supabase
```

**Fill in:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:[password]@db.your-project-ref.supabase.co:5432/postgres

USE_SUPABASE_AUTH=true
USE_SUPABASE_STORAGE=true
```

## 🗄️ Database Migration Demo

### Step 1: Create Supabase Schema
```bash
npm run db:supabase
```

**Expected Output:**
```
Environment variables loaded from .env.supabase
Prisma schema loaded from prisma/schema.supabase.prisma

✔ Generated Prisma Client to ./node_modules/.prisma/client-supabase
✔ The database is now in sync with the Prisma schema
```

**Verify in Supabase Dashboard:**
- Go to Table Editor
- Should see: `users`, `profiles`, `listings`, `offers`, `migration_logs` tables

### Step 2: Set Up Storage Bucket
**In Supabase Dashboard:**

1. **Go to Storage** → Create new bucket:
   - Name: `tickets`
   - Public: `false` (private)

2. **Set up RLS policies** (Storage → tickets → Policies):
```sql
-- Users can upload to their own folder
CREATE POLICY "Users can upload own tickets" ON storage.objects
FOR INSERT WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

-- Users can read their own tickets  
CREATE POLICY "Users can read own tickets" ON storage.objects
FOR SELECT USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Sellers can read tickets they're selling
CREATE POLICY "Sellers can read listing tickets" ON storage.objects
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM listings 
    WHERE listings."userId" = auth.uid()::text 
    AND (storage.foldername(name))[2] = listings.id
  )
);
```

### Step 3: Run Complete Migration
```bash
npm run migration:migrate
```

**Expected Output:**
```
🚀 Starting Phase 0 → Phase 1 migration...

📤 Step 1: Exporting Phase 0 data...
  ✅ Exported 4 users, 4 listings, 5 offers

👤 Step 2: Migrating users...
    ✅ Migrated user: alice (alice@example.com)
    ✅ Migrated user: bob (bob@example.com) 
    ✅ Migrated user: testuser (test@example.com)
    ✅ Migrated user: TestUser1 (testuser@example.com)

📋 Step 4: Migrating listings...
    ✅ Migrated listing: Taylor Swift Concert - Floor Seats
    ✅ Migrated listing: NBA Finals Game 6
    ✅ Migrated listing: Hamilton Broadway Show
    ✅ Migrated listing: Music Festival Weekend Pass

💰 Step 6: Migrating offers...
    ✅ Migrated offer: [5 offers migrated]

📊 Migration Summary:
    Users migrated: 4/4
    Listings migrated: 4/4
    Offers migrated: 5/5
    Errors: 0

✅ Migration completed successfully!
```

### Step 4: Migrate Files
```bash
npm run migration:files
```

**Expected Output:**
```
📁 Starting file migration from local storage to Supabase Storage...
🪣 Initializing Supabase Storage bucket...
📋 Finding listings with file attachments...

📤 Migrating: uploads/alice/ticket.pdf → alice-uuid/listing-uuid/ticket.pdf
    ✅ Migrated and updated listing

📊 File Migration Summary:
    Total listings with files: 4
    Successfully migrated: 4
    Errors: 0

🧪 Testing file access after migration...
    ✅ Taylor Swift Concert: File accessible
    ✅ NBA Finals Game 6: File accessible
```

### Step 5: Verify Migration
```bash
npm run migration:verify
```

**Expected Output:**
```
🔍 Verifying Phase 0 → Phase 1 migration integrity...

📊 Counting Phase 0 records...
Phase 0 counts: { users: 4, listings: 4, offers: 5 }

📊 Counting Phase 1 records...
Phase 1 counts: { users: 4, profiles: 4, listings: 4, offers: 5, migrationLogs: 13 }

✅ Verifying record counts...
👤 Verifying user migrations...
  - Migrated users: 4
  - Native users: 0

📁 Verifying file migrations...
  - Listings with files: 4
  - Listings with Supabase paths: 4

📝 Checking migration logs...
  - Completed migrations: 13
  - Failed migrations: 0

📋 Migration Verification Summary:
  Overall Status: ✅ SUCCESS
  Data Mismatches: 0
  Orphaned Records: 0
  Migration Success Rate: 100%

🎉 Migration verification passed! Your Phase 1 migration is successful.
```

## 🔄 Switch to Phase 1

### Activate Phase 1
```bash
npm run phase1:switch
```

**Output:**
```
Switched to Phase 1! Restart your dev server.
```

### Restart Application
```bash
npm run dev
```

## 🧪 Test Phase 1 Functionality

### 1. Test Supabase Auth Dashboard
**Check Supabase Dashboard:**
- Go to Authentication → Users
- Should see 4 migrated users
- All have `email_confirmed: true`

### 2. Test New User Registration
```bash
# Visit http://localhost:3000/auth/register
# Register with: test-phase1@example.com / testphase1 / password123
```

**Should work with Supabase Auth!**

### 3. Test Migrated User Login
```bash
# Visit http://localhost:3000/auth/login  
# Try: alice@example.com / any-password
```

**Will fail** - Users need to reset passwords. This is expected!

### 4. Test Password Reset (Supabase)
1. Click "Forgot Password"
2. Enter: `alice@example.com`
3. Check Supabase logs for reset email
4. In production, user would receive reset email

### 5. Test Data Access
```bash
# Visit http://localhost:3000/listings
# Should see all 4 migrated listings
# Data should be identical to Phase 0
```

### 6. Test File Downloads
```bash
# Login as new Phase 1 user
# Create test offer and "pay" for it
# Download should work with Supabase signed URLs
```

## 📊 Verify Database in Supabase

### Check Users Table
```sql
SELECT id, email, username, "migrationStatus", "migratedFromId" 
FROM users;
```

**Expected:**
```
4 rows with migrationStatus = 'migrated'
Links to original Phase 0 IDs
```

### Check Migration Logs
```sql
SELECT "tableName", status, COUNT(*) 
FROM migration_logs 
GROUP BY "tableName", status;
```

**Expected:**
```
users     | completed | 4
listings  | completed | 4  
offers    | completed | 5
```

## 🔄 Rollback Test (Optional)

If anything goes wrong:

```bash
# Switch back to Phase 0
npm run phase0:switch

# Restart
npm run dev

# Verify Phase 0 still works
# Visit http://localhost:3000
# All original data should be intact
```

## ✅ Success Criteria

**Phase 1 Migration is successful when:**

1. ✅ All data migrated (4 users, 4 listings, 5 offers)
2. ✅ No migration errors in logs
3. ✅ New users can register with Supabase Auth
4. ✅ Migrated data displays correctly
5. ✅ File downloads work with signed URLs
6. ✅ Database queries perform well
7. ✅ Rollback to Phase 0 works if needed

## 🎯 Next Steps After Successful Migration

### Immediate Actions
1. **Notify Users**: Send email about password reset requirement
2. **Monitor**: Watch Supabase dashboard for performance
3. **Test Thoroughly**: Verify all features work correctly

### Production Deployment
1. **Environment**: Update production `.env` with Supabase credentials
2. **Database**: Run migration on production data
3. **DNS**: Update domain to point to new deployment
4. **Monitoring**: Set up alerts for errors and performance

### User Communication Template
```
Subject: 🚀 Ticket Marketplace Upgrade - Password Reset Required

Hi [Username],

We've upgraded our ticket marketplace to a more secure and reliable platform! 

Your account and all your tickets/offers have been safely migrated, but you'll need to reset your password:

1. Go to: https://your-domain.com/auth/login
2. Click "Forgot Password"  
3. Enter your email: [user-email]
4. Check your email for reset instructions

Thank you for your patience during this upgrade!

- The Ticket Marketplace Team
```

## 🎉 Congratulations!

You have successfully migrated your ticket marketplace from Phase 0 to Phase 1! 

Your application now runs on:
- ✅ **Supabase PostgreSQL** (scalable database)
- ✅ **Supabase Auth** (professional authentication)
- ✅ **Supabase Storage** (secure file storage)
- ✅ **Row-Level Security** (data protection)

Ready for thousands of users and advanced features! 🚀
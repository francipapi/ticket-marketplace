# Phase 1 Migration Guide: SQLite to Supabase

This guide walks you through migrating your successful Phase 0 implementation from SQLite + JWT to Supabase PostgreSQL + Auth.

## 🎯 Migration Overview

**What we're migrating:**
- ✅ **Database**: SQLite → Supabase PostgreSQL
- ✅ **Authentication**: JWT cookies → Supabase Auth
- ✅ **File Storage**: Local uploads → Supabase Storage
- ✅ **User Data**: 4 users with encrypted passwords
- ✅ **Listings**: 4 ticket listings with file attachments
- ✅ **Offers**: 5 offer records with full history

**Migration Benefits:**
- 🔐 Professional authentication with password reset, social login ready
- 📊 Scalable PostgreSQL database with real-time subscriptions
- 🗂️ Secure file storage with signed URLs and access control
- 🔒 Row-level security policies protecting user data
- 🌐 Ready for production deployment

## 📋 Prerequisites

### 1. Supabase Project Setup

1. **Create Supabase Account**: Go to [supabase.com](https://supabase.com) and sign up
2. **Create New Project**: 
   - Project name: `ticket-marketplace`
   - Database password: Generate a secure password
   - Region: Choose closest to your users
3. **Get Credentials**: Go to Settings → API
   - Copy `Project URL`
   - Copy `anon public` key
   - Copy `service_role` key (keep this secret!)
4. **Get Database URL**: Go to Settings → Database
   - Copy the connection string (looks like `postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres`)

### 2. Environment Setup

Create `.env.supabase` from the template:

```bash
cp .env.supabase.example .env.supabase
```

Fill in your Supabase credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
DATABASE_URL=postgresql://postgres:[password]@db.your-project-ref.supabase.co:5432/postgres

# Enable Phase 1 features
USE_SUPABASE_AUTH=true
USE_SUPABASE_STORAGE=true
```

## 🗄️ Migration Steps

### Step 1: Set Up Database Schema

```bash
# Generate Supabase Prisma client and create tables
npm run db:supabase
```

This will:
- Generate Prisma client for PostgreSQL
- Create all tables in your Supabase database
- Set up indexes for performance

### Step 2: Export Phase 0 Data

```bash
# Export existing SQLite data
npm run migration:export
```

This creates `migration/phase0-export.json` with all your current data.

### Step 3: Set Up Supabase Storage

In your Supabase dashboard:

1. **Go to Storage**: Navigate to Storage in the left sidebar
2. **Create Bucket**: 
   - Name: `tickets`
   - Public: `false` (private bucket)
3. **Set Up Policies**: Go to Policies tab and add:

```sql
-- Allow users to upload their own tickets
CREATE POLICY "Users can upload own tickets" ON storage.objects
FOR INSERT WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to read their own tickets
CREATE POLICY "Users can read own tickets" ON storage.objects
FOR SELECT USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow sellers to read tickets they're selling
CREATE POLICY "Sellers can read listing tickets" ON storage.objects
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM listings 
    WHERE listings.userId = auth.uid()::text 
    AND (storage.foldername(name))[2] = listings.id
  )
);
```

### Step 4: Migrate Users & Data

```bash
# Migrate all data to Supabase
npm run migration:migrate
```

This will:
- Create Supabase auth users (with temporary passwords)
- Migrate user profiles and data
- Migrate all listings with proper foreign keys
- Migrate all offers with relationships intact
- Create migration logs for tracking

**Important**: Users will need to reset their passwords after migration since Supabase handles password hashing differently.

### Step 5: Migrate Files

```bash
# Migrate files to Supabase Storage
npm run migration:files
```

This will:
- Upload all ticket files to Supabase Storage
- Update database records with new file paths
- Test file access with signed URLs
- Migrate orphaned files to `orphaned/` folder

### Step 6: Update Environment

Switch to Phase 1 by updating your `.env.local`:

```bash
# Update your main .env.local file
cp .env.supabase .env.local
```

### Step 7: Restart Application

```bash
# Restart with Supabase
npm run dev
```

## 🔍 Verification Steps

### 1. Check Migration Logs

```bash
# View migration verification
npm run migration:verify
```

### 2. Test Core Functionality

- **Authentication**: 
  - ✅ New users can register via Supabase Auth
  - ⚠️ Existing users need to reset passwords
- **Data Access**: 
  - ✅ All listings display correctly
  - ✅ User relationships preserved
  - ✅ Offer history intact
- **File Access**: 
  - ✅ Ticket downloads work via signed URLs
  - ✅ File uploads go to Supabase Storage

### 3. Check Supabase Dashboard

1. **Authentication**: Go to Auth → Users
   - Should see all migrated users
   - Users will have `email_confirmed: true`

2. **Database**: Go to Table Editor
   - `users`: Should show all migrated users with `migrationStatus: 'migrated'`
   - `listings`: Should show all listings with updated file paths
   - `offers`: Should show all offers with proper relationships

3. **Storage**: Go to Storage → tickets
   - Should see all uploaded files organized by user/listing

## 🔄 Rollback Plan

If anything goes wrong, you can rollback:

```bash
# 1. Revert environment
cp .env.local.example .env.local
# Fill in Phase 0 settings

# 2. Restart application
npm run dev

# Your Phase 0 data is untouched in SQLite
```

## 🚨 Important Notes

### Password Reset Required

After migration, all users will need to reset their passwords:

1. **Notify Users**: Send email about the upgrade
2. **Reset Flow**: Users go to login → "Forgot Password"
3. **Supabase Email**: They'll receive reset email from Supabase
4. **New Password**: They set a new password in Supabase system

### File Path Changes

- **Before**: `/uploads/user-id/file.pdf`
- **After**: Signed URLs that expire (more secure)
- **API**: Use new file download endpoints

### Database Changes

- **IDs**: UUIDs instead of CUIDs (more standard)
- **Relations**: All foreign keys preserved
- **Indexes**: Added for better performance
- **RLS**: Row-level security protecting user data

## 📊 Migration Results

After successful migration, you'll see output like:

```
📊 Migration Summary:
    Users migrated: 4/4
    Listings migrated: 4/4
    Offers migrated: 5/5
    Errors: 0
    Files migrated: 4/4
    
✅ Migration completed successfully!
```

## 🔧 Troubleshooting

### Common Issues

**Database Connection Error**:
```bash
# Check your DATABASE_URL in .env.supabase
# Ensure Supabase project is running
```

**File Upload Errors**:
```bash
# Check storage bucket exists
# Verify RLS policies are set up
# Check file paths in listings table
```

**Auth Errors**:
```bash
# Verify NEXT_PUBLIC_SUPABASE_URL and keys
# Check Supabase project settings
```

### Getting Help

1. Check migration logs in database `migration_logs` table
2. Verify Supabase dashboard for data integrity  
3. Test individual components (auth, storage, database)

## 🎉 Next Steps

Once migration is complete:

1. **User Communication**: Notify users about password reset
2. **Testing**: Thoroughly test all functionality
3. **Deployment**: Update production environment variables
4. **Monitoring**: Watch Supabase dashboard for usage
5. **Phase 2**: Ready to implement advanced features from the main plan

Your ticket marketplace is now running on production-ready infrastructure with Supabase! 🚀
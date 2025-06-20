# Phase 0 → Phase 1 Migration Guide

This guide walks you through migrating from the Phase 0 prototype (SQLite + JWT) to Phase 1 production infrastructure (Supabase + PostgreSQL).

## Overview

Phase 0 serves as a working prototype to validate the concept with minimal infrastructure. Phase 1 upgrades to production-ready services:

- **Database**: SQLite → PostgreSQL (Supabase)
- **Authentication**: JWT → Supabase Auth
- **File Storage**: Local files → Supabase Storage
- **Architecture**: Single app → Monorepo (optional)

## Pre-Migration Checklist

- [ ] Validate Phase 0 is working correctly
- [ ] Test all user flows (registration, listing, offers, payments)
- [ ] Backup SQLite database
- [ ] Export all data using migration tools
- [ ] Document any custom modifications

## Migration Steps

### 1. Export Phase 0 Data

```bash
# Export all data from Phase 0
npm run migration:export

# This creates:
# - migration/data/phase0-export.json (all data)
# - migration/data/file-mappings.json (file paths)
# - migration/data/migration-report.md (detailed report)
```

### 2. Set Up Supabase

```bash
# Install Supabase CLI
npm install -g supabase

# Create new Supabase project at https://supabase.com
# Or initialize locally for development
supabase init
supabase start

# Get connection details
supabase status
```

### 3. Update Database Schema

```prisma
// Update prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL") // Supabase connection string
}

// Add enums for better type safety
enum ListingStatus {
  ACTIVE
  INACTIVE
  SOLD
  DELISTED
}

enum OfferStatus {
  PENDING
  ACCEPTED
  REJECTED
  EXPIRED
  COMPLETED
}
```

```bash
# Apply schema to Supabase
npx prisma db push

# Generate new client
npx prisma generate
```

### 4. Import Data

```bash
# Import exported data to Supabase
npm run migration:import

# Verify data integrity
npm run migration:verify
```

### 5. Update Authentication

Replace JWT auth with Supabase Auth:

```typescript
// Before (Phase 0): lib/auth.ts
const token = authService.generateToken(user);

// After (Phase 1): Supabase Auth
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(url, key)
const { data, error } = await supabase.auth.signUp({ email, password })
```

### 6. Update File Storage

Replace local storage with Supabase Storage:

```typescript
// Before (Phase 0): lib/upload.ts
await fs.writeFile(filePath, buffer);

// After (Phase 1): Supabase Storage
const { data, error } = await supabase.storage
  .from('tickets')
  .upload(path, file)
```

### 7. Implement RLS Policies

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Example policies
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can view active listings" ON listings
  FOR SELECT USING (status = 'ACTIVE');
```

### 8. Update Environment Variables

```bash
# .env.local (Phase 1)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=your-postgresql-connection-string
```

### 9. Test Migration

```bash
# Verify all functionality
npm run dev

# Test flows:
# - User registration/login
# - File uploads
# - Listing creation
# - Offer system
# - Mock payments
```

## Rollback Plan

If migration fails:

1. Keep Phase 0 SQLite database as backup
2. Restore from `migration/data/phase0-export.json`
3. Continue using Phase 0 until issues resolved

## Common Issues

### Authentication Migration
- Users need to reset passwords (Supabase Auth requirement)
- Implement invitation flow for existing users
- Update session handling

### File Path Changes
- Update all file references in database
- Test file uploads/downloads
- Verify RLS policies for storage

### Database Schema
- Handle PostgreSQL vs SQLite differences
- Update any raw SQL queries
- Test all database operations

## Verification

After migration, run these checks:

```bash
# Data integrity
npm run migration:verify

# Manual testing
- [ ] User registration works
- [ ] Login with migrated users works
- [ ] File uploads save to Supabase Storage
- [ ] Listings display correctly
- [ ] Offer system functions
- [ ] Mock payments complete flow
```

## Performance Optimization

Post-migration optimizations:

1. **Database Indexes**: Already included in schema
2. **File CDN**: Supabase provides global CDN
3. **Caching**: Implement query caching with TanStack Query
4. **Monitoring**: Set up Supabase monitoring

## Support

If you encounter issues:

1. Check migration logs in `migration/data/`
2. Verify environment variables
3. Test database connections
4. Review Supabase dashboard for errors

Remember: Phase 0 is for validation, Phase 1 is for production readiness.
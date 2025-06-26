-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "supabaseId" UUID UNIQUE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "migratedAt" TIMESTAMP,
  "migrationStatus" TEXT DEFAULT 'pending' NOT NULL,
  "migratedFromId" TEXT
);

-- Create indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_supabaseId ON users("supabaseId");

-- Create listings table
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  title TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "eventDate" TIMESTAMP NOT NULL,
  venue TEXT,
  "priceInCents" INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  description TEXT,
  "ticketPath" TEXT,
  "originalFileName" TEXT,
  "fileType" TEXT,
  "fileSize" INTEGER,
  status TEXT DEFAULT 'active' NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "migratedAt" TIMESTAMP,
  "migratedFromId" TEXT,
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for listings
CREATE INDEX IF NOT EXISTS idx_listings_userId ON listings("userId");
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_eventDate ON listings("eventDate");
CREATE INDEX IF NOT EXISTS idx_listings_eventName ON listings("eventName");

-- Create offers table
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "listingId" UUID NOT NULL,
  "buyerId" UUID NOT NULL,
  "offerPriceInCents" INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  "messageTemplate" TEXT NOT NULL,
  "customMessage" TEXT,
  status TEXT DEFAULT 'pending' NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "isPaid" BOOLEAN DEFAULT false NOT NULL,
  "paidAt" TIMESTAMP,
  "migratedAt" TIMESTAMP,
  "migratedFromId" TEXT,
  FOREIGN KEY ("listingId") REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY ("buyerId") REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for offers
CREATE INDEX IF NOT EXISTS idx_offers_listingId ON offers("listingId");
CREATE INDEX IF NOT EXISTS idx_offers_buyerId ON offers("buyerId");
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_createdAt ON offers("createdAt");

-- Create migration_logs table
CREATE TABLE IF NOT EXISTS migration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tableName" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "oldId" TEXT,
  "newId" TEXT,
  status TEXT NOT NULL,
  error TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for migration_logs
CREATE INDEX IF NOT EXISTS idx_migration_logs_tableName ON migration_logs("tableName");
CREATE INDEX IF NOT EXISTS idx_migration_logs_status ON migration_logs(status);

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updatedAt
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = "supabaseId");

-- Users can update their own data
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = "supabaseId");

-- Public can view active listings
CREATE POLICY "Anyone can view active listings" ON listings
  FOR SELECT USING (status = 'active');

-- Users can manage their own listings
CREATE POLICY "Users can insert own listings" ON listings
  FOR INSERT WITH CHECK (auth.uid() = (SELECT "supabaseId" FROM users WHERE id = "userId"));

CREATE POLICY "Users can update own listings" ON listings
  FOR UPDATE USING (auth.uid() = (SELECT "supabaseId" FROM users WHERE id = "userId"));

CREATE POLICY "Users can delete own listings" ON listings
  FOR DELETE USING (auth.uid() = (SELECT "supabaseId" FROM users WHERE id = "userId"));

-- Users can view offers on their listings or their own offers
CREATE POLICY "Users can view relevant offers" ON offers
  FOR SELECT USING (
    auth.uid() = (SELECT "supabaseId" FROM users WHERE id = "buyerId")
    OR
    auth.uid() = (SELECT u."supabaseId" FROM users u JOIN listings l ON u.id = l."userId" WHERE l.id = "listingId")
  );

-- Users can create offers
CREATE POLICY "Users can create offers" ON offers
  FOR INSERT WITH CHECK (auth.uid() = (SELECT "supabaseId" FROM users WHERE id = "buyerId"));

-- Users can update their own offers
CREATE POLICY "Users can update own offers" ON offers
  FOR UPDATE USING (auth.uid() = (SELECT "supabaseId" FROM users WHERE id = "buyerId"));

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
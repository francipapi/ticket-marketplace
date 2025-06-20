import { PrismaClient as SQLitePrisma } from '@prisma/client';
import fs from 'fs/promises';

// This will be updated to use Supabase client in Phase 1
// import { createClient } from '@supabase/supabase-js';

interface VerificationResult {
  table: string;
  sqliteCount: number;
  supabaseCount?: number;
  status: 'pending' | 'verified' | 'mismatch';
  issues?: string[];
}

async function verifyMigration() {
  console.log('🔍 Starting migration verification...');
  
  const sqlitePrisma = new SQLitePrisma();
  const results: VerificationResult[] = [];
  
  try {
    // Verify SQLite data exists
    const sqliteUsers = await sqlitePrisma.user.count();
    const sqliteListings = await sqlitePrisma.listing.count();
    const sqliteOffers = await sqlitePrisma.offer.count();
    
    results.push(
      { table: 'users', sqliteCount: sqliteUsers, status: 'pending' },
      { table: 'listings', sqliteCount: sqliteListings, status: 'pending' },
      { table: 'offers', sqliteCount: sqliteOffers, status: 'pending' }
    );
    
    console.log('📊 SQLite Database Counts:');
    console.log(`   - Users: ${sqliteUsers}`);
    console.log(`   - Listings: ${sqliteListings}`);
    console.log(`   - Offers: ${sqliteOffers}`);
    
    // Check if export data exists
    try {
      const exportData = await fs.readFile('./migration/data/phase0-export.json', 'utf-8');
      const parsed = JSON.parse(exportData);
      
      console.log('📋 Export Data Verification:');
      console.log(`   - Export date: ${parsed.metadata.exportDate}`);
      console.log(`   - Exported users: ${parsed.metadata.totalUsers}`);
      console.log(`   - Exported listings: ${parsed.metadata.totalListings}`);
      console.log(`   - Exported offers: ${parsed.metadata.totalOffers}`);
      
      // Verify export matches current database
      const issues = [];
      if (parsed.metadata.totalUsers !== sqliteUsers) {
        issues.push(`User count mismatch: export=${parsed.metadata.totalUsers}, current=${sqliteUsers}`);
      }
      if (parsed.metadata.totalListings !== sqliteListings) {
        issues.push(`Listing count mismatch: export=${parsed.metadata.totalListings}, current=${sqliteListings}`);
      }
      if (parsed.metadata.totalOffers !== sqliteOffers) {
        issues.push(`Offer count mismatch: export=${parsed.metadata.totalOffers}, current=${sqliteOffers}`);
      }
      
      if (issues.length > 0) {
        console.log('⚠️ Export data may be outdated:');
        issues.forEach(issue => console.log(`   - ${issue}`));
        console.log('💡 Run export again: npm run migration:export');
      } else {
        console.log('✅ Export data matches current database');
      }
      
    } catch (error) {
      console.log('❌ No export data found. Run: npm run migration:export');
    }
    
    // TODO: Phase 1 - Add Supabase verification
    /*
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      console.log('🔗 Connecting to Supabase...');
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Verify Supabase counts
      const { count: supabaseUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
        
      const { count: supabaseListings } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true });
        
      const { count: supabaseOffers } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true });
      
      console.log('📊 Supabase Database Counts:');
      console.log(`   - Users: ${supabaseUsers}`);
      console.log(`   - Listings: ${supabaseListings}`);
      console.log(`   - Offers: ${supabaseOffers}`);
      
      // Update results with Supabase verification
      results[0].supabaseCount = supabaseUsers || 0;
      results[1].supabaseCount = supabaseListings || 0;
      results[2].supabaseCount = supabaseOffers || 0;
      
      results.forEach(result => {
        if (result.supabaseCount === result.sqliteCount) {
          result.status = 'verified';
        } else {
          result.status = 'mismatch';
          result.issues = [`Count mismatch: SQLite=${result.sqliteCount}, Supabase=${result.supabaseCount}`];
        }
      });
    } else {
      console.log('🔧 Supabase not configured. Set environment variables:');
      console.log('   - NEXT_PUBLIC_SUPABASE_URL');
      console.log('   - SUPABASE_SERVICE_ROLE_KEY');
    }
    */
    
    // Save verification report
    const verificationReport = {
      timestamp: new Date().toISOString(),
      results,
      summary: {
        totalTables: results.length,
        verified: results.filter(r => r.status === 'verified').length,
        pending: results.filter(r => r.status === 'pending').length,
        mismatched: results.filter(r => r.status === 'mismatch').length,
      },
    };
    
    await fs.mkdir('./migration/data', { recursive: true });
    await fs.writeFile(
      './migration/data/verification-report.json',
      JSON.stringify(verificationReport, null, 2)
    );
    
    console.log('📋 Verification Summary:');
    console.log(`   - Total tables checked: ${verificationReport.summary.totalTables}`);
    console.log(`   - Verified: ${verificationReport.summary.verified}`);
    console.log(`   - Pending: ${verificationReport.summary.pending}`);
    console.log(`   - Mismatched: ${verificationReport.summary.mismatched}`);
    
    if (verificationReport.summary.mismatched > 0) {
      console.log('❌ Migration verification failed');
      console.log('🔍 Check verification-report.json for details');
      process.exit(1);
    } else {
      console.log('✅ Migration verification completed');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await sqlitePrisma.$disconnect();
  }
}

verifyMigration();
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

interface ExportData {
  users: any[];
  listings: any[];
  offers: any[];
  metadata: {
    exportDate: string;
    totalUsers: number;
    totalListings: number;
    totalOffers: number;
    version: string;
    sqliteDbPath: string;
  };
}

async function exportData() {
  console.log('🚀 Starting Phase 0 → Phase 1 data export...');
  
  try {
    const users = await prisma.user.findMany({
      include: {
        listings: {
          include: {
            offers: true,
          },
        },
        sentOffers: {
          include: {
            listing: true,
          },
        },
      },
    });
    
    const listings = await prisma.listing.findMany({
      include: {
        user: true,
        offers: true,
      },
    });
    
    const offers = await prisma.offer.findMany({
      include: {
        listing: true,
        buyer: true,
      },
    });
    
    const exportData: ExportData = {
      users: users.map(user => ({
        ...user,
        // Remove password hash for security (users will need to reset passwords)
        passwordHash: undefined,
        needsPasswordReset: true,
        // Add Supabase migration metadata
        supabaseEmail: user.email,
        supabaseUsername: user.username,
      })),
      listings: listings.map(listing => ({
        ...listing,
        // Convert file paths for Supabase storage
        supabaseTicketPath: listing.ticketPath 
          ? `tickets/${listing.userId}/${path.basename(listing.ticketPath)}`
          : null,
        // Keep original for reference
        originalTicketPath: listing.ticketPath,
      })),
      offers,
      metadata: {
        exportDate: new Date().toISOString(),
        totalUsers: users.length,
        totalListings: listings.length,
        totalOffers: offers.length,
        version: '1.0.0',
        sqliteDbPath: './prisma/dev.db',
      },
    };
    
    // Ensure migration data directory exists
    await fs.mkdir('./migration/data', { recursive: true });
    
    // Save export data
    await fs.writeFile(
      './migration/data/phase0-export.json',
      JSON.stringify(exportData, null, 2)
    );
    
    // Copy uploaded files with new structure mapping
    await copyUploadedFiles(users);
    
    // Generate migration report
    await generateMigrationReport(exportData);
    
    console.log('✅ Export completed successfully');
    console.log(`📊 Exported:`);
    console.log(`   - ${users.length} users`);
    console.log(`   - ${listings.length} listings`);
    console.log(`   - ${offers.length} offers`);
    console.log(`📁 Files saved to: ./migration/data/`);
    console.log(`📋 Review migration-report.md for next steps`);
    
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function copyUploadedFiles(users: any[]) {
  console.log('📁 Preparing file migration mapping...');
  
  const fileMappings = [];
  const uploadsDir = './public/uploads';
  
  try {
    // Check if uploads directory exists
    await fs.access(uploadsDir);
    
    for (const user of users) {
      const userDir = path.join(uploadsDir, user.id);
      
      try {
        const files = await fs.readdir(userDir);
        
        for (const fileName of files) {
          const localPath = path.join(userDir, fileName);
          const supabasePath = `tickets/${user.id}/${fileName}`;
          
          fileMappings.push({
            userId: user.id,
            username: user.username,
            localPath: localPath.replace('./public/', '/'), // Web accessible path
            supabasePath,
            fileName,
            fileSize: (await fs.stat(localPath)).size,
          });
        }
      } catch (error) {
        // User directory doesn't exist, skip
        console.log(`  - No files for user ${user.username}`);
      }
    }
    
    // Save file mapping
    await fs.writeFile(
      './migration/data/file-mappings.json',
      JSON.stringify(fileMappings, null, 2)
    );
    
    console.log(`📁 File mapping completed: ${fileMappings.length} files`);
    
  } catch (error) {
    console.log('📁 No uploads directory found - no files to migrate');
  }
}

async function generateMigrationReport(data: ExportData) {
  const report = `# Phase 0 → Phase 1 Migration Report

Generated: ${data.metadata.exportDate}

## Summary
- **Users**: ${data.metadata.totalUsers}
- **Listings**: ${data.metadata.totalListings}
- **Offers**: ${data.metadata.totalOffers}

## Migration Steps

### 1. Set up Supabase Project
\`\`\`bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase
supabase init

# Start local development
supabase start

# Or connect to cloud project
supabase link --project-ref YOUR_PROJECT_REF
\`\`\`

### 2. Update Database Schema
- Switch from SQLite to PostgreSQL in \`prisma/schema.prisma\`
- Add proper enums and constraints
- Run migrations: \`npx prisma db push\`

### 3. Migrate Authentication
- All users will need to reset passwords (Supabase Auth)
- Implement user invitation flow
- Update authentication system to use Supabase Auth

### 4. Migrate File Storage
- Upload files to Supabase Storage
- Update file paths in database
- Set up RLS policies for file access

### 5. Update Application Code
- Replace JWT auth with Supabase Auth
- Update file upload/download logic
- Implement RLS policies
- Add service abstractions

## Critical Notes
- ⚠️ Users will need to reset passwords
- ⚠️ File paths will change format
- ⚠️ Test all functionality after migration
- ⚠️ Keep SQLite backup until verification complete

## Files Generated
- \`phase0-export.json\` - All data export
- \`file-mappings.json\` - File migration mapping
- \`migration-report.md\` - This report

## Next Steps
1. Review exported data
2. Set up Supabase project
3. Run import script: \`npm run migration:import\`
4. Verify data integrity: \`npm run migration:verify\`
5. Update application code for Phase 1
`;

  await fs.writeFile('./migration/data/migration-report.md', report);
}

// Run the export
exportData();
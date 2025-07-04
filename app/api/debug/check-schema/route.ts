import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { getTables } from '@/lib/airtable';

export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tables = getTables();
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      suggestions: [],
      findings: {}
    };

    // Check Users table
    try {
      const userRecords = await tables.users.select({ maxRecords: 3 }).firstPage();
      diagnostics.findings['Users'] = {
        exists: true,
        recordCount: userRecords.length,
        sampleFields: userRecords[0] ? Object.keys(userRecords[0].fields) : [],
        sampleRecord: userRecords[0] ? {
          id: userRecords[0].id,
          fields: userRecords[0].fields
        } : null
      };
    } catch (error) {
      diagnostics.findings['Users'] = {
        exists: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // Check Listings table
    try {
      const listingRecords = await tables.listings.select({ maxRecords: 3 }).firstPage();
      diagnostics.findings['Listings'] = {
        exists: true,
        recordCount: listingRecords.length,
        sampleFields: listingRecords[0] ? Object.keys(listingRecords[0].fields) : [],
        sampleRecord: listingRecords[0] ? {
          id: listingRecords[0].id,
          fields: listingRecords[0].fields
        } : null
      };
      
      // Analyze field structure
      if (listingRecords[0]) {
        const fields = Object.keys(listingRecords[0].fields);
        const userRelatedFields = fields.filter(f => 
          f.toLowerCase().includes('user') || 
          f.toLowerCase().includes('seller') ||
          f.toLowerCase().includes('owner')
        );
        
        diagnostics.findings['Listings'].userRelatedFields = userRelatedFields;
        
        if (userRelatedFields.length === 0) {
          diagnostics.suggestions.push('No user-related fields found in Listings table. You need to create a linked record field pointing to the Users table.');
        } else {
          diagnostics.suggestions.push(`Found potential user fields: ${userRelatedFields.join(', ')}. Try using one of these field names.`);
        }
      }
    } catch (error) {
      diagnostics.findings['Listings'] = {
        exists: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // Provide specific recommendations based on Airtable best practices
    diagnostics.suggestions.push('According to Airtable documentation, linked record fields should:');
    diagnostics.suggestions.push('1. Be configured as "Link to another record" field type');
    diagnostics.suggestions.push('2. Point to the Users table');
    diagnostics.suggestions.push('3. Accept an array of record IDs like ["recXXXXXXXXXXXXXX"]');
    diagnostics.suggestions.push('4. Common field names are: seller, user, userId, sellerId');

    return NextResponse.json(diagnostics);
  } catch (error) {
    console.error('Error in schema check:', error);
    return NextResponse.json(
      { error: 'Failed to check schema', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
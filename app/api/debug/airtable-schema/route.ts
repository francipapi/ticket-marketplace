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
    
    // Get table schema information
    const diagnostics = {
      timestamp: new Date().toISOString(),
      userId,
      tables: {},
      testResults: {}
    };

    try {
      // Test Users table
      const userRecords = await tables.users.select({ maxRecords: 1 }).firstPage();
      diagnostics.tables['Users'] = {
        recordCount: userRecords.length,
        sampleRecord: userRecords[0] ? {
          id: userRecords[0].id,
          fields: userRecords[0].fields
        } : null
      };

      // Test Listings table structure
      const listingRecords = await tables.listings.select({ maxRecords: 1 }).firstPage();
      diagnostics.tables['Listings'] = {
        recordCount: listingRecords.length,
        sampleRecord: listingRecords[0] ? {
          id: listingRecords[0].id,
          fields: listingRecords[0].fields
        } : null
      };

      // Test creating a minimal listing to see what happens
      const testUserId = 'recQdwm14dppUN5KH'; // The user ID from your error
      
      try {
        // Try different approaches to the seller field
        const testCases = [
          {
            name: 'Array with string ID',
            data: { seller: [testUserId] }
          },
          {
            name: 'Single string ID',
            data: { seller: testUserId }
          },
          {
            name: 'Array with object',
            data: { seller: [{ id: testUserId }] }
          }
        ];

        for (const testCase of testCases) {
          try {
            const testData = {
              title: 'TEST - DELETE ME',
              eventName: 'TEST EVENT',
              eventDate: '2025-07-18',
              price: 1000,
              quantity: 1,
              status: 'ACTIVE',
              views: 0,
              ...testCase.data
            };

            // Don't actually create, just validate the structure
            diagnostics.testResults[testCase.name] = {
              attempted: true,
              data: testData,
              status: 'not_executed' // We're not actually executing to avoid creating test records
            };
          } catch (error) {
            diagnostics.testResults[testCase.name] = {
              attempted: true,
              error: error instanceof Error ? error.message : String(error),
              status: 'failed'
            };
          }
        }

        // Check if we can read the specific user that's causing issues
        try {
          const problemUser = await tables.users.find(testUserId);
          diagnostics.testResults['user_lookup'] = {
            status: 'success',
            user: {
              id: problemUser.id,
              fields: problemUser.fields
            }
          };
        } catch (error) {
          diagnostics.testResults['user_lookup'] = {
            status: 'failed',
            error: error instanceof Error ? error.message : String(error)
          };
        }

      } catch (error) {
        diagnostics.testResults['general_error'] = {
          error: error instanceof Error ? error.message : String(error)
        };
      }

    } catch (error) {
      diagnostics.tables['error'] = {
        error: error instanceof Error ? error.message : String(error)
      };
    }

    return NextResponse.json(diagnostics);
  } catch (error) {
    console.error('Error in schema diagnostics:', error);
    return NextResponse.json(
      { error: 'Failed to run diagnostics', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
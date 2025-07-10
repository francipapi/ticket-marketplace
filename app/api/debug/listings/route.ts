import { NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/services/factory';

export async function GET() {
  try {
    console.log('🔍 DEBUG: Fetching all listings for debugging');
    
    const dbService = getDatabaseService();
    const result = await dbService.listings.findMany({ limit: 50 });
    
    console.log(`📋 DEBUG: Found ${result.items.length} listings total`);
    
    const summary = result.items.map(listing => ({
      id: listing.id,
      title: listing.title,
      status: listing.status,
      userId: listing.userId,
      createdAt: listing.createdAt
    }));
    
    console.log('📋 DEBUG: Listings summary:', summary);
    
    return NextResponse.json({
      success: true,
      count: result.items.length,
      listings: summary
    });
  } catch (error) {
    console.error('❌ DEBUG: Error fetching listings:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
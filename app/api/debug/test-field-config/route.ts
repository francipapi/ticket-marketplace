import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { db } from '@/services/database.service';

export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId');

    if (!sellerId) {
      return NextResponse.json(
        { error: 'sellerId parameter is required' },
        { status: 400 }
      );
    }

    console.log('Testing field configuration with sellerId:', sellerId);

    const testResults = await db.testFieldConfiguration(sellerId);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      sellerId,
      testResults,
      recommendation: testResults.find(r => r.status === 'success')?.config || 'No working configuration found'
    });
  } catch (error) {
    console.error('Error in field configuration test:', error);
    return NextResponse.json(
      { error: 'Failed to test field configuration', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
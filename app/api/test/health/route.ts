import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { getAirtableBase } from '@/lib/airtable';

export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    
    const checks = {
      timestamp: new Date().toISOString(),
      auth: {
        isAuthenticated: !!userId,
        userId: userId || 'Not authenticated',
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasAirtableKey: !!process.env.AIRTABLE_API_KEY,
        hasAirtableBase: !!process.env.AIRTABLE_BASE_ID,
        hasClerkKey: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      },
      airtable: {
        initialized: false,
        error: null as string | null,
      },
    };
    
    // Test Airtable connection
    try {
      const base = getAirtableBase();
      checks.airtable.initialized = !!base;
    } catch (error) {
      checks.airtable.error = error instanceof Error ? error.message : 'Unknown error';
    }
    
    return NextResponse.json({
      status: 'ok',
      checks,
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
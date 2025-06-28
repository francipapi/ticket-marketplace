import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasAirtableKey: !!process.env.AIRTABLE_API_KEY,
    hasAirtableBase: !!process.env.AIRTABLE_BASE_ID,
    airtableKeyLength: process.env.AIRTABLE_API_KEY?.length || 0,
    airtableBaseLength: process.env.AIRTABLE_BASE_ID?.length || 0,
    // Show first few characters for debugging (safe for base ID)
    baseIdPrefix: process.env.AIRTABLE_BASE_ID?.substring(0, 6) || 'not set',
    nodeEnv: process.env.NODE_ENV,
  });
}
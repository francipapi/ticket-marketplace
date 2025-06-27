import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    message: 'Simple test works',
    env: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  })
}
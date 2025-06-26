import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  
  // Filter for Supabase cookies
  const supabaseCookies = allCookies.filter(cookie => 
    cookie.name.includes('supabase') || cookie.name.includes('sb-')
  )
  
  return NextResponse.json({
    totalCookies: allCookies.length,
    supabaseCookies: supabaseCookies.length,
    allCookieNames: allCookies.map(c => c.name),
    supabaseDetails: supabaseCookies,
    headers: {
      authorization: request.headers.get('authorization'),
      cookie: request.headers.get('cookie')
    }
  })
}
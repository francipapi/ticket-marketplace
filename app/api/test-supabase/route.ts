import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('Testing Supabase configuration...')
    
    // Basic environment check
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase environment variables',
        config: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey
        }
      })
    }

    // Test basic connectivity without importing the client
    const testUrl = `${supabaseUrl}/rest/v1/`
    
    console.log('Testing URL:', testUrl)
    
    const response = await fetch(testUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    })
    
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      config: {
        url: supabaseUrl,
        hasKey: !!supabaseKey
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('API test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Skip middleware for API routes, static files, and other excluded paths
  if (shouldSkipMiddleware(request.nextUrl.pathname)) {
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  try {
    // Get current user and refresh session if needed
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // Log auth errors but don't block navigation
    if (authError) {
      console.warn('Middleware auth error:', authError.message)
    }

    const pathname = request.nextUrl.pathname

    // Define route categories
    const isProtectedRoute = isProtectedPath(pathname)
    const isAuthRoute = isAuthPath(pathname)
    const isPublicRoute = isPublicPath(pathname)

    // Handle protected routes
    if (isProtectedRoute && !user) {
      const loginUrl = new URL('/auth/login', request.url)
      // Preserve the original destination for redirect after login
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Handle auth routes when user is already authenticated
    if (isAuthRoute && user) {
      // Check if user was trying to access a specific page before login
      const redirectTo = request.nextUrl.searchParams.get('redirectTo')
      const destination = redirectTo && isValidRedirectPath(redirectTo) 
        ? redirectTo 
        : '/dashboard'
      return NextResponse.redirect(new URL(destination, request.url))
    }

    // Verify user exists in our database for protected routes
    if (isProtectedRoute && user) {
      const { data: appUser, error: dbError } = await supabase
        .from('users')
        .select('id')
        .eq('supabaseId', user.id)
        .single()

      if (dbError || !appUser) {
        console.error('User exists in Supabase but not in database:', user.email)
        // Redirect to a user creation flow or login
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }
    }

  } catch (error) {
    console.error('Middleware error:', error)
    // On critical errors, redirect to login for protected routes
    if (isProtectedPath(request.nextUrl.pathname)) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  return response
}

/**
 * Check if middleware should be skipped for this path
 */
function shouldSkipMiddleware(pathname: string): boolean {
  const skipPaths = [
    '/api',
    '/_next',
    '/favicon.ico',
    '/.well-known'
  ]
  
  const skipExtensions = ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.css', '.js']
  
  return skipPaths.some(path => pathname.startsWith(path)) ||
         skipExtensions.some(ext => pathname.endsWith(ext))
}

/**
 * Check if path requires authentication
 */
function isProtectedPath(pathname: string): boolean {
  const protectedRoutes = [
    '/dashboard',
    '/listings/create',
    '/listings/edit',
    '/offers',
    '/profile',
    '/settings'
  ]
  
  return protectedRoutes.some(route => pathname.startsWith(route))
}

/**
 * Check if path is an auth-related page
 */
function isAuthPath(pathname: string): boolean {
  const authRoutes = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password'
  ]
  
  return authRoutes.includes(pathname)
}

/**
 * Check if path is public and doesn't require auth
 */
function isPublicPath(pathname: string): boolean {
  const publicRoutes = [
    '/',
    '/about',
    '/contact',
    '/listings',
    '/search'
  ]
  
  return publicRoutes.includes(pathname) || pathname.startsWith('/listings/')
}

/**
 * Validate that redirect path is safe
 */
function isValidRedirectPath(path: string): boolean {
  // Only allow internal paths, no external URLs
  if (path.startsWith('http') || path.startsWith('//')) {
    return false
  }
  
  // Must start with /
  if (!path.startsWith('/')) {
    return false
  }
  
  // Don't redirect to auth pages
  if (isAuthPath(path)) {
    return false
  }
  
  return true
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
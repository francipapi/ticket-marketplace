import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/browse(.*)',
  '/events(.*)',
  '/listings/(.*)', // Individual listing pages are public
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/listings', // GET requests to browse listings
  '/api/listings/(.*)', // GET requests to view individual listings
  '/api/health(.*)',
  '/api/simple-test(.*)',
]);

// Define which routes should be protected
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/listings/create(.*)',
  '/listings/edit(.*)',
  '/profile(.*)',
  '/settings(.*)',
  '/api/dashboard(.*)',
  '/api/offers(.*)',
  '/api/upload(.*)',
  '/api/payments(.*)',
  '/api/user/sync(.*)',
]);

export default clerkMiddleware(({ protect }, req) => {
  // Skip protection for public routes
  if (isPublicRoute(req)) {
    return;
  }
  
  // Protect routes that require authentication
  if (isProtectedRoute(req)) {
    protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
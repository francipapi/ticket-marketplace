import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define which routes should be protected
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/listings/create(.*)',
  '/listings/edit(.*)',
  '/offers(.*)',
  '/api/dashboard(.*)',
  '/api/listings(.*)',
  '/api/offers(.*)',
  '/api/upload(.*)',
  '/api/payments(.*)',
  '/api/user/sync',
]);

export default clerkMiddleware(({ protect }, req) => {
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
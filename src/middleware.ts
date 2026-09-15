import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@/auth'

// Auth.js's Google provider + the auth.users Postgres lookup pull in
// Node-only packages (pg), so middleware needs the Node.js runtime rather
// than the Edge default — Next.js has supported this since 15.2.
export const runtime = 'nodejs'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request,
  })

  // Only check auth for routes that actually need it (protected + auth pages)
  const protectedRoutes = ['/dashboard', '/timer', '/journal', '/stats', '/teacher', '/settings']
  const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password']
  const pathname = request.nextUrl.pathname
  const isHome = pathname === '/'

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute || isAuthRoute || isHome) {
    const session = await auth()
    const isSignedIn = Boolean(session?.user)

    if (isProtectedRoute && !isSignedIn) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if ((isAuthRoute || isHome) && isSignedIn) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()')
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.googleusercontent.com",
      "font-src 'self' https://fonts.gstatic.com",
      // accounts.google.com is where the OAuth consent redirect goes. The
      // PostgREST client runs server-side only (see src/lib/postgrest/client.ts),
      // so the mini's PostgREST endpoint never needs to be reachable from
      // the browser and doesn't belong in this connect-src.
      "connect-src 'self' https://api.anthropic.com https://accounts.google.com",
      "frame-src 'self' https://accounts.google.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://accounts.google.com",
    ].join('; ')
  )

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

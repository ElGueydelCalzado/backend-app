import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { withAuth } from 'next-auth/middleware'

export default withAuth(
  function middleware(request: NextRequest) {
    const url = request.nextUrl.clone()
    
    // If already on login page and authenticated, redirect to inventory
    if (url.pathname === '/login') {
      url.pathname = '/inventario'
      return NextResponse.redirect(url)
    }
    
    // Security headers
    const response = NextResponse.next()
    
    // HSTS - Force HTTPS
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    
    // Prevent clickjacking
    response.headers.set('X-Frame-Options', 'DENY')
    
    // Prevent MIME type sniffing
    response.headers.set('X-Content-Type-Options', 'nosniff')
    
    // XSS Protection
    response.headers.set('X-XSS-Protection', '1; mode=block')
    
    // Referrer Policy
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    // Content Security Policy
    response.headers.set('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' vercel.live; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob: vercel.com; " +
      "connect-src 'self' *.vercel.app *.google.com; " +
      "font-src 'self'"
    )
    
    // Permissions Policy
    response.headers.set('Permissions-Policy', 
      'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()'
    )
    
    return response
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
    pages: {
      signIn: '/login'
    }
  }
)

export const config = {
  matcher: [
    // Temporarily disable all middleware to test NextAuth routes
    '/disabled-for-testing',
  ],
}
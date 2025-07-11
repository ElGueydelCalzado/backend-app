import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export default auth((request) => {
  const url = request.nextUrl.clone()
  const isAuthenticated = !!request.auth
  
  // If already on login page and authenticated, redirect to inventory
  if (url.pathname === '/login' && isAuthenticated) {
    url.pathname = '/inventario'
    return NextResponse.redirect(url)
  }
  
  // If not authenticated and not on login/auth page, redirect to login
  if (!isAuthenticated && url.pathname !== '/login' && !url.pathname.startsWith('/api/auth')) {
    url.pathname = '/login'
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
  
  // Content Security Policy - Updated for Vercel live features and barcode scanner
  response.headers.set('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' vercel.live; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob: vercel.com; " +
    "connect-src 'self' *.vercel.app *.google.com; " +
    "font-src 'self'; " +
    "frame-src 'self' vercel.live; " +
    "media-src 'self' blob:"
  )
  
  // Permissions Policy - Allow camera for barcode scanning
  response.headers.set('Permissions-Policy', 
    'geolocation=(), microphone=(), camera=(self), payment=(), usb=(), magnetometer=(), gyroscope=()'
  )
  
  return response
})

export const config = {
  matcher: [
    '/',
    '/inventario/:path*',
    '/nuevo-producto/:path*',
    '/((?!api/auth|_next/static|_next/image|favicon.ico|login|public).*)',
  ],
}
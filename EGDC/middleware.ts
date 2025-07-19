// Multi-Tenant SaaS Middleware for Subdomain-Based Architecture
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Tenant configuration mapping subdomains to tenant IDs
const TENANT_CONFIG = {
  'egdc': {
    tenant_id: '471e9c26-a232-46b3-a992-2932e5dfadf4',
    name: 'EGDC',
    allowed_users: ['elweydelcalzado@gmail.com']
  },
  'fami': {
    tenant_id: 'fami-tenant-id',
    name: 'FAMI',
    allowed_users: ['fami@example.com'] // Will be real when they register
  },
  'osiel': {
    tenant_id: 'osiel-tenant-id', 
    name: 'Osiel',
    allowed_users: ['osiel@example.com'] // Will be real when they register
  },
  'molly': {
    tenant_id: 'molly-tenant-id',
    name: 'Molly', 
    allowed_users: ['molly@example.com'] // Will be real when they register
  }
}

function extractSubdomain(hostname: string): string | null {
  // Handle different environments
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return 'egdc' // Default to EGDC for local development
  }
  
  // For production: subdomain.elgueydelcalzado.com
  const parts = hostname.split('.')
  if (parts.length >= 3 && hostname.includes('elgueydelcalzado.com')) {
    return parts[0] // Return the subdomain part
  }
  
  return null
}

function isValidTenant(subdomain: string): boolean {
  return subdomain in TENANT_CONFIG
}

export default async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || request.nextUrl.hostname
  
  console.log('🔍 Middleware Debug:', {
    hostname,
    pathname: url.pathname,
    environment: process.env.VERCEL_ENV || 'development'
  })
  
  // Extract subdomain for tenant detection
  const subdomain = extractSubdomain(hostname)
  
  console.log('🏢 Tenant Detection:', {
    subdomain,
    isValidTenant: subdomain ? isValidTenant(subdomain) : false,
    hostname
  })
  
  // Skip authentication in preview environment
  if (process.env.SKIP_AUTH === 'true' || process.env.USE_MOCK_DATA === 'true') {
    console.log('🎭 Skipping auth - preview/mock environment')
    return NextResponse.next()
  }
  
  // CENTRALIZED LOGIN PORTAL: login.elgueydelcalzado.com (temporary: also accept 'inv')
  if (subdomain === 'login' || subdomain === 'inv') {
    console.log('🚪 Login portal accessed')
    
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    
    // If already authenticated, redirect to their tenant subdomain
    if (token?.tenant_subdomain) {
      const tenantSubdomain = token.tenant_subdomain
      console.log('✅ Authenticated user, redirecting to tenant:', tenantSubdomain)
      
      // Redirect to tenant subdomain (temporarily use inv for egdc until domains are configured)
      if (tenantSubdomain === 'egdc') {
        url.hostname = 'inv.elgueydelcalzado.com'
        url.pathname = '/inventario'
        return NextResponse.redirect(url)
      } else {
        url.hostname = `${tenantSubdomain}.elgueydelcalzado.com`
        url.pathname = '/inventario'
        return NextResponse.redirect(url)
      }
    }
    
    // If not authenticated, show login page
    if (url.pathname !== '/login' && !url.pathname.startsWith('/api/auth')) {
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    
    return NextResponse.next()
  }
  
  // TENANT SUBDOMAINS: egdc.elgueydelcalzado.com, fami.elgueydelcalzado.com, etc.
  if (subdomain && isValidTenant(subdomain)) {
    console.log('🏢 Tenant subdomain accessed:', subdomain)
    
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    const isAuthenticated = !!token
    
    // If not authenticated, redirect to login portal
    if (!isAuthenticated && !url.pathname.startsWith('/api/auth')) {
      console.log('❌ Not authenticated, redirecting to login portal')
      url.hostname = 'login.elgueydelcalzado.com'
      url.pathname = '/login'
      url.searchParams.set('redirect', `${subdomain}.elgueydelcalzado.com/inventario`)
      return NextResponse.redirect(url)
    }
    
    // Verify user has access to this tenant
    if (isAuthenticated && token?.tenant_subdomain) {
      const userTenantSubdomain = token.tenant_subdomain.replace('preview-', '').replace('mock-', '')
      
      if (userTenantSubdomain !== subdomain) {
        console.log('❌ User accessing wrong tenant:', {
          userTenant: userTenantSubdomain,
          requestedTenant: subdomain
        })
        
        // Redirect to their correct tenant
        url.hostname = `${userTenantSubdomain}.elgueydelcalzado.com`
        url.pathname = '/inventario'
        return NextResponse.redirect(url)
      }
    }
    
    // Add tenant context to request headers for API routes
    const response = NextResponse.next()
    response.headers.set('x-tenant-subdomain', subdomain)
    response.headers.set('x-tenant-id', TENANT_CONFIG[subdomain as keyof typeof TENANT_CONFIG].tenant_id)
    
    console.log('✅ Tenant access granted:', subdomain)
    return addSecurityHeaders(response)
  }
  
  // MAIN DOMAIN: elgueydelcalzado.com (Shopify store)
  if (hostname === 'elgueydelcalzado.com' || (!subdomain && hostname.includes('elgueydelcalzado.com'))) {
    console.log('🏪 Main domain accessed - this should be Shopify store')
    // This should be handled by your DNS/Shopify, not this app
    // If someone reaches this Next.js app on the main domain, redirect to login
    url.hostname = 'login.elgueydelcalzado.com'
    return NextResponse.redirect(url)
  }
  
  // FALLBACK: Unknown subdomain or invalid access
  console.log('❓ Unknown access pattern:', { hostname, subdomain })
  
  // For now, redirect unknown subdomains to inv.elgueydelcalzado.com (working domain)
  // until we get login.elgueydelcalzado.com working in Vercel
  if (hostname !== 'inv.elgueydelcalzado.com') {
    console.log('🔄 Redirecting unknown subdomain to inv.elgueydelcalzado.com')
    url.hostname = 'inv.elgueydelcalzado.com'
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  
  return NextResponse.next()
}

function addSecurityHeaders(response: NextResponse): NextResponse {
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
    "font-src 'self'; " +
    "frame-src 'self' vercel.live; " +
    "media-src 'self' blob:"
  )
  
  // Permissions Policy
  response.headers.set('Permissions-Policy', 
    'geolocation=(), microphone=(), camera=(self), payment=(), usb=(), magnetometer=(), gyroscope=()'
  )
  
  return response
}

export const config = {
  matcher: [
    // Match all paths except API routes, static files, and auth
    '/((?!api/auth|api/health|_next/static|_next/image|favicon.ico).*)',
  ],
}
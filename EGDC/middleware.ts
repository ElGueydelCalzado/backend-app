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

function extractTenantFromPath(pathname: string): string | null {
  // Extract tenant from path: /tenant/dashboard → tenant
  const pathParts = pathname.split('/').filter(Boolean)
  if (pathParts.length > 0 && isValidTenant(pathParts[0])) {
    return pathParts[0]
  }
  return null
}

function extractSubdomain(hostname: string): string | null {
  console.log('🔍 extractSubdomain called with:', { 
    hostname, 
    length: hostname.length,
    type: typeof hostname,
    rawValue: JSON.stringify(hostname)
  })
  
  // Clean hostname (remove any whitespace or special characters)
  const cleanHostname = hostname.trim().toLowerCase()
  console.log('🧹 Cleaned hostname:', { 
    cleanHostname,
    originalLength: hostname.length,
    cleanedLength: cleanHostname.length,
    areEqual: hostname === cleanHostname
  })
  
  // Handle different environments
  if (cleanHostname.includes('localhost') || cleanHostname.includes('127.0.0.1')) {
    console.log('🏠 Local development detected, returning egdc')
    return 'egdc' // Default to EGDC for local development
  }
  
  // For production: subdomain.lospapatos.com
  const parts = cleanHostname.split('.')
  console.log('📝 Hostname parts:', { 
    parts, 
    length: parts.length,
    part0: parts[0],
    part1: parts[1],
    part2: parts[2]
  })
  
  const hasLospapatos = cleanHostname.includes('lospapatos.com')
  console.log('🔍 Lospapatos check:', { 
    hasLospapatos, 
    cleanHostname,
    includesCheck: cleanHostname.includes('lospapatos.com'),
    searchTerm: 'lospapatos.com'
  })
  
  const lengthCheck = parts.length >= 3
  console.log('📏 Length check:', {
    partsLength: parts.length,
    lengthCheck,
    condition: `${parts.length} >= 3 = ${lengthCheck}`
  })
  
  const finalCondition = lengthCheck && hasLospapatos
  console.log('🎯 Final condition:', {
    lengthCheck,
    hasLospapatos,
    finalCondition,
    willExtract: finalCondition
  })
  
  if (finalCondition) {
    const subdomain = parts[0]
    console.log('✅ Subdomain extracted:', { 
      subdomain,
      fromPart: parts[0],
      allParts: parts
    })
    return subdomain
  }
  
  console.log('❌ No subdomain extracted, returning null')
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
    console.log('🎭 Skipping auth - preview/mock environment', {
      SKIP_AUTH: process.env.SKIP_AUTH,
      USE_MOCK_DATA: process.env.USE_MOCK_DATA,
      VERCEL_ENV: process.env.VERCEL_ENV
    })
    return NextResponse.next()
  }
  
  // CENTRALIZED LOGIN PORTAL: login.lospapatos.com ONLY
  if (subdomain === 'login') {
    console.log('🚪 Centralized login portal accessed:', {
      pathname: url.pathname,
      searchParams: url.search
    })
    
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    
    console.log('🔐 LOGIN PORTAL TOKEN CHECK:', {
      pathname: url.pathname,
      hasToken: !!token,
      tokenTenantSubdomain: token?.tenant_subdomain,
      tokenEmail: token?.email,
      isInventario: url.pathname === '/inventario'
    })
    
    // If user is authenticated and trying to access inventario, redirect to their tenant
    if (token?.tenant_subdomain && url.pathname === '/inventario') {
      const cleanSubdomain = token.tenant_subdomain.toString().replace('preview-', '').replace('mock-', '')
      const tenantUrl = `https://${cleanSubdomain}.lospapatos.com/inventario`
      
      console.log('✅ REDIRECTING AUTHENTICATED USER TO TENANT:', {
        email: token.email,
        tenant_subdomain: token.tenant_subdomain,
        cleanSubdomain,
        redirectUrl: tenantUrl,
        timestamp: new Date().toISOString()
      })
      
      return NextResponse.redirect(tenantUrl)
    }
    
    // Otherwise, allow login portal to work normally
    console.log('🔄 Allowing login portal to proceed:', {
      reason: !token ? 'No token' : url.pathname !== '/inventario' ? 'Wrong path' : 'No tenant subdomain'
    })
    return NextResponse.next()
  }
  
  // TENANT SUBDOMAINS: egdc.lospapatos.com, fami.lospapatos.com, etc.
  if (subdomain && isValidTenant(subdomain)) {
    console.log('🏢 Tenant subdomain accessed:', subdomain)
    
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    const isAuthenticated = !!token
    
    console.log('🔐 MIDDLEWARE TOKEN CHECK:', {
      subdomain,
      pathname: url.pathname,
      hasToken: !!token,
      isAuthenticated,
      cookies: request.headers.get('cookie')?.substring(0, 100) + '...',
      hasAuthSecret: !!process.env.NEXTAUTH_SECRET,
      tokenPreview: token ? {
        sub: token.sub,
        email: token.email,
        tenant_subdomain: token.tenant_subdomain,
        iat: token.iat,
        exp: token.exp
      } : 'NO_TOKEN_FOUND'
    })
    
    // CRITICAL: If not authenticated, redirect to login portal
    if (!isAuthenticated && !url.pathname.startsWith('/api/auth')) {
      console.log('❌ REDIRECT TO LOGIN - User not authenticated')
      console.log('❌ REDIRECT REASON:', {
        token: !!token,
        isApiAuth: url.pathname.startsWith('/api/auth'),
        pathname: url.pathname,
        redirecting: true
      })
      
      // Create a clean redirect URL without causing loops
      const loginUrl = new URL('https://login.lospapatos.com/login')
      loginUrl.searchParams.set('callbackUrl', `https://${subdomain}.lospapatos.com/inventario`)
      
      return NextResponse.redirect(loginUrl)
    }
    
    // If authenticated and trying to access /dashboard, redirect to /inventario
    if (isAuthenticated && url.pathname === '/dashboard') {
      console.log('🔄 Redirecting /dashboard to /inventario for proper inventory interface')
      url.pathname = '/inventario'
      return NextResponse.redirect(url)
    }
    
    // If authenticated, allow access with tenant context
    const response = NextResponse.next()
    response.headers.set('x-tenant-subdomain', subdomain)
    response.headers.set('x-tenant-id', TENANT_CONFIG[subdomain as keyof typeof TENANT_CONFIG].tenant_id)
    
    console.log('✅ Tenant access granted:', subdomain)
    return addSecurityHeaders(response)
  }
  
  // MAIN DOMAIN: lospapatos.com (Shopify store)
  if (hostname === 'lospapatos.com' || (!subdomain && hostname.includes('lospapatos.com'))) {
    console.log('🏪 Main domain accessed - this should be Shopify store')
    // This should be handled by your DNS/Shopify, not this app
    // If someone reaches this Next.js app on the main domain, redirect to login
    url.hostname = 'login.lospapatos.com'
    return NextResponse.redirect(url)
  }
  
  // FALLBACK: Unknown subdomain or invalid access
  console.log('❓ Unknown access pattern:', { hostname, subdomain })
  
  // No fallback redirect needed - login.lospapatos.com is working
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
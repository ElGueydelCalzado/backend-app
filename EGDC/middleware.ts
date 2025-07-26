// Multi-Tenant SaaS Middleware for Path-Based Architecture
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Tenant configuration mapping paths to tenant IDs
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
  console.log('🔍 extractTenantFromPath called with:', {
    pathname,
    pathParts: pathname.split('/').filter(Boolean)
  })
  
  // Extract tenant from path: /tenant/dashboard → tenant
  const pathParts = pathname.split('/').filter(Boolean)
  
  if (pathParts.length > 0 && isValidTenant(pathParts[0])) {
    const tenant = pathParts[0]
    console.log('✅ Tenant extracted from path:', {
      tenant,
      fromPath: pathname,
      isValid: isValidTenant(tenant)
    })
    return tenant
  }
  
  console.log('❌ No valid tenant found in path:', pathname)
  return null
}

function isAppDomain(hostname: string): boolean {
  console.log('🔍 isAppDomain called with:', {
    hostname,
    cleanHostname: hostname.trim().toLowerCase()
  })
  
  const cleanHostname = hostname.trim().toLowerCase()
  
  // Check for app.lospapatos.com or localhost for development
  const isApp = cleanHostname === 'app.lospapatos.com' || 
                cleanHostname.includes('localhost') || 
                cleanHostname.includes('127.0.0.1')
                
  console.log('🎯 App domain check result:', {
    cleanHostname,
    isApp,
    reasons: {
      isAppDomain: cleanHostname === 'app.lospapatos.com',
      isLocalhost: cleanHostname.includes('localhost'),
      isLocal127: cleanHostname.includes('127.0.0.1')
    }
  })
  
  return isApp
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
  
  // Extract tenant from path for path-based architecture
  const tenant = extractTenantFromPath(url.pathname)
  const isAppDomainAccess = isAppDomain(hostname)
  
  console.log('🏢 Tenant Detection:', {
    tenant,
    isValidTenant: tenant ? isValidTenant(tenant) : false,
    isAppDomainAccess,
    hostname,
    pathname: url.pathname
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
  
  // CENTRALIZED LOGIN: app.lospapatos.com/login
  if (isAppDomainAccess && url.pathname === '/login') {
    console.log('🚪 Centralized login portal accessed:', {
      pathname: url.pathname,
      searchParams: url.search,
      hostname
    })
    
    // Try to get token with more thorough checking
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === 'production'
    })
    
    console.log('🔐 LOGIN PORTAL TOKEN CHECK COMPREHENSIVE:', {
      pathname: url.pathname,
      hasToken: !!token,
      tokenTenantSubdomain: token?.tenant_subdomain,
      tokenEmail: token?.email,
      cookies: request.headers.get('cookie')?.includes('next-auth') ? 'HAS_COOKIES' : 'NO_COOKIES',
      userAgent: request.headers.get('user-agent')?.substring(0, 50),
      timestamp: new Date().toISOString()
    })
    
    // If user is authenticated, redirect to their tenant dashboard
    if (token?.tenant_subdomain) {
      const cleanTenant = token.tenant_subdomain.toString().replace('preview-', '').replace('mock-', '')
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://app.lospapatos.com' 
        : `http://${hostname}`
      const tenantUrl = `${baseUrl}/${cleanTenant}/dashboard`
      
      console.log('✅ REDIRECTING AUTHENTICATED USER TO TENANT:', {
        email: token.email,
        tenant_path: token.tenant_subdomain, // Used as path in path-based architecture
        cleanTenant,
        redirectUrl: tenantUrl,
        timestamp: new Date().toISOString()
      })
      
      return NextResponse.redirect(tenantUrl)
    }
    
    // No special dashboard handling needed in login path
    
    // Otherwise, allow login portal to work normally
    console.log('🔄 Allowing login portal to proceed:', {
      reason: !token ? 'No token' : 'No tenant subdomain'
    })
    return NextResponse.next()
  }
  
  // TENANT PATHS: app.lospapatos.com/egdc, app.lospapatos.com/fami, etc.
  if (isAppDomainAccess && tenant && isValidTenant(tenant)) {
    console.log('🏢 Tenant path accessed:', tenant)
    
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: process.env.NODE_ENV === 'production' ? 'next-auth.session-token' : 'next-auth.session-token'
    })
    const isAuthenticated = !!token
    
    console.log('🔐 MIDDLEWARE TOKEN CHECK (ENHANCED):', {
      tenant,
      pathname: url.pathname,
      hasToken: !!token,
      isAuthenticated,
      hasAuthSecret: !!process.env.NEXTAUTH_SECRET,
      nodeEnv: process.env.NODE_ENV,
      cookieHeader: request.headers.get('cookie') ? 'PRESENT' : 'MISSING',
      cookieNames: request.headers.get('cookie')?.split(';').map(c => c.split('=')[0].trim()),
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
      console.log('❌ DETAILED REDIRECT REASON:', {
        hasToken: !!token,
        isApiAuth: url.pathname.startsWith('/api/auth'),
        pathname: url.pathname,
        hasSecret: !!process.env.NEXTAUTH_SECRET,
        cookies: request.headers.get('cookie')?.split(';').map(c => c.split('=')[0].trim()),
        redirecting: true
      })
      
      // Create a clean redirect URL without causing loops
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://app.lospapatos.com' 
        : `http://${hostname}`
      const loginUrl = new URL(`${baseUrl}/login`)
      loginUrl.searchParams.set('callbackUrl', `${baseUrl}/${tenant}/dashboard`)
      
      return NextResponse.redirect(loginUrl)
    }
    
    // Dashboard is the main interface now - no redirects needed
    
    // If authenticated, allow access with tenant context
    const response = NextResponse.next()
    response.headers.set('x-tenant-path', tenant)
    response.headers.set('x-tenant-id', TENANT_CONFIG[tenant as keyof typeof TENANT_CONFIG].tenant_id)
    
    console.log('✅ Tenant access granted:', tenant)
    return addSecurityHeaders(response)
  }
  
  // MAIN DOMAIN: lospapatos.com (Shopify store)
  if (hostname === 'lospapatos.com' || (!isAppDomainAccess && hostname.includes('lospapatos.com'))) {
    console.log('🏪 Main domain or unknown domain accessed')
    // Redirect to the login portal on app domain
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://app.lospapatos.com' 
      : `http://${hostname}`
    return NextResponse.redirect(`${baseUrl}/login`)
  }
  
  // GENERIC DASHBOARD: app.lospapatos.com/dashboard (OAuth callback redirect)
  // Let the dashboard component handle tenant routing for better session access
  if (isAppDomainAccess && url.pathname === '/dashboard') {
    console.log('🎯 Generic dashboard accessed - allowing dashboard component to handle tenant routing')
    
    // Don't redirect in middleware - let the client-side dashboard component handle it
    // This avoids race conditions with JWT token availability after OAuth callback
    const response = NextResponse.next()
    response.headers.set('x-dashboard-mode', 'tenant-routing')
    
    console.log('✅ Allowing dashboard component to handle tenant routing')
    return addSecurityHeaders(response)
  }
  
  // FALLBACK: Unknown path or invalid access
  console.log('❓ Unknown access pattern:', { hostname, tenant, pathname: url.pathname })
  
  // For app domain without valid tenant path, redirect to login
  if (isAppDomainAccess && !tenant) {
    console.log('🔄 App domain without tenant - redirecting to login')
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://app.lospapatos.com' 
      : `http://${hostname}`
    return NextResponse.redirect(`${baseUrl}/login`)
  }
  
  // Unknown pattern - allow to proceed
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
    // Match all paths except ALL API routes, static files, and auth
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
// Multi-Tenant SaaS Middleware for Path-Based Architecture
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { 
  extractTenantFromPath, 
  isAppDomain, 
  isValidTenant, 
  isValidTenantFromDatabase,
  getTenantConfig,
  cleanTenantSubdomain,
  getBaseUrl,
  TENANT_CONFIG 
} from './lib/tenant-utils'

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
  
  // Check for supplier/retailer routing patterns
  const isSupplierRoute = url.pathname.includes('/s/')
  const isRetailerRoute = url.pathname.includes('/r/')
  const hasBusinessTypeRoute = isSupplierRoute || isRetailerRoute
  
  // Prioritize hardcoded tenant validation first (for performance and reliability)
  let tenantValidation = { isValid: false, config: null }
  if (tenant) {
    // First check hardcoded tenants (fast path)
    const isLegacyValid = isValidTenant(tenant)
    if (isLegacyValid) {
      tenantValidation = { 
        isValid: true, 
        config: { 
          id: TENANT_CONFIG[tenant as keyof typeof TENANT_CONFIG].tenant_id,
          name: TENANT_CONFIG[tenant as keyof typeof TENANT_CONFIG].name 
        } 
      }
    } else {
      // Fall back to database validation for dynamic tenants (if needed)
      tenantValidation = await isValidTenantFromDatabase(tenant)
    }
  }
  
  console.log('🏢 Tenant Detection:', {
    tenant,
    isValidTenant: tenantValidation.isValid,
    legacyValidation: tenant ? isValidTenant(tenant) : false,
    isAppDomainAccess,
    hostname,
    pathname: url.pathname,
    tenantConfig: tenantValidation.config ? { id: tenantValidation.config.id, name: tenantValidation.config.name } : null
  })
  
  // SECURITY: Authentication bypass removed for production security
  // Authentication is now required for all environments
  console.log('🔐 Security: Authentication required for all requests', {
    environment: process.env.VERCEL_ENV || 'development',
    hostname,
    pathname: url.pathname
  })
  
  // CENTRALIZED LOGIN: app.lospapatos.com/login
  if (isAppDomainAccess && url.pathname === '/login') {
    console.log('🚪 Centralized login portal accessed:', {
      pathname: url.pathname,
      searchParams: url.search,
      hostname
    })
    
    // Try to get token with environment-specific cookie handling
    let token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: 'next-auth.session-token',
      secureCookie: process.env.NODE_ENV === 'production'
    })
    
    // Fallback for production environments with secure cookies
    if (!token && process.env.NODE_ENV === 'production') {
      token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET,
        cookieName: '__Secure-next-auth.session-token',
        secureCookie: true
      })
    }
    
    // Development fallback
    if (!token && process.env.NODE_ENV !== 'production') {
      token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET,
        secureCookie: false
      })
    }
    
    console.log('🔐 LOGIN PORTAL TOKEN CHECK COMPREHENSIVE:', {
      pathname: url.pathname,
      hasToken: !!token,
      tokenTenantSubdomain: token?.tenant_subdomain,
      tokenEmail: token?.email,
      cookies: request.headers.get('cookie')?.includes('next-auth') ? 'HAS_COOKIES' : 'NO_COOKIES',
      userAgent: request.headers.get('user-agent')?.substring(0, 50),
      timestamp: new Date().toISOString()
    })
    
    // Check if user needs to complete registration
    if (token && token.registration_required) {
      console.log('🚧 REDIRECTING USER TO COMPLETE REGISTRATION:', {
        email: token.email,
        role: token.role,
        timestamp: new Date().toISOString()
      })
      
      const baseUrl = getBaseUrl(hostname)
      const registrationUrl = `${baseUrl}/register?email=${encodeURIComponent(token.email)}`
      return NextResponse.redirect(registrationUrl)
    }
    
    // If user is authenticated, redirect to their tenant dashboard based on business type
    if (token?.tenant_subdomain) {
      const cleanTenant = cleanTenantSubdomain(token.tenant_subdomain.toString())
      const baseUrl = getBaseUrl(hostname)
      
      // EMERGENCY FIX: Determine the business type route with EGDC-specific defaults
      // For EGDC tenant, always default to retailer to prevent redirect loops
      const businessType = cleanTenant === 'egdc' ? 'retailer' : (token.business_type || 'retailer')
      const businessRoute = businessType === 'supplier' ? 's' : 'r'
      const tenantUrl = `${baseUrl}/${cleanTenant}/${businessRoute}/dashboard`
      
      console.log('✅ REDIRECTING AUTHENTICATED USER TO TENANT:', {
        email: token.email,
        tenant_path: token.tenant_subdomain, // Used as path in path-based architecture
        cleanTenant,
        businessType,
        businessRoute,
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
  if (isAppDomainAccess && tenant && tenantValidation.isValid) {
    console.log('🏢 Tenant path accessed:', tenant, 'Config:', tenantValidation.config ? { id: tenantValidation.config.id, name: tenantValidation.config.name } : 'legacy')
    
    // CRITICAL: Use environment-specific cookie handling
    // Try both secure and non-secure cookie names for better compatibility
    let token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: 'next-auth.session-token',
      secureCookie: process.env.NODE_ENV === 'production'
    })
    
    // Fallback: try with __Secure- prefix for production environments  
    if (!token && process.env.NODE_ENV === 'production') {
      token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET,
        cookieName: '__Secure-next-auth.session-token',
        secureCookie: true
      })
    }
    
    // Development fallback: try without security restrictions
    if (!token && process.env.NODE_ENV !== 'production') {
      token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET,
        secureCookie: false
      })
    }
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
      const baseUrl = getBaseUrl(hostname)
      const loginUrl = new URL(`${baseUrl}/login`)
      
      // Set callbackUrl based on business type route
      if (hasBusinessTypeRoute) {
        const businessRoute = isSupplierRoute ? 's' : 'r'
        loginUrl.searchParams.set('callbackUrl', `${baseUrl}/${tenant}/${businessRoute}/dashboard`)
      } else {
        // Default fallback - let auth config handle routing
        loginUrl.searchParams.set('callbackUrl', `${baseUrl}/${tenant}/dashboard`)
      }
      
      return NextResponse.redirect(loginUrl)
    }
    
    // Dashboard is the main interface now - no redirects needed
    
    // If authenticated, allow access with tenant context
    const response = NextResponse.next()
    response.headers.set('x-tenant-path', tenant)
    
    // Use database config when available, fallback to legacy config
    const tenantId = tenantValidation.config?.id || 
                     (TENANT_CONFIG[tenant as keyof typeof TENANT_CONFIG]?.tenant_id) || 
                     'unknown'
    response.headers.set('x-tenant-id', tenantId)
    
    console.log('✅ Tenant access granted:', tenant, 'with ID:', tenantId)
    return addSecurityHeaders(response)
  }
  
  // MAIN DOMAIN: lospapatos.com (Shopify store)
  if (hostname === 'lospapatos.com' || (!isAppDomainAccess && hostname.includes('lospapatos.com'))) {
    console.log('🏪 Main domain or unknown domain accessed')
    // Redirect to the login portal on app domain
    const baseUrl = getBaseUrl(hostname)
    return NextResponse.redirect(`${baseUrl}/login`)
  }
  
  // GENERIC DASHBOARD: app.lospapatos.com/dashboard (OAuth callback redirect)
  // Check authentication and redirect directly to tenant dashboard to avoid redirect loops
  if (isAppDomainAccess && url.pathname === '/dashboard') {
    console.log('🎯 Generic dashboard accessed - checking auth and redirecting to tenant')
    
    // ENHANCED ANTI-LOOP PROTECTION: Check for redirect loops via multiple methods
    const referer = request.headers.get('referer')
    const redirectCount = parseInt(request.headers.get('x-redirect-count') || '0', 10)
    const userAgent = request.headers.get('user-agent') || ''
    
    // Check for circular redirects
    const dashboardPattern = /\/dashboard(\?|$)/
    const tenantDashboardPattern = /\/[a-zA-Z0-9\-_]+\/dashboard(\?|$)/
    
    if (redirectCount > 3) {
      console.error('🚫 REDIRECT LOOP DETECTED - Breaking cycle', {
        redirectCount,
        referer,
        pathname: url.pathname,
        userAgent: userAgent.substring(0, 50)
      })
      const baseUrl = getBaseUrl(hostname)
      return NextResponse.redirect(`${baseUrl}/login?error=redirect_loop`)
    }
    
    // Additional protection: if referer is also a dashboard route, be more careful
    if (referer && (dashboardPattern.test(referer) || tenantDashboardPattern.test(referer))) {
      console.warn('⚠️ Dashboard-to-dashboard redirect detected', {
        referer,
        currentPath: url.pathname,
        redirectCount
      })
      
      // If we've seen this pattern multiple times, break the loop
      if (redirectCount > 1) {
        console.error('🚫 Breaking dashboard redirect cycle')
        const baseUrl = getBaseUrl(hostname)
        return NextResponse.redirect(`${baseUrl}/login?error=dashboard_loop`)
      }
    }
    
    // Try to get token to determine if user is authenticated
    let token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: 'next-auth.session-token',
      secureCookie: process.env.NODE_ENV === 'production'
    })
    
    // Fallback for production environments with secure cookies
    if (!token && process.env.NODE_ENV === 'production') {
      token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET,
        cookieName: '__Secure-next-auth.session-token',
        secureCookie: true
      })
    }
    
    // Development fallback
    if (!token && process.env.NODE_ENV !== 'production') {
      token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET,
        secureCookie: false
      })
    }
    
    console.log('🔐 GENERIC DASHBOARD TOKEN CHECK:', {
      hasToken: !!token,
      tokenTenantSubdomain: token?.tenant_subdomain,
      tokenEmail: token?.email,
      registrationRequired: token?.registration_required,
      referer,
      redirectCount
    })
    
    // Check if user needs to complete registration first
    if (token && token.registration_required) {
      console.log('🚧 REDIRECTING FROM GENERIC DASHBOARD TO REGISTRATION:', {
        email: token.email,
        timestamp: new Date().toISOString()
      })
      
      const baseUrl = getBaseUrl(hostname)
      const registrationUrl = `${baseUrl}/register?email=${encodeURIComponent(token.email)}`
      return NextResponse.redirect(registrationUrl)
    }
    
    // If user has token with tenant info, redirect immediately to avoid loops
    if (token?.tenant_subdomain) {
      const cleanTenant = cleanTenantSubdomain(token.tenant_subdomain.toString())
      const baseUrl = getBaseUrl(hostname)
      
      // EMERGENCY FIX: Determine the business type route with EGDC-specific defaults
      // For EGDC tenant, always default to retailer to prevent redirect loops
      const businessType = cleanTenant === 'egdc' ? 'retailer' : (token.business_type || 'retailer')
      const businessRoute = businessType === 'supplier' ? 's' : 'r'
      const tenantUrl = `${baseUrl}/${cleanTenant}/${businessRoute}/dashboard`
      
      // ANTI-LOOP: Ensure we're not redirecting to the same URL that referred us
      if (referer && (referer.includes(`/${cleanTenant}/s/dashboard`) || referer.includes(`/${cleanTenant}/r/dashboard`))) {
        console.warn('⚠️ Potential loop detected - allowing dashboard component to handle routing')
        return NextResponse.next()
      }
      
      console.log('✅ REDIRECTING FROM GENERIC DASHBOARD TO TENANT:', {
        email: token.email,
        tenant_path: token.tenant_subdomain,
        cleanTenant,
        businessType,
        businessRoute,
        redirectUrl: tenantUrl,
        redirectCount: redirectCount + 1
      })
      
      const response = NextResponse.redirect(tenantUrl)
      response.headers.set('x-redirect-count', String(redirectCount + 1))
      response.headers.set('x-redirect-source', 'generic-dashboard')
      response.headers.set('x-redirect-target', cleanTenant)
      return response
    }
    
    // If no token or tenant info, redirect to login
    console.log('❌ No authentication or tenant info - redirecting to login')
    const baseUrl = getBaseUrl(hostname)
    return NextResponse.redirect(`${baseUrl}/login`)
  }
  
  // FALLBACK: Unknown path or invalid access
  console.log('❓ Unknown access pattern:', { hostname, tenant, pathname: url.pathname })
  
  // For app domain without valid tenant path, redirect to login
  if (isAppDomainAccess && !tenant) {
    console.log('🔄 App domain without tenant - redirecting to login')
    const baseUrl = getBaseUrl(hostname)
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
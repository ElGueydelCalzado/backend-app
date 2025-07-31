/**
 * Authentication Flow Debug Utility
 * Helps diagnose redirect loops and authentication issues
 */

interface AuthDebugInfo {
  timestamp: string
  environment: {
    NODE_ENV: string
    VERCEL_ENV?: string
    hostname: string
    port: string
    pathname: string
  }
  session: {
    hasSession: boolean
    email?: string
    tenantSubdomain?: string
    tenantId?: string
  }
  urls: {
    NEXTAUTH_URL?: string
    NEXT_PUBLIC_APP_URL?: string
    currentUrl: string
    referer?: string
  }
  cookies: {
    sessionTokenPresent: boolean
    cookieNames: string[]
  }
}

export function debugAuthenticationFlow(
  session: any,
  request?: any,
  additionalInfo?: Record<string, any>
): AuthDebugInfo {
  const hostname = typeof window !== 'undefined' 
    ? window.location.hostname 
    : request?.headers?.get('host') || 'unknown'
    
  const port = typeof window !== 'undefined'
    ? window.location.port
    : hostname.includes(':') ? hostname.split(':')[1] : '80'
    
  const pathname = typeof window !== 'undefined'
    ? window.location.pathname
    : request?.nextUrl?.pathname || 'unknown'
    
  const currentUrl = typeof window !== 'undefined'
    ? window.location.href
    : `${request?.nextUrl?.protocol}//${request?.nextUrl?.host}${pathname}`
    
  const referer = typeof window !== 'undefined'
    ? document.referrer
    : request?.headers?.get('referer')

  const cookieHeader = typeof window !== 'undefined'
    ? document.cookie
    : request?.headers?.get('cookie') || ''
    
  const cookieNames = cookieHeader
    ? cookieHeader.split(';').map(c => c.split('=')[0].trim())
    : []

  const debugInfo: AuthDebugInfo = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'unknown',
      VERCEL_ENV: process.env.VERCEL_ENV,
      hostname,
      port,
      pathname
    },
    session: {
      hasSession: !!session,
      email: session?.user?.email,
      tenantSubdomain: session?.user?.tenant_subdomain,
      tenantId: session?.user?.tenant_id
    },
    urls: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      currentUrl,
      referer
    },
    cookies: {
      sessionTokenPresent: cookieNames.some(name => 
        name.includes('next-auth') && name.includes('session-token')
      ),
      cookieNames
    }
  }

  console.log('🔍 AUTH FLOW DEBUG:', {
    ...debugInfo,
    additionalInfo
  })

  return debugInfo
}

export function detectRedirectLoop(
  currentPath: string,
  referer?: string,
  maxRedirects: number = 5
): boolean {
  if (!referer) return false

  try {
    const refererUrl = new URL(referer)
    const currentUrl = new URL(currentPath, referer)
    
    // Check if we're bouncing between the same paths
    const isLooping = refererUrl.pathname === currentUrl.pathname ||
      (refererUrl.pathname.includes('/dashboard') && currentUrl.pathname.includes('/dashboard'))

    console.log('🔄 REDIRECT LOOP CHECK:', {
      currentPath,
      referer,
      refererPath: refererUrl.pathname,
      currentPathname: currentUrl.pathname,
      isLooping
    })

    return isLooping
  } catch (error) {
    console.error('❌ Error detecting redirect loop:', error)
    return false
  }
}

export function logRedirectLoop(
  source: string,
  destination: string,
  debugInfo: AuthDebugInfo
): void {
  console.error(`
🚨 REDIRECT LOOP DETECTED 🚨

Source: ${source}
Destination: ${destination}
Timestamp: ${debugInfo.timestamp}

Environment:
- NODE_ENV: ${debugInfo.environment.NODE_ENV}
- Hostname: ${debugInfo.environment.hostname}:${debugInfo.environment.port}
- Current Path: ${debugInfo.environment.pathname}

URLs:
- NEXTAUTH_URL: ${debugInfo.urls.NEXTAUTH_URL}
- NEXT_PUBLIC_APP_URL: ${debugInfo.urls.NEXT_PUBLIC_APP_URL}
- Current URL: ${debugInfo.urls.currentUrl}
- Referer: ${debugInfo.urls.referer}

Session:
- Has Session: ${debugInfo.session.hasSession}
- Email: ${debugInfo.session.email}
- Tenant: ${debugInfo.session.tenantSubdomain}

Cookies:
- Session Token Present: ${debugInfo.cookies.sessionTokenPresent}
- Cookie Count: ${debugInfo.cookies.cookieNames.length}

TROUBLESHOOTING TIPS:
1. Check NEXTAUTH_URL matches the running port
2. Verify session cookies are accessible across the same domain/port
3. Ensure middleware and dashboard components use consistent base URLs
4. Check for conflicting redirects in auth callbacks
  `)
}
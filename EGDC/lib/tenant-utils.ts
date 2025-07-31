/**
 * Centralized Tenant Subdomain Handling Utility
 * Ensures consistent tenant path/subdomain processing across the application
 */

// Legacy tenant configuration mapping (for backward compatibility and fallback)
// NOTE: These tenant_ids should be actual UUIDs from the database when available
export const TENANT_CONFIG = {
  'egdc': {
    tenant_id: 'e6c8ef7d-f8cf-4670-8166-583011284588', // Valid UUID from database
    name: 'EGDC',
    allowed_users: ['elweydelcalzado@gmail.com']
  },
  'elweydelcalzado': {
    tenant_id: '550e8400-e29b-41d4-a716-446655440001', // Valid UUID placeholder - should be replaced with actual DB UUID
    name: 'El Guey del Calzado',
    allowed_users: ['elweydelcalzado@gmail.com']
  },
  'fami': {
    tenant_id: '550e8400-e29b-41d4-a716-446655440002', // Valid UUID placeholder - should be replaced with actual DB UUID
    name: 'FAMI',
    allowed_users: ['fami@example.com']
  },
  'osiel': {
    tenant_id: '550e8400-e29b-41d4-a716-446655440003', // Valid UUID placeholder - should be replaced with actual DB UUID
    name: 'Osiel',
    allowed_users: ['osiel@example.com']
  },
  'molly': {
    tenant_id: '550e8400-e29b-41d4-a716-446655440004', // Valid UUID placeholder - should be replaced with actual DB UUID
    name: 'Molly', 
    allowed_users: ['molly@example.com']
  }
} as const

export type TenantKey = keyof typeof TENANT_CONFIG

// In-memory cache for tenant validation (Edge Runtime compatible)
const tenantValidationCache = new Map<string, { isValid: boolean, config: any, timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * EDGE RUNTIME COMPATIBLE: Tenant validation using fetch to API route
 * Supports both original subdomains and custom subdomains
 * @param tenant - Tenant subdomain to validate  
 * @returns Promise<boolean> indicating if tenant exists in database
 */
export async function isValidTenantFromDatabase(tenant: string): Promise<{ isValid: boolean, config?: any }> {
  if (!tenant || typeof tenant !== 'string') {
    return { isValid: false }
  }

  const cleanTenant = cleanTenantSubdomain(tenant)
  
  // Check cache first
  const cached = tenantValidationCache.get(cleanTenant)
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log('🔍 Using cached tenant validation result:', { tenant: cleanTenant, isValid: cached.isValid })
    return { isValid: cached.isValid, config: cached.config }
  }

  // For Edge Runtime compatibility, check hardcoded tenants first
  const legacyValid = cleanTenant in TENANT_CONFIG
  if (legacyValid) {
    const config = TENANT_CONFIG[cleanTenant as TenantKey]
    const result = { isValid: true, config }
    
    // Cache the result
    tenantValidationCache.set(cleanTenant, {
      isValid: true,
      config,
      timestamp: Date.now()
    })
    
    console.log('✅ Valid legacy tenant found:', { tenant: cleanTenant, config: { tenant_id: config.tenant_id, name: config.name } })
    return result
  }

  try {
    // Try API route for database validation (Edge Runtime compatible)
    // This now checks both subdomain and custom_subdomain fields
    const baseUrl = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000')
    const response = await fetch(`${baseUrl}/api/tenants/validate?subdomain=${encodeURIComponent(cleanTenant)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (response.ok) {
      const data = await response.json()
      const result = { isValid: data.valid, config: data.tenant }
      
      // Cache the result
      tenantValidationCache.set(cleanTenant, {
        isValid: data.valid,
        config: data.tenant,
        timestamp: Date.now()
      })
      
      console.log(data.valid ? '✅ Valid tenant found via API:' : '❌ Tenant not found via API:', {
        tenant: cleanTenant,
        isValid: data.valid,
        hasCustomSubdomain: data.tenant?.custom_subdomain ? true : false
      })
      
      return result
    } else {
      console.warn('⚠️ Tenant validation API error:', response.status, response.statusText)
    }
    
  } catch (error) {
    console.error('❌ Tenant validation API error:', error.message)
  }
  
  // Final fallback - assume invalid
  console.log('❌ Tenant validation failed - not found:', cleanTenant)
  return { isValid: false }
}

/**
 * Clean tenant subdomain by removing common prefixes and suffixes
 * @param subdomain - Raw subdomain string
 * @returns Cleaned subdomain
 */
export function cleanTenantSubdomain(subdomain: string): string {
  if (!subdomain || typeof subdomain !== 'string') {
    return subdomain
  }
  
  return subdomain
    .toLowerCase()
    .trim()
    .replace(/^preview-/, '')
    .replace(/^mock-/, '')
    .replace(/^test-/, '')
    .replace(/-preview$/, '')
    .replace(/-mock$/, '')
    .replace(/-test$/, '')
}

/**
 * Extract tenant from URL pathname
 * @param pathname - URL pathname (e.g., '/egdc/dashboard')
 * @returns Tenant key or null if invalid
 */
export function extractTenantFromPath(pathname: string): TenantKey | null {
  if (!pathname || typeof pathname !== 'string') {
    return null
  }
  
  console.log('🔍 extractTenantFromPath called with:', {
    pathname,
    pathParts: pathname.split('/').filter(Boolean)
  })
  
  const pathParts = pathname.split('/').filter(Boolean)
  
  if (pathParts.length > 0) {
    const tenantCandidate = cleanTenantSubdomain(pathParts[0])
    
    if (isValidTenant(tenantCandidate)) {
      console.log('✅ Valid tenant extracted from path:', {
        tenant: tenantCandidate,
        fromPath: pathname,
        cleanedFrom: pathParts[0]
      })
      return tenantCandidate as TenantKey
    }
  }
  
  console.log('❌ No valid tenant found in path:', pathname)
  return null
}

/**
 * Check if a string is a valid tenant key
 * @param tenant - Tenant string to validate
 * @returns Boolean indicating validity
 */
export function isValidTenant(tenant: string): tenant is TenantKey {
  if (!tenant || typeof tenant !== 'string') {
    return false
  }
  
  const cleanTenant = cleanTenantSubdomain(tenant)
  return cleanTenant in TENANT_CONFIG
}

/**
 * Get tenant configuration by tenant key
 * @param tenant - Tenant key
 * @returns Tenant configuration or null if invalid
 */
export function getTenantConfig(tenant: string) {
  const cleanTenant = cleanTenantSubdomain(tenant)
  
  if (isValidTenant(cleanTenant)) {
    return TENANT_CONFIG[cleanTenant]
  }
  
  return null
}

/**
 * Build environment-aware base URL
 * @param hostname - Current hostname (optional, uses window.location if available)
 * @returns Base URL for the current environment
 */
export function getBaseUrl(hostname?: string): string {
  // Server-side environment detection
  if (typeof window === 'undefined') {
    if (process.env.NODE_ENV === 'production') {
      return 'https://app.lospapatos.com'
    }
    
    // Use provided hostname or fallback to localhost:3000 (matching NEXTAUTH_URL)
    const host = hostname || 'localhost:3000'
    return `http://${host}`
  }
  
  // Client-side environment detection
  if (window.location.hostname === 'app.lospapatos.com') {
    return 'https://app.lospapatos.com'
  }
  
  // Development/local environment
  return `${window.location.protocol}//${window.location.host}`
}

/**
 * Build tenant-specific URL
 * @param tenant - Tenant key or subdomain
 * @param path - Path within tenant (default: '/dashboard')
 * @param hostname - Current hostname (optional)
 * @returns Complete tenant URL
 */
export function buildTenantUrl(tenant: string, path: string = '/dashboard', hostname?: string): string {
  const cleanTenant = cleanTenantSubdomain(tenant)
  const baseUrl = getBaseUrl(hostname)
  
  return `${baseUrl}/${cleanTenant}${path.startsWith('/') ? path : '/' + path}`
}

/**
 * Check if hostname is the app domain
 * @param hostname - Hostname to check
 * @returns Boolean indicating if it's the app domain
 */
export function isAppDomain(hostname: string): boolean {
  if (!hostname || typeof hostname !== 'string') {
    return false
  }
  
  const cleanHostname = hostname.trim().toLowerCase()
  
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

/**
 * Validate tenant user access
 * @param tenant - Tenant key
 * @param userEmail - User email to check
 * @returns Boolean indicating if user has access to tenant
 */
export function validateTenantUserAccess(tenant: string, userEmail: string): boolean {
  const config = getTenantConfig(tenant)
  
  if (!config || !userEmail) {
    return false
  }
  
  // For now, we'll allow access to all registered users
  // In the future, this could be more restrictive based on allowed_users
  return true
}
/**
 * DEVELOPMENT UTILITIES
 * Centralized development mode handling with security safeguards
 */

interface DevConfig {
  isDevelopment: boolean
  isPreview: boolean
  allowTestMode: boolean
  testModeEnabled: boolean
}

/**
 * Get development configuration with security checks
 * @returns Development configuration object
 */
export function getDevelopmentConfig(): DevConfig {
  const nodeEnv = process.env.NODE_ENV || 'production'
  const vercelEnv = process.env.VERCEL_ENV
  
  const isDevelopment = nodeEnv === 'development'
  const isPreview = vercelEnv === 'preview'
  
  // SECURITY: Only allow test mode in explicit development environments
  // Never allow in production, even if flags are set
  const allowTestMode = isDevelopment && (
    // Must be localhost or explicit development domain
    (typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    )) || 
    // Server-side development check
    (typeof window === 'undefined' && isDevelopment)
  )
  
  // SECURITY: Test mode requires explicit opt-in AND development environment
  const testModeEnabled = allowTestMode && (
    process.env.NEXT_PUBLIC_DEV_MODE === 'true' ||
    (typeof window !== 'undefined' && window.location.search.includes('dev_mode=true'))
  )
  
  // Log development mode status for debugging
  if (isDevelopment || isPreview) {
    console.log('🔧 Development Configuration:', {
      nodeEnv,
      vercelEnv,
      isDevelopment,
      isPreview,
      allowTestMode,
      testModeEnabled,
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'server-side'
    })
  }
  
  return {
    isDevelopment,
    isPreview,
    allowTestMode,
    testModeEnabled
  }
}

/**
 * Check if development/test features should be available
 * @returns Boolean indicating if dev features are allowed
 */
export function isDevModeAllowed(): boolean {
  const config = getDevelopmentConfig()
  return config.testModeEnabled
}

/**
 * Get test tenant for development mode
 * @returns Test tenant configuration or null if not in dev mode
 */
export function getTestTenantConfig() {
  if (!isDevModeAllowed()) {
    return null
  }
  
  return {
    tenant_id: 'e6c8ef7d-f8cf-4670-8166-583011284588',
    tenant_subdomain: 'egdc',
    tenant_name: 'EGDC Test',
    user: {
      id: 'dev-user',
      name: 'Development User',
      email: 'dev@test.local',
      role: 'admin'
    }
  }
}

/**
 * Log security warning about development mode usage
 */
export function logDevModeWarning(): void {
  if (isDevModeAllowed()) {
    console.warn(`
    ⚠️  DEVELOPMENT MODE ACTIVE ⚠️
    
    This mode bypasses certain security checks and should
    NEVER be used in production environments.
    
    To disable: Remove NEXT_PUBLIC_DEV_MODE=true or dev_mode=true
    `)
  }
}
/**
 * Tenant Utilities Unit Tests
 * Tests tenant extraction, validation, and URL generation
 */

import {
  extractTenantFromPath,
  isValidTenant,
  cleanTenantSubdomain,
  getTenantConfig,
  getBaseUrl,
  buildTenantUrl,
  isAppDomain,
  validateTenantUserAccess,
  TENANT_CONFIG
} from '../../lib/tenant-utils'

describe('Tenant Utilities', () => {
  
  describe('cleanTenantSubdomain', () => {
    it('should remove preview prefixes', () => {
      expect(cleanTenantSubdomain('preview-egdc')).toBe('egdc')
      expect(cleanTenantSubdomain('mock-fami')).toBe('fami')
      expect(cleanTenantSubdomain('test-osiel')).toBe('osiel')
    })
    
    it('should remove preview suffixes', () => {
      expect(cleanTenantSubdomain('egdc-preview')).toBe('egdc')
      expect(cleanTenantSubdomain('fami-mock')).toBe('fami')
      expect(cleanTenantSubdomain('molly-test')).toBe('molly')
    })
    
    it('should handle mixed case and whitespace', () => {
      expect(cleanTenantSubdomain(' EGDC ')).toBe('egdc')
      expect(cleanTenantSubdomain('Preview-FAMI')).toBe('fami')
    })
    
    it('should return original if no cleaning needed', () => {
      expect(cleanTenantSubdomain('egdc')).toBe('egdc')
      expect(cleanTenantSubdomain('fami')).toBe('fami')
    })
    
    it('should handle invalid input gracefully', () => {
      expect(cleanTenantSubdomain('')).toBe('')
      expect(cleanTenantSubdomain(null as any)).toBe(null)
      expect(cleanTenantSubdomain(undefined as any)).toBe(undefined)
    })
  })

  describe('extractTenantFromPath', () => {
    it('should extract valid tenant from path', () => {
      expect(extractTenantFromPath('/egdc/dashboard')).toBe('egdc')
      expect(extractTenantFromPath('/fami/inventory')).toBe('fami')
      expect(extractTenantFromPath('/osiel/settings')).toBe('osiel')
      expect(extractTenantFromPath('/molly/dashboard')).toBe('molly')
    })
    
    it('should handle paths with query parameters', () => {
      expect(extractTenantFromPath('/egdc/dashboard?tab=inventory')).toBe('egdc')
      expect(extractTenantFromPath('/fami/settings#profile')).toBe('fami')
    })
    
    it('should handle preview tenant paths', () => {
      expect(extractTenantFromPath('/preview-egdc/dashboard')).toBe('egdc')
      expect(extractTenantFromPath('/test-fami/inventory')).toBe('fami')
    })
    
    it('should return null for invalid tenant paths', () => {
      expect(extractTenantFromPath('/invalid/dashboard')).toBe(null)
      expect(extractTenantFromPath('/unknown/settings')).toBe(null)
    })
    
    it('should return null for non-tenant paths', () => {
      expect(extractTenantFromPath('/dashboard')).toBe(null)
      expect(extractTenantFromPath('/login')).toBe(null)
      expect(extractTenantFromPath('/api/auth/signin')).toBe(null)
    })
    
    it('should handle invalid input gracefully', () => {
      expect(extractTenantFromPath('')).toBe(null)
      expect(extractTenantFromPath(null as any)).toBe(null)
      expect(extractTenantFromPath(undefined as any)).toBe(null)
    })
  })

  describe('isValidTenant', () => {
    it('should validate existing tenants', () => {
      expect(isValidTenant('egdc')).toBe(true)
      expect(isValidTenant('fami')).toBe(true)
      expect(isValidTenant('osiel')).toBe(true)
      expect(isValidTenant('molly')).toBe(true)
    })
    
    it('should validate tenants with prefixes/suffixes', () => {
      expect(isValidTenant('preview-egdc')).toBe(true)
      expect(isValidTenant('test-fami')).toBe(true)
      expect(isValidTenant('egdc-preview')).toBe(true)
    })
    
    it('should reject invalid tenants', () => {
      expect(isValidTenant('invalid')).toBe(false)
      expect(isValidTenant('unknown')).toBe(false)
      expect(isValidTenant('test')).toBe(false)
    })
    
    it('should handle invalid input gracefully', () => {
      expect(isValidTenant('')).toBe(false)
      expect(isValidTenant(null as any)).toBe(false)
      expect(isValidTenant(undefined as any)).toBe(false)
    })
  })

  describe('getTenantConfig', () => {
    it('should return config for valid tenants', () => {
      const egdcConfig = getTenantConfig('egdc')
      expect(egdcConfig).toBeDefined()
      expect(egdcConfig?.name).toBe('EGDC')
      expect(egdcConfig?.tenant_id).toBeDefined()
      
      const famiConfig = getTenantConfig('fami')
      expect(famiConfig).toBeDefined()
      expect(famiConfig?.name).toBe('FAMI')
    })
    
    it('should handle tenant name cleaning', () => {
      const config = getTenantConfig('preview-egdc')
      expect(config?.name).toBe('EGDC')
    })
    
    it('should return null for invalid tenants', () => {
      expect(getTenantConfig('invalid')).toBe(null)
      expect(getTenantConfig('unknown')).toBe(null)
    })
  })

  describe('getBaseUrl', () => {
    const originalWindow = global.window
    const originalEnv = process.env.NODE_ENV
    
    afterEach(() => {
      global.window = originalWindow
      process.env.NODE_ENV = originalEnv
    })
    
    it('should return production URL in production', () => {
      // Mock server-side environment
      delete (global as any).window
      process.env.NODE_ENV = 'production'
      
      const url = getBaseUrl()
      expect(url).toBe('https://app.lospapatos.com')
    })
    
    it('should return localhost URL in development', () => {
      // Mock server-side environment
      delete (global as any).window
      process.env.NODE_ENV = 'development'
      
      const url = getBaseUrl('localhost:3001')
      expect(url).toBe('http://localhost:3001')
    })
    
    it('should handle custom hostname', () => {
      delete (global as any).window
      process.env.NODE_ENV = 'development'
      
      const url = getBaseUrl('127.0.0.1:3000')
      expect(url).toBe('http://127.0.0.1:3000')
    })
    
    it('should work on client-side with production hostname', () => {
      global.window = {
        location: {
          hostname: 'app.lospapatos.com',
          protocol: 'https:',
          host: 'app.lospapatos.com'
        }
      } as any
      
      const url = getBaseUrl()
      expect(url).toBe('https://app.lospapatos.com')
    })
    
    it('should work on client-side with local hostname', () => {
      global.window = {
        location: {
          hostname: 'localhost',
          protocol: 'http:',
          host: 'localhost:3001'
        }
      } as any
      
      const url = getBaseUrl()
      expect(url).toBe('http://localhost:3001')
    })
  })

  describe('buildTenantUrl', () => {
    const originalEnv = process.env.NODE_ENV
    
    afterEach(() => {
      process.env.NODE_ENV = originalEnv
    })
    
    it('should build tenant URLs with default path', () => {
      delete (global as any).window
      process.env.NODE_ENV = 'development'
      
      const url = buildTenantUrl('egdc', undefined, 'localhost:3001')
      expect(url).toBe('http://localhost:3001/egdc/dashboard')
    })
    
    it('should build tenant URLs with custom path', () => {
      delete (global as any).window
      process.env.NODE_ENV = 'development'
      
      const url = buildTenantUrl('fami', '/inventory', 'localhost:3001')
      expect(url).toBe('http://localhost:3001/fami/inventory')
    })
    
    it('should handle paths without leading slash', () => {
      delete (global as any).window
      process.env.NODE_ENV = 'development'
      
      const url = buildTenantUrl('osiel', 'settings', 'localhost:3001')
      expect(url).toBe('http://localhost:3001/osiel/settings')
    })
    
    it('should clean tenant subdomains', () => {
      delete (global as any).window
      process.env.NODE_ENV = 'development'
      
      const url = buildTenantUrl('preview-molly', '/dashboard', 'localhost:3001')
      expect(url).toBe('http://localhost:3001/molly/dashboard')
    })
  })

  describe('isAppDomain', () => {
    it('should identify production app domain', () => {
      expect(isAppDomain('app.lospapatos.com')).toBe(true)
    })
    
    it('should identify localhost domains', () => {
      expect(isAppDomain('localhost:3001')).toBe(true)
      expect(isAppDomain('localhost:3000')).toBe(true)
      expect(isAppDomain('localhost')).toBe(true)
    })
    
    it('should identify 127.0.0.1 domains', () => {
      expect(isAppDomain('127.0.0.1:3001')).toBe(true)
      expect(isAppDomain('127.0.0.1')).toBe(true)
    })
    
    it('should reject non-app domains', () => {
      expect(isAppDomain('lospapatos.com')).toBe(false)
      expect(isAppDomain('malicious.com')).toBe(false)
      expect(isAppDomain('example.com')).toBe(false)
    })
    
    it('should handle case insensitivity', () => {
      expect(isAppDomain('APP.LOSPAPATOS.COM')).toBe(true)
      expect(isAppDomain('LOCALHOST:3001')).toBe(true)
    })
    
    it('should handle invalid input gracefully', () => {
      expect(isAppDomain('')).toBe(false)
      expect(isAppDomain(null as any)).toBe(false)
      expect(isAppDomain(undefined as any)).toBe(false)
    })
  })

  describe('validateTenantUserAccess', () => {
    it('should allow access for valid tenant and user', () => {
      expect(validateTenantUserAccess('egdc', 'test@example.com')).toBe(true)
      expect(validateTenantUserAccess('fami', 'user@example.com')).toBe(true)
    })
    
    it('should reject access for invalid tenant', () => {
      expect(validateTenantUserAccess('invalid', 'test@example.com')).toBe(false)
    })
    
    it('should reject access without user email', () => {
      expect(validateTenantUserAccess('egdc', '')).toBe(false)
      expect(validateTenantUserAccess('egdc', null as any)).toBe(false)
    })
    
    it('should handle edge cases gracefully', () => {
      expect(validateTenantUserAccess('', 'test@example.com')).toBe(false)
      expect(validateTenantUserAccess(null as any, 'test@example.com')).toBe(false)
    })
  })

  describe('TENANT_CONFIG', () => {
    it('should contain expected tenant configurations', () => {
      expect(TENANT_CONFIG).toBeDefined()
      expect(TENANT_CONFIG.egdc).toBeDefined()
      expect(TENANT_CONFIG.fami).toBeDefined()
      expect(TENANT_CONFIG.osiel).toBeDefined()
      expect(TENANT_CONFIG.molly).toBeDefined()
    })
    
    it('should have proper structure for each tenant', () => {
      Object.values(TENANT_CONFIG).forEach(config => {
        expect(config.tenant_id).toBeDefined()
        expect(config.name).toBeDefined()
        expect(config.allowed_users).toBeDefined()
        expect(Array.isArray(config.allowed_users)).toBe(true)
      })
    })
    
    it('should have unique tenant IDs', () => {
      const tenantIds = Object.values(TENANT_CONFIG).map(config => config.tenant_id)
      const uniqueIds = new Set(tenantIds)
      expect(uniqueIds.size).toBe(tenantIds.length)
    })
  })
})
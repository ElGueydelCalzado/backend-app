/**
 * Middleware Security Tests
 * Tests authentication enforcement, tenant isolation, and security headers
 */

import { NextRequest, NextResponse } from 'next/server'
import middleware from '../../middleware'
import { createMockRequest } from '../utils/auth-test-helpers'

// Mock dependencies
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn()
}))

jest.mock('../../lib/tenant-utils', () => ({
  extractTenantFromPath: jest.fn(),
  isAppDomain: jest.fn(),
  isValidTenant: jest.fn(),
  getTenantConfig: jest.fn(),
  cleanTenantSubdomain: jest.fn(),
  getBaseUrl: jest.fn(),
  TENANT_CONFIG: {
    egdc: { tenant_id: 'egdc-id', name: 'EGDC' },
    fami: { tenant_id: 'fami-id', name: 'FAMI' }
  }
}))

import { getToken } from 'next-auth/jwt'
import { 
  extractTenantFromPath, 
  isAppDomain, 
  isValidTenant,
  getBaseUrl 
} from '../../lib/tenant-utils'

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>
const mockExtractTenantFromPath = extractTenantFromPath as jest.MockedFunction<typeof extractTenantFromPath>
const mockIsAppDomain = isAppDomain as jest.MockedFunction<typeof isAppDomain>
const mockIsValidTenant = isValidTenant as jest.MockedFunction<typeof isValidTenant>
const mockGetBaseUrl = getBaseUrl as jest.MockedFunction<typeof getBaseUrl>

describe('Middleware Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetBaseUrl.mockReturnValue('http://localhost:3001')
  })

  describe('Authentication Enforcement', () => {
    it('should redirect unauthenticated users to login', async () => {
      // Mock no authentication token
      mockGetToken.mockResolvedValue(null)
      mockIsAppDomain.mockReturnValue(true)
      mockExtractTenantFromPath.mockReturnValue('egdc')
      mockIsValidTenant.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3001/egdc/dashboard')
      const response = await middleware(request)

      expect(response?.status).toBe(307) // Redirect status
      expect(response?.headers.get('location')).toContain('/login')
    })

    it('should allow authenticated users to access tenant pages', async () => {
      // Mock valid authentication token
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        email: 'test@example.com',
        tenant_subdomain: 'egdc'
      })
      mockIsAppDomain.mockReturnValue(true)
      mockExtractTenantFromPath.mockReturnValue('egdc')
      mockIsValidTenant.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3001/egdc/dashboard')
      const response = await middleware(request)

      expect(response?.status).not.toBe(307)
      expect(response?.headers.get('x-tenant-path')).toBe('egdc')
    })

    it('should redirect authenticated users from login to their tenant', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        email: 'test@example.com',
        tenant_subdomain: 'egdc'
      })
      mockIsAppDomain.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3001/login')
      const response = await middleware(request)

      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toContain('/egdc/dashboard')
    })

    it('should allow access to auth API routes without authentication', async () => {
      mockGetToken.mockResolvedValue(null)
      mockIsAppDomain.mockReturnValue(true)
      mockExtractTenantFromPath.mockReturnValue('egdc')
      mockIsValidTenant.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3001/api/auth/signin')
      const response = await middleware(request)

      // Should not redirect auth API routes
      expect(response?.status).not.toBe(307)
    })
  })

  describe('Tenant Isolation', () => {
    it('should reject access to invalid tenant paths', async () => {
      mockIsAppDomain.mockReturnValue(true)
      mockExtractTenantFromPath.mockReturnValue('invalid')
      mockIsValidTenant.mockReturnValue(false)

      const request = new NextRequest('http://localhost:3001/invalid/dashboard')
      const response = await middleware(request)

      // Should redirect to login for invalid tenant
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toContain('/login')
    })

    it('should set proper tenant context headers', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        email: 'test@example.com',
        tenant_subdomain: 'egdc'
      })
      mockIsAppDomain.mockReturnValue(true)
      mockExtractTenantFromPath.mockReturnValue('egdc')
      mockIsValidTenant.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3001/egdc/dashboard')
      const response = await middleware(request)

      expect(response?.headers.get('x-tenant-path')).toBe('egdc')
      expect(response?.headers.get('x-tenant-id')).toBe('egdc-id')
    })

    it('should handle generic dashboard routing', async () => {
      mockIsAppDomain.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3001/dashboard')
      const response = await middleware(request)

      expect(response?.headers.get('x-dashboard-mode')).toBe('tenant-routing')
    })

    it('should redirect non-app domains to login', async () => {
      mockIsAppDomain.mockReturnValue(false)

      const request = new NextRequest('http://lospapatos.com/some-path')
      const response = await middleware(request)

      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toContain('/login')
    })
  })

  describe('Security Headers', () => {
    it('should add security headers to all responses', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        email: 'test@example.com',
        tenant_subdomain: 'egdc'
      })
      mockIsAppDomain.mockReturnValue(true)
      mockExtractTenantFromPath.mockReturnValue('egdc')
      mockIsValidTenant.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3001/egdc/dashboard')
      const response = await middleware(request)

      // Check for security headers
      expect(response?.headers.get('Strict-Transport-Security')).toBeDefined()
      expect(response?.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response?.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response?.headers.get('X-XSS-Protection')).toBe('1; mode=block')
      expect(response?.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
      expect(response?.headers.get('Content-Security-Policy')).toBeDefined()
      expect(response?.headers.get('Permissions-Policy')).toBeDefined()
    })

    it('should include proper CSP headers', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        email: 'test@example.com',
        tenant_subdomain: 'egdc'
      })
      mockIsAppDomain.mockReturnValue(true)
      mockExtractTenantFromPath.mockReturnValue('egdc')
      mockIsValidTenant.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3001/egdc/dashboard')
      const response = await middleware(request)

      const csp = response?.headers.get('Content-Security-Policy')
      expect(csp).toContain("default-src 'self'")
      expect(csp).toContain("script-src 'self'")
      expect(csp).toContain("style-src 'self'")
    })
  })

  describe('Token Handling', () => {
    it('should try multiple cookie names for token retrieval', async () => {
      // Test different environments with different cookie names
      mockIsAppDomain.mockReturnValue(true)
      mockExtractTenantFromPath.mockReturnValue('egdc')
      mockIsValidTenant.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3001/egdc/dashboard')
      
      // Mock getToken to be called multiple times with different options
      mockGetToken
        .mockResolvedValueOnce(null) // First attempt fails
        .mockResolvedValueOnce(null) // Second attempt fails  
        .mockResolvedValueOnce({     // Third attempt succeeds
          sub: 'user-id',
          email: 'test@example.com',
          tenant_subdomain: 'egdc'
        })

      const response = await middleware(request)

      expect(mockGetToken).toHaveBeenCalledTimes(3)
      expect(response?.headers.get('x-tenant-path')).toBe('egdc')
    })

    it('should handle production cookie names', async () => {
      const originalNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      mockIsAppDomain.mockReturnValue(true)
      mockExtractTenantFromPath.mockReturnValue('egdc')
      mockIsValidTenant.mockReturnValue(true)

      // Mock secure cookie token
      mockGetToken
        .mockResolvedValueOnce(null) // Regular cookie fails
        .mockResolvedValueOnce({     // Secure cookie succeeds
          sub: 'user-id',
          email: 'test@example.com',
          tenant_subdomain: 'egdc'
        })

      const request = new NextRequest('http://localhost:3001/egdc/dashboard')
      const response = await middleware(request)

      expect(mockGetToken).toHaveBeenCalledWith(
        expect.objectContaining({
          cookieName: '__Secure-next-auth.session-token',
          secureCookie: true
        })
      )

      process.env.NODE_ENV = originalNodeEnv
    })
  })

  describe('Error Handling', () => {
    it('should handle getToken errors gracefully', async () => {
      mockGetToken.mockRejectedValue(new Error('Token error'))
      mockIsAppDomain.mockReturnValue(true)
      mockExtractTenantFromPath.mockReturnValue('egdc')
      mockIsValidTenant.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3001/egdc/dashboard')
      const response = await middleware(request)

      // Should still redirect to login on token error
      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toContain('/login')
    })

    it('should handle tenant utility errors gracefully', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        email: 'test@example.com',  
        tenant_subdomain: 'egdc'
      })
      mockIsAppDomain.mockImplementation(() => {
        throw new Error('Domain check error')
      })

      const request = new NextRequest('http://localhost:3001/egdc/dashboard')
      
      // Should not throw, but handle error gracefully
      await expect(middleware(request)).resolves.toBeDefined()
    })
  })

  describe('Path Matching', () => {
    it('should match configured paths only', () => {
      // The middleware config matcher should exclude API routes and static files
      const config = require('../../middleware').config
      
      expect(config.matcher).toEqual([
        '/((?!api|_next/static|_next/image|favicon.ico).*)'
      ])
    })

    it('should not process excluded paths', async () => {
      // API routes should be excluded by the matcher
      const apiRequest = new NextRequest('http://localhost:3001/api/test')
      // This would not actually call the middleware due to the matcher
      // but we can test the pattern
      
      const excluded = [
        '/api/test',
        '/_next/static/css/app.css',
        '/_next/image/logo.png',
        '/favicon.ico'
      ]
      
      excluded.forEach(path => {
        const pattern = /^(?!.*(?:api|_next\/static|_next\/image|favicon\.ico)).*$/
        expect(pattern.test(path)).toBe(false)
      })
    })
  })
})
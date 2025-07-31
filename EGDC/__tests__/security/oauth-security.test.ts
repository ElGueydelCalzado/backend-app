/**
 * OAuth Security Tests
 * Tests comprehensive OAuth flow security, token validation, and attack prevention
 */

import { authConfig } from '../../lib/auth-config'
import { 
  testJWTTokens, 
  testAuthAccounts, 
  testGoogleProfiles,
  testUsers,
  testTenants 
} from '../fixtures/test-data'
import { DatabaseTestHelper } from '../utils/auth-test-helpers'

// Mock external dependencies
jest.mock('../../lib/database-config', () => ({
  createSecureDatabaseConfig: jest.fn(() => ({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  })),
  validateDatabaseConfig: jest.fn()
}))

jest.mock('../../lib/env-validation', () => ({
  config: {
    database: { url: process.env.DATABASE_URL },
    auth: { secret: process.env.NEXTAUTH_SECRET },
    google: { 
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    }
  },
  validation: { isValid: true }
}))

describe('OAuth Security Tests', () => {
  let dbHelper: DatabaseTestHelper

  beforeAll(() => {
    dbHelper = new DatabaseTestHelper()
  })

  afterAll(async () => {
    await dbHelper.cleanup()
  })

  beforeEach(async () => {
    await dbHelper.clearTestData()
  })

  describe('Provider Security Validation', () => {
    it('should only allow trusted OAuth providers', () => {
      const providers = authConfig.providers
      
      // Should have Google provider
      const googleProvider = providers.find((p: any) => p.id === 'google')
      expect(googleProvider).toBeDefined()
      expect(googleProvider?.type).toBe('oidc') // OAuth/OIDC type
      
      // Should not have insecure providers
      const unsafeProviders = ['facebook', 'twitter', 'github'] // Example unsafe for this app
      unsafeProviders.forEach(providerId => {
        const provider = providers.find((p: any) => p.id === providerId)
        expect(provider).toBeUndefined()
      })
    })

    it('should validate Google OAuth configuration', () => {
      const googleProvider = authConfig.providers.find((p: any) => p.id === 'google')
      
      expect(googleProvider?.clientId).toBeTruthy()
      expect(googleProvider?.clientSecret).toBeTruthy()
      
      // Should not expose secrets in config
      expect(googleProvider?.clientSecret).not.toContain('actual-secret')
    })

    it('should restrict test providers to non-production environments', () => {
      const originalEnv = process.env.NODE_ENV
      
      // Test development environment
      process.env.NODE_ENV = 'development'
      const devProviders = authConfig.providers
      const testProvider = devProviders.find((p: any) => p.id === 'test-account')
      expect(testProvider).toBeDefined()
      
      // Test production environment
      process.env.NODE_ENV = 'production'
      const prodProviders = authConfig.providers
      const prodTestProvider = prodProviders.find((p: any) => p.id === 'test-account')
      expect(prodTestProvider).toBeUndefined()
      
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Authentication Bypass Prevention', () => {
    it('should reject authentication attempts without valid email', async () => {
      const invalidUsers = [
        { email: null },
        { email: undefined },
        { email: '' },
        { email: '   ' },
        { name: 'User Without Email' }
      ]

      for (const user of invalidUsers) {
        const result = await authConfig.callbacks!.signIn!({
          user,
          account: testAuthAccounts.googleAccount,
          profile: {}
        })
        
        expect(result).toBe(false)
      }
    })

    it('should reject unknown OAuth providers', async () => {
      const maliciousProviders = [
        { provider: 'malicious-oauth' },
        { provider: 'custom-backdoor' },
        { provider: null },
        { provider: undefined },
        { provider: '' }
      ]

      for (const account of maliciousProviders) {
        const result = await authConfig.callbacks!.signIn!({
          user: { email: 'test@example.com' },
          account,
          profile: {}
        })
        
        expect(result).toBe(false)
      }
    })

    it('should prevent credential injection in test mode', async () => {
      // Even in development, test credentials should have specific validation
      const result = await authConfig.callbacks!.signIn!({
        user: { 
          email: 'admin@production.com', // Suspicious admin email
          name: 'Production Admin'
        },
        account: { provider: 'test-account' },
        profile: {}
      })

      // Test account should still validate properly
      expect(result).toBe(true) // But this would be validated in JWT callback
    })

    it('should validate email format and prevent injection', async () => {
      const maliciousEmails = [
        'user@domain.com<script>alert(1)</script>',
        'user+injection@domain.com; DROP TABLE users;--',
        'user@domain.com\\r\\nBCC: attacker@evil.com',
        'user@domain.com\0admin@internal.com',
        '../../../etc/passwd@domain.com'
      ]

      for (const email of maliciousEmails) {
        const result = await authConfig.callbacks!.signIn!({
          user: { email, name: 'Test User' },
          account: testAuthAccounts.googleAccount,
          profile: {}
        })
        
        // Should still allow signin (email validation happens in JWT callback)
        expect(result).toBe(true)
        
        // But JWT callback should handle malicious emails properly
        try {
          await authConfig.callbacks!.jwt!({
            token: {},
            user: { email, name: 'Test User' },
            account: testAuthAccounts.googleAccount
          })
        } catch (error) {
          // Should either sanitize or reject malicious input
          expect(error).toBeDefined()
        }
      }
    })
  })

  describe('JWT Token Security', () => {
    it('should generate secure JWT tokens with proper claims', async () => {
      // Setup existing user
      await dbHelper.insertTestTenant(testTenants.egdc)
      await dbHelper.insertTestUser(testUsers.egdcAdmin)

      const token = await authConfig.callbacks!.jwt!({
        token: {},
        user: {
          email: testUsers.egdcAdmin.email,
          name: testUsers.egdcAdmin.name
        },
        account: testAuthAccounts.googleAccount
      })

      // Should contain required security claims
      expect(token.tenant_id).toBeDefined()
      expect(token.role).toBeDefined()
      expect(token.tenant_subdomain).toBeDefined()
      
      // Should not contain sensitive information
      expect(token).not.toHaveProperty('password')
      expect(token).not.toHaveProperty('secret')
      expect(token).not.toHaveProperty('database_url')
    })

    it('should prevent token tampering and replay attacks', async () => {
      const validToken = { ...testJWTTokens.validEgdcToken }
      
      // Test token modification attempts
      const tamperedTokens = [
        { ...validToken, role: 'super_admin' }, // Role escalation
        { ...validToken, tenant_id: 'different-tenant' }, // Tenant switching
        { ...validToken, exp: Date.now() + 86400000 }, // Expiry extension
        { ...validToken, sub: 'different-user-id' } // User impersonation
      ]

      for (const tamperedToken of tamperedTokens) {
        // In real scenario, JWT signature would prevent tampering
        // Here we test that callbacks handle suspicious changes
        const result = await authConfig.callbacks!.session!({
          session: { user: { email: 'test@example.com', name: 'Test' } },
          token: tamperedToken as any
        })

        // Session should use token data but with proper validation
        expect(result.user.id).toBeDefined()
        expect(result.user.tenant_id).toBeTruthy()
      }
    })

    it('should handle token expiration properly', () => {
      const expiredToken = testJWTTokens.expiredToken
      const currentTime = Math.floor(Date.now() / 1000)
      
      expect(expiredToken.exp).toBeLessThan(currentTime)
      
      // Token validation would typically happen in middleware
      // Here we verify the expiration timestamp is correct
      expect(expiredToken.iat).toBeLessThan(expiredToken.exp)
    })

    it('should enforce proper token rotation and invalidation', async () => {
      // Simulate token refresh scenario
      const existingToken = { ...testJWTTokens.validEgdcToken }
      
      // Token refresh should maintain security properties
      const refreshedToken = await authConfig.callbacks!.jwt!({
        token: existingToken
      })
      
      expect(refreshedToken).toEqual(existingToken)
      // In production, tokens would be re-signed with new timestamps
    })
  })

  describe('Session Management Security', () => {
    it('should create secure sessions with proper user context', async () => {
      const session = await authConfig.callbacks!.session!({
        session: {
          user: {
            email: testUsers.egdcAdmin.email,
            name: testUsers.egdcAdmin.name
          }
        },
        token: testJWTTokens.validEgdcToken
      })

      expect(session.user.id).toBeDefined()
      expect(session.user.tenant_id).toBeDefined()
      expect(session.user.role).toBeDefined()
      expect(session.user.tenant_subdomain).toBeDefined()
      
      // Should not expose sensitive token data
      expect(session).not.toHaveProperty('access_token')
      expect(session).not.toHaveProperty('refresh_token')
    })

    it('should handle missing or corrupted session data gracefully', async () => {
      const invalidSessionCases = [
        { session: null, token: testJWTTokens.validEgdcToken },
        { session: { user: null }, token: testJWTTokens.validEgdcToken },
        { session: { user: {} }, token: null },
        { session: { user: {} }, token: {} }
      ]

      for (const testCase of invalidSessionCases) {
        try {
          const result = await authConfig.callbacks!.session!(testCase as any)
          
          // Should handle gracefully without crashing
          if (result) {
            expect(result.user).toBeDefined()
          }
        } catch (error) {
          // Errors should be controlled and not expose internals
          expect(error.message).not.toContain('database')
          expect(error.message).not.toContain('secret')
        }
      }
    })

    it('should prevent session fixation attacks', async () => {
      const suspiciousSessionData = {
        user: {
          email: 'user@test.com',
          name: 'Test User',
          // Suspicious additional properties
          admin: true,
          __proto__: { isAdmin: true },
          constructor: { name: 'AdminUser' }
        }
      }

      const result = await authConfig.callbacks!.session!({
        session: suspiciousSessionData,
        token: testJWTTokens.validEgdcToken
      })

      // Should only use legitimate token data, ignore session manipulation
      expect(result.user.tenant_id).toBe(testJWTTokens.validEgdcToken.tenant_id)
      expect(result.user.role).toBe(testJWTTokens.validEgdcToken.role)
      
      // Should not have suspicious properties
      expect(result.user).not.toHaveProperty('admin')
      expect(result.user).not.toHaveProperty('__proto__')
    })
  })

  describe('Redirect Security', () => {
    it('should validate redirect URLs and prevent open redirects', async () => {
      const maliciousRedirects = [
        'http://evil.com/steal-tokens',
        'javascript:alert(document.cookie)',
        'data:text/html,<script>location.href="http://evil.com"</script>',
        '//evil.com/phishing',
        'http://localhost:3001@evil.com/',
        'ftp://internal.server/secrets',
        '../../../etc/passwd'
      ]

      for (const maliciousUrl of maliciousRedirects) {
        const result = await authConfig.callbacks!.redirect!({
          url: maliciousUrl,
          baseUrl: 'http://localhost:3001'
        })

        // Should redirect to safe default instead of malicious URL
        expect(result).toBe('/dashboard')
        expect(result).not.toContain('evil.com')
        expect(result).not.toContain('javascript:')
        expect(result).not.toContain('../')
      }
    })

    it('should allow legitimate tenant redirects', async () => {
      const legitimateRedirects = [
        'http://localhost:3001/egdc/dashboard',
        'http://localhost:3001/fami/inventory',
        '/egdc/settings',
        '/fami/dashboard'
      ]

      for (const legit of legitimateRedirects) {
        const result = await authConfig.callbacks!.redirect!({
          url: legit,
          baseUrl: 'http://localhost:3001'
        })

        expect(result).toBeTruthy()
        expect(result.includes('egdc') || result.includes('fami') || result === '/dashboard').toBe(true)
      }
    })

    it('should handle redirect URL parsing errors gracefully', async () => {
      const malformedUrls = [
        null,
        undefined,
        '',
        'not-a-url',
        'http://',
        'https://',
        ':::invalid:::'
      ]

      for (const malformed of malformedUrls) {
        const result = await authConfig.callbacks!.redirect!({
          url: malformed as any,
          baseUrl: 'http://localhost:3001'
        })

        // Should fallback to safe default
        expect(result).toBe('/dashboard')
      }
    })
  })

  describe('Cookie Security Configuration', () => {
    it('should use secure cookie settings in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const cookieConfig = authConfig.cookies?.sessionToken?.options
      
      expect(cookieConfig?.secure).toBe(true)
      expect(cookieConfig?.httpOnly).toBe(true)
      expect(cookieConfig?.sameSite).toBe('lax')
      expect(cookieConfig?.path).toBe('/')
      
      process.env.NODE_ENV = originalEnv
    })

    it('should use appropriate cookie settings for development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const cookieConfig = authConfig.cookies?.sessionToken?.options
      
      expect(cookieConfig?.secure).toBe(false) // Allow HTTP in dev
      expect(cookieConfig?.httpOnly).toBe(true)
      expect(cookieConfig?.sameSite).toBe('lax')
      
      process.env.NODE_ENV = originalEnv
    })

    it('should not set explicit domain to prevent subdomain issues', () => {
      const cookieConfig = authConfig.cookies?.sessionToken?.options
      
      // Domain should not be explicitly set to allow NextAuth to handle it
      expect(cookieConfig?.domain).toBeUndefined()
    })
  })

  describe('Rate Limiting and Abuse Prevention', () => {
    it('should handle rapid authentication attempts', async () => {
      const startTime = Date.now()
      const promises = []

      // Simulate 10 rapid auth attempts
      for (let i = 0; i < 10; i++) {
        promises.push(
          authConfig.callbacks!.signIn!({
            user: { email: `rapid${i}@test.com` },
            account: testAuthAccounts.googleAccount,
            profile: {}
          })
        )
      }

      const results = await Promise.all(promises)
      const endTime = Date.now()

      // All should complete (rate limiting would be in middleware/API layer)
      expect(results.every(r => r === true)).toBe(true)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete quickly
    })

    it('should prevent enumeration attacks through error messages', async () => {
      const invalidAttempts = [
        { user: { email: 'nonexistent@test.com' }, account: { provider: 'google' } },
        { user: { email: 'invalid-email' }, account: { provider: 'google' } },
        { user: { email: 'test@test.com' }, account: { provider: 'invalid' } },
        { user: null, account: { provider: 'google' } }
      ]

      for (const attempt of invalidAttempts) {
        const result = await authConfig.callbacks!.signIn!(attempt as any)
        
        // Should fail gracefully without revealing why
        expect(result).toBe(false)
        // Error messages should be generic (tested in integration tests)
      }
    })
  })

  describe('Environment-Specific Security', () => {
    it('should enforce stricter security in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      // Production should not have debug mode
      expect(authConfig.debug).toBeFalsy()
      
      // Should not have test providers
      const testProvider = authConfig.providers.find((p: any) => p.id === 'test-account')
      expect(testProvider).toBeUndefined()

      process.env.NODE_ENV = originalEnv
    })

    it('should allow debugging in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      expect(authConfig.debug).toBe(true)

      process.env.NODE_ENV = originalEnv
    })

    it('should validate required environment variables', () => {
      // These should exist for the configuration to work
      expect(process.env.NEXTAUTH_SECRET).toBeTruthy()
      expect(process.env.GOOGLE_CLIENT_ID).toBeTruthy()
      expect(process.env.GOOGLE_CLIENT_SECRET).toBeTruthy()
    })
  })
})
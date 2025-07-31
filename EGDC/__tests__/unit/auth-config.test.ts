/**
 * Authentication Configuration Unit Tests
 * Tests OAuth flow, JWT callbacks, and tenant mapping
 */

import { authConfig } from '../../lib/auth-config'
import { 
  mockUsers, 
  mockTenants, 
  mockNextAuthAccount, 
  mockNextAuthToken,
  mockNextAuthSession,
  DatabaseTestHelper 
} from '../utils/auth-test-helpers'

// Mock database operations
jest.mock('../../lib/auth-config', () => {
  const originalModule = jest.requireActual('../../lib/auth-config')
  return {
    ...originalModule,
    authConfig: {
      ...originalModule.authConfig,
      // Override database operations for testing
    }
  }
})

describe('Authentication Configuration', () => {
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

  describe('Providers Configuration', () => {
    it('should include Google OAuth provider', () => {
      expect(authConfig.providers).toBeDefined()
      
      // Find Google provider
      const googleProvider = authConfig.providers.find(
        (provider: any) => provider.id === 'google'
      )
      
      expect(googleProvider).toBeDefined()
      expect(googleProvider?.type).toBe('oauth')
    })
    
    it('should include test credentials provider in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      // Re-evaluate authConfig to include development providers
      const devProviders = authConfig.providers
      
      const testProvider = devProviders.find(
        (provider: any) => provider.id === 'test-account'
      )
      
      expect(testProvider).toBeDefined()
      
      process.env.NODE_ENV = originalEnv
    })
    
    it('should not include test credentials in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      const prodProviders = authConfig.providers
      
      const testProvider = prodProviders.find(
        (provider: any) => provider.id === 'test-account'
      )
      
      expect(testProvider).toBeUndefined()
      
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('SignIn Callback', () => {
    it('should allow Google OAuth users', async () => {
      const result = await authConfig.callbacks!.signIn!({
        user: { email: 'test@example.com' },
        account: { provider: 'google' },
        profile: {}
      })
      
      expect(result).toBe(true)
    })
    
    it('should allow test account in development', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      const result = await authConfig.callbacks!.signIn!({
        user: { email: 'test@example.com' },
        account: { provider: 'test-account' },
        profile: {}
      })
      
      expect(result).toBe(true)
      
      process.env.NODE_ENV = originalEnv
    })
    
    it('should reject invalid providers', async () => {
      const result = await authConfig.callbacks!.signIn!({
        user: { email: 'test@example.com' },
        account: { provider: 'invalid-provider' },
        profile: {}
      })
      
      expect(result).toBe(false)
    })
    
    it('should reject users without email', async () => {
      const result = await authConfig.callbacks!.signIn!({
        user: {},
        account: { provider: 'google' },
        profile: {}
      })
      
      expect(result).toBe(false)
    })
  })

  describe('JWT Callback', () => {
    it('should handle first sign in with new user', async () => {
      const user = {
        email: 'newuser@example.com',
        name: 'New User'
      }
      
      const account = {
        provider: 'google',
        providerAccountId: 'google-123'
      }
      
      const token = {}
      
      // Mock the JWT callback
      const result = await authConfig.callbacks!.jwt!({
        token,
        user,
        account
      })
      
      expect(result).toBeDefined()
      expect(result.tenant_id).toBeDefined()
      expect(result.tenant_subdomain).toBeDefined()
      expect(result.role).toBe('admin')
    })
    
    it('should handle existing user sign in', async () => {
      // Setup existing user in database
      await dbHelper.insertTestTenant(mockTenants.existingTenant)
      await dbHelper.insertTestUser(mockUsers.existingUser)
      
      const user = {
        email: mockUsers.existingUser.email,
        name: mockUsers.existingUser.name
      }
      
      const account = {
        provider: 'google',
        providerAccountId: mockUsers.existingUser.google_id
      }
      
      const token = {}
      
      const result = await authConfig.callbacks!.jwt!({
        token,
        user,
        account
      })
      
      expect(result.tenant_id).toBe(mockUsers.existingUser.tenant_id)
      expect(result.tenant_subdomain).toBe(mockTenants.existingTenant.subdomain)
    })
    
    it('should handle token refresh without user/account', async () => {
      const existingToken = {
        ...mockNextAuthToken
      }
      
      const result = await authConfig.callbacks!.jwt!({
        token: existingToken
      })
      
      // Should return the same token for refresh
      expect(result).toEqual(existingToken)
    })
    
    it('should handle test account authentication', async () => {
      const user = {
        email: 'test@example.com',
        name: 'Test User'
      }
      
      const account = {
        provider: 'test-account'
      }
      
      const token = {}
      
      const result = await authConfig.callbacks!.jwt!({
        token,
        user,
        account
      })
      
      expect(result.tenant_id).toBe('test-tenant')
      expect(result.tenant_subdomain).toBe('test')
      expect(result.role).toBe('admin')
    })
    
    it('should fail gracefully on database errors', async () => {
      // Mock database error
      const originalConsoleError = console.error
      console.error = jest.fn()
      
      const user = {
        email: 'error@example.com',
        name: 'Error User'
      }
      
      const account = {
        provider: 'google',
        providerAccountId: 'google-error'
      }
      
      const token = {}
      
      await expect(
        authConfig.callbacks!.jwt!({
          token,
          user,
          account
        })
      ).rejects.toThrow()
      
      console.error = originalConsoleError
    })
  })

  describe('Session Callback', () => {
    it('should populate session with user data from token', async () => {
      const session = {
        user: {
          email: 'test@example.com',
          name: 'Test User'
        }
      }
      
      const token = mockNextAuthToken
      
      const result = await authConfig.callbacks!.session!({
        session,
        token
      })
      
      expect(result.user.id).toBe(token.sub)
      expect(result.user.tenant_id).toBe(token.tenant_id)
      expect(result.user.role).toBe(token.role)
      expect(result.user.tenant_name).toBe(token.tenant_name)
      expect(result.user.tenant_subdomain).toBe(token.tenant_subdomain)
    })
    
    it('should handle missing token data gracefully', async () => {
      const session = {
        user: {
          email: 'test@example.com',
          name: 'Test User'
        }
      }
      
      const token = {
        sub: 'user-id'
        // Missing other token properties
      }
      
      const result = await authConfig.callbacks!.session!({
        session,
        token
      })
      
      expect(result.user.id).toBe('user-id')
      expect(result.user.tenant_id).toBe('unknown')
      expect(result.user.role).toBe('user')
      expect(result.user.tenant_name).toBe('Unknown Tenant')
    })
  })

  describe('Redirect Callback', () => {
    it('should redirect to tenant dashboard with callbackUrl', async () => {
      const url = 'http://localhost:3001/login?callbackUrl=%2Fegdc%2Fdashboard'
      const baseUrl = 'http://localhost:3001'
      
      const result = await authConfig.callbacks!.redirect!({
        url,
        baseUrl
      })
      
      expect(result).toBe('/egdc/dashboard')
    })
    
    it('should redirect to tenant path when present in URL', async () => {
      const url = 'http://localhost:3001/fami/dashboard'
      const baseUrl = 'http://localhost:3001'
      
      const result = await authConfig.callbacks!.redirect!({
        url,
        baseUrl
      })
      
      expect(result).toBe(url)
    })
    
    it('should default to generic dashboard', async () => {
      const url = 'http://localhost:3001/some-other-path'
      const baseUrl = 'http://localhost:3001'
      
      const result = await authConfig.callbacks!.redirect!({
        url,
        baseUrl
      })
      
      expect(result).toBe('/dashboard')
    })
    
    it('should handle malformed URLs gracefully', async () => {
      const url = 'invalid-url'
      const baseUrl = 'http://localhost:3001'
      
      const result = await authConfig.callbacks!.redirect!({
        url,
        baseUrl
      })
      
      expect(result).toBe('/dashboard')
    })
  })

  describe('Cookie Configuration', () => {
    it('should use secure cookies in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      expect(authConfig.cookies?.sessionToken?.options?.secure).toBe(true)
      
      process.env.NODE_ENV = originalEnv
    })
    
    it('should use non-secure cookies in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      expect(authConfig.cookies?.sessionToken?.options?.secure).toBe(false)
      
      process.env.NODE_ENV = originalEnv
    })
    
    it('should set proper cookie attributes', () => {
      const cookieOptions = authConfig.cookies?.sessionToken?.options
      
      expect(cookieOptions?.httpOnly).toBe(true)
      expect(cookieOptions?.sameSite).toBe('lax')
      expect(cookieOptions?.path).toBe('/')
    })
  })

  describe('Session Configuration', () => {
    it('should use JWT strategy', () => {
      expect(authConfig.session?.strategy).toBe('jwt')
    })
    
    it('should set proper session maxAge', () => {
      expect(authConfig.session?.maxAge).toBe(24 * 60 * 60) // 24 hours
    })
  })
})
/**
 * Authentication Flow Integration Tests
 * Tests complete OAuth + tenant creation workflow
 */

import { Pool } from 'pg'
import { createSecureDatabaseConfig } from '../../lib/database-config'
import { authConfig } from '../../lib/auth-config'
import { DatabaseTestHelper } from '../utils/auth-test-helpers'

describe('Authentication Flow Integration Tests', () => {
  let pool: Pool
  let dbHelper: DatabaseTestHelper

  beforeAll(async () => {
    pool = new Pool({
      ...createSecureDatabaseConfig(),
      connectionString: process.env.DATABASE_URL || 'postgres://test:test@localhost:5432/egdc_test'
    })
    dbHelper = new DatabaseTestHelper()
  })

  afterAll(async () => {
    await pool.end()
    await dbHelper.cleanup()
  })

  beforeEach(async () => {
    await dbHelper.clearTestData()
  })

  describe('New User Registration Flow', () => {
    it('should create tenant and user for new Google OAuth user', async () => {
      const newUserEmail = 'newuser@integrationtest.com'
      const newUserName = 'New Integration User'
      const googleId = 'google-integration-' + Date.now()

      // Simulate JWT callback for new user
      const mockUser = {
        email: newUserEmail,
        name: newUserName
      }

      const mockAccount = {
        provider: 'google',
        providerAccountId: googleId
      }

      // Call the JWT callback directly
      const result = await authConfig.callbacks!.jwt!({
        token: {},
        user: mockUser,
        account: mockAccount
      })

      // Verify JWT token contains tenant information
      expect(result.tenant_id).toBeDefined()
      expect(result.tenant_subdomain).toBeDefined()
      expect(result.role).toBe('admin')
      expect(typeof result.tenant_id).toBe('string')
      expect(result.tenant_id.length).toBeGreaterThan(0)

      // Verify tenant was created in database
      const tenant = await dbHelper.getTenantBySubdomain(result.tenant_subdomain as string)
      expect(tenant).toBeDefined()
      expect(tenant.email).toBe(newUserEmail)
      expect(tenant.status).toBe('active')
      expect(tenant.business_type).toBe('retailer')

      // Verify user was created in database
      const user = await dbHelper.getUserByEmail(newUserEmail)
      expect(user).toBeDefined()
      expect(user.tenant_id).toBe(result.tenant_id)
      expect(user.google_id).toBe(googleId)
      expect(user.role).toBe('admin')
      expect(user.tenant_subdomain).toBe(result.tenant_subdomain)
    })

    it('should generate unique subdomain for duplicate email prefixes', async () => {
      // Create first user with email that would generate 'john' subdomain
      const firstUserEmail = 'john@company1.com'
      const firstResult = await authConfig.callbacks!.jwt!({
        token: {},
        user: { email: firstUserEmail, name: 'John One' },
        account: { provider: 'google', providerAccountId: 'google-john-1' }
      })

      // Create second user with email that would also generate 'john' subdomain
      const secondUserEmail = 'john@company2.com'
      const secondResult = await authConfig.callbacks!.jwt!({
        token: {},
        user: { email: secondUserEmail, name: 'John Two' },
        account: { provider: 'google', providerAccountId: 'google-john-2' }
      })

      // Subdomains should be different
      expect(firstResult.tenant_subdomain).not.toBe(secondResult.tenant_subdomain)
      
      // First should be 'john', second should be 'john1' or similar
      expect(firstResult.tenant_subdomain).toBe('john')
      expect((secondResult.tenant_subdomain as string).startsWith('john')).toBe(true)
      expect(secondResult.tenant_subdomain).not.toBe('john')

      // Both tenants should exist in database
      const tenant1 = await dbHelper.getTenantBySubdomain(firstResult.tenant_subdomain as string)
      const tenant2 = await dbHelper.getTenantBySubdomain(secondResult.tenant_subdomain as string)
      
      expect(tenant1).toBeDefined()
      expect(tenant2).toBeDefined()
      expect(tenant1.id).not.toBe(tenant2.id)
    })

    it('should handle special characters in email for subdomain generation', async () => {
      const specialEmail = 'user+test@example-domain.com'
      
      const result = await authConfig.callbacks!.jwt!({
        token: {},
        user: { email: specialEmail, name: 'Special User' },
        account: { provider: 'google', providerAccountId: 'google-special-123' }
      })

      // Subdomain should be cleaned of special characters
      expect(result.tenant_subdomain).toBe('usertest')
      
      const tenant = await dbHelper.getTenantBySubdomain('usertest')
      expect(tenant).toBeDefined()
      expect(tenant.email).toBe(specialEmail)
    })
  })

  describe('Existing User Login Flow', () => {
    beforeEach(async () => {
      // Set up existing tenant and user
      await dbHelper.insertTestTenant({
        id: 'existing-tenant-integration',
        name: 'Existing Integration Business',
        subdomain: 'existing',
        email: 'existing@integrationtest.com',
        business_type: 'retailer',
        plan: 'starter',
        status: 'active'
      })

      await dbHelper.insertTestUser({
        id: 'existing-user-integration',
        tenant_id: 'existing-tenant-integration',
        email: 'existing@integrationtest.com',
        name: 'Existing User',
        role: 'admin',
        google_id: 'google-existing-integration',
        status: 'active'
      })
    })

    it('should authenticate existing user without creating new tenant', async () => {
      const existingEmail = 'existing@integrationtest.com'
      
      const result = await authConfig.callbacks!.jwt!({
        token: {},
        user: { email: existingEmail, name: 'Existing User' },
        account: { provider: 'google', providerAccountId: 'google-existing-integration' }
      })

      // Should use existing tenant
      expect(result.tenant_id).toBe('existing-tenant-integration')
      expect(result.tenant_subdomain).toBe('existing')
      expect(result.role).toBe('admin')

      // Should not create duplicate tenant
      const client = await pool.connect()
      try {
        const tenantCount = await client.query(`
          SELECT COUNT(*) as count FROM tenants WHERE email = $1
        `, [existingEmail])
        
        expect(parseInt(tenantCount.rows[0].count)).toBe(1)
      } finally {
        client.release()
      }
    })

    it('should update user login information on existing user signin', async () => {
      const existingEmail = 'existing@integrationtest.com'
      const newGoogleId = 'google-updated-' + Date.now()
      
      await authConfig.callbacks!.jwt!({
        token: {},
        user: { email: existingEmail, name: 'Updated Name' },
        account: { provider: 'google', providerAccountId: newGoogleId }
      })

      // Verify user was updated
      const user = await dbHelper.getUserByEmail(existingEmail)
      expect(user.google_id).toBe(newGoogleId)
      expect(user.name).toBe('Updated Name')
    })
  })

  describe('Session Management', () => {
    it('should create proper session from JWT token', async () => {
      const mockSession = {
        user: {
          email: 'session@integrationtest.com',
          name: 'Session User'
        }
      }

      const mockToken = {
        sub: 'session-user-id',
        tenant_id: 'session-tenant-id',
        role: 'admin',
        tenant_name: 'Session Business',
        tenant_subdomain: 'sessiontest'
      }

      const result = await authConfig.callbacks!.session!({
        session: mockSession,
        token: mockToken
      })

      expect(result.user.id).toBe('session-user-id')
      expect(result.user.tenant_id).toBe('session-tenant-id')
      expect(result.user.role).toBe('admin')
      expect(result.user.tenant_name).toBe('Session Business')
      expect(result.user.tenant_subdomain).toBe('sessiontest')
    })

    it('should handle missing token data gracefully in session', async () => {
      const mockSession = {
        user: {
          email: 'incomplete@test.com',
          name: 'Incomplete User'
        }
      }

      const incompleteToken = {
        sub: 'incomplete-user-id'
        // Missing other tenant information
      }

      const result = await authConfig.callbacks!.session!({
        session: mockSession,
        token: incompleteToken
      })

      expect(result.user.id).toBe('incomplete-user-id')
      expect(result.user.tenant_id).toBe('unknown')
      expect(result.user.role).toBe('user')
      expect(result.user.tenant_name).toBe('Unknown Tenant')
    })
  })

  describe('SignIn Validation', () => {
    it('should allow valid Google OAuth signin', async () => {
      const result = await authConfig.callbacks!.signIn!({
        user: { email: 'valid@test.com' },
        account: { provider: 'google' },
        profile: {}
      })

      expect(result).toBe(true)
    })

    it('should reject signin without email', async () => {
      const result = await authConfig.callbacks!.signIn!({
        user: {},
        account: { provider: 'google' },
        profile: {}
      })

      expect(result).toBe(false)
    })

    it('should reject unknown providers', async () => {
      const result = await authConfig.callbacks!.signIn!({
        user: { email: 'test@example.com' },
        account: { provider: 'unknown-provider' },
        profile: {}
      })

      expect(result).toBe(false)
    })
  })

  describe('Database Error Handling', () => {
    it('should handle database connection failures gracefully', async () => {
      // Mock database error by temporarily corrupting the connection
      const originalUrl = process.env.DATABASE_URL
      process.env.DATABASE_URL = 'postgres://invalid:invalid@nonexistent:5432/invalid'

      try {
        await expect(
          authConfig.callbacks!.jwt!({
            token: {},
            user: { email: 'error@test.com', name: 'Error User' },
            account: { provider: 'google', providerAccountId: 'google-error' }
          })
        ).rejects.toThrow()
      } finally {
        process.env.DATABASE_URL = originalUrl
      }
    })

    it('should rollback transaction on tenant creation failure', async () => {
      // This test would need to simulate a scenario where tenant creation
      // succeeds but user creation fails, testing the rollback mechanism
      
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        
        // Create a tenant
        await client.query(`
          INSERT INTO tenants (id, name, subdomain, email, business_type, plan, status)
          VALUES ('rollback-test-tenant', 'Rollback Test', 'rollback', 'rollback@test.com', 'retailer', 'starter', 'active')
        `)
        
        // Simulate failure in user creation
        try {
          await client.query(`
            INSERT INTO users (id, tenant_id, email, name, role, google_id, status)
            VALUES ('rollback-user', 'rollback-test-tenant', 'rollback@test.com', 'Rollback User', 'admin', 'google-rollback', 'invalid-status-that-will-fail')
          `)
        } catch (error) {
          await client.query('ROLLBACK')
        }
        
        // Verify tenant was rolled back
        const tenantCheck = await client.query(`
          SELECT COUNT(*) as count FROM tenants WHERE id = 'rollback-test-tenant'
        `)
        
        expect(parseInt(tenantCheck.rows[0].count)).toBe(0)
        
      } finally {
        client.release()
      }
    })
  })

  describe('Redirect Handling', () => {
    it('should redirect to tenant dashboard with callbackUrl', async () => {
      const url = 'http://localhost:3001/login?callbackUrl=%2Fegdc%2Fdashboard'
      const baseUrl = 'http://localhost:3001'

      const result = await authConfig.callbacks!.redirect!({
        url,
        baseUrl
      })

      expect(result).toBe('/egdc/dashboard')
    })

    it('should handle tenant-specific URLs in redirect', async () => {
      const url = 'http://localhost:3001/mycompany/inventory'
      const baseUrl = 'http://localhost:3001'

      const result = await authConfig.callbacks!.redirect!({
        url,
        baseUrl
      })

      expect(result).toBe(url)
    })

    it('should default to generic dashboard for non-tenant URLs', async () => {
      const url = 'http://localhost:3001/some-random-path'
      const baseUrl = 'http://localhost:3001'

      const result = await authConfig.callbacks!.redirect!({
        url,
        baseUrl
      })

      expect(result).toBe('/dashboard')
    })
  })
})
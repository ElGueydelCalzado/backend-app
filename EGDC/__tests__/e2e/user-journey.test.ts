/**
 * End-to-End User Journey Tests
 * Tests complete user workflows from authentication to tenant access
 */

import { Pool } from 'pg'
import { createSecureDatabaseConfig } from '../../lib/database-config'
import { authConfig } from '../../lib/auth-config'
import { 
  extractTenantFromPath,
  isValidTenant,
  buildTenantUrl,
  isAppDomain
} from '../../lib/tenant-utils'
import { DatabaseTestHelper } from '../utils/auth-test-helpers'

describe('End-to-End User Journey Tests', () => {
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

  describe('New Retailer Onboarding Journey', () => {
    it('should complete full onboarding flow for new retailer', async () => {
      const retailerEmail = 'newretailer@journey.test'
      const retailerName = 'New Retailer Owner'
      const googleId = 'google-journey-' + Date.now()

      // Step 1: User attempts to access app, gets redirected to login
      const loginUrl = 'http://localhost:3001/login'
      expect(isAppDomain('localhost:3001')).toBe(true)

      // Step 2: User completes Google OAuth
      const mockUser = { email: retailerEmail, name: retailerName }
      const mockAccount = { provider: 'google', providerAccountId: googleId }

      // Step 3: JWT callback processes new user registration
      const jwtResult = await authConfig.callbacks!.jwt!({
        token: {},
        user: mockUser,
        account: mockAccount
      })

      expect(jwtResult.tenant_id).toBeDefined()
      expect(jwtResult.tenant_subdomain).toBeDefined()
      expect(jwtResult.role).toBe('admin')

      // Step 4: Session is created from JWT token
      const sessionResult = await authConfig.callbacks!.session!({
        session: { user: mockUser },
        token: jwtResult
      })

      expect(sessionResult.user.tenant_id).toBe(jwtResult.tenant_id)
      expect(sessionResult.user.tenant_subdomain).toBe(jwtResult.tenant_subdomain)

      // Step 5: User is redirected to their tenant dashboard
      const expectedDashboardUrl = buildTenantUrl(
        jwtResult.tenant_subdomain as string,
        '/dashboard',
        'localhost:3001'
      )
      expect(expectedDashboardUrl).toContain(`/${jwtResult.tenant_subdomain}/dashboard`)

      // Step 6: Verify tenant and user were created in database
      const tenant = await dbHelper.getTenantBySubdomain(jwtResult.tenant_subdomain as string)
      expect(tenant).toBeDefined()
      expect(tenant.email).toBe(retailerEmail)
      expect(tenant.status).toBe('active')
      expect(tenant.business_type).toBe('retailer')

      const user = await dbHelper.getUserByEmail(retailerEmail)
      expect(user).toBeDefined()
      expect(user.tenant_id).toBe(jwtResult.tenant_id)
      expect(user.role).toBe('admin')
      expect(user.google_id).toBe(googleId)

      // Step 7: Verify tenant path extraction works
      const tenantFromPath = extractTenantFromPath(`/${jwtResult.tenant_subdomain}/dashboard`)
      expect(tenantFromPath).toBe(jwtResult.tenant_subdomain)
      expect(isValidTenant(tenantFromPath as string)).toBe(true)

      console.log('✅ New retailer onboarding journey completed successfully:', {
        email: retailerEmail,
        tenantId: jwtResult.tenant_id,
        subdomain: jwtResult.tenant_subdomain,
        dashboardUrl: expectedDashboardUrl
      })
    })

    it('should handle concurrent new user registrations', async () => {
      const numUsers = 3
      const users = Array.from({ length: numUsers }, (_, i) => ({
        email: `concurrent${i}@journey.test`,
        name: `Concurrent User ${i}`,
        googleId: `google-concurrent-${i}-${Date.now()}`
      }))

      // Register all users concurrently
      const registrationPromises = users.map(async (user) => {
        return await authConfig.callbacks!.jwt!({
          token: {},
          user: { email: user.email, name: user.name },
          account: { provider: 'google', providerAccountId: user.googleId }
        })
      })

      const results = await Promise.all(registrationPromises)

      // All should succeed
      expect(results).toHaveLength(numUsers)
      results.forEach(result => {
        expect(result.tenant_id).toBeDefined()
        expect(result.tenant_subdomain).toBeDefined()
        expect(result.role).toBe('admin')
      })

      // All should have unique tenant IDs and subdomains
      const tenantIds = results.map(r => r.tenant_id)
      const subdomains = results.map(r => r.tenant_subdomain)
      
      expect(new Set(tenantIds).size).toBe(numUsers)
      expect(new Set(subdomains).size).toBe(numUsers)

      // Verify all were created in database
      for (let i = 0; i < numUsers; i++) {
        const user = await dbHelper.getUserByEmail(users[i].email)
        expect(user).toBeDefined()
        expect(user.tenant_id).toBe(results[i].tenant_id)
      }
    })
  })

  describe('Existing User Return Journey', () => {
    beforeEach(async () => {
      // Set up existing user
      await dbHelper.insertTestTenant({
        id: 'return-tenant-journey',
        name: 'Return Journey Business',
        subdomain: 'returner',
        email: 'returner@journey.test',
        business_type: 'retailer',
        plan: 'starter',
        status: 'active'
      })

      await dbHelper.insertTestUser({
        id: 'return-user-journey',
        tenant_id: 'return-tenant-journey',
        email: 'returner@journey.test',
        name: 'Returning User',
        role: 'admin',
        google_id: 'google-returner-original',
        status: 'active'
      })
    })

    it('should complete return user authentication journey', async () => {
      const returnerEmail = 'returner@journey.test'
      const updatedGoogleId = 'google-returner-updated-' + Date.now()

      // Step 1: User accesses login portal
      expect(isAppDomain('localhost:3001')).toBe(true)

      // Step 2: User completes OAuth with potentially updated Google ID
      const jwtResult = await authConfig.callbacks!.jwt!({
        token: {},
        user: { email: returnerEmail, name: 'Returning User Updated' },
        account: { provider: 'google', providerAccountId: updatedGoogleId }
      })

      // Should use existing tenant
      expect(jwtResult.tenant_id).toBe('return-tenant-journey')
      expect(jwtResult.tenant_subdomain).toBe('returner')
      expect(jwtResult.role).toBe('admin')

      // Step 3: Session creation
      const sessionResult = await authConfig.callbacks!.session!({
        session: { user: { email: returnerEmail, name: 'Returning User Updated' } },
        token: jwtResult
      })

      expect(sessionResult.user.tenant_id).toBe('return-tenant-journey')
      expect(sessionResult.user.tenant_subdomain).toBe('returner')

      // Step 4: Redirect to tenant dashboard
      const redirectResult = await authConfig.callbacks!.redirect!({
        url: `http://localhost:3001/${jwtResult.tenant_subdomain}/dashboard`,
        baseUrl: 'http://localhost:3001'
      })

      expect(redirectResult).toBe(`http://localhost:3001/${jwtResult.tenant_subdomain}/dashboard`)

      // Step 5: Verify user information was updated
      const updatedUser = await dbHelper.getUserByEmail(returnerEmail)
      expect(updatedUser.google_id).toBe(updatedGoogleId)
      expect(updatedUser.name).toBe('Returning User Updated')

      // Step 6: Verify tenant wasn't duplicated
      const client = await pool.connect()
      try {
        const tenantCount = await client.query(`
          SELECT COUNT(*) as count FROM tenants WHERE email = $1
        `, [returnerEmail])
        expect(parseInt(tenantCount.rows[0].count)).toBe(1)
      } finally {
        client.release()
      }
    })
  })

  describe('Multi-User Tenant Journey', () => {
    beforeEach(async () => {
      // Set up a tenant with primary user
      await dbHelper.insertTestTenant({
        id: 'multi-tenant-journey',
        name: 'Multi User Business',
        subdomain: 'multiuser',
        email: 'owner@multiuser.test',
        business_type: 'retailer',
        plan: 'professional',
        status: 'active'
      })

      await dbHelper.insertTestUser({
        id: 'owner-user-journey',
        tenant_id: 'multi-tenant-journey',
        email: 'owner@multiuser.test',
        name: 'Business Owner',
        role: 'admin',
        google_id: 'google-owner-123',
        status: 'active'
      })
    })

    it('should handle multiple users accessing same tenant', async () => {
      // First user (existing owner) login
      const ownerLogin = await authConfig.callbacks!.jwt!({
        token: {},
        user: { email: 'owner@multiuser.test', name: 'Business Owner' },
        account: { provider: 'google', providerAccountId: 'google-owner-123' }
      })

      expect(ownerLogin.tenant_id).toBe('multi-tenant-journey')
      expect(ownerLogin.tenant_subdomain).toBe('multiuser')

      // Second user tries to create account with same business domain
      // In a real scenario, this might be handled differently (invite system, etc.)
      // For now, each user gets their own tenant
      const employeeEmail = 'employee@multiuser.test'
      const employeeLogin = await authConfig.callbacks!.jwt!({
        token: {},
        user: { email: employeeEmail, name: 'Employee User' },
        account: { provider: 'google', providerAccountId: 'google-employee-456' }
      })

      // Employee gets their own tenant (current behavior)
      expect(employeeLogin.tenant_id).not.toBe('multi-tenant-journey')
      expect(employeeLogin.tenant_subdomain).not.toBe('multiuser')

      // Verify both users can access their respective tenants
      const ownerTenant = await dbHelper.getTenantBySubdomain('multiuser')
      const employeeTenant = await dbHelper.getTenantBySubdomain(employeeLogin.tenant_subdomain as string)

      expect(ownerTenant).toBeDefined()
      expect(employeeTenant).toBeDefined()
      expect(ownerTenant.id).not.toBe(employeeTenant.id)
    })
  })

  describe('Error Recovery Journeys', () => {
    it('should handle database errors during registration gracefully', async () => {
      // Mock a database error scenario
      const originalUrl = process.env.DATABASE_URL
      
      try {
        // Temporarily break database connection
        process.env.DATABASE_URL = 'postgres://invalid:invalid@nonexistent:5432/invalid'

        // Attempt user registration
        await expect(
          authConfig.callbacks!.jwt!({
            token: {},
            user: { email: 'error@journey.test', name: 'Error User' },
            account: { provider: 'google', providerAccountId: 'google-error-123' }
          })
        ).rejects.toThrow()

        // Restore connection
        process.env.DATABASE_URL = originalUrl

        // Retry registration should work
        const retryResult = await authConfig.callbacks!.jwt!({
          token: {},
          user: { email: 'error@journey.test', name: 'Error User' },
          account: { provider: 'google', providerAccountId: 'google-error-123' }
        })

        expect(retryResult.tenant_id).toBeDefined()
        expect(retryResult.tenant_subdomain).toBeDefined()

      } finally {
        process.env.DATABASE_URL = originalUrl
      }
    })

    it('should handle invalid redirect URLs gracefully', async () => {
      const invalidUrls = [
        'javascript:alert("xss")',
        'http://malicious.com/steal-data',
        'ftp://internal.server/files',
        '../../../etc/passwd',
        null,
        undefined,
        ''
      ]

      for (const invalidUrl of invalidUrls) {
        const result = await authConfig.callbacks!.redirect!({
          url: invalidUrl as any,
          baseUrl: 'http://localhost:3001'
        })

        // Should default to safe dashboard URL
        expect(result).toBe('/dashboard')
      }
    })
  })

  describe('Security Validation Journey', () => {
    it('should prevent unauthorized access throughout the journey', async () => {
      // Step 1: Attempt to access tenant without authentication
      const tenantPath = '/unauthorized/dashboard'
      const extractedTenant = extractTenantFromPath(tenantPath)
      
      // Even if path is extracted, user needs authentication
      expect(extractedTenant).toBe('unauthorized')
      expect(isValidTenant('unauthorized')).toBe(false)

      // Step 2: Invalid provider should be rejected
      const invalidProviderResult = await authConfig.callbacks!.signIn!({
        user: { email: 'hacker@test.com' },
        account: { provider: 'malicious-provider' },
        profile: {}
      })
      expect(invalidProviderResult).toBe(false)

      // Step 3: No email should be rejected
      const noEmailResult = await authConfig.callbacks!.signIn!({
        user: {},
        account: { provider: 'google' },
        profile: {}
      })
      expect(noEmailResult).toBe(false)

      // Step 4: Valid user should be allowed
      const validResult = await authConfig.callbacks!.signIn!({
        user: { email: 'valid@test.com' },
        account: { provider: 'google' },
        profile: {}
      })
      expect(validResult).toBe(true)
    })

    it('should maintain security throughout session lifecycle', async () => {
      const userEmail = 'secure@journey.test'
      
      // Create user and establish session
      const jwtResult = await authConfig.callbacks!.jwt!({
        token: {},
        user: { email: userEmail, name: 'Secure User' },
        account: { provider: 'google', providerAccountId: 'google-secure-123' }
      })

      // Session callback should maintain security context
      const sessionResult = await authConfig.callbacks!.session!({
        session: { user: { email: userEmail, name: 'Secure User' } },
        token: jwtResult
      })

      // Verify session contains proper tenant isolation data
      expect(sessionResult.user.tenant_id).toBe(jwtResult.tenant_id)
      expect(sessionResult.user.tenant_subdomain).toBe(jwtResult.tenant_subdomain)
      
      // Verify user cannot access other tenants
      const otherTenantPath = '/othertenant/dashboard'
      const otherTenant = extractTenantFromPath(otherTenantPath)
      
      if (otherTenant && isValidTenant(otherTenant)) {
        // User's session should only work for their own tenant
        expect(sessionResult.user.tenant_subdomain).not.toBe(otherTenant)
      }
    })
  })

  describe('Performance and Scalability Journey', () => {
    it('should handle high-volume user registration efficiently', async () => {
      const numUsers = 10 // Reduced for test performance
      const startTime = Date.now()

      const registrationPromises = Array.from({ length: numUsers }, (_, i) => {
        return authConfig.callbacks!.jwt!({
          token: {},
          user: { 
            email: `perf${i}@journey.test`, 
            name: `Performance User ${i}` 
          },
          account: { 
            provider: 'google', 
            providerAccountId: `google-perf-${i}-${Date.now()}` 
          }
        })
      })

      const results = await Promise.all(registrationPromises)
      const endTime = Date.now()
      const totalTime = endTime - startTime

      // All registrations should succeed
      expect(results).toHaveLength(numUsers)
      results.forEach(result => {
        expect(result.tenant_id).toBeDefined()
        expect(result.tenant_subdomain).toBeDefined()
      })

      // Should complete within reasonable time (adjust based on requirements)
      expect(totalTime).toBeLessThan(30000) // 30 seconds for 10 users

      console.log(`✅ Registered ${numUsers} users in ${totalTime}ms (${totalTime/numUsers}ms per user)`)
    })
  })
})
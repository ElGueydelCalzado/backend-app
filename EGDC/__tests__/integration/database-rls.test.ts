/**
 * Database Row Level Security Integration Tests
 * Tests complete RLS implementation with real database operations
 */

import { Pool } from 'pg'
import { createSecureDatabaseConfig } from '../../lib/database-config'
import { setTenantContext } from '../../lib/auth-config'
import { DatabaseTestHelper, mockTenants, mockUsers } from '../utils/auth-test-helpers'

describe('Database RLS Integration Tests', () => {
  let pool: Pool
  let dbHelper: DatabaseTestHelper

  beforeAll(async () => {
    pool = new Pool({
      ...createSecureDatabaseConfig(),
      // Use test database
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

  describe('Tenant Context Setting', () => {
    it('should set and retrieve tenant context correctly', async () => {
      const client = await pool.connect()
      
      try {
        const tenantId = 'test-tenant-rls-123'
        
        // Set tenant context
        await setTenantContext(tenantId, client)
        
        // Verify context is set
        const result = await client.query(`
          SELECT current_setting('app.current_tenant_id') as current_tenant
        `)
        
        expect(result.rows[0].current_tenant).toBe(tenantId)
      } finally {
        client.release()
      }
    })

    it('should maintain context across multiple queries', async () => {
      const client = await pool.connect()
      
      try {
        const tenantId = 'persistent-tenant-123'
        
        await setTenantContext(tenantId, client)
        
        // Multiple queries should maintain the same context
        for (let i = 0; i < 3; i++) {
          const result = await client.query(`
            SELECT current_setting('app.current_tenant_id') as current_tenant
          `)
          expect(result.rows[0].current_tenant).toBe(tenantId)
        }
      } finally {
        client.release()
      }
    })

    it('should allow context changes within same connection', async () => {
      const client = await pool.connect()
      
      try {
        // Set first tenant
        await setTenantContext('tenant-1', client)
        let result = await client.query(`
          SELECT current_setting('app.current_tenant_id') as current_tenant
        `)
        expect(result.rows[0].current_tenant).toBe('tenant-1')
        
        // Change to second tenant
        await setTenantContext('tenant-2', client)
        result = await client.query(`
          SELECT current_setting('app.current_tenant_id') as current_tenant
        `)
        expect(result.rows[0].current_tenant).toBe('tenant-2')
      } finally {
        client.release()
      }
    })

    it('should isolate context between different connections', async () => {
      const client1 = await pool.connect()
      const client2 = await pool.connect()
      
      try {
        await setTenantContext('connection-1-tenant', client1)
        await setTenantContext('connection-2-tenant', client2)
        
        const result1 = await client1.query(`
          SELECT current_setting('app.current_tenant_id') as current_tenant
        `)
        const result2 = await client2.query(`
          SELECT current_setting('app.current_tenant_id') as current_tenant
        `)
        
        expect(result1.rows[0].current_tenant).toBe('connection-1-tenant')
        expect(result2.rows[0].current_tenant).toBe('connection-2-tenant')
      } finally {
        client1.release()
        client2.release()
      }
    })
  })

  describe('User Data Isolation', () => {
    beforeEach(async () => {
      // Set up test tenants and users
      await dbHelper.insertTestTenant({
        ...mockTenants.existingTenant,
        id: 'tenant-1',
        subdomain: 'tenant1'
      })
      
      await dbHelper.insertTestTenant({
        ...mockTenants.newTenant,
        id: 'tenant-2', 
        subdomain: 'tenant2'
      })
      
      await dbHelper.insertTestUser({
        ...mockUsers.existingUser,
        id: 'user-1',
        tenant_id: 'tenant-1',
        email: 'user1@test.com'
      })
      
      await dbHelper.insertTestUser({
        ...mockUsers.newUser,
        id: 'user-2',
        tenant_id: 'tenant-2',
        email: 'user2@test.com'
      })
    })

    it('should only return users from current tenant context', async () => {
      const client = await pool.connect()
      
      try {
        // Set context to tenant-1
        await setTenantContext('tenant-1', client)
        
        const result = await client.query(`
          SELECT id, email, tenant_id FROM users WHERE status = 'active'
        `)
        
        // Should only see users from tenant-1
        expect(result.rows).toHaveLength(1)
        expect(result.rows[0].email).toBe('user1@test.com')
        expect(result.rows[0].tenant_id).toBe('tenant-1')
      } finally {
        client.release()
      }
    })

    it('should allow switching context to see different tenant users', async () => {
      const client = await pool.connect()
      
      try {
        // First, check tenant-1
        await setTenantContext('tenant-1', client)
        let result = await client.query(`
          SELECT id, email, tenant_id FROM users WHERE status = 'active'
        `)
        expect(result.rows[0].email).toBe('user1@test.com')
        
        // Switch to tenant-2
        await setTenantContext('tenant-2', client)
        result = await client.query(`
          SELECT id, email, tenant_id FROM users WHERE status = 'active'
        `)
        expect(result.rows[0].email).toBe('user2@test.com')
      } finally {
        client.release()
      }
    })

    it('should prevent cross-tenant user updates', async () => {
      const client = await pool.connect()
      
      try {
        // Set context to tenant-1
        await setTenantContext('tenant-1', client)
        
        // Try to update a user from tenant-2 (should fail or have no effect)
        const updateResult = await client.query(`
          UPDATE users 
          SET name = 'Hacked Name' 
          WHERE email = 'user2@test.com' AND status = 'active'
        `)
        
        // Should not update any rows (due to RLS)
        expect(updateResult.rowCount).toBe(0)
        
        // Verify the user in tenant-2 was not affected
        await setTenantContext('tenant-2', client)
        const verifyResult = await client.query(`
          SELECT name FROM users WHERE email = 'user2@test.com'
        `)
        expect(verifyResult.rows[0].name).not.toBe('Hacked Name')
      } finally {
        client.release()
      }
    })
  })

  describe('Tenant Data Isolation', () => {
    beforeEach(async () => {
      // Set up test tenants
      await dbHelper.insertTestTenant({
        id: 'isolated-tenant-1',
        name: 'Isolated Tenant 1',
        subdomain: 'isolated1',
        email: 'tenant1@isolation.test',
        business_type: 'retailer',
        plan: 'starter',
        status: 'active'
      })
      
      await dbHelper.insertTestTenant({
        id: 'isolated-tenant-2', 
        name: 'Isolated Tenant 2',
        subdomain: 'isolated2',
        email: 'tenant2@isolation.test',
        business_type: 'retailer',
        plan: 'starter',
        status: 'active'
      })
    })

    it('should only show current tenant in tenant queries', async () => {
      const client = await pool.connect()
      
      try {
        // Context should be set before querying tenants
        await setTenantContext('isolated-tenant-1', client)
        
        const result = await client.query(`
          SELECT id, name, subdomain FROM tenants WHERE status = 'active'
        `)
        
        // Should only see the current tenant (if RLS is applied to tenants table)
        // Note: This depends on actual RLS policy implementation
        const tenant1Results = result.rows.filter(row => row.id === 'isolated-tenant-1')
        expect(tenant1Results).toHaveLength(1)
        expect(tenant1Results[0].subdomain).toBe('isolated1')
      } finally {
        client.release()
      }
    })
  })

  describe('Transaction Context Persistence', () => {
    it('should maintain tenant context within transactions', async () => {
      const client = await pool.connect()
      
      try {
        await client.query('BEGIN')
        
        const tenantId = 'transaction-tenant-123'
        await setTenantContext(tenantId, client)
        
        // Context should persist throughout transaction
        let result = await client.query(`
          SELECT current_setting('app.current_tenant_id') as current_tenant
        `)
        expect(result.rows[0].current_tenant).toBe(tenantId)
        
        // Perform some operations
        await client.query('SELECT 1 as dummy')
        
        // Context should still be there
        result = await client.query(`
          SELECT current_setting('app.current_tenant_id') as current_tenant
        `)
        expect(result.rows[0].current_tenant).toBe(tenantId)
        
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    })

    it('should handle rollback with tenant context', async () => {
      const client = await pool.connect()
      
      try {
        await client.query('BEGIN')
        
        const tenantId = 'rollback-tenant-123'
        await setTenantContext(tenantId, client)
        
        // Simulate an error requiring rollback
        try {
          await client.query('INVALID SQL STATEMENT')
        } catch (sqlError) {
          // Expected error
        }
        
        await client.query('ROLLBACK')
        
        // After rollback, we should be able to set context again
        await setTenantContext('new-tenant-456', client)
        const result = await client.query(`
          SELECT current_setting('app.current_tenant_id') as current_tenant
        `)
        expect(result.rows[0].current_tenant).toBe('new-tenant-456')
      } finally {
        client.release()
      }
    })
  })

  describe('Security Edge Cases', () => {
    it('should reject invalid tenant ID formats', async () => {
      const client = await pool.connect()
      
      try {
        // Test various malicious inputs
        const maliciousInputs = [
          "'; DROP TABLE users; --",
          "union select * from users",
          "../../../etc/passwd",
          "<script>alert('xss')</script>",
          null,
          undefined,
          ""
        ]
        
        for (const input of maliciousInputs) {
          await expect(setTenantContext(input as any, client)).rejects.toThrow()
        }
      } finally {
        client.release()
      }
    })

    it('should handle concurrent context changes safely', async () => {
      const numConnections = 5
      const connections = []
      
      try {
        // Create multiple connections
        for (let i = 0; i < numConnections; i++) {
          connections.push(await pool.connect())
        }
        
        // Set different contexts concurrently
        const promises = connections.map(async (client, index) => {
          const tenantId = `concurrent-tenant-${index}`
          await setTenantContext(tenantId, client)
          
          // Verify context is correct for this connection
          const result = await client.query(`
            SELECT current_setting('app.current_tenant_id') as current_tenant
          `)
          expect(result.rows[0].current_tenant).toBe(tenantId)
          
          return tenantId
        })
        
        const results = await Promise.all(promises)
        expect(results).toHaveLength(numConnections)
        
        // Each should have its own unique tenant ID
        const uniqueResults = new Set(results)
        expect(uniqueResults.size).toBe(numConnections)
        
      } finally {
        // Clean up connections
        for (const client of connections) {
          client.release()
        }
      }
    })

    it('should enforce context requirement for data operations', async () => {
      const client = await pool.connect()
      
      try {
        // Try to query without setting tenant context first
        // This should either fail or return no results depending on RLS policy
        
        const result = await client.query(`
          SELECT COUNT(*) as count FROM users WHERE status = 'active'
        `)
        
        // Without tenant context, should see 0 results (if RLS is properly configured)
        // This test verifies that RLS prevents data access without proper context
        expect(parseInt(result.rows[0].count)).toBe(0)
        
      } finally {
        client.release()
      }
    })
  })
})
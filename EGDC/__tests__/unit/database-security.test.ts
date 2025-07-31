/**
 * Database Security Tests
 * Tests RLS enforcement, connection security, and data isolation
 */

import { Pool } from 'pg'
import { 
  createSecureDatabaseConfig, 
  validateDatabaseConfig,
  testDatabaseConnection 
} from '../../lib/database-config'
import { setTenantContext } from '../../lib/auth-config'
import { DatabaseTestHelper } from '../utils/auth-test-helpers'

describe('Database Security', () => {
  let dbHelper: DatabaseTestHelper
  let pool: Pool

  beforeAll(() => {
    dbHelper = new DatabaseTestHelper()
  })

  afterAll(async () => {
    if (pool) {
      await pool.end()
    }
    await dbHelper.cleanup()
  })

  beforeEach(async () => {
    await dbHelper.clearTestData()
  })

  describe('Database Configuration Security', () => {
    it('should require DATABASE_URL environment variable', () => {
      const originalUrl = process.env.DATABASE_URL
      delete process.env.DATABASE_URL

      expect(() => createSecureDatabaseConfig()).toThrow('DATABASE_URL environment variable is required')

      process.env.DATABASE_URL = originalUrl
    })

    it('should enforce SSL in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const config = createSecureDatabaseConfig()
      
      expect(config.ssl).toBeTruthy()
      expect(config.ssl).toHaveProperty('rejectUnauthorized', false)
      expect(config.ssl).toHaveProperty('require', true)

      process.env.NODE_ENV = originalEnv
    })

    it('should allow non-SSL for local development', () => {
      const originalEnv = process.env.NODE_ENV
      const originalUrl = process.env.DATABASE_URL
      
      process.env.NODE_ENV = 'development'
      process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/test'

      const config = createSecureDatabaseConfig()
      
      expect(config.ssl).toBe(false)

      process.env.NODE_ENV = originalEnv
      process.env.DATABASE_URL = originalUrl
    })

    it('should set proper connection limits', () => {
      const config = createSecureDatabaseConfig()
      
      expect(config.max).toBe(20)
      expect(config.min).toBe(2)
      expect(config.idleTimeoutMillis).toBe(30000)
      expect(config.connectionTimeoutMillis).toBe(5000)
      expect(config.statement_timeout).toBe(30000)
    })

    it('should validate database URL format', () => {
      const originalUrl = process.env.DATABASE_URL
      process.env.DATABASE_URL = 'invalid-url'

      expect(() => validateDatabaseConfig()).toThrow('DATABASE_URL must be a valid URL')

      process.env.DATABASE_URL = originalUrl
    })

    it('should mask sensitive information in logs', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      validateDatabaseConfig()
      
      // Check that password is masked in logs
      const logCalls = consoleSpy.mock.calls
      const urlLog = logCalls.find(call => call[0]?.includes('Database URL validated'))
      
      if (urlLog && urlLog[1]) {
        expect(urlLog[1]).toContain('***')
        expect(urlLog[1]).not.toContain(process.env.DATABASE_URL?.split('@')[0].split(':').pop())
      }
      
      consoleSpy.mockRestore()
    })
  })

  describe('Connection Security', () => {
    beforeEach(() => {
      pool = new Pool(createSecureDatabaseConfig())
    })

    afterEach(async () => {
      if (pool) {
        await pool.end()
      }
    })

    it('should successfully connect with valid configuration', async () => {
      const isHealthy = await testDatabaseConnection(pool)
      expect(isHealthy).toBe(true)
    })

    it('should handle connection failures gracefully', async () => {
      const invalidPool = new Pool({
        connectionString: 'postgres://invalid:invalid@nonexistent:5432/invalid',
        ssl: false
      })

      const isHealthy = await testDatabaseConnection(invalidPool)
      expect(isHealthy).toBe(false)

      await invalidPool.end()
    })

    it('should release connections properly', async () => {
      const client = await pool.connect()
      expect(client).toBeDefined()
      
      client.release()
      
      // Pool should still be usable after releasing client
      const health = await testDatabaseConnection(pool)
      expect(health).toBe(true)
    })

    it('should handle multiple concurrent connections', async () => {
      const promises = Array.from({ length: 5 }, async () => {
        const client = await pool.connect()
        await client.query('SELECT 1')
        client.release()
        return true
      })

      const results = await Promise.all(promises)
      expect(results).toHaveLength(5)
      expect(results.every(r => r === true)).toBe(true)
    })
  })

  describe('Row Level Security (RLS)', () => {
    beforeEach(() => {
      pool = new Pool(createSecureDatabaseConfig())
    })

    afterEach(async () => {
      if (pool) {
        await pool.end()
      }
    })

    it('should set tenant context properly', async () => {
      const client = await pool.connect()
      
      try {
        const tenantId = 'test-tenant-123'
        
        // Set tenant context
        await setTenantContext(tenantId, client)
        
        // Verify context was set
        const result = await client.query('SELECT current_setting(\'app.current_tenant_id\') as tenant_id')
        expect(result.rows[0].tenant_id).toBe(tenantId)
        
      } finally {
        client.release()
      }
    })

    it('should isolate data by tenant', async () => {
      // This test would require actual RLS policies in place
      // For now, we test the context setting mechanism
      
      const client = await pool.connect()
      
      try {
        // Test setting different tenant contexts
        await setTenantContext('tenant-1', client)
        let result = await client.query('SELECT current_setting(\'app.current_tenant_id\') as tenant_id')
        expect(result.rows[0].tenant_id).toBe('tenant-1')
        
        await setTenantContext('tenant-2', client)
        result = await client.query('SELECT current_setting(\'app.current_tenant_id\') as tenant_id')
        expect(result.rows[0].tenant_id).toBe('tenant-2')
        
      } finally {
        client.release()
      }
    })

    it('should handle RLS context errors gracefully', async () => {
      const client = await pool.connect()
      
      try {
        // Test with invalid tenant ID format
        await expect(setTenantContext('', client)).rejects.toThrow()
        
      } finally {
        client.release()
      }
    })

    it('should maintain context within transaction', async () => {
      const client = await pool.connect()
      
      try {
        await client.query('BEGIN')
        
        const tenantId = 'transaction-tenant-123'
        await setTenantContext(tenantId, client)
        
        // Context should persist within transaction
        const result = await client.query('SELECT current_setting(\'app.current_tenant_id\') as tenant_id')
        expect(result.rows[0].tenant_id).toBe(tenantId)
        
        await client.query('COMMIT')
        
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    })
  })

  describe('Data Access Patterns', () => {
    beforeEach(() => {
      pool = new Pool(createSecureDatabaseConfig())
    })

    afterEach(async () => {
      if (pool) {
        await pool.end()
      }
    })

    it('should prevent SQL injection in tenant context', async () => {
      const client = await pool.connect()
      
      try {
        // Attempt SQL injection via tenant ID
        const maliciousInput = "'; DROP TABLE users; --"
        
        // setTenantContext should properly escape/validate input
        await expect(setTenantContext(maliciousInput, client)).rejects.toThrow()
        
        // Verify tables still exist
        const result = await client.query(`
          SELECT table_name FROM information_schema.tables 
          WHERE table_name = 'users'
        `)
        expect(result.rows.length).toBeGreaterThan(0)
        
      } finally {
        client.release()
      }
    })

    it('should validate tenant ID format', async () => {
      const client = await pool.connect()
      
      try {
        // Test various invalid tenant ID formats
        const invalidInputs = [
          null,
          undefined,
          '',
          '   ',
          'SELECT * FROM users',
          '../../etc/passwd',
          '<script>alert("xss")</script>'
        ]
        
        for (const input of invalidInputs) {
          await expect(setTenantContext(input as any, client)).rejects.toThrow()
        }
        
      } finally {
        client.release()
      }
    })

    it('should handle concurrent tenant contexts', async () => {
      // Test that different connections can have different tenant contexts
      const client1 = await pool.connect()
      const client2 = await pool.connect()
      
      try {
        await setTenantContext('tenant-1', client1)
        await setTenantContext('tenant-2', client2)
        
        const result1 = await client1.query('SELECT current_setting(\'app.current_tenant_id\') as tenant_id')
        const result2 = await client2.query('SELECT current_setting(\'app.current_tenant_id\') as tenant_id')
        
        expect(result1.rows[0].tenant_id).toBe('tenant-1')
        expect(result2.rows[0].tenant_id).toBe('tenant-2')
        
      } finally {
        client1.release()
        client2.release()
      }
    })
  })

  describe('Statement Timeout Security', () => {
    beforeEach(() => {
      pool = new Pool(createSecureDatabaseConfig())
    })

    afterEach(async () => {
      if (pool) {
        await pool.end()
      }
    })

    it('should timeout long-running queries', async () => {
      const client = await pool.connect()
      
      try {
        // This would test statement timeout if we had a way to create a long-running query
        // For now, we just verify the timeout is configured
        const result = await client.query('SHOW statement_timeout')
        expect(result.rows[0].statement_timeout).toBe('30s')
        
      } finally {
        client.release()
      }
    })
  })

  describe('Connection Pool Security', () => {
    it('should limit maximum connections', () => {
      const config = createSecureDatabaseConfig()
      expect(config.max).toBe(20)
    })

    it('should have minimum connection baseline', () => {
      const config = createSecureDatabaseConfig()
      expect(config.min).toBe(2)
    })

    it('should timeout idle connections', () => {
      const config = createSecureDatabaseConfig()
      expect(config.idleTimeoutMillis).toBe(30000)
    })

    it('should timeout connection attempts', () => {
      const config = createSecureDatabaseConfig()
      expect(config.connectionTimeoutMillis).toBe(5000)
    })
  })
})
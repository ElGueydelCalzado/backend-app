/**
 * Database Test Setup Utilities
 * Provides database initialization and cleanup for testing
 */

import { Pool, Client } from 'pg'
import { createSecureDatabaseConfig } from '../../lib/database-config'
import { testTenants, testUsers, testProducts } from '../fixtures/test-data'

export class TestDatabaseSetup {
  private pool: Pool
  private setupComplete: boolean = false

  constructor() {
    this.pool = new Pool({
      ...createSecureDatabaseConfig(),
      connectionString: process.env.DATABASE_URL || 'postgres://test:test@localhost:5432/egdc_test'
    })
  }

  async initialize(): Promise<void> {
    if (this.setupComplete) return

    const client = await this.pool.connect()
    
    try {
      console.log('🔧 Initializing test database...')
      
      // Create test schema if it doesn't exist
      await client.query(`CREATE SCHEMA IF NOT EXISTS test_schema`)
      
      // Set search path to test schema
      await client.query(`SET search_path TO test_schema, public`)
      
      // Create tables if they don't exist (basic structure for testing)
      await this.createTestTables(client)
      
      // Set up test data
      await this.seedTestData(client)
      
      this.setupComplete = true
      console.log('✅ Test database initialization complete')
      
    } catch (error) {
      console.error('❌ Test database initialization failed:', error)
      throw error
    } finally {
      client.release()
    }
  }

  private async createTestTables(client: Client): Promise<void> {
    // Create tenants table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        subdomain VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        business_type VARCHAR(50) DEFAULT 'retailer',
        plan VARCHAR(50) DEFAULT 'starter',
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        google_id VARCHAR(255),
        status VARCHAR(20) DEFAULT 'active',
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create products table for inventory testing
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(255) PRIMARY KEY,
        tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100),
        price DECIMAL(10,2),
        quantity INTEGER DEFAULT 0,
        category VARCHAR(100),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create indexes for performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain)`)

    // Create RLS policies for testing (if RLS is enabled)
    try {
      await client.query(`ALTER TABLE users ENABLE ROW LEVEL SECURITY`)
      await client.query(`ALTER TABLE products ENABLE ROW LEVEL SECURITY`)
      
      // Create policy for users table
      await client.query(`
        CREATE POLICY IF NOT EXISTS tenant_isolation_users ON users
        USING (tenant_id = current_setting('app.current_tenant_id', true))
      `)
      
      // Create policy for products table  
      await client.query(`
        CREATE POLICY IF NOT EXISTS tenant_isolation_products ON products
        USING (tenant_id = current_setting('app.current_tenant_id', true))
      `)
      
    } catch (error) {
      // RLS setup is optional for basic testing
      console.warn('⚠️ RLS setup skipped (may not be supported):', error.message)
    }
  }

  private async seedTestData(client: Client): Promise<void> {
    // Insert test tenants
    for (const tenant of Object.values(testTenants)) {
      await client.query(`
        INSERT INTO tenants (id, name, subdomain, email, business_type, plan, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          subdomain = EXCLUDED.subdomain,
          email = EXCLUDED.email,
          business_type = EXCLUDED.business_type,
          plan = EXCLUDED.plan,
          status = EXCLUDED.status,
          updated_at = CURRENT_TIMESTAMP
      `, [tenant.id, tenant.name, tenant.subdomain, tenant.email, tenant.business_type, tenant.plan, tenant.status])
    }

    // Insert test users
    for (const user of Object.values(testUsers)) {
      await client.query(`
        INSERT INTO users (id, tenant_id, email, name, role, google_id, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          tenant_id = EXCLUDED.tenant_id,
          email = EXCLUDED.email,
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          google_id = EXCLUDED.google_id,
          status = EXCLUDED.status,
          updated_at = CURRENT_TIMESTAMP
      `, [user.id, user.tenant_id, user.email, user.name, user.role, user.google_id, user.status])
    }

    // Insert test products
    for (const product of Object.values(testProducts)) {
      await client.query(`
        INSERT INTO products (id, tenant_id, name, sku, price, quantity, category, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          tenant_id = EXCLUDED.tenant_id,
          name = EXCLUDED.name,
          sku = EXCLUDED.sku,
          price = EXCLUDED.price,
          quantity = EXCLUDED.quantity,
          category = EXCLUDED.category,
          status = EXCLUDED.status,
          updated_at = CURRENT_TIMESTAMP
      `, [product.id, product.tenant_id, product.name, product.sku, product.price, product.quantity, product.category, product.status])
    }
  }

  async cleanupTestData(): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      // Clean up in reverse order of dependencies
      await client.query(`DELETE FROM products WHERE tenant_id LIKE '%test%' OR name LIKE '%Test%'`)
      await client.query(`DELETE FROM users WHERE email LIKE '%@fixtures.test' OR email LIKE '%@test.com'`)
      await client.query(`DELETE FROM tenants WHERE email LIKE '%@fixtures.test' OR email LIKE '%@test.com'`)
      
      console.log('🧹 Test data cleanup completed')
    } catch (error) {
      console.error('❌ Test data cleanup failed:', error)
    } finally {
      client.release()
    }
  }

  async resetTestData(): Promise<void> {
    await this.cleanupTestData()
    const client = await this.pool.connect()
    
    try {
      await this.seedTestData(client)
      console.log('🔄 Test data reset completed')
    } catch (error) {
      console.error('❌ Test data reset failed:', error)
      throw error
    } finally {
      client.release()
    }
  }

  async getConnection(): Promise<Client> {
    return await this.pool.connect()
  }

  async close(): Promise<void> {
    await this.pool.end()
    this.setupComplete = false
  }

  async executeInTransaction<T>(callback: (client: Client) => Promise<T>): Promise<T> {
    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')
      const result = await callback(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async setTenantContext(tenantId: string, client?: Client): Promise<Client | void> {
    const dbClient = client || await this.pool.connect()
    
    try {
      await dbClient.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [tenantId])
      
      if (!client) {
        return dbClient
      }
    } catch (error) {
      if (!client) {
        dbClient.release()
      }
      throw error
    }
  }

  async verifyTableExists(tableName: string): Promise<boolean> {
    const client = await this.pool.connect()
    
    try {
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = $1
      `, [tableName])
      
      return result.rows.length > 0
    } finally {
      client.release()
    }
  }

  async getRowCount(tableName: string, whereClause?: string, params?: any[]): Promise<number> {
    const client = await this.pool.connect()
    
    try {
      let query = `SELECT COUNT(*) as count FROM ${tableName}`
      if (whereClause) {
        query += ` WHERE ${whereClause}`
      }
      
      const result = await client.query(query, params)
      return parseInt(result.rows[0].count)
    } finally {
      client.release()
    }
  }

  async waitForCondition(
    condition: () => Promise<boolean>, 
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return
      }
      await new Promise(resolve => setTimeout(resolve, interval))
    }
    
    throw new Error(`Condition not met within ${timeout}ms timeout`)
  }
}

// Global test database instance
export const testDb = new TestDatabaseSetup()

// Test database lifecycle hooks
export const setupTestDatabase = async () => {
  await testDb.initialize()
}

export const cleanupTestDatabase = async () => {
  await testDb.cleanupTestData()
}

export const teardownTestDatabase = async () => {
  await testDb.close()
}
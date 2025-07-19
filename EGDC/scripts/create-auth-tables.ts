import { Pool } from 'pg'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function createAuthTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  })

  try {
    console.log('🏗️ Creating authentication tables...')
    
    // Create tenants table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        subdomain VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        plan VARCHAR(50) NOT NULL DEFAULT 'starter',
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    console.log('✅ Tenants table created')
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'admin',
        google_id VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        last_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    console.log('✅ Users table created')
    
    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
    `)
    console.log('✅ Indexes created')
    
    // Test the setup
    console.log('\n🧪 Testing authentication tables...')
    
    // Test tenant creation
    const tenantResult = await pool.query(`
      INSERT INTO tenants (name, subdomain, email, plan, status)
      VALUES ('Test Company', 'test-company-123', 'test@company.com', 'starter', 'active')
      RETURNING id, name, subdomain
    `)
    console.log('✅ Test tenant created:', tenantResult.rows[0])
    
    // Test user creation
    const userResult = await pool.query(`
      INSERT INTO users (tenant_id, email, name, role, google_id, status)
      VALUES ($1, 'user@company.com', 'Test User', 'admin', 'google123', 'active')
      RETURNING id, email, name, role
    `, [tenantResult.rows[0].id])
    console.log('✅ Test user created:', userResult.rows[0])
    
    // Clean up test data
    await pool.query('DELETE FROM users WHERE email = $1', ['user@company.com'])
    await pool.query('DELETE FROM tenants WHERE subdomain = $1', ['test-company-123'])
    console.log('✅ Test data cleaned up')
    
    console.log('\n🎉 Authentication tables ready for multi-tenant OAuth!')
    
  } catch (error) {
    console.error('❌ Error creating auth tables:', error)
  } finally {
    await pool.end()
  }
}

createAuthTables()
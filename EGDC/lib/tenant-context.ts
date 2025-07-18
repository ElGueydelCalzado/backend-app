// Multi-Tenant Context Management for Google Cloud PostgreSQL
import { Pool } from 'pg'
import { getServerSession } from 'next-auth'
import { authConfig } from './auth-config-multi-tenant'
import { NextRequest } from 'next/server'

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Extended session type with tenant information
export interface TenantSession {
  user: {
    id: string
    email: string
    name: string
    tenant_id: string
    role: string
    tenant_name: string
    tenant_subdomain: string
  }
}

// Get tenant context from session
export async function getTenantContext(req: NextRequest): Promise<TenantSession | null> {
  try {
    const session = await getServerSession(authConfig) as TenantSession
    
    if (!session?.user?.tenant_id) {
      console.log('❌ No tenant context found in session')
      return null
    }
    
    return session
  } catch (error) {
    console.error('❌ Error getting tenant context:', error)
    return null
  }
}

// Get database client with tenant context set
export async function getTenantClient(tenantId: string) {
  const client = await pool.connect()
  
  try {
    // Set tenant context for Row Level Security
    await client.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [tenantId])
    return client
  } catch (error) {
    client.release()
    throw error
  }
}

// Execute query with tenant context
export async function executeWithTenant<T>(
  tenantId: string,
  query: string,
  params?: any[]
): Promise<T[]> {
  const client = await getTenantClient(tenantId)
  
  try {
    const result = await client.query(query, params)
    return result.rows
  } finally {
    client.release()
  }
}

// Validate tenant access
export async function validateTenantAccess(
  userId: string,
  tenantId: string
): Promise<boolean> {
  const client = await pool.connect()
  
  try {
    const result = await client.query(`
      SELECT 1 FROM users 
      WHERE id = $1 AND tenant_id = $2 AND status = 'active'
    `, [userId, tenantId])
    
    return result.rows.length > 0
  } finally {
    client.release()
  }
}

// Get tenant information
export async function getTenantInfo(tenantId: string) {
  const client = await pool.connect()
  
  try {
    const result = await client.query(`
      SELECT 
        id,
        name,
        subdomain,
        email,
        plan,
        status,
        created_at
      FROM tenants 
      WHERE id = $1
    `, [tenantId])
    
    return result.rows[0] || null
  } finally {
    client.release()
  }
}

// Create new tenant (for registration)
export async function createTenant(data: {
  name: string
  subdomain: string
  email: string
  plan?: string
}) {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    // Check if subdomain is available
    const existing = await client.query(`
      SELECT 1 FROM tenants WHERE subdomain = $1
    `, [data.subdomain])
    
    if (existing.rows.length > 0) {
      throw new Error('Subdomain already exists')
    }
    
    // Create tenant
    const tenantResult = await client.query(`
      INSERT INTO tenants (name, subdomain, email, plan, status)
      VALUES ($1, $2, $3, $4, 'active')
      RETURNING *
    `, [data.name, data.subdomain, data.email, data.plan || 'starter'])
    
    const tenant = tenantResult.rows[0]
    
    await client.query('COMMIT')
    return tenant
    
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// Create new user within tenant
export async function createUser(data: {
  tenant_id: string
  email: string
  name: string
  role?: string
  google_id?: string
}) {
  const client = await pool.connect()
  
  try {
    const result = await client.query(`
      INSERT INTO users (tenant_id, email, name, role, google_id, status)
      VALUES ($1, $2, $3, $4, $5, 'active')
      RETURNING *
    `, [
      data.tenant_id,
      data.email,
      data.name,
      data.role || 'employee',
      data.google_id
    ])
    
    return result.rows[0]
    
  } finally {
    client.release()
  }
}

// Get user with tenant information
export async function getUserWithTenant(email: string) {
  const client = await pool.connect()
  
  try {
    const result = await client.query(`
      SELECT 
        u.id,
        u.tenant_id,
        u.email,
        u.name,
        u.role,
        u.google_id,
        u.status,
        t.name as tenant_name,
        t.subdomain as tenant_subdomain,
        t.plan as tenant_plan
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      WHERE u.email = $1 AND u.status = 'active' AND t.status = 'active'
    `, [email])
    
    return result.rows[0] || null
    
  } finally {
    client.release()
  }
}

// Update user last login
export async function updateUserLogin(userId: string, googleId?: string) {
  const client = await pool.connect()
  
  try {
    await client.query(`
      UPDATE users 
      SET last_login = NOW(), google_id = COALESCE($2, google_id)
      WHERE id = $1
    `, [userId, googleId])
    
  } finally {
    client.release()
  }
}

// Clean up pool on app shutdown
export async function closeTenantPool() {
  await pool.end()
}

// Export pool for direct access if needed
export { pool as tenantPool }
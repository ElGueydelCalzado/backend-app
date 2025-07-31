/**
 * Authentication Test Utilities
 * Provides mocking and helper functions for testing authentication flows
 */

import { Pool } from 'pg'
import { createSecureDatabaseConfig } from '../../lib/database-config'

// Mock user data for testing
export const mockUsers = {
  existingUser: {
    id: 'existing-user-id',
    email: 'existing@example.com',
    name: 'Existing User',
    google_id: 'google-existing-123',
    tenant_id: 'existing-tenant-id',
    role: 'admin',
    status: 'active'
  },
  newUser: {
    id: 'new-user-id', 
    email: 'newuser@example.com',
    name: 'New User',
    google_id: 'google-new-456',
    tenant_id: 'new-tenant-id',
    role: 'admin',
    status: 'active'
  }
}

// Mock tenant data for testing
export const mockTenants = {
  existingTenant: {
    id: 'existing-tenant-id',
    name: 'Existing Business',
    subdomain: 'existing',
    email: 'existing@example.com',
    business_type: 'retailer',
    plan: 'starter',
    status: 'active'
  },
  newTenant: {
    id: 'new-tenant-id',
    name: 'New Business',
    subdomain: 'newuser',
    email: 'newuser@example.com', 
    business_type: 'retailer',
    plan: 'starter',
    status: 'active'
  }
}

// Mock Google OAuth profile
export const mockGoogleProfile = {
  id: 'google-profile-123',
  email: 'test@example.com',
  name: 'Test User',
  picture: 'https://example.com/avatar.jpg',
  verified_email: true
}

// Mock NextAuth objects
export const mockNextAuthAccount = {
  provider: 'google',
  type: 'oauth',
  providerAccountId: 'google-provider-123',
  access_token: 'mock-access-token',
  token_type: 'Bearer',
  scope: 'openid email profile'
}

export const mockNextAuthToken = {
  sub: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  tenant_id: 'test-tenant-id',
  role: 'admin',
  tenant_name: 'Test Business',
  tenant_subdomain: 'test',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 86400 // 24 hours
}

export const mockNextAuthSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    tenant_id: 'test-tenant-id',
    role: 'admin',
    tenant_name: 'Test Business',
    tenant_subdomain: 'test'
  },
  expires: new Date(Date.now() + 86400000).toISOString() // 24 hours
}

/**
 * Database test helpers
 */
export class DatabaseTestHelper {
  private pool: Pool
  
  constructor() {
    this.pool = new Pool({
      ...createSecureDatabaseConfig(),
      // Override for test database
      connectionString: process.env.DATABASE_URL || 'postgres://test:test@localhost:5432/egdc_test'
    })
  }
  
  async connect() {
    return await this.pool.connect()
  }
  
  async cleanup() {
    await this.pool.end()
  }
  
  async clearTestData() {
    const client = await this.connect()
    try {
      // Clear test data in proper order (respecting foreign keys)
      await client.query('DELETE FROM users WHERE email LIKE \'%@test.com\' OR email LIKE \'%@example.com\'')
      await client.query('DELETE FROM tenants WHERE email LIKE \'%@test.com\' OR email LIKE \'%@example.com\'')
    } finally {
      client.release()
    }
  }
  
  async insertTestTenant(tenant: any) {
    const client = await this.connect()
    try {
      const result = await client.query(`
        INSERT INTO tenants (id, name, subdomain, email, business_type, plan, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          subdomain = EXCLUDED.subdomain,
          email = EXCLUDED.email,
          business_type = EXCLUDED.business_type,
          plan = EXCLUDED.plan,
          status = EXCLUDED.status
        RETURNING *
      `, [tenant.id, tenant.name, tenant.subdomain, tenant.email, tenant.business_type, tenant.plan, tenant.status])
      
      return result.rows[0]
    } finally {
      client.release()
    }
  }
  
  async insertTestUser(user: any) {
    const client = await this.connect()
    try {
      const result = await client.query(`
        INSERT INTO users (id, tenant_id, email, name, role, google_id, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (email) DO UPDATE SET
          tenant_id = EXCLUDED.tenant_id,
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          google_id = EXCLUDED.google_id,
          status = EXCLUDED.status
        RETURNING *
      `, [user.id, user.tenant_id, user.email, user.name, user.role, user.google_id, user.status])
      
      return result.rows[0]
    } finally {
      client.release()
    }
  }
  
  async getUserByEmail(email: string) {
    const client = await this.connect()
    try {
      const result = await client.query(`
        SELECT u.*, t.name as tenant_name, t.subdomain as tenant_subdomain
        FROM users u
        JOIN tenants t ON u.tenant_id = t.id
        WHERE u.email = $1
      `, [email])
      
      return result.rows[0] || null
    } finally {
      client.release()
    }
  }
  
  async getTenantBySubdomain(subdomain: string) {
    const client = await this.connect()
    try {
      const result = await client.query('SELECT * FROM tenants WHERE subdomain = $1', [subdomain])
      return result.rows[0] || null
    } finally {
      client.release()
    }
  }
}

/**
 * Mock authentication providers
 */
export const mockAuthProviders = {
  google: jest.fn().mockImplementation(() => ({
    id: 'google',
    name: 'Google',
    type: 'oauth',
    clientId: 'test-google-client-id',
    clientSecret: 'test-google-client-secret'
  })),
  
  credentials: jest.fn().mockImplementation(() => ({
    id: 'test-account', 
    name: 'Test Account',
    type: 'credentials',
    authorize: jest.fn()
  }))
}

/**
 * Mock NextAuth configuration for testing
 */
export const createMockAuthConfig = (overrides = {}) => ({
  providers: [mockAuthProviders.google(), mockAuthProviders.credentials()],
  pages: {
    signIn: '/login',
    error: '/login'
  },
  callbacks: {
    signIn: jest.fn().mockResolvedValue(true),
    redirect: jest.fn().mockResolvedValue('/dashboard'),
    session: jest.fn().mockResolvedValue(mockNextAuthSession),
    jwt: jest.fn().mockResolvedValue(mockNextAuthToken)
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60 // 24 hours
  },
  secret: 'test-secret',
  debug: false,
  ...overrides
})

/**
 * Test utilities for mocking HTTP requests
 */
export const createMockRequest = (overrides = {}) => ({
  url: 'http://localhost:3001/api/auth/callback/google',
  method: 'GET',
  headers: {
    'host': 'localhost:3001',
    'user-agent': 'test-agent',
    'cookie': 'next-auth.session-token=test-token'
  },
  query: {},
  body: {},
  ...overrides
})

export const createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis()
  }
  return res
}
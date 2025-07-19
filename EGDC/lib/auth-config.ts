// Multi-Tenant SaaS Authentication Configuration
import GoogleProvider from 'next-auth/providers/google'
import type { NextAuthOptions } from 'next-auth'
import { Pool } from 'pg'

// Database connection for auth operations
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') 
    ? false 
    : { rejectUnauthorized: false }
})

// Test connection at startup
pool.connect()
  .then(client => {
    console.log('✅ Auth database connection established')
    client.release()
  })
  .catch(err => {
    console.error('❌ Auth database connection failed:', err)
  })

// Extended user type with tenant information
declare module 'next-auth' {
  interface User {
    tenant_id: string
    role: string
    tenant_name: string
    tenant_subdomain: string
  }
  
  interface Session {
    user: {
      id: string
      name: string
      email: string
      tenant_id: string
      role: string
      tenant_name: string
      tenant_subdomain: string
    }
    error?: string
  }
}

// Helper function to get or create user with tenant
async function getOrCreateUser(email: string, name: string, googleId: string) {
  console.log('🔍 getOrCreateUser called:', { email, name, googleId })
  
  let client
  try {
    client = await pool.connect()
    console.log('✅ Database connection established')
    
    await client.query('BEGIN')
    console.log('✅ Transaction started')
    
    // Check if user exists
    const userResult = await client.query(`
      SELECT 
        u.id,
        u.tenant_id,
        u.role,
        u.name,
        u.email,
        t.name as tenant_name,
        t.subdomain as tenant_subdomain
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      WHERE u.email = $1
    `, [email])
    
    if (userResult.rows.length > 0) {
      // Update last login
      await client.query(`
        UPDATE users 
        SET last_login = NOW(), google_id = $1 
        WHERE email = $2
      `, [googleId, email])
      
      await client.query('COMMIT')
      return userResult.rows[0]
    }
    
    // User doesn't exist - this is a new registration via Google OAuth
    // Create a default tenant for one-click sign-up
    // Business details can be updated later in account settings
    
    const subdomain = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + Math.random().toString(36).substring(7)
    const tenantName = name || email.split('@')[0] + ' Business'
    
    // Create new tenant
    const tenantResult = await client.query(`
      INSERT INTO tenants (name, subdomain, email, plan, status)
      VALUES ($1, $2, $3, 'starter', 'active')
      RETURNING id, name, subdomain
    `, [tenantName, subdomain, email])
    
    const tenant = tenantResult.rows[0]
    
    // Create new user as admin of their tenant
    const newUserResult = await client.query(`
      INSERT INTO users (tenant_id, email, name, role, google_id, status)
      VALUES ($1, $2, $3, 'admin', $4, 'active')
      RETURNING id, tenant_id, role, name, email
    `, [tenant.id, email, name, googleId])
    
    const newUser = newUserResult.rows[0]
    
    await client.query('COMMIT')
    
    return {
      id: newUser.id,
      tenant_id: newUser.tenant_id,
      role: newUser.role,
      name: newUser.name,
      email: newUser.email,
      tenant_name: tenant.name,
      tenant_subdomain: tenant.subdomain
    }
    
  } catch (error) {
    console.error('❌ Error in getOrCreateUser:', error)
    if (client) {
      try {
        await client.query('ROLLBACK')
        console.log('✅ Transaction rolled back')
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError)
      }
    }
    throw error
  } finally {
    if (client) {
      try {
        client.release()
        console.log('✅ Database connection released')
      } catch (releaseError) {
        console.error('❌ Connection release failed:', releaseError)
      }
    }
  }
}

export const authConfig: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('🔍 SignIn:', {
        email: user?.email,
        provider: account?.provider,
        useMockData: process.env.USE_MOCK_DATA
      })
      
      // Allow all Google OAuth users
      if (account?.provider === 'google' && user?.email) {
        return true
      }
      
      return false
    },
    
    async session({ session, token }) {
      console.log('🔍 Session callback:', {
        hasSession: !!session,
        hasToken: !!token,
        useMockData: process.env.USE_MOCK_DATA
      })
      
      if (session?.user && token) {
        session.user.id = token.sub as string
        session.user.tenant_id = token.tenant_id as string || 'mock-tenant'
        session.user.role = token.role as string || 'admin'
        session.user.tenant_name = token.tenant_name as string || 'Preview Environment'
        session.user.tenant_subdomain = token.tenant_subdomain as string || 'preview'
      }
      
      return session
    },
    
    async jwt({ token, user, account }) {
      console.log('🔍 JWT Start:', {
        hasAccount: !!account,
        hasUser: !!user,
        hasToken: !!token,
        userEmail: user?.email,
        useMockData: process.env.USE_MOCK_DATA
      })
      
      if (account && user) {
        console.log('🔍 JWT: First sign in for:', user.email)
        
        // Check if we're in preview/mock mode
        if (process.env.USE_MOCK_DATA === 'true') {
          console.log('🔍 JWT: Using mock data - skipping database')
          // Mock tenant data for preview environment
          token.tenant_id = 'mock-tenant-id'
          token.role = 'admin'
          token.tenant_name = 'Preview Environment'
          token.tenant_subdomain = 'preview'
        } else {
          console.log('🔍 JWT: Using real database')
          try {
            const userData = await getOrCreateUser(
              user.email,
              user.name || user.email,
              account.providerAccountId
            )
            
            token.tenant_id = userData.tenant_id
            token.role = userData.role
            token.tenant_name = userData.tenant_name
            token.tenant_subdomain = userData.tenant_subdomain
          } catch (error) {
            console.error('❌ Database error:', error?.message)
            // Fallback to mock data if database fails
            token.tenant_id = 'fallback-tenant'
            token.role = 'admin'
            token.tenant_name = 'Fallback Environment'
            token.tenant_subdomain = 'fallback'
          }
        }
      }
      
      console.log('🔍 JWT: Returning token with tenant_id:', token.tenant_id)
      return token
    },
  },
  
  pages: {
    signIn: '/login',
    error: '/login',
  },
  
  debug: true,
  
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
  
  secret: process.env.NEXTAUTH_SECRET,
}

// Helper function to get tenant context for API routes
export async function getTenantContext(userId: string) {
  const client = await pool.connect()
  
  try {
    const result = await client.query(`
      SELECT 
        u.tenant_id,
        t.name as tenant_name,
        t.subdomain as tenant_subdomain,
        u.role
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      WHERE u.id = $1
    `, [userId])
    
    return result.rows[0] || null
  } finally {
    client.release()
  }
}

// Helper function to set tenant context for RLS
export async function setTenantContext(tenantId: string) {
  const client = await pool.connect()
  
  try {
    await client.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [tenantId])
    return client
  } catch (error) {
    client.release()
    throw error
  }
}
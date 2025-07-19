// Multi-Tenant SaaS Authentication Configuration
import GoogleProvider from 'next-auth/providers/google'
import type { NextAuthOptions } from 'next-auth'
import { Pool } from 'pg'

// Database connection for auth operations
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
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
  }
}

// Helper function to get or create user with tenant
async function getOrCreateUser(email: string, name: string, googleId: string) {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
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
    await client.query('ROLLBACK')
    console.error('Error in getOrCreateUser:', error)
    throw error
  } finally {
    client.release()
  }
}

export const authConfig: NextAuthOptions = {
  debug: process.env.NODE_ENV === 'development',
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('🔍 Multi-Tenant SignIn Debug:', {
        user: {
          email: user?.email,
          name: user?.name,
          id: user?.id
        },
        account: {
          provider: account?.provider,
          providerAccountId: account?.providerAccountId,
          type: account?.type
        },
        profile: profile ? 'Present' : 'Missing',
        timestamp: new Date().toISOString()
      })
      
      // Allow all Google OAuth users - they'll get their own tenant
      if (account?.provider === 'google' && user?.email) {
        console.log('✅ Google OAuth user allowed:', user.email)
        return true
      }
      
      console.log('❌ SignIn rejected - not Google OAuth or missing email')
      return false
    },
    
    async session({ session, token }) {
      if (session?.user?.email && token?.tenant_id) {
        session.user.id = token.sub as string
        session.user.tenant_id = token.tenant_id as string
        session.user.role = token.role as string
        session.user.tenant_name = token.tenant_name as string
        session.user.tenant_subdomain = token.tenant_subdomain as string
      }
      return session
    },
    
    async jwt({ token, user, account }) {
      console.log('🔍 JWT Callback Debug:', {
        hasAccount: !!account,
        hasUser: !!user,
        userEmail: user?.email,
        accountProvider: account?.provider,
        tokenSub: token?.sub,
        existingTenantId: token?.tenant_id,
        timestamp: new Date().toISOString()
      })
      
      // On first sign in, get or create user and tenant
      if (account && user?.email) {
        console.log('🚀 First sign in detected, creating/getting user...')
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
          
          console.log('✅ User authenticated successfully:', {
            email: user.email,
            tenant: userData.tenant_name,
            tenant_id: userData.tenant_id,
            role: userData.role
          })
          
        } catch (error) {
          console.error('❌ Error creating user/tenant:', error)
          console.error('❌ Error details:', {
            message: error.message,
            stack: error.stack,
            email: user.email,
            name: user.name
          })
          console.log('🔄 Returning null token - will retry authentication')
          return null
        }
      }
      
      console.log('✅ JWT callback returning token:', {
        hasTenantId: !!token.tenant_id,
        tenantName: token.tenant_name
      })
      return token
    },
  },
  
  pages: {
    signIn: '/login',
    error: '/login',
  },
  
  // Enable debug mode to see detailed logs
  debug: true,
  
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
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
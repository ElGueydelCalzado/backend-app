// Multi-Tenant SaaS Authentication Configuration
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { NextAuthOptions } from 'next-auth'
import { Pool } from 'pg'

// Database connection for auth operations
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') 
    ? false 
    : { rejectUnauthorized: false }
})

// DISABLED FOR MINIMAL TEST - no database connections
// pool.connect()
//   .then(client => {
//     console.log('✅ Auth database connection established')
//     client.release()
//   })
//   .catch(err => {
//     console.error('❌ Auth database connection failed:', err)
//   })

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

// Map known users to specific tenants for production SaaS
function mapUserToTenant(email: string): { tenant_id: string, tenant_name: string, tenant_subdomain: string } {
  // EGDC - Main business owner
  if (email === 'elweydelcalzado@gmail.com') {
    return {
      tenant_id: '471e9c26-a232-46b3-a992-2932e5dfadf4',
      tenant_name: 'EGDC',
      tenant_subdomain: 'egdc'
    }
  }
  
  // Future customers - will be real when they register
  if (email === 'fami@example.com') {
    return {
      tenant_id: 'fami-tenant-id',
      tenant_name: 'FAMI',
      tenant_subdomain: 'fami'
    }
  }
  
  if (email === 'osiel@example.com') {
    return {
      tenant_id: 'osiel-tenant-id', 
      tenant_name: 'Osiel',
      tenant_subdomain: 'osiel'
    }
  }
  
  if (email === 'molly@example.com') {
    return {
      tenant_id: 'molly-tenant-id',
      tenant_name: 'Molly',
      tenant_subdomain: 'molly'
    }
  }
  
  // Default for new users - create a new tenant
  const subdomain = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + Math.random().toString(36).substring(7)
  return {
    tenant_id: `tenant-${Date.now()}`, // Will be replaced with real UUID
    tenant_name: email.split('@')[0] + ' Business',
    tenant_subdomain: subdomain
  }
}

// Helper function to get or create user with tenant
async function getOrCreateUser(email: string, name: string, googleId: string) {
  console.log('🔍 getOrCreateUser called:', { email, name, googleId })
  
  // For EGDC (main business), use hardcoded tenant mapping
  // This ensures consistent tenant_id for production
  const tenantMapping = mapUserToTenant(email)
  
  console.log('🏢 Tenant mapping for user:', {
    email,
    tenant_id: tenantMapping.tenant_id,
    tenant_subdomain: tenantMapping.tenant_subdomain
  })
  
  // For now, return the mapped tenant directly
  // In the future, this will query/create in the tenants/users tables
  return {
    id: googleId,
    tenant_id: tenantMapping.tenant_id,
    role: 'admin', // All OAuth users are admins of their tenant
    name: name,
    email: email,
    tenant_name: tenantMapping.tenant_name,
    tenant_subdomain: tenantMapping.tenant_subdomain
  }
}

export const authConfig: NextAuthOptions = {
  providers: [
    // Production: Use Google OAuth
    ...(process.env.VERCEL_ENV === 'production' ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      })
    ] : []),
    
    // Preview/Development: Use test credentials
    ...(process.env.VERCEL_ENV === 'preview' || process.env.NODE_ENV === 'development' ? [
      CredentialsProvider({
        id: 'test-account',
        name: 'Test Account (Preview Only)',
        credentials: {
          username: { 
            label: 'Username', 
            type: 'text', 
            placeholder: 'test' 
          },
          password: { 
            label: 'Password', 
            type: 'password', 
            placeholder: 'password' 
          }
        },
        async authorize(credentials) {
          console.log('🧪 Test credentials auth attempt:', credentials?.username)
          
          // Simple test auth for previews
          if (credentials?.username === 'test' && credentials?.password === 'password') {
            return {
              id: 'test-user-' + Date.now(),
              name: 'Test User',
              email: 'test@preview.com',
              tenant_id: 'test-tenant',
              role: 'admin',
              tenant_name: 'Test Business',
              tenant_subdomain: 'test'
            }
          }
          
          console.log('❌ Invalid test credentials')
          return null
        }
      })
    ] : [])
  ],
  
  pages: {
    signIn: '/login',
    error: '/login',
  },
  
  callbacks: {
    async redirect({ url, baseUrl }) {
      console.log('🔄 NextAuth redirect called:', { url, baseUrl })
      
      // Always redirect to dashboard after successful authentication
      // This prevents redirect loops by having a consistent destination
      return '/dashboard'
    },
    
    async signIn({ user, account, profile }) {
      console.log('🔍 SignIn Callback:', {
        email: user?.email,
        provider: account?.provider,
        environment: process.env.VERCEL_ENV
      })
      
      // Allow Google OAuth users in production
      if (account?.provider === 'google' && user?.email) {
        console.log('✅ Google OAuth user allowed:', user.email)
        return true
      }
      
      // Allow test credentials in preview/development
      if (account?.provider === 'test-account') {
        console.log('✅ Test account allowed in preview/dev environment')
        return true
      }
      
      console.log('❌ SignIn rejected - invalid provider or missing email')
      return false
    },
    
    async session({ session, token }) {
      console.log('🔍 Session Callback:', {
        email: session?.user?.email,
        environment: process.env.VERCEL_ENV
      })
      
      if (session?.user && token) {
        session.user.id = token.sub as string
        session.user.tenant_id = token.tenant_id as string || 'unknown'
        session.user.role = token.role as string || 'user'
        session.user.tenant_name = token.tenant_name as string || 'Unknown Tenant'
        session.user.tenant_subdomain = token.tenant_subdomain as string || 'unknown'
        
        console.log('✅ Session ready for tenant:', token.tenant_subdomain)
      }
      
      return session
    },
    
    async jwt({ token, user, account }) {
      console.log('🔍 JWT Callback:', {
        isFirstSignIn: !!(account && user),
        email: user?.email,
        environment: process.env.VERCEL_ENV
      })
      
      // COMPREHENSIVE JWT DEBUGGING
      console.log('🔐 JWT CALLBACK DETAILED DEBUG:', {
        hasUser: !!user,
        hasAccount: !!account,
        hasToken: !!token,
        userDetails: user ? {
          id: user.id,
          email: user.email,
          name: user.name
        } : null,
        accountDetails: account ? {
          provider: account.provider,
          type: account.type,
          providerAccountId: account.providerAccountId
        } : null,
        existingTokenDetails: {
          sub: token.sub,
          email: token.email,
          name: token.name,
          tenant_id: token.tenant_id,
          tenant_subdomain: token.tenant_subdomain,
          iat: token.iat,
          exp: token.exp
        },
        timestamp: new Date().toISOString()
      })
      
      // On first sign in (when account and user are present)
      if (account && user?.email) {
        console.log('🚀 First sign in detected for:', user.email)
        console.log('🌍 Environment:', process.env.VERCEL_ENV)
        
        // Environment-aware authentication
        const isPreviewOrDev = process.env.VERCEL_ENV === 'preview' || process.env.NODE_ENV === 'development'
        
        if (isPreviewOrDev || account.provider === 'test-account') {
          console.log('🎭 Preview/Dev Environment: Using mock tenant data')
          // Mock tenant data for preview/dev - no database calls
          token.tenant_id = `mock-${user.id}`
          token.role = 'admin'
          token.tenant_name = account.provider === 'test-account' 
            ? 'Test Business (Preview)' 
            : `${user.name}'s Preview Business`
          token.tenant_subdomain = `preview-${user.id}`
        } else {
          console.log('🏭 Production Environment: Using tenant mapping')
          try {
            console.log('🔍 CALLING getOrCreateUser with:', {
              email: user.email,
              name: user.name,
              providerAccountId: account.providerAccountId
            })
            
            // Use tenant mapping for production
            const userData = await getOrCreateUser(
              user.email,
              user.name || user.email,
              account.providerAccountId
            )
            
            console.log('✅ TENANT MAPPING SUCCESSFUL:', {
              input: { email: user.email, name: user.name },
              output: {
                tenant_id: userData.tenant_id,
                role: userData.role,
                tenant_name: userData.tenant_name,
                tenant_subdomain: userData.tenant_subdomain
              }
            })
            
            token.tenant_id = userData.tenant_id
            token.role = userData.role
            token.tenant_name = userData.tenant_name
            token.tenant_subdomain = userData.tenant_subdomain
            
            console.log('✅ TOKEN UPDATED with tenant info:', {
              email: user.email,
              tenant_subdomain: userData.tenant_subdomain,
              tenant_name: userData.tenant_name
            })
          } catch (error) {
            console.error('❌ TENANT MAPPING ERROR:', {
              error: error?.message,
              stack: error?.stack,
              email: user.email
            })
            // Fallback - still provide session but mark as needs setup
            token.tenant_id = 'setup-required'
            token.role = 'admin'
            token.tenant_name = 'Setup Required'
            token.tenant_subdomain = 'setup'
            
            console.log('⚠️ USING FALLBACK TENANT CONFIG')
          }
        }
      }
      
      console.log('✅ JWT token ready with tenant_subdomain:', token.tenant_subdomain)
      return token
    },
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
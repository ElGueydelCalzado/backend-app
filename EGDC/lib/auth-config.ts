// Multi-Tenant SaaS Authentication Configuration
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { NextAuthOptions } from 'next-auth'
import { Pool } from 'pg'

// SECURITY: Secure database connection for auth operations
import { createSecureDatabaseConfig, validateDatabaseConfig } from './database-config'
// ENHANCED: Comprehensive environment validation
import { config as envConfig, validation as envValidation } from './env-validation'

// Lazy initialization - only validate during runtime, not build time
let pool: Pool | null = null
let isInitialized = false

// Lazy database connection initialization
function getAuthPool(): Pool {
  if (!pool) {
    // Only validate during runtime when actually needed
    validateDatabaseConfig()
    
    // Ensure environment is properly configured before proceeding
    if (!envValidation.isValid) {
      console.error('💥 Cannot initialize auth config with invalid environment')
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Authentication configuration failed: Invalid environment variables')
      }
    }

    pool = new Pool(createSecureDatabaseConfig())
  }
  return pool
}

// Test database connection with proper error handling
async function validateAuthDatabaseConnection() {
  try {
    const authPool = getAuthPool()
    const client = await authPool.connect()
    console.log('✅ Auth database connection established successfully')
    
    // Test basic query to ensure connection is working
    await client.query('SELECT 1')
    console.log('✅ Auth database query test passed')
    
    client.release()
    return true
  } catch (error) {
    console.error('❌ Auth database connection failed:', {
      error: error.message,
      code: error.code,
      detail: error.detail
    })
    
    // In production, we should fail fast if database is unavailable
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Critical: Auth database connection failed - ${error.message}`)
    }
    
    return false
  }
}

// Initialize connection validation
validateAuthDatabaseConnection().catch(error => {
  console.error('💥 Critical database error during auth config initialization:', error)
  // Don't crash in development, but log the error prominently
  if (process.env.NODE_ENV === 'production') {
    process.exit(1)
  }
})

// Extended user type with tenant information
declare module 'next-auth' {
  interface User {
    tenant_id: string
    role: string
    tenant_name: string
    tenant_subdomain: string
    business_type?: string
  }
  
  interface Session {
    user: {
      id: string
      name: string
      email: string
      tenant_id: string | null
      role: string
      tenant_name: string | null
      tenant_subdomain: string | null
      business_type?: string | null
    }
    registration_required?: boolean
    error?: string
  }
}

// SECURITY: Database-driven tenant resolution instead of hardcoded mapping
// Securely map users to tenants using database lookup
async function getTenantForUser(email: string): Promise<{ tenant_id: string, tenant_name: string, tenant_subdomain: string, business_type: string } | null> {
  const client = await getAuthPool().connect()
  
  try {
    // First, check if user already exists and get their tenant
    const existingUser = await client.query(`
      SELECT 
        u.tenant_id,
        t.name as tenant_name,
        t.subdomain as tenant_subdomain,
        t.business_type
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      WHERE u.email = $1 AND u.status = 'active' AND t.status = 'active'
    `, [email])
    
    if (existingUser.rows.length > 0) {
      const tenant = existingUser.rows[0]
      console.log('✅ Existing tenant found for user:', {
        email,
        tenant_id: tenant.tenant_id,
        tenant_subdomain: tenant.tenant_subdomain,
        business_type: tenant.business_type
      })
      return {
        tenant_id: tenant.tenant_id,
        tenant_name: tenant.tenant_name,
        tenant_subdomain: tenant.tenant_subdomain,
        business_type: tenant.business_type
      }
    }
    
    // If no existing user found, this is a new user - they need to register first
    console.log('❌ No existing tenant found for user:', email)
    return null
    
  } catch (error) {
    console.error('❌ Database error in getTenantForUser:', error)
    return null
  } finally {
    client.release()
  }
}

// Helper function to get or create user with tenant
async function getOrCreateUser(email: string, name: string, googleId: string) {
  console.log('🔍 getOrCreateUser called:', { email, name, googleId })
  
  const client = await getAuthPool().connect()
  
  try {
    // First, check if user already exists WITHOUT RLS context
    // This initial query needs to work across all tenants to find the user's tenant
    const existingUser = await client.query(`
      SELECT 
        u.id,
        u.tenant_id,
        u.email,
        u.name,
        u.role,
        u.google_id,
        t.name as tenant_name,
        t.subdomain as tenant_subdomain,
        t.business_type
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      WHERE u.email = $1 AND u.status = 'active'
    `, [email])
    
    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0]
      console.log('✅ Existing user found:', user.email, 'tenant:', user.tenant_subdomain)
      
      // CRITICAL: Set RLS context for the user's tenant
      await setTenantContext(user.tenant_id, client)
      
      // Update Google ID and last login with RLS context set
      await client.query(`
        UPDATE users 
        SET google_id = $1, last_login = NOW(), updated_at = NOW()
        WHERE id = $2
      `, [googleId, user.id])
      
      return {
        id: googleId,
        tenant_id: user.tenant_id,
        role: user.role,
        name: user.name,
        email: user.email,
        tenant_name: user.tenant_name,
        tenant_subdomain: user.tenant_subdomain,
        business_type: user.business_type
      }
    }
    
    // SECURITY: No more hardcoded tenant logic - all users must be properly registered
    // Check if this is a returning user who should be granted access
    const tenantInfo = await getTenantForUser(email)
    if (tenantInfo) {
      console.log('🏢 Returning user login - using existing tenant:', tenantInfo.tenant_subdomain)
      
      // Update user login information
      await client.query(`
        UPDATE users 
        SET google_id = $1, last_login = NOW(), updated_at = NOW()
        WHERE email = $2 AND tenant_id = $3
      `, [googleId, email, tenantInfo.tenant_id])
      
      return {
        id: googleId,
        tenant_id: tenantInfo.tenant_id,
        role: 'admin', // Will be fetched from DB in production
        name: name,
        email: email,
        tenant_name: tenantInfo.tenant_name,
        tenant_subdomain: tenantInfo.tenant_subdomain,
        business_type: tenantInfo.business_type
      }
    }
    
    // For new users, create tenant and user automatically
    console.log('🆕 Creating new tenant and user for:', email)
    
    await client.query('BEGIN')
    
    try {
      // Generate unique tenant subdomain from email
      const baseSubdomain = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
      let tenantSubdomain = baseSubdomain
      let counter = 1
      
      // Ensure subdomain is unique
      while (true) {
        const existing = await client.query(`
          SELECT id FROM tenants WHERE subdomain = $1
        `, [tenantSubdomain])
        
        if (existing.rows.length === 0) break
        
        tenantSubdomain = `${baseSubdomain}${counter}`
        counter++
      }
      
      // Create new tenant - EGDC default is always retailer
      const newTenant = await client.query(`
        INSERT INTO tenants (name, subdomain, email, business_type, plan, status)
        VALUES ($1, $2, $3, 'retailer', 'starter', 'active')
        RETURNING id, name, subdomain
      `, [
        `${name}'s Business`, // Business name from user's name
        tenantSubdomain,
        email
      ])
      
      const tenant = newTenant.rows[0]
      console.log('✅ Created new tenant:', tenant.subdomain, 'ID:', tenant.id)
      
      // CRITICAL: Set RLS context for the new tenant
      await setTenantContext(tenant.id, client)
      
      // Create new user with RLS context set
      const newUser = await client.query(`
        INSERT INTO users (tenant_id, email, name, role, google_id, status)
        VALUES ($1, $2, $3, 'admin', $4, 'active')
        RETURNING id
      `, [tenant.id, email, name, googleId])
      
      console.log('✅ Created new user:', email, 'in tenant:', tenant.subdomain)
      
      await client.query('COMMIT')
      
      console.log('✅ Transaction committed successfully - tenant and user created')
      
      return {
        id: googleId,
        tenant_id: tenant.id,
        role: 'admin',
        name: name,
        email: email,
        tenant_name: tenant.name,
        tenant_subdomain: tenant.subdomain,
        business_type: 'retailer' // Default for new users
      }
      
    } catch (error) {
      console.error('💥 CRITICAL ERROR during tenant creation - initiating rollback:', {
        error: error.message,
        code: error.code,
        detail: error.detail,
        email,
        name,
        googleId
      })
      
      try {
        await client.query('ROLLBACK')
        console.log('✅ Database transaction rolled back successfully')
      } catch (rollbackError) {
        console.error('💥 CRITICAL: Rollback failed!', {
          originalError: error.message,
          rollbackError: rollbackError.message
        })
        
        // This is a critical state - we need to alert monitoring systems
        // In production, this should trigger alerts
        throw new Error(`Transaction rollback failed: ${rollbackError.message}. Original error: ${error.message}`)
      }
      
      // Re-throw original error after successful rollback
      throw new Error(`Tenant creation failed: ${error.message}`)
    }
    
  } finally {
    client.release()
  }
}

export const authConfig: NextAuthOptions = {
  providers: [
    // Always enable Google OAuth for production and preview
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    
    // Preview/Development: Also include test credentials as fallback
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
        async authorize(credentials, req) {
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
              tenant_subdomain: 'test',
              business_type: 'retailer'
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
    newUser: '/signup',
  },
  
  callbacks: {
    async redirect({ url, baseUrl }) {
      console.log('🔄 NextAuth redirect called:', { url, baseUrl })
      
      // SIMPLIFIED REDIRECT LOGIC to prevent loops
      // Let middleware handle all tenant routing - just return base URL
      console.log('🔄 Simplified redirect - letting middleware handle tenant routing')
      return baseUrl
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
      console.log('🔍 Session Callback - ENHANCED DEBUG:', {
        email: session?.user?.email,
        environment: process.env.VERCEL_ENV,
        registrationRequired: token?.registration_required,
        tokenBusinessType: token?.business_type,
        tokenTenantSubdomain: token?.tenant_subdomain,
        tokenId: token?.tenant_id,
        timestamp: new Date().toISOString()
      })
      
      if (session?.user && token) {
        session.user.id = token.sub as string
        session.user.tenant_id = token.tenant_id as string || null
        session.user.role = token.role as string || 'user'
        session.user.tenant_name = token.tenant_name as string || null
        session.user.tenant_subdomain = token.tenant_subdomain as string || null
        
        // BULLETPROOF business_type assignment with debugging
        let sessionBusinessType = null
        if (token.business_type && typeof token.business_type === 'string') {
          const validBusinessTypes = ['retailer', 'wholesaler', 'supplier', 'hybrid']
          if (validBusinessTypes.includes(token.business_type.toLowerCase())) {
            sessionBusinessType = token.business_type.toLowerCase()
            console.log('📋 Session business_type set from valid token:', sessionBusinessType)
          } else {
            console.warn('⚠️ Invalid business_type in token for session:', token.business_type)
            sessionBusinessType = 'retailer'
          }
        } else {
          console.log('🔄 No business_type in token for session - using null')
          sessionBusinessType = null
        }
        
        session.user.business_type = sessionBusinessType
        
        // Add registration status to session
        if (token.registration_required) {
          session.registration_required = true
          console.log('🚧 Session flagged for pending registration:', session.user.email)
        } else {
          console.log('✅ Session ready for tenant path:', {
            tenant_subdomain: token.tenant_subdomain,
            business_type: sessionBusinessType,
            tenant_id: token.tenant_id
          })
        }
        
        // CRITICAL DEBUG: Log session creation details for troubleshooting
        console.log('🎯 FINAL SESSION CREATED:', {
          user_email: session.user.email,
          tenant_id: session.user.tenant_id,
          tenant_subdomain: session.user.tenant_subdomain,
          business_type: session.user.business_type,
          role: session.user.role,
          registration_required: session.registration_required || false,
          session_ready: !session.registration_required && !!session.user.tenant_subdomain
        })
      }
      
      return session
    },
    
    async jwt({ token, user, account, trigger }) {
      const isFirstSignIn = !!(account && user)
      
      console.log('🔐 JWT CALLBACK START:', {
        isFirstSignIn,
        hasToken: !!token,
        hasUser: !!user,
        hasAccount: !!account,
        userEmail: user?.email,
        accountProvider: account?.provider,
        trigger,
        registrationRequired: token?.registration_required,
        timestamp: new Date().toISOString()
      })
      
      // Handle token refresh for users who completed registration
      if (trigger === 'update' && token?.registration_required && token?.email) {
        console.log('🔄 JWT refresh triggered - checking if registration completed:', token.email)
        
        try {
          const tenantInfo = await getTenantForUser(token.email as string)
          if (tenantInfo) {
            console.log('✅ Registration completed! Updating token with tenant info:', tenantInfo)
            
            token.tenant_id = tenantInfo.tenant_id
            token.role = 'admin'
            token.tenant_name = tenantInfo.tenant_name
            token.tenant_subdomain = tenantInfo.tenant_subdomain
            token.registration_required = false
            
            console.log('✅ Token updated with completed registration info')
          } else {
            console.log('⏳ Registration still pending for:', token.email)
          }
        } catch (error) {
          console.error('❌ Error checking registration status:', error)
        }
      }
      
      // On first sign in (when account and user are present)
      if (isFirstSignIn && user?.email) {
        console.log('🚀 FIRST SIGN IN - Processing tenant mapping for:', user.email)
        console.log('🌍 Environment check:', {
          VERCEL_ENV: process.env.VERCEL_ENV,
          NODE_ENV: process.env.NODE_ENV,
          provider: account?.provider
        })
        
        try {
          // Always use tenant mapping for Google OAuth
          if (account?.provider === 'google') {
            console.log('📱 Google OAuth - mapping to tenant')
            
            const userData = await getOrCreateUser(
              user.email,
              user.name || user.email,
              account.providerAccountId
            )
            
            // Set tenant information in token
            token.tenant_id = userData.tenant_id
            token.role = userData.role  
            token.tenant_name = userData.tenant_name
            token.tenant_subdomain = userData.tenant_subdomain
            // BULLETPROOF FIX: Determine business_type with comprehensive validation and debugging
            let finalBusinessType = 'retailer' // Safe default
            
            if (userData.tenant_subdomain === 'egdc') {
              // EGDC is always retailer - hardcoded to prevent redirect loops
              finalBusinessType = 'retailer'
              console.log('🏢 EGDC tenant detected in JWT - forcing retailer business type')
            } else if (userData.business_type && typeof userData.business_type === 'string') {
              // Validate and use database business_type
              const validBusinessTypes = ['retailer', 'wholesaler', 'supplier', 'hybrid']
              if (validBusinessTypes.includes(userData.business_type.toLowerCase())) {
                finalBusinessType = userData.business_type.toLowerCase()
                console.log('📋 Using database business_type:', finalBusinessType)
              } else {
                console.warn('⚠️ Invalid business_type from database:', userData.business_type, '- defaulting to retailer')
                finalBusinessType = 'retailer'
              }
            } else {
              console.log('🔄 No business_type from database - defaulting to retailer')
              finalBusinessType = 'retailer'
            }
            
            token.business_type = finalBusinessType
            
            console.log('✅ TENANT MAPPED SUCCESSFULLY:', {
              email: user.email,
              tenant_id: userData.tenant_id,
              tenant_path: userData.tenant_subdomain, // Used as path in path-based architecture
              tenant_name: userData.tenant_name,
              role: userData.role,
              business_type: finalBusinessType,
              original_business_type: userData.business_type,
              business_type_source: userData.tenant_subdomain === 'egdc' ? 'HARDCODED_EGDC' : 
                                  userData.business_type ? 'DATABASE' : 'DEFAULT_FALLBACK'
            })
            
          } else if (account?.provider === 'test-account') {
            console.log('🧪 Test account - using mock tenant')
            token.tenant_id = 'test-tenant'
            token.role = 'admin'
            token.tenant_name = 'Test Business'
            token.tenant_subdomain = 'test'
            token.business_type = 'retailer'
          }
          
        } catch (error) {
          console.error('❌ CRITICAL: Tenant mapping failed:', {
            error: error?.message,
            stack: error?.stack,
            email: user.email,
            provider: account?.provider
          })
          
          // ENHANCED: Instead of throwing error, create a "pending registration" token
          // This allows the user to be authenticated but directs them to complete registration
          console.log('🚧 Creating pending registration token for new user:', user.email)
          
          token.tenant_id = null
          token.role = 'pending'
          token.tenant_name = null
          token.tenant_subdomain = null
          token.registration_required = true
          token.email = user.email
          token.name = user.name
          
          console.log('✅ Pending registration token created - user will be directed to complete registration')
        }
      }
      
      console.log('✅ JWT token ready with tenant_path:', token.tenant_subdomain)
      return token
    },
  },
  
  debug: true,
  
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
  
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
        // Remove explicit domain - let NextAuth handle it automatically
      }
    }
  },
  
  secret: process.env.NEXTAUTH_SECRET,
}

// Helper function to get tenant context for API routes
export async function getTenantContext(userId: string) {
  const client = await getAuthPool().connect()
  
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
    
    const context = result.rows[0] || null
    
    // CRITICAL: Set RLS context if we found the user's tenant
    if (context?.tenant_id) {
      await setTenantContext(context.tenant_id, client)
      console.log('✅ Tenant context set for API operations:', {
        userId,
        tenant_id: context.tenant_id,
        tenant_subdomain: context.tenant_subdomain
      })
    }
    
    return context
  } finally {
    client.release()
  }
}

// Helper function to set tenant context for RLS - ENHANCED VERSION
export async function setTenantContext(tenantId: string, client?: any) {
  const dbClient = client || await getAuthPool().connect()
  
  try {
    console.log('🔐 Setting RLS tenant context:', { tenantId })
    await dbClient.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [tenantId])
    console.log('✅ RLS tenant context set successfully')
    
    if (!client) {
      return dbClient
    }
  } catch (error) {
    console.error('❌ Failed to set RLS tenant context:', { 
      tenantId, 
      error: error.message 
    })
    if (!client) {
      dbClient.release()
    }
    throw error
  }
}
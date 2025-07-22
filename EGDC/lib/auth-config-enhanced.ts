// ENHANCED MULTI-PROVIDER AUTHENTICATION CONFIGURATION
// Centralized login for both suppliers and retailers with multiple auth methods

import GoogleProvider from 'next-auth/providers/google'
import AppleProvider from 'next-auth/providers/apple'
import CredentialsProvider from 'next-auth/providers/credentials'
import EmailProvider from 'next-auth/providers/email'
import type { NextAuthOptions } from 'next-auth'
import { executeWithTenant } from './tenant-context'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

// Extended user type with tenant information  
declare module 'next-auth' {
  interface User {
    id: string
    tenant_id: string
    role: string
    tenant_name: string
    tenant_subdomain: string
    business_type: 'retailer' | 'wholesaler'
    phone?: string
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
      business_type: 'retailer' | 'wholesaler'
      phone?: string
    }
    error?: string
  }
}

// Helper: Get or create user with tenant
async function getOrCreateUser(
  email: string, 
  name: string, 
  provider: string,
  providerAccountId: string,
  phone?: string
) {
  console.log('🔍 Getting or creating user:', { email, provider, phone })
  
  try {
    // First, check if user already exists
    const existingUserQuery = `
      SELECT 
        u.id, u.tenant_id, u.email, u.name, u.role, u.phone,
        t.name as tenant_name, t.subdomain as tenant_subdomain,
        t.business_type
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      WHERE u.email = $1 AND u.status = 'active' AND t.status = 'active'
    `
    
    const existingUser = await executeWithTenant(
      null,
      existingUserQuery,
      [email],
      { skipTenantCheck: true }
    )

    if (existingUser && existingUser.length > 0) {
      const user = existingUser[0]
      console.log('✅ Found existing user:', user.email, 'Tenant:', user.tenant_subdomain)
      
      // Update last login and provider info if needed
      await executeWithTenant(
        null,
        `UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1`,
        [user.id],
        { skipTenantCheck: true }
      )

      return {
        id: user.id,
        tenant_id: user.tenant_id,
        role: user.role,
        name: user.name,
        email: user.email,
        tenant_name: user.tenant_name,
        tenant_subdomain: user.tenant_subdomain,
        business_type: user.business_type,
        phone: user.phone
      }
    }

    // User doesn't exist - this should not happen for login
    // Users should be created through registration process
    console.log('❌ User not found, cannot create during login:', email)
    throw new Error('Account not found. Please register first.')

  } catch (error) {
    console.error('❌ Error in getOrCreateUser:', error)
    throw error
  }
}

// Helper: Verify email/password credentials
async function verifyCredentials(email: string, password: string) {
  try {
    const userQuery = `
      SELECT 
        u.id, u.email, u.name, u.password_hash, u.tenant_id, u.role, u.phone,
        t.name as tenant_name, t.subdomain as tenant_subdomain,
        t.business_type
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      WHERE u.email = $1 AND u.status = 'active' AND t.status = 'active'
    `
    
    const result = await executeWithTenant(
      null,
      userQuery,
      [email],
      { skipTenantCheck: true }
    )

    if (!result || result.length === 0) {
      return null
    }

    const user = result[0]
    
    // Check if user has a password set
    if (!user.password_hash) {
      throw new Error('Please use Google, Apple, or Magic Link to sign in')
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    
    if (!isValidPassword) {
      return null
    }

    return {
      id: user.id,
      tenant_id: user.tenant_id,
      role: user.role,
      name: user.name,
      email: user.email,
      tenant_name: user.tenant_name,
      tenant_subdomain: user.tenant_subdomain,
      business_type: user.business_type,
      phone: user.phone
    }

  } catch (error) {
    console.error('❌ Error verifying credentials:', error)
    throw error
  }
}

// Helper: Send SMS verification code
async function sendSMSCode(phone: string): Promise<string> {
  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  
  // Store code in database with expiration
  const codeId = nanoid()
  await executeWithTenant(
    null,
    `
      INSERT INTO sms_verification_codes (id, phone, code, expires_at, created_at)
      VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes', NOW())
      ON CONFLICT (phone) DO UPDATE SET
        code = $3,
        expires_at = NOW() + INTERVAL '5 minutes',
        attempts = 0,
        created_at = NOW()
    `,
    [codeId, phone, code],
    { skipTenantCheck: true }
  )

  // In production, integrate with Twilio, AWS SNS, or similar
  console.log('📱 SMS Code for', phone, ':', code)
  
  // For development, just return the code
  if (process.env.NODE_ENV === 'development') {
    return code
  }
  
  // TODO: Integrate with SMS service
  // await sendSMSWithTwilio(phone, `Your verification code is: ${code}`)
  
  return code
}

// Helper: Verify SMS code
async function verifySMSCode(phone: string, code: string): Promise<boolean> {
  try {
    const result = await executeWithTenant(
      null,
      `
        SELECT code, attempts, expires_at > NOW() as is_valid
        FROM sms_verification_codes 
        WHERE phone = $1
      `,
      [phone],
      { skipTenantCheck: true }
    )

    if (!result || result.length === 0) {
      return false
    }

    const record = result[0]
    
    if (!record.is_valid) {
      console.log('❌ SMS code expired for phone:', phone)
      return false
    }

    if (record.attempts >= 3) {
      console.log('❌ Too many SMS code attempts for phone:', phone)
      return false
    }

    if (record.code !== code) {
      // Increment attempts
      await executeWithTenant(
        null,
        `UPDATE sms_verification_codes SET attempts = attempts + 1 WHERE phone = $1`,
        [phone],
        { skipTenantCheck: true }
      )
      return false
    }

    // Valid code - delete it
    await executeWithTenant(
      null,
      `DELETE FROM sms_verification_codes WHERE phone = $1`,
      [phone],
      { skipTenantCheck: true }
    )

    return true

  } catch (error) {
    console.error('❌ Error verifying SMS code:', error)
    return false
  }
}

export const enhancedAuthConfig: NextAuthOptions = {
  providers: [
    // Google OAuth (Primary)
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // Apple ID
    AppleProvider({
      clientId: process.env.APPLE_ID!,
      clientSecret: process.env.APPLE_SECRET!,
    }),

    // Email/Password Authentication
    CredentialsProvider({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        email: { 
          label: 'Email', 
          type: 'email', 
          placeholder: 'your@email.com' 
        },
        password: { 
          label: 'Password', 
          type: 'password',
          placeholder: 'Enter your password'
        }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required')
        }

        try {
          return await verifyCredentials(credentials.email, credentials.password)
        } catch (error) {
          console.error('❌ Credentials auth failed:', error)
          return null
        }
      }
    }),

    // Phone/SMS Authentication  
    CredentialsProvider({
      id: 'phone',
      name: 'Phone & SMS',
      credentials: {
        phone: { 
          label: 'Phone Number', 
          type: 'tel', 
          placeholder: '+1234567890' 
        },
        code: { 
          label: 'Verification Code', 
          type: 'text',
          placeholder: '123456'
        },
        action: {
          label: 'Action',
          type: 'text'
        }
      },
      async authorize(credentials) {
        if (!credentials?.phone) {
          throw new Error('Phone number required')
        }

        // If no code provided, send SMS code
        if (!credentials.code) {
          await sendSMSCode(credentials.phone)
          throw new Error('SMS_CODE_SENT')
        }

        // Verify SMS code
        const isValidCode = await verifySMSCode(credentials.phone, credentials.code)
        if (!isValidCode) {
          throw new Error('Invalid or expired verification code')
        }

        // Find user by phone number
        try {
          const userQuery = `
            SELECT 
              u.id, u.email, u.name, u.tenant_id, u.role, u.phone,
              t.name as tenant_name, t.subdomain as tenant_subdomain,
              t.business_type
            FROM users u
            JOIN tenants t ON u.tenant_id = t.id
            WHERE u.phone = $1 AND u.status = 'active' AND t.status = 'active'
          `
          
          const result = await executeWithTenant(
            null,
            userQuery,
            [credentials.phone],
            { skipTenantCheck: true }
          )

          if (!result || result.length === 0) {
            throw new Error('Account not found with this phone number')
          }

          const user = result[0]
          
          return {
            id: user.id,
            tenant_id: user.tenant_id,
            role: user.role,
            name: user.name,
            email: user.email,
            tenant_name: user.tenant_name,
            tenant_subdomain: user.tenant_subdomain,
            business_type: user.business_type,
            phone: user.phone
          }

        } catch (error) {
          console.error('❌ Phone auth failed:', error)
          return null
        }
      }
    }),

    // Magic Link (Passwordless Email)
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM || 'noreply@lospapatos.com',
      maxAge: 24 * 60 * 60, // 24 hours
    }),
  ],
  
  pages: {
    signIn: '/login',
    signUp: '/signup',
    error: '/login',
    verifyRequest: '/verify-request',
  },
  
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      console.log('🔍 SignIn Callback:', {
        email: user?.email,
        provider: account?.provider,
        business_type: user?.business_type
      })

      // Allow all configured providers
      const allowedProviders = ['google', 'apple', 'credentials', 'phone', 'email']
      
      if (account && allowedProviders.includes(account.provider)) {
        return true
      }

      console.log('❌ SignIn rejected - invalid provider')
      return false
    },
    
    async jwt({ token, user, account, trigger }) {
      // On first sign in
      if (account && user?.email) {
        console.log('🚀 First sign in:', user.email, 'Provider:', account.provider)
        
        try {
          let userData
          
          if (account.provider === 'credentials' || account.provider === 'phone') {
            // User data already validated in authorize function
            userData = user
          } else {
            // OAuth providers (Google, Apple) or Email
            userData = await getOrCreateUser(
              user.email,
              user.name || user.email,
              account.provider,
              account.providerAccountId,
              user.phone
            )
          }
          
          token.tenant_id = userData.tenant_id
          token.role = userData.role
          token.tenant_name = userData.tenant_name
          token.tenant_subdomain = userData.tenant_subdomain
          token.business_type = userData.business_type
          token.phone = userData.phone
          
          console.log('✅ User authenticated for tenant:', userData.tenant_subdomain)
          
        } catch (error) {
          console.error('❌ Authentication error:', error)
          token.error = error.message
        }
      }
      
      return token
    },
    
    async session({ session, token }) {
      if (session?.user && token) {
        session.user.id = token.sub as string
        session.user.tenant_id = token.tenant_id as string
        session.user.role = token.role as string
        session.user.tenant_name = token.tenant_name as string
        session.user.tenant_subdomain = token.tenant_subdomain as string
        session.user.business_type = token.business_type as 'retailer' | 'wholesaler'
        session.user.phone = token.phone as string
        session.error = token.error as string
      }
      
      return session
    },
    
    async redirect({ url, baseUrl }) {
      console.log('🔄 Auth redirect:', { url, baseUrl })
      
      // After login, redirect to user's tenant subdomain
      if (url.startsWith('/') || url.startsWith(baseUrl)) {
        return url
      }
      
      // Allow redirects to tenant subdomains
      if (url.includes('lospapatos.com')) {
        return url
      }
      
      return baseUrl
    },
  },
  
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log('📊 Sign in event:', {
        user: user.email,
        provider: account?.provider,
        isNewUser,
        tenant: user.tenant_subdomain
      })
    },
    
    async signOut({ session, token }) {
      console.log('📊 Sign out event:', {
        user: session?.user?.email,
        tenant: session?.user?.tenant_subdomain
      })
    },
  },
  
  debug: process.env.NODE_ENV === 'development',
  
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  
  secret: process.env.NEXTAUTH_SECRET,
}

// Helper function to create SMS verification codes table
export async function createSMSVerificationTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS sms_verification_codes (
      id VARCHAR(50) PRIMARY KEY,
      phone VARCHAR(20) NOT NULL,
      code VARCHAR(10) NOT NULL,
      attempts INTEGER DEFAULT 0,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(phone)
    );
    
    CREATE INDEX IF NOT EXISTS idx_sms_codes_phone ON sms_verification_codes(phone);
    CREATE INDEX IF NOT EXISTS idx_sms_codes_expires ON sms_verification_codes(expires_at);
  `
  
  await executeWithTenant(
    null,
    createTableQuery,
    [],
    { skipTenantCheck: true }
  )
  
  console.log('✅ SMS verification codes table ready')
}
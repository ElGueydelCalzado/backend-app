// Google OAuth configuration for EGDC (NextAuth v4)
import GoogleProvider from 'next-auth/providers/google'
import type { NextAuthOptions } from 'next-auth'

// Authorized Google accounts - only these emails can access the system
const AUTHORIZED_EMAILS = [
  'elweydelcalzado@gmail.com',      // 🔥 Primary account - El Guey del Calzado
  'manager@lospapatos.com',   // Replace with actual manager email
  'employee@lospapatos.com',  // Replace with actual employee email
  // Add more authorized emails as needed
]

// User roles based on email
const getUserRole = (email: string): 'admin' | 'manager' | 'employee' => {
  if (email === 'elweydelcalzado@gmail.com') {
    return 'admin'
  }
  if (email === 'manager@lospapatos.com') {
    return 'manager'
  }
  return 'employee'
}

export const authConfig: NextAuthOptions = {
  debug: true, // 🔍 Enable debug mode
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  
  callbacks: {
    async signIn({ user, account, profile }) {
      // 🔍 DEBUG: Log all OAuth data
      console.log('🔍 OAuth SignIn Debug:', {
        user: user,
        account: account,
        profile: profile,
        userEmail: user?.email,
        isEmailAuthorized: user?.email ? AUTHORIZED_EMAILS.includes(user.email) : false,
        authorizedEmails: AUTHORIZED_EMAILS,
        timestamp: new Date().toISOString()
      })
      
      // Check if user email is in authorized list
      if (!user.email || !AUTHORIZED_EMAILS.includes(user.email)) {
        console.log(`❌ Unauthorized access attempt: ${user.email}`)
        console.log(`📧 Authorized emails:`, AUTHORIZED_EMAILS)
        return false // Deny access
      }
      
      console.log(`✅ Authorized access granted: ${user.email}`)
      return true // Allow access
    },
    
    async session({ session, token }) {
      if (session.user?.email) {
        // Add role to session
        session.user.role = getUserRole(session.user.email)
        session.user.id = token.sub as string
      }
      return session
    },
    
    async jwt({ token, user }) {
      if (user) {
        token.role = getUserRole(user.email!)
      }
      return token
    },
  },
  
  pages: {
    signIn: '/login',
    error: '/login',
  },
  
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  
  secret: process.env.NEXTAUTH_SECRET,
}

// Helper function to check if email is authorized
export function isAuthorizedEmail(email: string): boolean {
  return AUTHORIZED_EMAILS.includes(email)
}

// Helper function to get user role
export function getUserRoleByEmail(email: string): 'admin' | 'manager' | 'employee' {
  return getUserRole(email)
}
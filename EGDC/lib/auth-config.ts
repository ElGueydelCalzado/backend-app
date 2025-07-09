// Google OAuth configuration for EGDC
import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

// Authorized Google accounts - only these emails can access the system
const AUTHORIZED_EMAILS = [
  'admin@elgueydelcalzado.com',     // Replace with actual admin email
  'manager@elgueydelcalzado.com',   // Replace with actual manager email
  'employee@elgueydelcalzado.com',  // Replace with actual employee email
  // Add more authorized emails as needed
]

// User roles based on email
const getUserRole = (email: string): 'admin' | 'manager' | 'employee' => {
  if (email === 'admin@elgueydelcalzado.com') {
    return 'admin'
  }
  if (email === 'manager@elgueydelcalzado.com') {
    return 'manager'
  }
  return 'employee'
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  
  callbacks: {
    async signIn({ user, account, profile }) {
      // Check if user email is in authorized list
      if (!user.email || !AUTHORIZED_EMAILS.includes(user.email)) {
        console.log(`Unauthorized access attempt: ${user.email}`)
        return false // Deny access
      }
      
      return true // Allow access
    },
    
    async session({ session, token }) {
      if (session.user?.email) {
        // Add role to session
        session.user.role = getUserRole(session.user.email)
        session.user.id = token.sub
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
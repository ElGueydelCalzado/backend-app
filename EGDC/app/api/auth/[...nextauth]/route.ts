import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth-config'

// NextAuth v5 handler for Google OAuth authentication
const handler = NextAuth(authConfig)

export { handler as GET, handler as POST }
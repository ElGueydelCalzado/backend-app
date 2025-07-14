import { authConfig } from '@/lib/auth-config'
import NextAuth from 'next-auth'

// NextAuth v4 handlers for Google OAuth authentication
const handler = NextAuth(authConfig)

export { handler as GET, handler as POST }
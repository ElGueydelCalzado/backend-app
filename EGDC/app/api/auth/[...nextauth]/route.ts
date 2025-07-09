import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth-config'

// NextAuth handler for Google OAuth authentication
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
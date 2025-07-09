import NextAuth from 'next-auth'
import { authConfig } from './auth-config'

// NextAuth v5 configuration for EGDC inventory management
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.NEXTAUTH_SECRET,
})
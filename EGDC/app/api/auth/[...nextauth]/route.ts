import { authConfig } from '@/lib/auth-config'
import NextAuth from 'next-auth'

// 🔍 DEBUG: Log environment variables (without secrets)
console.log('🔍 NextAuth Environment Debug:', {
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? '✅ SET' : '❌ MISSING',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? '✅ SET' : '❌ MISSING',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '✅ SET' : '❌ MISSING',
  NODE_ENV: process.env.NODE_ENV,
  timestamp: new Date().toISOString()
})

// NextAuth v4 handlers for Google OAuth authentication
const handler = NextAuth(authConfig)

export { handler as GET, handler as POST }
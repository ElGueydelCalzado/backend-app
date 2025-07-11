import NextAuth from 'next-auth'
import { authConfig } from './auth-config'

// NextAuth v4 configuration for EGDC inventory management
export default NextAuth(authConfig)
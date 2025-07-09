// Simple but secure authentication system for EGDC
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

// Simple user database (in production, use a real database)
const AUTHORIZED_USERS = [
  {
    id: 1,
    username: 'admin',
    password: 'EgdcAdmin2024!', // In production, this should be hashed
    name: 'Administrador',
    role: 'admin'
  },
  {
    id: 2,
    username: 'manager',
    password: 'EgdcManager2024!',
    name: 'Gerente',
    role: 'manager'
  }
]

export interface User {
  id: number
  username: string
  name: string
  role: 'admin' | 'manager' | 'employee'
}

export interface LoginCredentials {
  username: string
  password: string
}

// Authenticate user with username/password
export function authenticateUser(credentials: LoginCredentials): User | null {
  const user = AUTHORIZED_USERS.find(
    u => u.username === credentials.username && u.password === credentials.password
  )
  
  if (user) {
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role as 'admin' | 'manager' | 'employee'
    }
  }
  
  return null
}

// Generate session token
export function generateSessionToken(user: User): string {
  const sessionData = {
    userId: user.id,
    username: user.username,
    role: user.role as 'admin' | 'manager' | 'employee',
    expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  }
  
  // In production, use proper JWT or encrypted sessions
  return Buffer.from(JSON.stringify(sessionData)).toString('base64')
}

// Verify session token
export function verifySessionToken(token: string): User | null {
  try {
    const sessionData = JSON.parse(Buffer.from(token, 'base64').toString())
    
    // Check if session is expired
    if (Date.now() > sessionData.expires) {
      return null
    }
    
    // Find user
    const user = AUTHORIZED_USERS.find(u => u.id === sessionData.userId)
    if (!user) {
      return null
    }
    
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role as 'admin' | 'manager' | 'employee'
    }
  } catch (error) {
    return null
  }
}

// Get current user from request
export async function getCurrentUser(request: NextRequest): Promise<User | null> {
  const sessionToken = request.cookies.get('egdc-session')?.value
  
  if (!sessionToken) {
    return null
  }
  
  return verifySessionToken(sessionToken)
}

// Set session cookie
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set('egdc-session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60, // 24 hours
    path: '/'
  })
}

// Clear session cookie
export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete('egdc-session')
}

// Check if user has permission for action
export function hasPermission(user: User, action: string): boolean {
  switch (action) {
    case 'view_inventory':
      return ['admin', 'manager', 'employee'].includes(user.role)
    case 'edit_inventory':
      return ['admin', 'manager'].includes(user.role)
    case 'delete_products':
      return user.role === 'admin'
    case 'export_data':
      return ['admin', 'manager'].includes(user.role)
    case 'manage_users':
      return user.role === 'admin'
    default:
      return false
  }
}
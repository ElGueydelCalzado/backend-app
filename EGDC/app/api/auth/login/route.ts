import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, generateSessionToken, setSessionCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Usuario y contraseña son requeridos' },
        { status: 400 }
      )
    }

    // Authenticate user
    const user = authenticateUser({ username, password })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Credenciales incorrectas' },
        { status: 401 }
      )
    }

    // Generate session token
    const sessionToken = generateSessionToken(user)

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      user: {
        name: user.name,
        username: user.username,
        role: user.role
      }
    })

    // Set session cookie
    response.cookies.set('egdc-session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
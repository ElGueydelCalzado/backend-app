/**
 * Enterprise JWT Token Refresh API
 * Handles secure token rotation with 15-minute access tokens
 */

import { NextRequest, NextResponse } from 'next/server'
import { enterpriseTokenManager } from '@/lib/enterprise-auth'
import { enterpriseAuditLogger } from '@/lib/enterprise-audit'
import { getClientIP } from '@/lib/security'

export async function POST(request: NextRequest) {
  try {
    const { refreshToken, deviceId } = await request.json()
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token required' },
        { status: 400 }
      )
    }

    const ipAddress = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || undefined

    // Attempt token rotation
    const newTokenPair = await enterpriseTokenManager.rotateTokens(
      refreshToken,
      deviceId,
      ipAddress,
      userAgent
    )

    if (!newTokenPair) {
      await enterpriseAuditLogger.logAuthEvent(
        'login_failure',
        'unknown',
        'unknown',
        { reason: 'invalid_refresh_token', refreshToken: '[REDACTED]' },
        ipAddress,
        userAgent
      )

      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      )
    }

    await enterpriseAuditLogger.logAuthEvent(
      'login_success',
      'token_rotation',
      'system',
      { 
        method: 'refresh_token',
        deviceId,
        newTokenExpiry: newTokenPair.expiresAt
      },
      ipAddress,
      userAgent
    )

    return NextResponse.json({
      success: true,
      accessToken: newTokenPair.accessToken,
      refreshToken: newTokenPair.refreshToken,
      expiresAt: newTokenPair.expiresAt.toISOString(),
      refreshExpiresAt: newTokenPair.refreshExpiresAt.toISOString()
    })

  } catch (error) {
    console.error('[AUTH] Token refresh failed:', error)

    await enterpriseAuditLogger.logSecurityEvent(
      'token_refresh_error',
      'authentication',
      'high',
      'Token refresh system error',
      { error: error.message },
      {
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || undefined
      }
    )

    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}
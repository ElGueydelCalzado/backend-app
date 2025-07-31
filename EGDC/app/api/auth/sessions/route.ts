/**
 * Enterprise Session Management API
 * Manage active user sessions across devices
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { enterpriseTokenManager } from '@/lib/enterprise-auth'
import { enterpriseAuditLogger } from '@/lib/enterprise-audit'
import { enterpriseRBACManager } from '@/lib/enterprise-rbac'
import { getClientIP } from '@/lib/security'

// GET /api/auth/sessions - Get user's active sessions
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    })

    if (!token?.sub || !token?.tenant_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission to view sessions
    const hasPermission = await enterpriseRBACManager.checkPermission({
      userId: token.sub,
      tenantId: token.tenant_id as string,
      resource: 'users',
      action: 'read',
      context: 'own'
    })

    if (!hasPermission.granted) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const sessions = await enterpriseTokenManager.getUserSessions(token.sub)

    await enterpriseAuditLogger.logDataAccess(
      'read',
      'user_sessions',
      token.sub,
      token.tenant_id as string,
      { sessionCount: sessions.length },
      getClientIP(request)
    )

    return NextResponse.json({
      success: true,
      sessions: sessions.map(session => ({
        id: session.id,
        deviceId: session.deviceId,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        lastUsed: session.lastUsed,
        isCurrent: session.id === request.headers.get('x-session-id')
      }))
    })

  } catch (error) {
    console.error('[AUTH] Failed to get sessions:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve sessions' },
      { status: 500 }
    )
  }
}

// DELETE /api/auth/sessions - Revoke specific session or all sessions
export async function DELETE(request: NextRequest) {
  try {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    })

    if (!token?.sub || !token?.tenant_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { sessionId, revokeAll } = await request.json()

    if (revokeAll) {
      // Revoke all user sessions (logout everywhere)
      await enterpriseTokenManager.revokeAllUserTokens(token.sub, 'user_logout_all')

      await enterpriseAuditLogger.logAuthEvent(
        'logout',
        token.sub,
        token.tenant_id as string,
        { action: 'revoke_all_sessions' },
        getClientIP(request),
        request.headers.get('user-agent') || undefined
      )

      return NextResponse.json({
        success: true,
        message: 'All sessions revoked'
      })
    } else if (sessionId) {
      // Revoke specific session
      const success = await enterpriseTokenManager.revokeSession(sessionId, token.sub)

      if (!success) {
        return NextResponse.json(
          { error: 'Session not found or already revoked' },
          { status: 404 }
        )
      }

      await enterpriseAuditLogger.logAuthEvent(
        'logout',
        token.sub,
        token.tenant_id as string,
        { action: 'revoke_session', sessionId },
        getClientIP(request),
        request.headers.get('user-agent') || undefined
      )

      return NextResponse.json({
        success: true,
        message: 'Session revoked'
      })
    } else {
      return NextResponse.json(
        { error: 'sessionId or revokeAll required' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('[AUTH] Failed to revoke sessions:', error)
    return NextResponse.json(
      { error: 'Failed to revoke sessions' },
      { status: 500 }
    )
  }
}
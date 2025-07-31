/**
 * Enterprise 2FA Verification API
 * Verify 2FA setup and login challenges
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { enterprise2FAManager } from '@/lib/enterprise-2fa'
import { enterpriseAuditLogger } from '@/lib/enterprise-audit'
import { getClientIP } from '@/lib/security'

// POST /api/auth/2fa/verify - Verify 2FA code
export async function POST(request: NextRequest) {
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

    const { code, deviceId, action } = await request.json()

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code required' },
        { status: 400 }
      )
    }

    const ipAddress = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || undefined

    let result: boolean = false

    if (action === 'setup') {
      // Verify 2FA setup
      if (!deviceId) {
        return NextResponse.json(
          { error: 'Device ID required for setup verification' },
          { status: 400 }
        )
      }

      // Check if it's TOTP or SMS setup
      const devices = await enterprise2FAManager.getUserMFADevices(token.sub)
      const device = devices.find(d => d.id === deviceId)

      if (!device) {
        return NextResponse.json(
          { error: 'Device not found' },
          { status: 404 }
        )
      }

      if (device.type === 'totp') {
        result = await enterprise2FAManager.verifyTOTPSetup(
          token.sub,
          deviceId,
          code,
          ipAddress,
          userAgent
        )
      } else if (device.type === 'sms') {
        result = await enterprise2FAManager.verifySMSSetup(
          token.sub,
          deviceId,
          code,
          ipAddress,
          userAgent
        )
      }

      if (result) {
        return NextResponse.json({
          success: true,
          message: '2FA setup completed successfully',
          deviceType: device.type
        })
      } else {
        return NextResponse.json(
          { error: 'Invalid verification code' },
          { status: 400 }
        )
      }

    } else {
      // Verify 2FA for login
      const verificationResult = await enterprise2FAManager.verifyMFACode(
        token.sub,
        code,
        ipAddress,
        userAgent
      )

      if (verificationResult.success) {
        return NextResponse.json({
          success: true,
          message: '2FA verification successful',
          method: verificationResult.method,
          deviceId: verificationResult.deviceId
        })
      } else {
        return NextResponse.json(
          { error: 'Invalid verification code' },
          { status: 400 }
        )
      }
    }

  } catch (error) {
    console.error('[2FA] Verification failed:', error)

    await enterpriseAuditLogger.logSecurityEvent(
      'mfa_verification_error',
      'authentication',
      'high',
      '2FA verification failed',
      { error: error.message },
      {
        userId: (await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET }))?.sub,
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || undefined
      }
    )

    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
}

// DELETE /api/auth/2fa/verify - Disable 2FA device
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

    const { deviceId } = await request.json()

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID required' },
        { status: 400 }
      )
    }

    const success = await enterprise2FAManager.disableMFADevice(deviceId, token.sub)

    if (!success) {
      return NextResponse.json(
        { error: 'Device not found or already disabled' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '2FA device disabled successfully'
    })

  } catch (error) {
    console.error('[2FA] Failed to disable device:', error)
    return NextResponse.json(
      { error: 'Failed to disable 2FA device' },
      { status: 500 }
    )
  }
}
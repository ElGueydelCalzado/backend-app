/**
 * Enterprise 2FA Setup API
 * Enable TOTP and SMS 2FA for users
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { enterprise2FAManager } from '@/lib/enterprise-2fa'
import { enterpriseAuditLogger } from '@/lib/enterprise-audit'
import { enterpriseRBACManager } from '@/lib/enterprise-rbac'
import { getClientIP } from '@/lib/security'

// POST /api/auth/2fa/setup - Setup 2FA for user
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

    const { method, phoneNumber, deviceName } = await request.json()

    if (!['totp', 'sms'].includes(method)) {
      return NextResponse.json(
        { error: 'Invalid 2FA method. Supported: totp, sms' },
        { status: 400 }
      )
    }

    const ipAddress = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || undefined

    let result: any

    if (method === 'totp') {
      result = await enterprise2FAManager.enableTOTP(
        token.sub,
        token.tenant_id as string,
        deviceName || 'Mobile Authenticator'
      )

      await enterpriseAuditLogger.logSecurityEvent(
        'mfa_totp_setup_initiated',
        'authentication',
        'medium',
        'TOTP 2FA setup initiated',
        { deviceName },
        {
          userId: token.sub,
          tenantId: token.tenant_id as string,
          ipAddress,
          userAgent
        }
      )

      return NextResponse.json({
        success: true,
        method: 'totp',
        secret: result.secret,
        qrCode: result.qrCode,
        backupCodes: result.backupCodes,
        instructions: 'Scan the QR code with your authenticator app and verify with a 6-digit code'
      })

    } else if (method === 'sms') {
      if (!phoneNumber) {
        return NextResponse.json(
          { error: 'Phone number required for SMS 2FA' },
          { status: 400 }
        )
      }

      result = await enterprise2FAManager.enableSMS(
        token.sub,
        token.tenant_id as string,
        phoneNumber,
        deviceName || 'SMS'
      )

      await enterpriseAuditLogger.logSecurityEvent(
        'mfa_sms_setup_initiated',
        'authentication',
        'medium',
        'SMS 2FA setup initiated',
        { phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*') }, // Mask phone number
        {
          userId: token.sub,
          tenantId: token.tenant_id as string,
          ipAddress,
          userAgent
        }
      )

      return NextResponse.json({
        success: true,
        method: 'sms',
        deviceId: result.deviceId,
        backupCodes: result.backupCodes,
        instructions: 'A verification code has been sent to your phone. Enter it to complete setup.'
      })
    }

  } catch (error) {
    console.error('[2FA] Setup failed:', error)

    await enterpriseAuditLogger.logSecurityEvent(
      'mfa_setup_error',
      'authentication',
      'high',
      '2FA setup failed',
      { error: error.message },
      {
        userId: (await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET }))?.sub,
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || undefined
      }
    )

    return NextResponse.json(
      { error: 'Failed to setup 2FA' },
      { status: 500 }
    )
  }
}

// GET /api/auth/2fa/setup - Get user's 2FA devices
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

    const devices = await enterprise2FAManager.getUserMFADevices(token.sub)

    return NextResponse.json({
      success: true,
      devices: devices.map(device => ({
        id: device.id,
        type: device.type,
        name: device.name,
        isEnabled: device.isEnabled,
        isVerified: device.isVerified,
        createdAt: device.createdAt,
        lastUsed: device.lastUsed,
        // Don't expose sensitive data like secret or phone number
        phoneNumber: device.phoneNumber ? 
          device.phoneNumber.replace(/\d(?=\d{4})/g, '*') : undefined
      }))
    })

  } catch (error) {
    console.error('[2FA] Failed to get devices:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve 2FA devices' },
      { status: 500 }
    )
  }
}
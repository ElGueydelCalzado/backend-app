/**
 * GDPR Consent Management API
 * Handle user consent for data processing and cookies
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { enterpriseGDPRManager } from '@/lib/enterprise-gdpr'
import { enterpriseAuditLogger } from '@/lib/enterprise-audit'
import { getClientIP } from '@/lib/security'

// POST /api/gdpr/consent - Record user consent
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

    const { 
      consentType, 
      granted, 
      lawfulBasis, 
      purpose, 
      dataCategories, 
      policyVersion 
    } = await request.json()

    // Validate required fields
    if (!consentType || typeof granted !== 'boolean' || !lawfulBasis || !purpose) {
      return NextResponse.json(
        { error: 'Missing required fields: consentType, granted, lawfulBasis, purpose' },
        { status: 400 }
      )
    }

    const ipAddress = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || undefined

    const consentId = await enterpriseGDPRManager.recordConsent(
      token.sub,
      token.tenant_id as string,
      consentType,
      granted,
      lawfulBasis,
      purpose,
      dataCategories || [],
      policyVersion || '1.0',
      ipAddress,
      userAgent
    )

    return NextResponse.json({
      success: true,
      consentId,
      message: `Consent ${granted ? 'granted' : 'withdrawn'} successfully`,
      consentType,
      granted,
      recordedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('[GDPR] Failed to record consent:', error)

    await enterpriseAuditLogger.logSecurityEvent(
      'gdpr_consent_error',
      'privacy',
      'high',
      'Failed to record consent',
      { error: error.message },
      {
        userId: (await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET }))?.sub,
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || undefined
      }
    )

    return NextResponse.json(
      { error: 'Failed to record consent' },
      { status: 500 }
    )
  }
}

// GET /api/gdpr/consent - Get user's consent status
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

    const consents = await enterpriseGDPRManager.getUserConsent(
      token.sub,
      token.tenant_id as string
    )

    await enterpriseAuditLogger.logDataAccess(
      'read',
      'consent_records',
      token.sub,
      token.tenant_id as string,
      { consentCount: consents.length },
      getClientIP(request)
    )

    // Group consents by type for easier consumption
    const consentsByType: Record<string, any> = {}
    
    consents.forEach(consent => {
      consentsByType[consent.consentType] = {
        granted: consent.granted,
        grantedAt: consent.grantedAt,
        withdrawnAt: consent.withdrawnAt,
        expiresAt: consent.expiresAt,
        purpose: consent.purpose,
        lawfulBasis: consent.lawfulBasis,
        dataCategories: consent.dataCategories,
        version: consent.version
      }
    })

    return NextResponse.json({
      success: true,
      consents: consentsByType,
      totalConsents: consents.length,
      retrievedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('[GDPR] Failed to retrieve consents:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve consent status' },
      { status: 500 }
    )
  }
}
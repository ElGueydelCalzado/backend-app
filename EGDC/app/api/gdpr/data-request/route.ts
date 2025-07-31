/**
 * GDPR Data Subject Rights API
 * Handle data access, deletion, and portability requests
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { enterpriseGDPRManager } from '@/lib/enterprise-gdpr'
import { enterpriseAuditLogger } from '@/lib/enterprise-audit'
import { enterpriseRBACManager } from '@/lib/enterprise-rbac'
import { getClientIP } from '@/lib/security'

// POST /api/gdpr/data-request - Submit data subject request
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

    const { requestType, reason } = await request.json()

    // Validate request type
    const validTypes = ['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection']
    if (!validTypes.includes(requestType)) {
      return NextResponse.json(
        { error: `Invalid request type. Valid types: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const requestId = await enterpriseGDPRManager.processDataSubjectRequest(
      token.sub,
      token.tenant_id as string,
      requestType,
      reason
    )

    // Estimate processing time based on request type
    const processingTime = requestType === 'access' || requestType === 'portability' ? 
      'within 24 hours' : 'within 30 days'

    return NextResponse.json({
      success: true,
      requestId,
      requestType,
      status: 'pending',
      estimatedProcessingTime: processingTime,
      submittedAt: new Date().toISOString(),
      message: 'Your data subject request has been submitted and will be processed according to GDPR requirements.'
    })

  } catch (error) {
    console.error('[GDPR] Failed to submit data request:', error)

    await enterpriseAuditLogger.logSecurityEvent(
      'gdpr_request_error',
      'privacy',
      'high',
      'Failed to submit data subject request',
      { error: error.message },
      {
        userId: (await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET }))?.sub,
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || undefined
      }
    )

    return NextResponse.json(
      { error: 'Failed to submit data request' },
      { status: 500 }
    )
  }
}

// GET /api/gdpr/data-request - Get user's data requests
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

    // For admin users, allow viewing all requests in tenant
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')

    if (userId && userId !== token.sub) {
      // Check if user has admin permissions
      const hasPermission = await enterpriseRBACManager.checkPermission({
        userId: token.sub,
        tenantId: token.tenant_id as string,
        resource: 'users',
        action: 'read',
        context: 'tenant'
      })

      if (!hasPermission.granted) {
        return NextResponse.json(
          { error: 'Insufficient permissions to view other users\' requests' },
          { status: 403 }
        )
      }
    }

    // This would require a method in GDPR manager to get requests
    // For now, return a placeholder response
    return NextResponse.json({
      success: true,
      requests: [],
      message: 'Data request history retrieval - implementation pending'
    })

  } catch (error) {
    console.error('[GDPR] Failed to retrieve data requests:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve data requests' },
      { status: 500 }
    )
  }
}

// PUT /api/gdpr/data-request/[id] - Process data request (admin only)
export async function PUT(request: NextRequest) {
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

    // Check admin permissions
    const hasPermission = await enterpriseRBACManager.checkPermission({
      userId: token.sub,
      tenantId: token.tenant_id as string,
      resource: 'users',
      action: 'update',
      context: 'tenant'
    })

    if (!hasPermission.granted) {
      return NextResponse.json(
        { error: 'Insufficient permissions to process data requests' },
        { status: 403 }
      )
    }

    const { requestId, approved, reason } = await request.json()

    if (!requestId || typeof approved !== 'boolean') {
      return NextResponse.json(
        { error: 'requestId and approved status required' },
        { status: 400 }
      )
    }

    // For erasure requests, use the GDPR manager
    const success = await enterpriseGDPRManager.processDataErasureRequest(
      requestId,
      token.sub,
      approved,
      reason
    )

    await enterpriseAuditLogger.logSecurityEvent(
      'gdpr_request_processed',
      'privacy',
      'high',
      `Data request ${approved ? 'approved' : 'rejected'}`,
      { requestId, approved, reason },
      {
        userId: token.sub,
        tenantId: token.tenant_id as string,
        ipAddress: getClientIP(request)
      }
    )

    return NextResponse.json({
      success,
      message: `Data request ${approved ? 'approved and processed' : 'rejected'}`,
      requestId,
      processedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('[GDPR] Failed to process data request:', error)
    return NextResponse.json(
      { error: 'Failed to process data request' },
      { status: 500 }
    )
  }
}
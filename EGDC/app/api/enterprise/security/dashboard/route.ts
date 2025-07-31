/**
 * Enterprise Security Dashboard API
 * Real-time security metrics and compliance monitoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { enterpriseAuditLogger } from '@/lib/enterprise-audit'
import { enterpriseGDPRManager } from '@/lib/enterprise-gdpr'
import { enterprise2FAManager } from '@/lib/enterprise-2fa'
import { enterpriseRBACManager } from '@/lib/enterprise-rbac'
import { getClientIP } from '@/lib/security'

// GET /api/enterprise/security/dashboard - Get security dashboard metrics
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

    // Check if user has permission to view security dashboard
    const hasPermission = await enterpriseRBACManager.checkPermission({
      userId: token.sub,
      tenantId: token.tenant_id as string,
      resource: 'audit_logs',
      action: 'read',
      context: 'tenant'
    })

    if (!hasPermission.granted) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view security dashboard' },
        { status: 403 }
      )
    }

    const tenantId = token.tenant_id as string
    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Collect security metrics
    const [
      recentEvents,
      criticalEvents,
      authMetrics,
      mfaMetrics,
      gdprMetrics
    ] = await Promise.all([
      // Recent security events (last 24h)
      enterpriseAuditLogger.searchEvents({
        tenantId,
        startDate: last24Hours,
        endDate: now,
        limit: 50
      }),

      // Critical events (last 7 days)
      enterpriseAuditLogger.searchEvents({
        tenantId,
        riskLevel: 'critical',
        startDate: last7Days,
        endDate: now,
        limit: 20
      }),

      // Authentication metrics
      enterpriseAuditLogger.searchEvents({
        tenantId,
        category: 'authentication',
        startDate: last24Hours,
        endDate: now,
        limit: 100
      }),

      // 2FA adoption metrics - placeholder for actual implementation
      Promise.resolve({ total: 0 }),

      // GDPR compliance metrics
      enterpriseGDPRManager.generateComplianceReport(tenantId)
    ])

    // Calculate authentication metrics
    const authEvents = authMetrics.events
    const loginAttempts = authEvents.filter(e => e.eventType.includes('login_attempt')).length
    const loginSuccesses = authEvents.filter(e => e.eventType.includes('login_success')).length
    const loginFailures = authEvents.filter(e => e.eventType.includes('login_failure')).length
    const mfaChallenges = authEvents.filter(e => e.eventType.includes('mfa_')).length

    // Risk level distribution
    const riskDistribution = {
      low: recentEvents.events.filter(e => e.riskLevel === 'low').length,
      medium: recentEvents.events.filter(e => e.riskLevel === 'medium').length,
      high: recentEvents.events.filter(e => e.riskLevel === 'high').length,
      critical: recentEvents.events.filter(e => e.riskLevel === 'critical').length
    }

    // Category distribution
    const categoryDistribution: Record<string, number> = {}
    recentEvents.events.forEach(event => {
      categoryDistribution[event.category] = (categoryDistribution[event.category] || 0) + 1
    })

    // Security score calculation (simplified)
    let securityScore = 85 // Base score
    
    // Deduct points for issues
    securityScore -= Math.min(criticalEvents.events.length * 5, 20) // Critical events
    securityScore -= Math.min(loginFailures * 2, 15) // Failed logins
    securityScore -= (riskDistribution.high * 1) // High risk events
    
    // Add points for good practices
    if (mfaChallenges > 0) securityScore += 5 // MFA usage
    if (loginSuccesses > 0 && loginFailures / Math.max(loginSuccesses, 1) < 0.1) {
      securityScore += 5 // Low failure rate
    }

    securityScore = Math.max(Math.min(securityScore, 100), 0) // Clamp to 0-100

    const dashboardData = {
      timestamp: now.toISOString(),
      tenantId,
      securityScore,
      overview: {
        totalEvents24h: recentEvents.total,
        criticalEvents7d: criticalEvents.total,
        securityIncidents: recentEvents.events.filter(e => e.category === 'security_incident').length,
        complianceFlags: recentEvents.events.filter(e => e.complianceFlags?.includes('requires_review')).length
      },
      authentication: {
        loginAttempts24h: loginAttempts,
        loginSuccesses24h: loginSuccesses,
        loginFailures24h: loginFailures,
        successRate: loginAttempts > 0 ? Math.round((loginSuccesses / loginAttempts) * 100) : 0,
        mfaChallenges24h: mfaChallenges,
        uniqueUsers24h: new Set(authEvents.map(e => e.userId).filter(Boolean)).size
      },
      riskDistribution,
      categoryDistribution,
      gdprCompliance: {
        totalConsents: Object.values(gdprMetrics.consentStatus).reduce((acc: number, curr: any) => 
          acc + curr.granted + curr.withdrawn, 0),
        dataRequests: Object.values(gdprMetrics.dataSubjectRequests).reduce((acc: number, curr: number) => 
          acc + curr, 0),
        privacyPolicyVersion: gdprMetrics.privacyPolicyVersion,
        retentionIssues: gdprMetrics.retentionCompliance.expiredData.length
      },
      recentCriticalEvents: criticalEvents.events.slice(0, 5).map(event => ({
        id: event.id,
        eventType: event.eventType,
        category: event.category,
        riskLevel: event.riskLevel,
        timestamp: event.timestamp,
        details: event.details
      })),
      recommendations: generateSecurityRecommendations({
        securityScore,
        criticalEventsCount: criticalEvents.total,
        loginFailureRate: loginFailures / Math.max(loginAttempts, 1),
        mfaUsage: mfaChallenges > 0,
        retentionIssues: gdprMetrics.retentionCompliance.expiredData.length
      })
    }

    await enterpriseAuditLogger.logDataAccess(
      'read',
      'security_dashboard',
      token.sub,
      tenantId,
      { metricsGenerated: true },
      getClientIP(request)
    )

    return NextResponse.json({
      success: true,
      dashboard: dashboardData
    })

  } catch (error) {
    console.error('[SECURITY] Dashboard generation failed:', error)

    await enterpriseAuditLogger.logSecurityEvent(
      'dashboard_error',
      'system_access',
      'medium',
      'Security dashboard generation failed',
      { error: error.message },
      {
        userId: (await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET }))?.sub,
        ipAddress: getClientIP(request)
      }
    )

    return NextResponse.json(
      { error: 'Failed to generate security dashboard' },
      { status: 500 }
    )
  }
}

function generateSecurityRecommendations(metrics: {
  securityScore: number
  criticalEventsCount: number
  loginFailureRate: number
  mfaUsage: boolean
  retentionIssues: number
}): string[] {
  const recommendations: string[] = []

  if (metrics.securityScore < 90) {
    recommendations.push('Security score below optimal level - review recent security events')
  }

  if (metrics.criticalEventsCount > 0) {
    recommendations.push(`${metrics.criticalEventsCount} critical security events require immediate attention`)
  }

  if (metrics.loginFailureRate > 0.1) {
    recommendations.push('High login failure rate detected - consider implementing additional brute force protection')
  }

  if (!metrics.mfaUsage) {
    recommendations.push('No 2FA usage detected - encourage users to enable multi-factor authentication')
  }

  if (metrics.retentionIssues > 0) {
    recommendations.push(`${metrics.retentionIssues} data retention issues found - review GDPR compliance`)
  }

  if (recommendations.length === 0) {
    recommendations.push('Security posture is good - continue monitoring')
  }

  return recommendations
}
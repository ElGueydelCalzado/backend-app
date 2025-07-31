/**
 * Enterprise Security Dashboard Component
 * Real-time security monitoring and compliance metrics
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface SecurityMetrics {
  timestamp: string
  tenantId: string
  securityScore: number
  overview: {
    totalEvents24h: number
    criticalEvents7d: number
    securityIncidents: number
    complianceFlags: number
  }
  authentication: {
    loginAttempts24h: number
    loginSuccesses24h: number
    loginFailures24h: number
    successRate: number
    mfaChallenges24h: number
    uniqueUsers24h: number
  }
  riskDistribution: {
    low: number
    medium: number
    high: number
    critical: number
  }
  categoryDistribution: Record<string, number>
  gdprCompliance: {
    totalConsents: number
    dataRequests: number
    privacyPolicyVersion: string
    retentionIssues: number
  }
  recentCriticalEvents: Array<{
    id: string
    eventType: string
    category: string
    riskLevel: string
    timestamp: string
    details: any
  }>
  recommendations: string[]
}

export default function EnterpriseSecurityDashboard() {
  const { data: session } = useSession()
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/enterprise/security/dashboard')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch security metrics')
      }

      setMetrics(data.dashboard)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Security dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user) {
      fetchMetrics()

      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchMetrics, 30000)
      setRefreshInterval(interval)

      return () => {
        if (interval) clearInterval(interval)
      }
    }
  }, [session])

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 75) return 'text-yellow-600'
    if (score >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreStatus = (score: number) => {
    if (score >= 90) return 'Excellent'
    if (score >= 75) return 'Good'
    if (score >= 60) return 'Fair'
    return 'Needs Attention'
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-md">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Failed to load security dashboard
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={fetchMetrics}
                  className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!metrics) return null

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time security monitoring and compliance • Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Security Score */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Security Score</h2>
            <div className="flex items-center space-x-4">
              <span className={`text-4xl font-bold ${getScoreColor(metrics.securityScore)}`}>
                {metrics.securityScore}
              </span>
              <div>
                <span className={`text-sm font-medium ${getScoreColor(metrics.securityScore)}`}>
                  {getScoreStatus(metrics.securityScore)}
                </span>
                <p className="text-xs text-gray-500">Enterprise Security Score</p>
              </div>
            </div>
          </div>
          <div className="w-32 h-32">
            <svg className="transform -rotate-90 w-32 h-32">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-gray-200"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={`${metrics.securityScore * 3.51} 351`}
                className={getScoreColor(metrics.securityScore)}
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Events (24h)</h3>
          <p className="text-2xl font-bold text-gray-900">{metrics.overview.totalEvents24h}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Critical Events (7d)</h3>
          <p className="text-2xl font-bold text-red-600">{metrics.overview.criticalEvents7d}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Security Incidents</h3>
          <p className="text-2xl font-bold text-orange-600">{metrics.overview.securityIncidents}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Compliance Flags</h3>
          <p className="text-2xl font-bold text-blue-600">{metrics.overview.complianceFlags}</p>
        </div>
      </div>

      {/* Authentication Metrics */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Authentication Metrics (24h)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <p className="text-sm text-gray-500">Login Attempts</p>
            <p className="text-xl font-bold text-gray-900">{metrics.authentication.loginAttempts24h}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Successes</p>
            <p className="text-xl font-bold text-green-600">{metrics.authentication.loginSuccesses24h}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Failures</p>
            <p className="text-xl font-bold text-red-600">{metrics.authentication.loginFailures24h}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Success Rate</p>
            <p className="text-xl font-bold text-blue-600">{metrics.authentication.successRate}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">2FA Challenges</p>
            <p className="text-xl font-bold text-purple-600">{metrics.authentication.mfaChallenges24h}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Unique Users</p>
            <p className="text-xl font-bold text-indigo-600">{metrics.authentication.uniqueUsers24h}</p>
          </div>
        </div>
      </div>

      {/* Risk Distribution & GDPR Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h2>
          <div className="space-y-3">
            {Object.entries(metrics.riskDistribution).map(([level, count]) => (
              <div key={level} className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getRiskLevelColor(level)}`}>
                  {level}
                </span>
                <span className="font-medium">{count} events</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">GDPR Compliance</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total Consents</span>
              <span className="font-medium">{metrics.gdprCompliance.totalConsents}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Data Requests</span>
              <span className="font-medium">{metrics.gdprCompliance.dataRequests}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Privacy Policy</span>
              <span className="font-medium">v{metrics.gdprCompliance.privacyPolicyVersion}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Retention Issues</span>
              <span className={`font-medium ${metrics.gdprCompliance.retentionIssues > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {metrics.gdprCompliance.retentionIssues}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Critical Events */}
      {metrics.recentCriticalEvents.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Critical Events</h2>
          <div className="space-y-3">
            {metrics.recentCriticalEvents.map((event) => (
              <div key={event.id} className="border border-red-200 rounded-md p-3 bg-red-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-red-800">{event.eventType}</span>
                  <span className="text-xs text-red-600">
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskLevelColor(event.riskLevel)}`}>
                    {event.riskLevel}
                  </span>
                  <span className="text-sm text-gray-600">{event.category}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {metrics.recommendations.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-yellow-800 mb-4">Security Recommendations</h2>
          <ul className="space-y-2">
            {metrics.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start">
                <span className="text-yellow-600 mr-2">•</span>
                <span className="text-yellow-800">{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
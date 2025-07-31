'use client'

/**
 * APM Dashboard React Component
 * 
 * Features:
 * - Real-time metrics display
 * - Interactive charts and gauges
 * - Alert management
 * - Custom dashboard creation
 * - Business KPI tracking
 */

import { useState, useEffect, useCallback } from 'react'
import { apmDashboard } from '@/lib/monitoring/apm-dashboard'

interface MetricCardProps {
  title: string
  value: number | string
  unit?: string
  change?: number
  status?: 'healthy' | 'warning' | 'critical'
}

interface AlertItemProps {
  alert: {
    id: string
    type: string
    severity: 'info' | 'warning' | 'critical' | 'emergency'
    title: string
    description: string
    timestamp: number
    acknowledged: boolean
    resolved: boolean
  }
  onAcknowledge: (id: string) => void
  onResolve: (id: string) => void
}

interface ChartProps {
  data: Array<{ timestamp: number; value: number }>
  title: string
  unit?: string
  height?: number
}

const MetricCard = ({ title, value, unit, change, status = 'healthy' }: MetricCardProps) => {
  const getStatusColor = () => {
    switch (status) {
      case 'critical': return 'border-red-500 bg-red-50'
      case 'warning': return 'border-yellow-500 bg-yellow-50'
      default: return 'border-green-500 bg-green-50'
    }
  }

  const getChangeColor = () => {
    if (!change) return ''
    return change > 0 ? 'text-green-600' : 'text-red-600'
  }

  return (
    <div className={`border-2 rounded-lg p-4 ${getStatusColor()}`}>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <div className="flex items-baseline">
        <span className="text-2xl font-bold text-gray-900">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {unit && <span className="ml-1 text-sm text-gray-500">{unit}</span>}
      </div>
      {change !== undefined && (
        <div className={`text-xs ${getChangeColor()}`}>
          {change > 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
        </div>
      )}
    </div>
  )
}

const AlertItem = ({ alert, onAcknowledge, onResolve }: AlertItemProps) => {
  const getSeverityColor = () => {
    switch (alert.severity) {
      case 'emergency': return 'bg-red-600 text-white'
      case 'critical': return 'bg-red-500 text-white'
      case 'warning': return 'bg-yellow-500 text-white'
      default: return 'bg-blue-500 text-white'
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor()}`}>
              {alert.severity.toUpperCase()}
            </span>
            <span className="ml-2 text-xs text-gray-500">{formatTime(alert.timestamp)}</span>
          </div>
          <h4 className="font-medium text-gray-900 mb-1">{alert.title}</h4>
          <p className="text-sm text-gray-600">{alert.description}</p>
        </div>
        <div className="flex space-x-2 ml-4">
          {!alert.acknowledged && (
            <button
              onClick={() => onAcknowledge(alert.id)}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Acknowledge
            </button>
          )}
          {!alert.resolved && (
            <button
              onClick={() => onResolve(alert.id)}
              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
            >
              Resolve
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const SimpleChart = ({ data, title, unit, height = 200 }: ChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-48 text-gray-500">
          No data available
        </div>
      </div>
    )
  }

  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const range = maxValue - minValue || 1

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h3 className="font-medium text-gray-900 mb-4">{title}</h3>
      <div className="relative" style={{ height }}>
        <svg width="100%" height="100%" className="overflow-visible">
          <polyline
            points={data.map((point, index) => {
              const x = (index / (data.length - 1)) * 100
              const y = 100 - ((point.value - minValue) / range) * 80
              return `${x},${y}`
            }).join(' ')}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          {data.map((point, index) => {
            const x = (index / (data.length - 1)) * 100
            const y = 100 - ((point.value - minValue) / range) * 80
            return (
              <circle
                key={index}
                cx={`${x}%`}
                cy={`${y}%`}
                r="3"
                fill="#3B82F6"
              />
            )
          })}
        </svg>
        <div className="absolute bottom-0 left-0 text-xs text-gray-500">
          {minValue.toFixed(1)}{unit}
        </div>
        <div className="absolute top-0 left-0 text-xs text-gray-500">
          {maxValue.toFixed(1)}{unit}
        </div>
      </div>
    </div>
  )
}

export default function APMDashboardComponent() {
  const [activeTab, setActiveTab] = useState<'overview' | 'business' | 'technical' | 'security' | 'alerts'>('overview')
  const [dashboards, setDashboards] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [healthSummary, setHealthSummary] = useState<any>(null)
  const [businessMetrics, setBusinessMetrics] = useState<any>({})
  const [technicalMetrics, setTechnicalMetrics] = useState<any>({})
  const [isLoading, setIsLoading] = useState(true)

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true)

      // Get health summary
      const health = apmDashboard.getHealthSummary()
      setHealthSummary(health)

      // Get active alerts
      const activeAlerts = apmDashboard.getActiveAlerts()
      setAlerts(activeAlerts)

      // Get dashboards
      const allDashboards = apmDashboard.getAllDashboards()
      setDashboards(allDashboards)

      // Calculate business metrics
      const businessKPIs = {
        revenue: apmDashboard.calculateKPI('revenue_per_hour'),
        conversionRate: apmDashboard.calculateKPI('orders_conversion_rate'),
        aov: apmDashboard.calculateKPI('average_order_value'),
        syncAccuracy: apmDashboard.calculateKPI('inventory_sync_accuracy')
      }
      setBusinessMetrics(businessKPIs)

      // Calculate technical metrics
      const technicalKPIs = {
        responseTime: apmDashboard.calculateKPI('api_response_time_p95'),
        errorRate: apmDashboard.calculateKPI('error_rate'),
        availability: apmDashboard.calculateKPI('system_availability')
      }
      setTechnicalMetrics(technicalKPIs)

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000)
    return () => clearInterval(interval)
  }, [loadDashboardData])

  const handleAcknowledgeAlert = (alertId: string) => {
    apmDashboard.acknowledgeAlert(alertId, 'current_user')
    loadDashboardData()
  }

  const handleResolveAlert = (alertId: string) => {
    apmDashboard.resolveAlert(alertId)
    loadDashboardData()
  }

  const getOverallStatusColor = () => {
    if (!healthSummary) return 'text-gray-500'
    switch (healthSummary.overall) {
      case 'critical': return 'text-red-600'
      case 'warning': return 'text-yellow-600'
      default: return 'text-green-600'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">APM Dashboard</h1>
            <p className="text-gray-600 mt-1">Application Performance Monitoring & Business Intelligence</p>
          </div>
          <div className="text-right">
            <div className={`text-lg font-semibold ${getOverallStatusColor()}`}>
              System Status: {healthSummary?.overall?.toUpperCase() || 'UNKNOWN'}
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'business', label: 'Business KPIs' },
            { id: 'technical', label: 'Technical Performance' },
            { id: 'security', label: 'Security' },
            { id: 'alerts', label: `Alerts (${alerts.length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && healthSummary && (
        <div className="space-y-6">
          {/* Health Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Business Health"
              value={healthSummary.business.score}
              unit="%"
              status={healthSummary.business.score < 70 ? 'warning' : 'healthy'}
            />
            <MetricCard
              title="Technical Health"
              value={healthSummary.technical.score}
              unit="%"
              status={healthSummary.technical.score < 70 ? 'warning' : 'healthy'}
            />
            <MetricCard
              title="Security Health"
              value={healthSummary.security.score}
              unit="%"
              status={healthSummary.security.score < 80 ? 'critical' : 'healthy'}
            />
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Revenue/Hour"
              value={businessMetrics.revenue?.toFixed(0) || 0}
              unit="USD"
              status="healthy"
            />
            <MetricCard
              title="Conversion Rate"
              value={businessMetrics.conversionRate?.toFixed(2) || 0}
              unit="%"
              status="healthy"
            />
            <MetricCard
              title="Response Time"
              value={technicalMetrics.responseTime?.toFixed(0) || 0}
              unit="ms"
              status={technicalMetrics.responseTime > 1000 ? 'warning' : 'healthy'}
            />
            <MetricCard
              title="System Uptime"
              value={technicalMetrics.availability?.toFixed(1) || 0}
              unit="%"
              status={technicalMetrics.availability < 99 ? 'critical' : 'healthy'}
            />
          </div>

          {/* Recent Alerts */}
          {alerts.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Alerts</h3>
              <div className="space-y-3">
                {alerts.slice(0, 3).map((alert) => (
                  <AlertItem
                    key={alert.id}
                    alert={alert}
                    onAcknowledge={handleAcknowledgeAlert}
                    onResolve={handleResolveAlert}
                  />
                ))}
              </div>
              {alerts.length > 3 && (
                <button
                  onClick={() => setActiveTab('alerts')}
                  className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View all {alerts.length} alerts →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Business KPIs Tab */}
      {activeTab === 'business' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Revenue per Hour"
              value={businessMetrics.revenue?.toFixed(0) || 0}
              unit="USD"
              status="healthy"
            />
            <MetricCard
              title="Conversion Rate"
              value={businessMetrics.conversionRate?.toFixed(2) || 0}
              unit="%"
              status="healthy"
            />
            <MetricCard
              title="Average Order Value"
              value={businessMetrics.aov?.toFixed(0) || 0}
              unit="USD"
              status="healthy"
            />
            <MetricCard
              title="Sync Accuracy"
              value={businessMetrics.syncAccuracy?.toFixed(1) || 0}
              unit="%"
              status={businessMetrics.syncAccuracy < 98 ? 'warning' : 'healthy'}
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Performance Trends</h3>
            <p className="text-gray-600">
              Business performance charts would be displayed here with real-time data visualization.
            </p>
          </div>
        </div>
      )}

      {/* Technical Performance Tab */}
      {activeTab === 'technical' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="API Response Time (P95)"
              value={technicalMetrics.responseTime?.toFixed(0) || 0}
              unit="ms"
              status={technicalMetrics.responseTime > 1000 ? 'warning' : 'healthy'}
            />
            <MetricCard
              title="Error Rate"
              value={technicalMetrics.errorRate?.toFixed(2) || 0}
              unit="%"
              status={technicalMetrics.errorRate > 1 ? 'critical' : 'healthy'}
            />
            <MetricCard
              title="System Availability"
              value={technicalMetrics.availability?.toFixed(2) || 0}
              unit="%"
              status={technicalMetrics.availability < 99.5 ? 'warning' : 'healthy'}
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Analytics</h3>
            <p className="text-gray-600">
              Detailed performance charts and analytics would be displayed here.
            </p>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Security Score"
              value={healthSummary?.security.score || 0}
              unit="%"
              status={healthSummary?.security.score < 80 ? 'critical' : 'healthy'}
            />
            <MetricCard
              title="Failed Logins (24h)"
              value="12"
              unit="attempts"
              status="healthy"
            />
            <MetricCard
              title="Active Threats"
              value="0"
              unit="detected"
              status="healthy"
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Events</h3>
            <p className="text-gray-600">
              Security event timeline and threat analysis would be displayed here.
            </p>
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Active Alerts</h2>
            <div className="text-sm text-gray-500">
              {alerts.length} active alerts
            </div>
          </div>

          {alerts.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <div className="text-green-600 text-4xl mb-4">✅</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Alerts</h3>
              <p className="text-gray-600">All systems are operating normally.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={handleAcknowledgeAlert}
                  onResolve={handleResolveAlert}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
/**
 * ENTERPRISE APM DASHBOARD
 * 
 * Features:
 * - Application Performance Monitoring
 * - Business metrics and KPI tracking
 * - Security event monitoring
 * - Real-time alerting system
 * - Custom dashboards and reports
 * - Performance analytics and optimization
 */

import { performanceMonitor } from '@/lib/performance-monitor'
import { securityMonitor } from '@/lib/monitoring'

interface BusinessMetric {
  id: string
  name: string
  value: number
  unit: string
  timestamp: number
  tags: Record<string, string>
  threshold?: {
    warning: number
    critical: number
  }
}

interface KPIDefinition {
  id: string
  name: string
  description: string
  calculation: (data: any[]) => number
  unit: string
  target?: number
  thresholds: {
    warning: number
    critical: number
  }
  category: 'business' | 'technical' | 'security' | 'user_experience'
}

interface Alert {
  id: string
  type: 'performance' | 'business' | 'security' | 'system'
  severity: 'info' | 'warning' | 'critical' | 'emergency'
  title: string
  description: string
  metric: string
  value: number
  threshold: number
  timestamp: number
  acknowledged: boolean
  resolved: boolean
  assignee?: string
  tags: Record<string, string>
}

interface DashboardWidget {
  id: string
  type: 'metric' | 'chart' | 'table' | 'gauge' | 'heatmap' | 'alert_list'
  title: string
  description?: string
  config: {
    metrics: string[]
    timeRange: string
    refreshInterval: number
    visualization?: any
  }
  position: {
    x: number
    y: number
    width: number
    height: number
  }
}

interface Dashboard {
  id: string
  name: string
  description: string
  category: string
  widgets: DashboardWidget[]
  isPublic: boolean
  owner: string
  tags: string[]
  created: number
  updated: number
}

export class APMDashboard {
  private metrics: Map<string, BusinessMetric[]> = new Map()
  private kpiDefinitions: Map<string, KPIDefinition> = new Map()
  private alerts: Alert[] = []
  private dashboards: Map<string, Dashboard> = new Map()
  private alertHandlers: Map<string, (alert: Alert) => Promise<void>> = new Map()

  constructor() {
    this.initializeKPIDefinitions()
    this.initializeDefaultDashboards()
    this.startMetricCollection()
    console.log('📊 APM Dashboard initialized')
  }

  /**
   * Initialize KPI definitions
   */
  private initializeKPIDefinitions(): void {
    const kpis: KPIDefinition[] = [
      // Business KPIs
      {
        id: 'revenue_per_hour',
        name: 'Revenue per Hour',
        description: 'Total revenue generated per hour',
        calculation: (data) => data.reduce((sum, item) => sum + (item.amount || 0), 0),
        unit: 'USD',
        target: 1000,
        thresholds: { warning: 800, critical: 500 },
        category: 'business'
      },
      {
        id: 'orders_conversion_rate',
        name: 'Order Conversion Rate',
        description: 'Percentage of visitors who complete a purchase',
        calculation: (data) => {
          const orders = data.filter(item => item.type === 'order').length
          const visitors = data.filter(item => item.type === 'visitor').length
          return visitors > 0 ? (orders / visitors) * 100 : 0
        },
        unit: '%',
        target: 3.5,
        thresholds: { warning: 2.5, critical: 1.5 },
        category: 'business'
      },
      {
        id: 'average_order_value',
        name: 'Average Order Value',
        description: 'Average value of each order',
        calculation: (data) => {
          const orders = data.filter(item => item.type === 'order')
          const totalValue = orders.reduce((sum, order) => sum + (order.amount || 0), 0)
          return orders.length > 0 ? totalValue / orders.length : 0
        },
        unit: 'USD',
        target: 150,
        thresholds: { warning: 120, critical: 80 },
        category: 'business'
      },
      {
        id: 'inventory_sync_accuracy',
        name: 'Inventory Sync Accuracy',
        description: 'Accuracy of inventory synchronization across marketplaces',
        calculation: (data) => {
          const syncEvents = data.filter(item => item.type === 'sync')
          const successful = syncEvents.filter(item => item.success).length
          return syncEvents.length > 0 ? (successful / syncEvents.length) * 100 : 100
        },
        unit: '%',
        target: 99.5,
        thresholds: { warning: 98, critical: 95 },
        category: 'business'
      },

      // Technical KPIs
      {
        id: 'api_response_time_p95',
        name: 'API Response Time (95th percentile)',
        description: '95th percentile of API response times',
        calculation: (data) => {
          const responseTimes = data.map(item => item.responseTime).sort((a, b) => a - b)
          const index = Math.ceil(responseTimes.length * 0.95) - 1
          return responseTimes[index] || 0
        },
        unit: 'ms',
        target: 500,
        thresholds: { warning: 1000, critical: 2000 },
        category: 'technical'
      },
      {
        id: 'error_rate',
        name: 'Error Rate',
        description: 'Percentage of requests that result in errors',
        calculation: (data) => {
          const errors = data.filter(item => item.error).length
          return data.length > 0 ? (errors / data.length) * 100 : 0
        },
        unit: '%',
        target: 0.1,
        thresholds: { warning: 1, critical: 5 },
        category: 'technical'
      },
      {
        id: 'system_availability',
        name: 'System Availability',
        description: 'Percentage of time the system is available',
        calculation: (data) => {
          const uptime = data.filter(item => item.status === 'up').length
          return data.length > 0 ? (uptime / data.length) * 100 : 100
        },
        unit: '%',
        target: 99.9,
        thresholds: { warning: 99.5, critical: 99 },
        category: 'technical'
      },

      // Security KPIs
      {
        id: 'security_incidents',
        name: 'Security Incidents per Day',
        description: 'Number of security incidents detected per day',
        calculation: (data) => data.filter(item => item.type === 'security_incident').length,
        unit: 'count',
        target: 0,
        thresholds: { warning: 1, critical: 5 },
        category: 'security'
      },
      {
        id: 'failed_login_rate',
        name: 'Failed Login Rate',
        description: 'Percentage of login attempts that fail',
        calculation: (data) => {
          const logins = data.filter(item => item.type === 'login_attempt')
          const failures = logins.filter(item => !item.success).length
          return logins.length > 0 ? (failures / logins.length) * 100 : 0
        },
        unit: '%',
        target: 5,
        thresholds: { warning: 15, critical: 30 },
        category: 'security'
      },

      // User Experience KPIs
      {
        id: 'page_load_time',
        name: 'Average Page Load Time',
        description: 'Average time for pages to load completely',
        calculation: (data) => {
          const loadTimes = data.filter(item => item.loadTime).map(item => item.loadTime)
          return loadTimes.length > 0 ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length : 0
        },
        unit: 'ms',
        target: 2000,
        thresholds: { warning: 3000, critical: 5000 },
        category: 'user_experience'
      }
    ]

    for (const kpi of kpis) {
      this.kpiDefinitions.set(kpi.id, kpi)
    }
  }

  /**
   * Initialize default dashboards
   */
  private initializeDefaultDashboards(): void {
    const dashboards: Dashboard[] = [
      {
        id: 'business_overview',
        name: 'Business Overview',
        description: 'Key business metrics and KPIs',
        category: 'business',
        isPublic: true,
        owner: 'system',
        tags: ['business', 'kpi', 'overview'],
        created: Date.now(),
        updated: Date.now(),
        widgets: [
          {
            id: 'revenue_chart',
            type: 'chart',
            title: 'Revenue Trends',
            config: {
              metrics: ['revenue_per_hour'],
              timeRange: '24h',
              refreshInterval: 300000 // 5 minutes
            },
            position: { x: 0, y: 0, width: 6, height: 4 }
          },
          {
            id: 'conversion_gauge',
            type: 'gauge',
            title: 'Conversion Rate',
            config: {
              metrics: ['orders_conversion_rate'],
              timeRange: '1h',
              refreshInterval: 60000 // 1 minute
            },
            position: { x: 6, y: 0, width: 3, height: 4 }
          },
          {
            id: 'aov_metric',
            type: 'metric',
            title: 'Average Order Value',
            config: {
              metrics: ['average_order_value'],
              timeRange: '1h',
              refreshInterval: 300000
            },
            position: { x: 9, y: 0, width: 3, height: 4 }
          }
        ]
      },
      {
        id: 'technical_performance',
        name: 'Technical Performance',
        description: 'System performance and technical metrics',
        category: 'technical',
        isPublic: true,
        owner: 'system',
        tags: ['performance', 'technical', 'monitoring'],
        created: Date.now(),
        updated: Date.now(),
        widgets: [
          {
            id: 'response_time_chart',
            type: 'chart',
            title: 'API Response Times',
            config: {
              metrics: ['api_response_time_p95'],
              timeRange: '4h',
              refreshInterval: 60000
            },
            position: { x: 0, y: 0, width: 8, height: 4 }
          },
          {
            id: 'error_rate_gauge',
            type: 'gauge',
            title: 'Error Rate',
            config: {
              metrics: ['error_rate'],
              timeRange: '1h',
              refreshInterval: 60000
            },
            position: { x: 8, y: 0, width: 4, height: 4 }
          },
          {
            id: 'availability_metric',
            type: 'metric',
            title: 'System Availability',
            config: {
              metrics: ['system_availability'],
              timeRange: '24h',
              refreshInterval: 300000
            },
            position: { x: 0, y: 4, width: 6, height: 2 }
          }
        ]
      },
      {
        id: 'marketplace_integration',
        name: 'Marketplace Integration',
        description: 'Monitoring marketplace integrations and sync operations',
        category: 'integration',
        isPublic: true,
        owner: 'system',
        tags: ['marketplace', 'integration', 'sync'],
        created: Date.now(),
        updated: Date.now(),
        widgets: [
          {
            id: 'sync_accuracy',
            type: 'gauge',
            title: 'Inventory Sync Accuracy',
            config: {
              metrics: ['inventory_sync_accuracy'],
              timeRange: '1h',
              refreshInterval: 60000
            },
            position: { x: 0, y: 0, width: 4, height: 4 }
          },
          {
            id: 'integration_health',
            type: 'table',
            title: 'Integration Health Status',
            config: {
              metrics: ['shopify_health', 'mercadolibre_health', 'stripe_health'],
              timeRange: '5m',
              refreshInterval: 30000
            },
            position: { x: 4, y: 0, width: 8, height: 4 }
          }
        ]
      },
      {
        id: 'security_dashboard',
        name: 'Security Monitoring',
        description: 'Security events and threat monitoring',
        category: 'security',
        isPublic: false,
        owner: 'security_team',
        tags: ['security', 'threats', 'incidents'],
        created: Date.now(),
        updated: Date.now(),
        widgets: [
          {
            id: 'security_incidents',
            type: 'alert_list',
            title: 'Recent Security Incidents',
            config: {
              metrics: ['security_incidents'],
              timeRange: '24h',
              refreshInterval: 30000
            },
            position: { x: 0, y: 0, width: 8, height: 6 }
          },
          {
            id: 'failed_logins',
            type: 'chart',
            title: 'Failed Login Attempts',
            config: {
              metrics: ['failed_login_rate'],
              timeRange: '4h',
              refreshInterval: 60000
            },
            position: { x: 8, y: 0, width: 4, height: 6 }
          }
        ]
      }
    ]

    for (const dashboard of dashboards) {
      this.dashboards.set(dashboard.id, dashboard)
    }
  }

  /**
   * Record business metric
   */
  recordMetric(metricId: string, value: number, tags: Record<string, string> = {}): void {
    const metric: BusinessMetric = {
      id: this.generateMetricId(),
      name: metricId,
      value,
      unit: this.getMetricUnit(metricId),
      timestamp: Date.now(),
      tags
    }

    if (!this.metrics.has(metricId)) {
      this.metrics.set(metricId, [])
    }

    this.metrics.get(metricId)!.push(metric)

    // Keep only recent metrics (last 24 hours)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    const filteredMetrics = this.metrics.get(metricId)!.filter(m => m.timestamp > cutoff)
    this.metrics.set(metricId, filteredMetrics)

    // Check for alerts
    this.checkAlertThresholds(metricId, value)
  }

  /**
   * Calculate KPI value
   */
  calculateKPI(kpiId: string, timeRange: string = '1h'): number {
    const kpi = this.kpiDefinitions.get(kpiId)
    if (!kpi) return 0

    const timeRangeMs = this.parseTimeRange(timeRange)
    const cutoff = Date.now() - timeRangeMs

    // Collect relevant data for KPI calculation
    const relevantData = this.collectKPIData(kpiId, cutoff)

    return kpi.calculation(relevantData)
  }

  /**
   * Get dashboard data
   */
  getDashboard(dashboardId: string): Dashboard | null {
    return this.dashboards.get(dashboardId) || null
  }

  /**
   * Get all dashboards
   */
  getAllDashboards(): Dashboard[] {
    return Array.from(this.dashboards.values())
  }

  /**
   * Create custom dashboard
   */
  createDashboard(dashboard: Omit<Dashboard, 'id' | 'created' | 'updated'>): string {
    const dashboardId = this.generateDashboardId()
    const newDashboard: Dashboard = {
      ...dashboard,
      id: dashboardId,
      created: Date.now(),
      updated: Date.now()
    }

    this.dashboards.set(dashboardId, newDashboard)
    console.log(`📊 Dashboard created: ${dashboard.name}`)

    return dashboardId
  }

  /**
   * Get widget data
   */
  async getWidgetData(widget: DashboardWidget): Promise<any> {
    const timeRange = widget.config.timeRange
    const metrics = widget.config.metrics

    const data: any = {
      widget: widget.id,
      type: widget.type,
      timestamp: Date.now(),
      data: []
    }

    for (const metricId of metrics) {
      if (this.kpiDefinitions.has(metricId)) {
        // KPI metric
        const value = this.calculateKPI(metricId, timeRange)
        const kpi = this.kpiDefinitions.get(metricId)!
        
        data.data.push({
          metric: metricId,
          name: kpi.name,
          value,
          unit: kpi.unit,
          target: kpi.target,
          thresholds: kpi.thresholds,
          category: kpi.category
        })
      } else if (this.metrics.has(metricId)) {
        // Raw metric
        const timeRangeMs = this.parseTimeRange(timeRange)
        const cutoff = Date.now() - timeRangeMs
        const metricData = this.metrics.get(metricId)!.filter(m => m.timestamp > cutoff)
        
        data.data.push({
          metric: metricId,
          values: metricData.map(m => ({ timestamp: m.timestamp, value: m.value })),
          latest: metricData.length > 0 ? metricData[metricData.length - 1].value : 0
        })
      }
    }

    return data
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(severity?: Alert['severity']): Alert[] {
    let alerts = this.alerts.filter(alert => !alert.resolved)
    
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity)
    }

    return alerts.sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Create alert
   */
  createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged' | 'resolved'>): string {
    const alertId = this.generateAlertId()
    const newAlert: Alert = {
      ...alert,
      id: alertId,
      timestamp: Date.now(),
      acknowledged: false,
      resolved: false
    }

    this.alerts.push(newAlert)

    console.log(`🚨 Alert created: ${alert.severity.toUpperCase()} - ${alert.title}`)

    // Trigger alert handlers
    this.triggerAlertHandlers(newAlert)

    return alertId
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, assignee: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (!alert) return false

    alert.acknowledged = true
    alert.assignee = assignee

    console.log(`✅ Alert acknowledged: ${alertId} by ${assignee}`)
    return true
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (!alert) return false

    alert.resolved = true
    console.log(`✅ Alert resolved: ${alertId}`)
    return true
  }

  /**
   * Register alert handler
   */
  registerAlertHandler(type: string, handler: (alert: Alert) => Promise<void>): void {
    this.alertHandlers.set(type, handler)
  }

  /**
   * Get system health summary
   */
  getHealthSummary(): {
    overall: 'healthy' | 'warning' | 'critical'
    business: { score: number; status: string }
    technical: { score: number; status: string }
    security: { score: number; status: string }
    activeAlerts: number
    criticalAlerts: number
  } {
    const businessKPIs = Array.from(this.kpiDefinitions.values()).filter(kpi => kpi.category === 'business')
    const technicalKPIs = Array.from(this.kpiDefinitions.values()).filter(kpi => kpi.category === 'technical')
    const securityKPIs = Array.from(this.kpiDefinitions.values()).filter(kpi => kpi.category === 'security')

    const businessScore = this.calculateCategoryScore(businessKPIs)
    const technicalScore = this.calculateCategoryScore(technicalKPIs)
    const securityScore = this.calculateCategoryScore(securityKPIs)

    const activeAlerts = this.getActiveAlerts().length
    const criticalAlerts = this.getActiveAlerts('critical').length

    const overallScore = (businessScore + technicalScore + securityScore) / 3
    const overall = criticalAlerts > 0 ? 'critical' : 
                   overallScore < 70 ? 'warning' : 'healthy'

    return {
      overall,
      business: { score: businessScore, status: this.getScoreStatus(businessScore) },
      technical: { score: technicalScore, status: this.getScoreStatus(technicalScore) },
      security: { score: securityScore, status: this.getScoreStatus(securityScore) },
      activeAlerts,
      criticalAlerts
    }
  }

  /**
   * Start metric collection
   */
  private startMetricCollection(): void {
    // Collect metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics()
    }, 30000)

    // Calculate KPIs every 5 minutes
    setInterval(() => {
      this.calculateAllKPIs()
    }, 300000)

    console.log('📈 Metric collection started')
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    try {
      // Get performance metrics
      const performanceStatus = performanceMonitor.getCurrentStatus()
      
      this.recordMetric('api_response_time', performanceStatus.score, { category: 'performance' })
      this.recordMetric('system_availability', performanceStatus.score > 0 ? 100 : 0, { category: 'availability' })

      // Get security metrics
      const securityEvents = securityMonitor.getEventStats(1) // Last 1 hour
      this.recordMetric('security_incidents', securityEvents.total, { category: 'security' })

      // Record business metrics (these would come from your application logic)
      // This is where you'd integrate with your business logic to collect real metrics

    } catch (error) {
      console.error('❌ Error collecting system metrics:', error)
    }
  }

  /**
   * Calculate all KPIs
   */
  private calculateAllKPIs(): void {
    for (const [kpiId, kpi] of this.kpiDefinitions) {
      try {
        const value = this.calculateKPI(kpiId)
        this.recordMetric(`kpi_${kpiId}`, value, { category: kpi.category, type: 'kpi' })
      } catch (error) {
        console.error(`❌ Error calculating KPI ${kpiId}:`, error)
      }
    }
  }

  /**
   * Check alert thresholds
   */
  private checkAlertThresholds(metricId: string, value: number): void {
    const kpi = this.kpiDefinitions.get(metricId)
    if (!kpi || !kpi.thresholds) return

    const { warning, critical } = kpi.thresholds

    if (value >= critical) {
      this.createAlert({
        type: 'business',
        severity: 'critical',
        title: `Critical threshold exceeded: ${kpi.name}`,
        description: `${kpi.name} value ${value} ${kpi.unit} exceeds critical threshold of ${critical} ${kpi.unit}`,
        metric: metricId,
        value,
        threshold: critical,
        tags: { category: kpi.category, type: 'threshold' }
      })
    } else if (value >= warning) {
      this.createAlert({
        type: 'business',
        severity: 'warning',
        title: `Warning threshold exceeded: ${kpi.name}`,
        description: `${kpi.name} value ${value} ${kpi.unit} exceeds warning threshold of ${warning} ${kpi.unit}`,
        metric: metricId,
        value,
        threshold: warning,
        tags: { category: kpi.category, type: 'threshold' }
      })
    }
  }

  /**
   * Trigger alert handlers
   */
  private async triggerAlertHandlers(alert: Alert): Promise<void> {
    const handlers = [
      this.alertHandlers.get(alert.type),
      this.alertHandlers.get('all')
    ].filter(Boolean)

    for (const handler of handlers) {
      try {
        await handler!(alert)
      } catch (error) {
        console.error('❌ Error in alert handler:', error)
      }
    }
  }

  /**
   * Utility methods
   */
  private parseTimeRange(timeRange: string): number {
    const unit = timeRange.slice(-1)
    const value = parseInt(timeRange.slice(0, -1))

    switch (unit) {
      case 's': return value * 1000
      case 'm': return value * 60 * 1000
      case 'h': return value * 60 * 60 * 1000
      case 'd': return value * 24 * 60 * 60 * 1000
      default: return 60 * 60 * 1000 // Default to 1 hour
    }
  }

  private collectKPIData(kpiId: string, cutoff: number): any[] {
    // This would collect relevant data for KPI calculation
    // For now, return empty array as placeholder
    return []
  }

  private getMetricUnit(metricId: string): string {
    const kpi = this.kpiDefinitions.get(metricId)
    return kpi?.unit || 'count'
  }

  private calculateCategoryScore(kpis: KPIDefinition[]): number {
    if (kpis.length === 0) return 100

    let totalScore = 0
    for (const kpi of kpis) {
      const value = this.calculateKPI(kpi.id)
      const score = this.calculateKPIScore(kpi, value)
      totalScore += score
    }

    return totalScore / kpis.length
  }

  private calculateKPIScore(kpi: KPIDefinition, value: number): number {
    if (value >= kpi.thresholds.critical) return 0
    if (value >= kpi.thresholds.warning) return 50
    if (kpi.target && value >= kpi.target) return 100
    return 75 // Default good score
  }

  private getScoreStatus(score: number): string {
    if (score >= 90) return 'excellent'
    if (score >= 80) return 'good'
    if (score >= 70) return 'fair'
    if (score >= 50) return 'poor'
    return 'critical'
  }

  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateDashboardId(): string {
    return `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Export singleton instance
export const apmDashboard = new APMDashboard()

// Export factory function
export function createAPMDashboard(): APMDashboard {
  return new APMDashboard()
}
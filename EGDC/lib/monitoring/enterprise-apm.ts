/**
 * ENTERPRISE APPLICATION PERFORMANCE MONITORING (APM)
 * 
 * Features:
 * - Real-time performance metrics collection
 * - Business KPI tracking
 * - Error tracking and alerting
 * - User experience monitoring
 * - Infrastructure health monitoring
 * - Custom dashboard creation
 * - Automated alerting and incident response
 */

import { performanceMonitor } from '@/lib/performance-monitor'
import { securityMonitor } from '@/lib/monitoring'

interface MetricData {
  name: string
  value: number
  unit: string
  timestamp: number
  tags: Record<string, string>
  metadata?: Record<string, any>
}

interface BusinessMetric {
  name: string
  value: number
  target?: number
  threshold?: {
    warning: number
    critical: number
  }
  trend: 'up' | 'down' | 'stable'
  period: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly'
}

interface PerformanceAlert {
  id: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  description: string
  metric: string
  value: number
  threshold: number
  timestamp: number
  resolved: boolean
  resolvedAt?: number
  actions: string[]
}

interface UserExperienceMetric {
  userId?: string
  sessionId: string
  pageLoadTime: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
  firstInputDelay: number
  timeToInteractive: number
  bounceRate: number
  conversionRate: number
  errorRate: number
  timestamp: number
}

export class EnterpriseAPM {
  private metrics: Map<string, MetricData[]> = new Map()
  private businessMetrics: Map<string, BusinessMetric> = new Map()
  private alerts: Map<string, PerformanceAlert> = new Map()
  private userExperienceData: UserExperienceMetric[] = []
  private alertCallbacks: Map<string, Function[]> = new Map()
  private isCollecting = false
  private collectionInterval?: NodeJS.Timeout
  private readonly retentionDays = 30

  constructor() {
    console.log('🔬 Enterprise APM System initialized')
    this.startMetricsCollection()
    this.setupBusinessMetrics()
  }

  /**
   * Start real-time metrics collection
   */
  private startMetricsCollection(): void {
    if (this.isCollecting) return

    this.isCollecting = true
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics()
      this.collectApplicationMetrics()
      this.collectBusinessMetrics()
      this.evaluateAlerts()
      this.cleanupOldData()
    }, 60000) // Collect every minute

    console.log('📊 Metrics collection started')
  }

  /**
   * Stop metrics collection
   */
  stopMetricsCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval)
      this.collectionInterval = undefined
    }
    this.isCollecting = false
    console.log('⏹️ Metrics collection stopped')
  }

  /**
   * Record custom metric
   */
  recordMetric(metric: Omit<MetricData, 'timestamp'>): void {
    const metricData: MetricData = {
      ...metric,
      timestamp: Date.now()
    }

    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, [])
    }

    const metricHistory = this.metrics.get(metric.name)!
    metricHistory.push(metricData)

    // Keep only last 1000 data points per metric
    if (metricHistory.length > 1000) {
      metricHistory.splice(0, metricHistory.length - 1000)
    }

    // Check if this metric triggers any alerts
    this.checkMetricAlerts(metricData)
  }

  /**
   * Record business KPI
   */
  recordBusinessMetric(name: string, value: number, target?: number): void {
    const existingMetric = this.businessMetrics.get(name)
    const trend = existingMetric 
      ? (value > existingMetric.value ? 'up' : value < existingMetric.value ? 'down' : 'stable')
      : 'stable'

    const businessMetric: BusinessMetric = {
      name,
      value,
      target,
      trend: trend as 'up' | 'down' | 'stable',
      period: 'realtime',
      threshold: this.getBusinessMetricThreshold(name)
    }

    this.businessMetrics.set(name, businessMetric)

    // Record as regular metric for historical tracking
    this.recordMetric({
      name: `business.${name}`,
      value,
      unit: 'count',
      tags: { type: 'business_kpi' }
    })
  }

  /**
   * Record user experience metrics
   */
  recordUserExperience(metrics: Omit<UserExperienceMetric, 'timestamp'>): void {
    const uxMetric: UserExperienceMetric = {
      ...metrics,
      timestamp: Date.now()
    }

    this.userExperienceData.push(uxMetric)

    // Keep only last 10000 UX records
    if (this.userExperienceData.length > 10000) {
      this.userExperienceData.splice(0, this.userExperienceData.length - 10000)
    }

    // Record individual UX metrics
    this.recordMetric({
      name: 'ux.page_load_time',
      value: metrics.pageLoadTime,
      unit: 'ms',
      tags: { 
        type: 'user_experience',
        session_id: metrics.sessionId,
        user_id: metrics.userId || 'anonymous'
      }
    })

    this.recordMetric({
      name: 'ux.first_contentful_paint',
      value: metrics.firstContentfulPaint,
      unit: 'ms',
      tags: { type: 'user_experience' }
    })

    // Check for poor user experience and alert
    this.checkUserExperienceAlerts(uxMetric)
  }

  /**
   * Create custom alert rule
   */
  createAlert(
    metricName: string,
    condition: 'above' | 'below' | 'equals',
    threshold: number,
    severity: 'info' | 'warning' | 'critical',
    title: string,
    description: string,
    actions: string[] = []
  ): string {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const alert: PerformanceAlert = {
      id: alertId,
      severity,
      title,
      description,
      metric: metricName,
      value: 0, // Will be updated when triggered
      threshold,
      timestamp: Date.now(),
      resolved: true, // Start as resolved
      actions
    }

    this.alerts.set(alertId, alert)
    
    // Store alert condition for evaluation
    if (!this.alertCallbacks.has(metricName)) {
      this.alertCallbacks.set(metricName, [])
    }
    
    this.alertCallbacks.get(metricName)!.push((value: number) => {
      let triggered = false
      
      switch (condition) {
        case 'above':
          triggered = value > threshold
          break
        case 'below':
          triggered = value < threshold
          break
        case 'equals':
          triggered = value === threshold
          break
      }
      
      if (triggered && alert.resolved) {
        this.triggerAlert(alertId, value)
      } else if (!triggered && !alert.resolved) {
        this.resolveAlert(alertId)
      }
    })

    console.log(`🚨 Alert created: ${title} (${alertId})`)
    return alertId
  }

  /**
   * Get real-time dashboard data
   */
  getDashboardData(): {
    systemHealth: {
      status: 'healthy' | 'warning' | 'critical'
      uptime: number
      responseTime: number
      errorRate: number
      throughput: number
    }
    businessMetrics: BusinessMetric[]
    activeAlerts: PerformanceAlert[]
    userExperience: {
      averagePageLoadTime: number
      averageFirstContentfulPaint: number
      bounceRate: number
      conversionRate: number
      activeUsers: number
    }
    performanceMetrics: {
      name: string
      current: number
      average: number
      trend: 'up' | 'down' | 'stable'
    }[]
  } {
    return {
      systemHealth: this.getSystemHealth(),
      businessMetrics: Array.from(this.businessMetrics.values()),
      activeAlerts: Array.from(this.alerts.values()).filter(alert => !alert.resolved),
      userExperience: this.getUserExperienceOverview(),
      performanceMetrics: this.getPerformanceOverview()
    }
  }

  /**
   * Get historical data for a specific metric
   */
  getMetricHistory(
    metricName: string,
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h'
  ): MetricData[] {
    const history = this.metrics.get(metricName) || []
    const now = Date.now()
    
    let cutoffTime = now
    switch (timeRange) {
      case '1h':
        cutoffTime = now - (60 * 60 * 1000)
        break
      case '24h':
        cutoffTime = now - (24 * 60 * 60 * 1000)
        break
      case '7d':
        cutoffTime = now - (7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        cutoffTime = now - (30 * 24 * 60 * 60 * 1000)
        break
    }
    
    return history.filter(metric => metric.timestamp >= cutoffTime)
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(timeRange: '24h' | '7d' | '30d' = '24h'): {
    summary: {
      totalRequests: number
      averageResponseTime: number
      errorRate: number
      uptime: number
      throughput: number
    }
    topSlowEndpoints: Array<{
      endpoint: string
      averageResponseTime: number
      requestCount: number
    }>
    errorBreakdown: Array<{
      error: string
      count: number
      percentage: number
    }>
    businessMetrics: Array<{
      name: string
      value: number
      change: number
      target?: number
    }>
    recommendations: string[]
  } {
    const metricsInRange = this.getMetricsInTimeRange(timeRange)
    
    return {
      summary: this.calculateSummaryMetrics(metricsInRange),
      topSlowEndpoints: this.getSlowEndpoints(metricsInRange),
      errorBreakdown: this.getErrorBreakdown(metricsInRange),
      businessMetrics: this.getBusinessMetricsChange(timeRange),
      recommendations: this.generateRecommendations(metricsInRange)
    }
  }

  /**
   * Set up automated business metrics
   */
  private setupBusinessMetrics(): void {
    // Create default business metric alerts
    this.createAlert(
      'business.daily_active_users',
      'below',
      100,
      'warning',
      'Low Daily Active Users',
      'Daily active users have fallen below threshold',
      ['investigate_user_engagement', 'check_marketing_campaigns']
    )

    this.createAlert(
      'business.conversion_rate',
      'below',
      0.02, // 2%
      'critical',
      'Low Conversion Rate',
      'Conversion rate is critically low',
      ['review_checkout_flow', 'check_payment_issues', 'analyze_user_journey']
    )

    this.createAlert(
      'business.revenue_per_hour',
      'below',
      1000,
      'warning',
      'Revenue Drop',
      'Hourly revenue has dropped significantly',
      ['check_marketplace_integrations', 'review_pricing_strategy']
    )
  }

  /**
   * Collect system-level metrics
   */
  private collectSystemMetrics(): void {
    // Memory usage
    const memUsage = process.memoryUsage()
    this.recordMetric({
      name: 'system.memory.used',
      value: memUsage.heapUsed,
      unit: 'bytes',
      tags: { type: 'system' }
    })

    this.recordMetric({
      name: 'system.memory.total',
      value: memUsage.heapTotal,
      unit: 'bytes',
      tags: { type: 'system' }
    })

    // CPU usage (approximation)
    const cpuUsage = process.cpuUsage()
    this.recordMetric({
      name: 'system.cpu.user',
      value: cpuUsage.user,
      unit: 'microseconds',
      tags: { type: 'system' }
    })

    // Event loop lag
    const start = process.hrtime()
    setImmediate(() => {
      const lag = process.hrtime(start)
      const lagMs = lag[0] * 1000 + lag[1] * 1e-6
      this.recordMetric({
        name: 'system.event_loop_lag',
        value: lagMs,
        unit: 'ms',
        tags: { type: 'system' }
      })
    })
  }

  /**
   * Collect application-specific metrics
   */
  private collectApplicationMetrics(): void {
    // Get performance data from performance monitor
    const performanceData = performanceMonitor.getStats()
    
    this.recordMetric({
      name: 'app.request.count',
      value: performanceData.totalRequests,
      unit: 'count',
      tags: { type: 'application' }
    })

    this.recordMetric({
      name: 'app.request.average_response_time',
      value: performanceData.averageResponseTime,
      unit: 'ms',
      tags: { type: 'application' }
    })

    this.recordMetric({
      name: 'app.request.error_rate',
      value: performanceData.errorRate,
      unit: 'percentage',
      tags: { type: 'application' }
    })
  }

  /**
   * Collect business metrics
   */
  private collectBusinessMetrics(): void {
    // These would typically come from your database
    // For now, we'll simulate some business metrics
    this.recordBusinessMetric('daily_active_users', this.getDailyActiveUsers())
    this.recordBusinessMetric('conversion_rate', this.getConversionRate())
    this.recordBusinessMetric('revenue_per_hour', this.getHourlyRevenue())
    this.recordBusinessMetric('marketplace_sync_success_rate', this.getMarketplaceSyncRate())
  }

  /**
   * Evaluate all alert conditions
   */
  private evaluateAlerts(): void {
    for (const [metricName, callbacks] of this.alertCallbacks.entries()) {
      const recentMetrics = this.getMetricHistory(metricName, '1h')
      if (recentMetrics.length > 0) {
        const latestValue = recentMetrics[recentMetrics.length - 1].value
        callbacks.forEach(callback => callback(latestValue))
      }
    }
  }

  /**
   * Check metric-specific alerts
   */
  private checkMetricAlerts(metric: MetricData): void {
    const callbacks = this.alertCallbacks.get(metric.name) || []
    callbacks.forEach(callback => callback(metric.value))
  }

  /**
   * Check user experience alerts
   */
  private checkUserExperienceAlerts(uxMetric: UserExperienceMetric): void {
    // Alert on poor page load times
    if (uxMetric.pageLoadTime > 3000) {
      this.triggerCustomAlert(
        'Poor Page Load Performance',
        `Page load time of ${uxMetric.pageLoadTime}ms exceeds 3s threshold`,
        'warning',
        ['optimize_images', 'review_javascript_bundles', 'check_server_performance']
      )
    }

    // Alert on high CLS (Cumulative Layout Shift)
    if (uxMetric.cumulativeLayoutShift > 0.25) {
      this.triggerCustomAlert(
        'High Layout Shift',
        `CLS of ${uxMetric.cumulativeLayoutShift} exceeds 0.25 threshold`,
        'warning',
        ['review_css_loading', 'optimize_font_loading', 'fix_dynamic_content']
      )
    }
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(alertId: string, value: number): void {
    const alert = this.alerts.get(alertId)
    if (!alert) return

    alert.resolved = false
    alert.value = value
    alert.timestamp = Date.now()

    console.warn(`🚨 ALERT TRIGGERED: ${alert.title}`)
    console.warn(`   Metric: ${alert.metric}`)
    console.warn(`   Value: ${value}`)
    console.warn(`   Threshold: ${alert.threshold}`)

    // Execute alert actions
    this.executeAlertActions(alert)

    // Log security event for critical alerts
    if (alert.severity === 'critical') {
      securityMonitor.logEvent({
        type: 'critical_performance_alert',
        ip: 'system',
        endpoint: 'apm',
        details: {
          alertId,
          title: alert.title,
          metric: alert.metric,
          value,
          threshold: alert.threshold
        }
      })
    }
  }

  /**
   * Resolve an alert
   */
  private resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId)
    if (!alert) return

    alert.resolved = true
    alert.resolvedAt = Date.now()

    console.log(`✅ ALERT RESOLVED: ${alert.title}`)
  }

  /**
   * Trigger custom alert
   */
  private triggerCustomAlert(
    title: string,
    description: string,
    severity: 'info' | 'warning' | 'critical',
    actions: string[] = []
  ): void {
    const alertId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const alert: PerformanceAlert = {
      id: alertId,
      severity,
      title,
      description,
      metric: 'custom',
      value: 0,
      threshold: 0,
      timestamp: Date.now(),
      resolved: false,
      actions
    }

    this.alerts.set(alertId, alert)
    this.executeAlertActions(alert)
  }

  /**
   * Execute alert actions
   */
  private executeAlertActions(alert: PerformanceAlert): void {
    alert.actions.forEach(action => {
      switch (action) {
        case 'investigate_user_engagement':
          console.log('🔍 Action: Investigating user engagement metrics...')
          break
        case 'check_marketplace_integrations':
          console.log('🔍 Action: Checking marketplace integration health...')
          break
        case 'optimize_images':
          console.log('🔍 Action: Image optimization recommended')
          break
        case 'review_checkout_flow':
          console.log('🔍 Action: Checkout flow review needed')
          break
        default:
          console.log(`🔍 Action: ${action}`)
      }
    })
  }

  /**
   * Get system health overview
   */
  private getSystemHealth(): {
    status: 'healthy' | 'warning' | 'critical'
    uptime: number
    responseTime: number
    errorRate: number
    throughput: number
  } {
    const recentMetrics = this.getMetricsInTimeRange('1h')
    const responseTimeMetrics = recentMetrics.filter(m => m.name === 'app.request.average_response_time')
    const errorRateMetrics = recentMetrics.filter(m => m.name === 'app.request.error_rate')
    
    const avgResponseTime = this.calculateAverage(responseTimeMetrics.map(m => m.value))
    const avgErrorRate = this.calculateAverage(errorRateMetrics.map(m => m.value))
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (avgResponseTime > 1000 || avgErrorRate > 5) {
      status = 'warning'
    }
    if (avgResponseTime > 3000 || avgErrorRate > 10) {
      status = 'critical'
    }

    return {
      status,
      uptime: process.uptime(),
      responseTime: avgResponseTime,
      errorRate: avgErrorRate,
      throughput: this.calculateThroughput(recentMetrics)
    }
  }

  /**
   * Get user experience overview
   */
  private getUserExperienceOverview(): {
    averagePageLoadTime: number
    averageFirstContentfulPaint: number
    bounceRate: number
    conversionRate: number
    activeUsers: number
  } {
    const recentUX = this.userExperienceData.filter(
      ux => ux.timestamp > Date.now() - (60 * 60 * 1000) // Last hour
    )

    return {
      averagePageLoadTime: this.calculateAverage(recentUX.map(ux => ux.pageLoadTime)),
      averageFirstContentfulPaint: this.calculateAverage(recentUX.map(ux => ux.firstContentfulPaint)),
      bounceRate: this.calculateAverage(recentUX.map(ux => ux.bounceRate)),
      conversionRate: this.calculateAverage(recentUX.map(ux => ux.conversionRate)),
      activeUsers: new Set(recentUX.map(ux => ux.userId).filter(Boolean)).size
    }
  }

  /**
   * Get performance overview
   */
  private getPerformanceOverview(): Array<{
    name: string
    current: number
    average: number
    trend: 'up' | 'down' | 'stable'
  }> {
    const keyMetrics = [
      'app.request.average_response_time',
      'app.request.error_rate',
      'system.memory.used',
      'system.event_loop_lag'
    ]

    return keyMetrics.map(metricName => {
      const recent = this.getMetricHistory(metricName, '1h')
      const historical = this.getMetricHistory(metricName, '24h')

      const current = recent.length > 0 ? recent[recent.length - 1].value : 0
      const average = this.calculateAverage(historical.map(m => m.value))
      
      let trend: 'up' | 'down' | 'stable' = 'stable'
      if (recent.length >= 2) {
        const previous = recent[recent.length - 2].value
        trend = current > previous ? 'up' : current < previous ? 'down' : 'stable'
      }

      return {
        name: metricName,
        current,
        average,
        trend
      }
    })
  }

  // Helper methods for business metrics simulation
  private getDailyActiveUsers(): number {
    return Math.floor(Math.random() * 1000) + 500
  }

  private getConversionRate(): number {
    return Math.random() * 0.05 + 0.01 // 1-6%
  }

  private getHourlyRevenue(): number {
    return Math.floor(Math.random() * 5000) + 1000
  }

  private getMarketplaceSyncRate(): number {
    return Math.random() * 0.1 + 0.9 // 90-100%
  }

  private getBusinessMetricThreshold(name: string): { warning: number; critical: number } | undefined {
    const thresholds: Record<string, { warning: number; critical: number }> = {
      'daily_active_users': { warning: 100, critical: 50 },
      'conversion_rate': { warning: 0.02, critical: 0.01 },
      'revenue_per_hour': { warning: 1000, critical: 500 }
    }
    return thresholds[name]
  }

  private getMetricsInTimeRange(timeRange: '1h' | '24h' | '7d' | '30d'): MetricData[] {
    const allMetrics: MetricData[] = []
    for (const metricHistory of this.metrics.values()) {
      allMetrics.push(...this.getMetricHistory('', timeRange))
    }
    return allMetrics
  }

  private calculateSummaryMetrics(metrics: MetricData[]): any {
    // Implementation for summary calculation
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      uptime: process.uptime(),
      throughput: 0
    }
  }

  private getSlowEndpoints(metrics: MetricData[]): any[] {
    // Implementation for slow endpoints analysis
    return []
  }

  private getErrorBreakdown(metrics: MetricData[]): any[] {
    // Implementation for error analysis
    return []
  }

  private getBusinessMetricsChange(timeRange: string): any[] {
    // Implementation for business metrics change analysis
    return []
  }

  private generateRecommendations(metrics: MetricData[]): string[] {
    return [
      'Consider implementing database connection pooling',
      'Optimize image loading with lazy loading',
      'Review and optimize slow API endpoints',
      'Consider implementing CDN for static assets'
    ]
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }

  private calculateThroughput(metrics: MetricData[]): number {
    const requestMetrics = metrics.filter(m => m.name === 'app.request.count')
    if (requestMetrics.length < 2) return 0
    
    const latest = requestMetrics[requestMetrics.length - 1]
    const previous = requestMetrics[requestMetrics.length - 2]
    const timeDiff = (latest.timestamp - previous.timestamp) / 1000 // seconds
    
    return (latest.value - previous.value) / timeDiff // requests per second
  }

  private cleanupOldData(): void {
    const cutoffTime = Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000)
    
    // Clean up metrics
    for (const [name, history] of this.metrics.entries()) {
      const filteredHistory = history.filter(metric => metric.timestamp >= cutoffTime)
      this.metrics.set(name, filteredHistory)
    }
    
    // Clean up UX data
    this.userExperienceData = this.userExperienceData.filter(
      ux => ux.timestamp >= cutoffTime
    )
    
    // Clean up resolved alerts older than 7 days
    const alertCutoff = Date.now() - (7 * 24 * 60 * 60 * 1000)
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.resolved && alert.resolvedAt && alert.resolvedAt < alertCutoff) {
        this.alerts.delete(alertId)
      }
    }
  }
}

// Export singleton instance
export const enterpriseAPM = new EnterpriseAPM()

// Export types for external use
export type {
  MetricData,
  BusinessMetric,
  PerformanceAlert,
  UserExperienceMetric
}
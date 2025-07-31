/**
 * SCALABILITY: Performance Monitoring and Bottleneck Analysis System
 * Real-time monitoring of all scalability improvements with detailed metrics
 * 
 * Phase 2 Implementation: Performance Analysis and Monitoring
 * Tracks database, cache, middleware, and overall system performance
 */

import { tenantConnectionManager } from './tenant-connection-manager'
import { tenantCache } from './tenant-redis-cache'
import { optimizedDb } from './optimized-database-operations'

export interface PerformanceMetrics {
  timestamp: string
  
  // Request-level metrics
  totalRequests: number
  averageResponseTime: number
  requestsPerSecond: number
  errorRate: number
  
  // Database metrics
  database: {
    totalConnections: number
    activeConnections: number
    idleConnections: number
    totalQueries: number
    averageQueryTime: number
    slowQueries: number
    connectionPools: number
  }
  
  // Cache metrics
  cache: {
    hitRate: number
    missRate: number
    averageResponseTime: number
    totalRequests: number
    redisConnected: boolean
    memoryFallback: boolean
  }
  
  // Tenant metrics
  tenants: {
    activeTenants: number
    totalTenants: number
    tenantsPerSecond: number
    averageTenantResolutionTime: number
  }
  
  // System metrics
  system: {
    memoryUsage: NodeJS.MemoryUsage
    cpuUsage: number
    uptime: number
  }
  
  // Scalability indicators
  scalability: {
    score: number // 0-100 scale
    bottlenecks: string[]
    recommendations: string[]
    capacity: {
      current: number
      maximum: number
      utilizationPercent: number
    }
  }
}

export interface BenchmarkResult {
  testName: string
  scenario: string
  duration: number
  metrics: {
    requestsCompleted: number
    requestsPerSecond: number
    averageResponseTime: number
    p50ResponseTime: number
    p95ResponseTime: number
    p99ResponseTime: number
    errorRate: number
    throughput: number
  }
  resourceUsage: {
    peakMemory: number
    averageCpu: number
    databaseConnections: number
    cacheHitRate: number
  }
  scalabilityAssessment: {
    score: number
    maxTenants: number
    bottlenecks: string[]
  }
}

/**
 * SCALABILITY: Advanced Performance Monitor
 * 
 * Features:
 * - Real-time performance tracking across all system components
 * - Automated bottleneck detection and recommendations
 * - Scalability scoring and capacity planning
 * - Performance benchmarking and load testing
 * - Historical trend analysis
 * - Alert system for performance degradation
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private alerts: Array<{ timestamp: string; level: 'warning' | 'critical'; message: string }> = []
  private benchmarks: BenchmarkResult[] = []
  
  // Request tracking
  private requestTimes: number[] = []
  private requestCount = 0
  private errorCount = 0
  private startTime = Date.now()
  
  // Tenant tracking
  private tenantResolutionTimes: number[] = []
  private activeTenantSet = new Set<string>()
  
  // Performance thresholds
  private readonly THRESHOLDS = {
    RESPONSE_TIME_WARNING: 1000, // 1 second
    RESPONSE_TIME_CRITICAL: 3000, // 3 seconds
    ERROR_RATE_WARNING: 0.05, // 5%
    ERROR_RATE_CRITICAL: 0.1, // 10%
    CACHE_HIT_RATE_WARNING: 0.8, // 80%
    CACHE_HIT_RATE_CRITICAL: 0.6, // 60%
    DB_CONNECTION_WARNING: 0.8, // 80% of max connections
    DB_CONNECTION_CRITICAL: 0.95, // 95% of max connections
  }
  
  constructor() {
    console.log('📊 Performance Monitor initialized for scalability tracking')
    this.startPeriodicCollection()
    this.startHealthChecks()
  }
  
  /**
   * Record request performance
   */
  recordRequest(responseTime: number, isError: boolean = false): void {
    this.requestCount++
    this.requestTimes.push(responseTime)
    
    if (isError) {
      this.errorCount++
    }
    
    // Keep only recent metrics for memory management
    if (this.requestTimes.length > 10000) {
      this.requestTimes = this.requestTimes.slice(-5000)
    }
    
    // Real-time alerting
    if (responseTime > this.THRESHOLDS.RESPONSE_TIME_CRITICAL) {
      this.addAlert('critical', `Slow response detected: ${responseTime}ms`)
    }
  }
  
  /**
   * Record tenant resolution performance
   */
  recordTenantResolution(tenantSlug: string, responseTime: number): void {
    this.tenantResolutionTimes.push(responseTime)
    this.activeTenantSet.add(tenantSlug)
    
    // Keep recent data only
    if (this.tenantResolutionTimes.length > 1000) {
      this.tenantResolutionTimes = this.tenantResolutionTimes.slice(-500)
    }
  }
  
  /**
   * Collect comprehensive system metrics
   */
  async collectMetrics(): Promise<PerformanceMetrics> {
    const now = new Date().toISOString()
    const uptime = Date.now() - this.startTime
    
    // Get component statistics
    const connectionStats = tenantConnectionManager.getStats()
    const cacheStats = tenantCache.getStats()
    const dbStats = optimizedDb.getStats()
    
    // Calculate request metrics
    const totalRequests = this.requestCount
    const averageResponseTime = this.requestTimes.length > 0 
      ? this.requestTimes.reduce((sum, time) => sum + time, 0) / this.requestTimes.length 
      : 0
    const requestsPerSecond = totalRequests / (uptime / 1000)
    const errorRate = totalRequests > 0 ? this.errorCount / totalRequests : 0
    
    // Calculate tenant metrics
    const averageTenantResolutionTime = this.tenantResolutionTimes.length > 0
      ? this.tenantResolutionTimes.reduce((sum, time) => sum + time, 0) / this.tenantResolutionTimes.length
      : 0
    
    // System metrics
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()
    
    // Scalability assessment
    const scalabilityScore = this.calculateScalabilityScore({
      averageResponseTime,
      errorRate,
      cacheHitRate: cacheStats.hitRate,
      connectionUtilization: connectionStats.totalConnections / 1000, // Assuming 1000 max
      averageTenantResolutionTime
    })
    
    const bottlenecks = this.identifyBottlenecks({
      averageResponseTime,
      errorRate,
      cacheHitRate: cacheStats.hitRate,
      connectionUtilization: connectionStats.totalConnections / 1000,
      averageQueryTime: dbStats.averageQueryTime
    })
    
    const recommendations = this.generateRecommendations(bottlenecks)
    
    const metrics: PerformanceMetrics = {
      timestamp: now,
      
      totalRequests,
      averageResponseTime,
      requestsPerSecond,
      errorRate,
      
      database: {
        totalConnections: connectionStats.totalConnections,
        activeConnections: connectionStats.activeConnections,
        idleConnections: connectionStats.idleConnections,
        totalQueries: dbStats.queriesExecuted,
        averageQueryTime: dbStats.averageQueryTime,
        slowQueries: 0, // Could be tracked separately
        connectionPools: connectionStats.totalPools
      },
      
      cache: {
        hitRate: cacheStats.hitRate,
        missRate: 1 - cacheStats.hitRate,
        averageResponseTime: cacheStats.averageResponseTime,
        totalRequests: cacheStats.totalRequests,
        redisConnected: true, // Would check actual Redis status
        memoryFallback: false
      },
      
      tenants: {
        activeTenants: this.activeTenantSet.size,
        totalTenants: connectionStats.totalPools,
        tenantsPerSecond: this.activeTenantSet.size / (uptime / 1000),
        averageTenantResolutionTime
      },
      
      system: {
        memoryUsage,
        cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000 / 1000, // Convert to percentage
        uptime
      },
      
      scalability: {
        score: scalabilityScore,
        bottlenecks,
        recommendations,
        capacity: {
          current: this.activeTenantSet.size,
          maximum: this.estimateMaxCapacity(scalabilityScore),
          utilizationPercent: (this.activeTenantSet.size / this.estimateMaxCapacity(scalabilityScore)) * 100
        }
      }
    }
    
    // Store for historical analysis
    this.metrics.push(metrics)
    
    // Keep only recent metrics (last 24 hours worth)
    if (this.metrics.length > 1440) { // Assuming 1-minute intervals
      this.metrics = this.metrics.slice(-1440)
    }
    
    return metrics
  }
  
  /**
   * Run comprehensive benchmark tests
   */
  async runBenchmark(scenario: {
    name: string
    tenantCount: number
    concurrentRequests: number
    duration: number // seconds
    requestType: 'tenant_resolution' | 'database_query' | 'full_request'
  }): Promise<BenchmarkResult> {
    console.log(`🏁 Running benchmark: ${scenario.name}`)
    const startTime = Date.now()
    
    const results = {
      requestTimes: [] as number[],
      errors: 0,
      completed: 0
    }
    
    // Create test data
    const testTenants = Array.from({ length: scenario.tenantCount }, (_, i) => `test-tenant-${i}`)
    
    // Run concurrent requests
    const promises: Promise<void>[] = []
    
    for (let i = 0; i < scenario.concurrentRequests; i++) {
      promises.push(this.runBenchmarkRequest(scenario.requestType, testTenants, results))
    }
    
    // Wait for duration
    await Promise.race([
      Promise.all(promises),
      new Promise(resolve => setTimeout(resolve, scenario.duration * 1000))
    ])
    
    const totalDuration = Date.now() - startTime
    
    // Calculate statistics
    const sortedTimes = results.requestTimes.sort((a, b) => a - b)
    const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0
    
    const benchmark: BenchmarkResult = {
      testName: scenario.name,
      scenario: `${scenario.tenantCount} tenants, ${scenario.concurrentRequests} concurrent requests`,
      duration: totalDuration,
      
      metrics: {
        requestsCompleted: results.completed,
        requestsPerSecond: results.completed / (totalDuration / 1000),
        averageResponseTime: results.requestTimes.reduce((sum, time) => sum + time, 0) / results.requestTimes.length || 0,
        p50ResponseTime: p50,
        p95ResponseTime: p95,
        p99ResponseTime: p99,
        errorRate: results.errors / (results.completed + results.errors),
        throughput: results.completed / (totalDuration / 1000)
      },
      
      resourceUsage: {
        peakMemory: process.memoryUsage().heapUsed,
        averageCpu: 0, // Would need external monitoring
        databaseConnections: tenantConnectionManager.getStats().totalConnections,
        cacheHitRate: tenantCache.getStats().hitRate
      },
      
      scalabilityAssessment: {
        score: this.calculateBenchmarkScore(results, totalDuration),
        maxTenants: this.estimateMaxTenantsFromBenchmark(results, scenario),
        bottlenecks: this.identifyBenchmarkBottlenecks(results, scenario)
      }
    }
    
    this.benchmarks.push(benchmark)
    
    console.log(`✅ Benchmark completed: ${benchmark.metrics.requestsPerSecond.toFixed(2)} req/s`)
    
    return benchmark
  }
  
  /**
   * Get current performance status
   */
  getCurrentStatus(): {
    status: 'healthy' | 'warning' | 'critical'
    score: number
    issues: string[]
    recommendations: string[]
  } {
    if (this.metrics.length === 0) {
      return {
        status: 'warning',
        score: 0,
        issues: ['No metrics collected yet'],
        recommendations: ['Wait for initial metrics collection']
      }
    }
    
    const latest = this.metrics[this.metrics.length - 1]
    const issues: string[] = []
    
    // Check thresholds
    if (latest.averageResponseTime > this.THRESHOLDS.RESPONSE_TIME_CRITICAL) {
      issues.push(`Critical response time: ${latest.averageResponseTime}ms`)
    } else if (latest.averageResponseTime > this.THRESHOLDS.RESPONSE_TIME_WARNING) {
      issues.push(`High response time: ${latest.averageResponseTime}ms`)
    }
    
    if (latest.errorRate > this.THRESHOLDS.ERROR_RATE_CRITICAL) {
      issues.push(`Critical error rate: ${(latest.errorRate * 100).toFixed(1)}%`)
    } else if (latest.errorRate > this.THRESHOLDS.ERROR_RATE_WARNING) {
      issues.push(`High error rate: ${(latest.errorRate * 100).toFixed(1)}%`)
    }
    
    if (latest.cache.hitRate < this.THRESHOLDS.CACHE_HIT_RATE_CRITICAL) {
      issues.push(`Critical cache hit rate: ${(latest.cache.hitRate * 100).toFixed(1)}%`)
    } else if (latest.cache.hitRate < this.THRESHOLDS.CACHE_HIT_RATE_WARNING) {
      issues.push(`Low cache hit rate: ${(latest.cache.hitRate * 100).toFixed(1)}%`)
    }
    
    const status = issues.some(issue => issue.includes('Critical')) ? 'critical' :
                   issues.length > 0 ? 'warning' : 'healthy'
    
    return {
      status,
      score: latest.scalability.score,
      issues,
      recommendations: latest.scalability.recommendations
    }
  }
  
  /**
   * Get performance trends
   */
  getTrends(hours: number = 1): {
    responseTime: { trend: 'improving' | 'degrading' | 'stable'; change: number }
    throughput: { trend: 'improving' | 'degrading' | 'stable'; change: number }
    errorRate: { trend: 'improving' | 'degrading' | 'stable'; change: number }
    cacheHitRate: { trend: 'improving' | 'degrading' | 'stable'; change: number }
  } {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000)
    const recentMetrics = this.metrics.filter(m => new Date(m.timestamp).getTime() > cutoff)
    
    if (recentMetrics.length < 2) {
      return {
        responseTime: { trend: 'stable', change: 0 },
        throughput: { trend: 'stable', change: 0 },
        errorRate: { trend: 'stable', change: 0 },
        cacheHitRate: { trend: 'stable', change: 0 }
      }
    }
    
    const first = recentMetrics[0]
    const last = recentMetrics[recentMetrics.length - 1]
    
    const responseTimeChange = ((last.averageResponseTime - first.averageResponseTime) / first.averageResponseTime) * 100
    const throughputChange = ((last.requestsPerSecond - first.requestsPerSecond) / first.requestsPerSecond) * 100
    const errorRateChange = ((last.errorRate - first.errorRate) / (first.errorRate || 0.001)) * 100
    const cacheHitRateChange = ((last.cache.hitRate - first.cache.hitRate) / first.cache.hitRate) * 100
    
    return {
      responseTime: {
        trend: responseTimeChange > 5 ? 'degrading' : responseTimeChange < -5 ? 'improving' : 'stable',
        change: responseTimeChange
      },
      throughput: {
        trend: throughputChange > 5 ? 'improving' : throughputChange < -5 ? 'degrading' : 'stable',
        change: throughputChange
      },
      errorRate: {
        trend: errorRateChange > 5 ? 'degrading' : errorRateChange < -5 ? 'improving' : 'stable',
        change: errorRateChange
      },
      cacheHitRate: {
        trend: cacheHitRateChange > 5 ? 'improving' : cacheHitRateChange < -5 ? 'degrading' : 'stable',
        change: cacheHitRateChange
      }
    }
  }
  
  /**
   * Helper methods for calculations
   */
  private calculateScalabilityScore(factors: {
    averageResponseTime: number
    errorRate: number
    cacheHitRate: number
    connectionUtilization: number
    averageTenantResolutionTime: number
  }): number {
    let score = 100
    
    // Response time penalty
    if (factors.averageResponseTime > 1000) score -= 20
    if (factors.averageResponseTime > 3000) score -= 30
    
    // Error rate penalty
    if (factors.errorRate > 0.01) score -= 15
    if (factors.errorRate > 0.05) score -= 25
    
    // Cache hit rate bonus/penalty
    if (factors.cacheHitRate > 0.9) score += 10
    if (factors.cacheHitRate < 0.8) score -= 20
    
    // Connection utilization penalty
    if (factors.connectionUtilization > 0.8) score -= 15
    if (factors.connectionUtilization > 0.95) score -= 30
    
    // Tenant resolution time penalty
    if (factors.averageTenantResolutionTime > 50) score -= 10
    if (factors.averageTenantResolutionTime > 100) score -= 20
    
    return Math.max(0, Math.min(100, score))
  }
  
  private identifyBottlenecks(factors: {
    averageResponseTime: number
    errorRate: number
    cacheHitRate: number
    connectionUtilization: number
    averageQueryTime: number
  }): string[] {
    const bottlenecks: string[] = []
    
    if (factors.averageResponseTime > 1000) {
      bottlenecks.push('High response times')
    }
    
    if (factors.errorRate > 0.05) {
      bottlenecks.push('High error rate')
    }
    
    if (factors.cacheHitRate < 0.8) {
      bottlenecks.push('Low cache efficiency')
    }
    
    if (factors.connectionUtilization > 0.8) {
      bottlenecks.push('Database connection pool saturation')
    }
    
    if (factors.averageQueryTime > 500) {
      bottlenecks.push('Slow database queries')
    }
    
    return bottlenecks
  }
  
  private generateRecommendations(bottlenecks: string[]): string[] {
    const recommendations: string[] = []
    
    if (bottlenecks.includes('High response times')) {
      recommendations.push('Optimize middleware and database queries')
      recommendations.push('Increase cache usage and connection pool sizes')
    }
    
    if (bottlenecks.includes('Low cache efficiency')) {
      recommendations.push('Implement cache warming strategies')
      recommendations.push('Review cache TTL settings')
    }
    
    if (bottlenecks.includes('Database connection pool saturation')) {
      recommendations.push('Implement connection pool optimization per tenant')
      recommendations.push('Consider database read replicas')
    }
    
    if (bottlenecks.includes('Slow database queries')) {
      recommendations.push('Add database indexes for common queries')
      recommendations.push('Implement query result caching')
    }
    
    return recommendations
  }
  
  private estimateMaxCapacity(scalabilityScore: number): number {
    // Rough estimation based on scalability score
    const baseCapacity = 100 // Base tenant capacity
    const scaleFactor = scalabilityScore / 100
    
    return Math.floor(baseCapacity * scaleFactor * 10) // Up to 1000 tenants at perfect score
  }
  
  private async runBenchmarkRequest(
    type: string,
    testTenants: string[],
    results: { requestTimes: number[]; errors: number; completed: number }
  ): Promise<void> {
    const startTime = Date.now()
    
    try {
      const tenant = testTenants[Math.floor(Math.random() * testTenants.length)]
      
      switch (type) {
        case 'tenant_resolution':
          await optimizedDb.getTenantInfo(tenant)
          break
        case 'database_query':
          await optimizedDb.getAllProducts(`${tenant}-id`)
          break
        case 'full_request':
          await optimizedDb.getTenantInfo(tenant)
          await optimizedDb.getAllProducts(`${tenant}-id`)
          break
      }
      
      results.completed++
    } catch (error) {
      results.errors++
    }
    
    results.requestTimes.push(Date.now() - startTime)
  }
  
  private calculateBenchmarkScore(
    results: { requestTimes: number[]; errors: number; completed: number },
    duration: number
  ): number {
    const avgResponseTime = results.requestTimes.reduce((sum, time) => sum + time, 0) / results.requestTimes.length
    const errorRate = results.errors / (results.completed + results.errors)
    const throughput = results.completed / (duration / 1000)
    
    let score = 100
    
    if (avgResponseTime > 100) score -= 20
    if (avgResponseTime > 500) score -= 30
    if (errorRate > 0.01) score -= 25
    if (throughput < 10) score -= 20
    
    return Math.max(0, score)
  }
  
  private estimateMaxTenantsFromBenchmark(
    results: { requestTimes: number[]; errors: number; completed: number },
    scenario: { tenantCount: number; concurrentRequests: number }
  ): number {
    const avgResponseTime = results.requestTimes.reduce((sum, time) => sum + time, 0) / results.requestTimes.length
    const errorRate = results.errors / (results.completed + results.errors)
    
    if (errorRate > 0.1 || avgResponseTime > 3000) {
      return scenario.tenantCount * 0.5 // Can handle half the tested load
    } else if (errorRate < 0.01 && avgResponseTime < 500) {
      return scenario.tenantCount * 5 // Can handle 5x the tested load
    } else {
      return scenario.tenantCount * 2 // Can handle 2x the tested load
    }
  }
  
  private identifyBenchmarkBottlenecks(
    results: { requestTimes: number[]; errors: number; completed: number },
    scenario: { tenantCount: number; concurrentRequests: number }
  ): string[] {
    const bottlenecks: string[] = []
    const avgResponseTime = results.requestTimes.reduce((sum, time) => sum + time, 0) / results.requestTimes.length
    const errorRate = results.errors / (results.completed + results.errors)
    
    if (avgResponseTime > 1000) bottlenecks.push('Response time bottleneck')
    if (errorRate > 0.05) bottlenecks.push('Error rate bottleneck')
    if (results.completed < scenario.concurrentRequests * 0.8) bottlenecks.push('Throughput bottleneck')
    
    return bottlenecks
  }
  
  private addAlert(level: 'warning' | 'critical', message: string): void {
    this.alerts.push({
      timestamp: new Date().toISOString(),
      level,
      message
    })
    
    // Keep only recent alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-500)
    }
    
    console.log(`🚨 ${level.toUpperCase()}: ${message}`)
  }
  
  private startPeriodicCollection(): void {
    // Collect metrics every minute
    setInterval(async () => {
      try {
        await this.collectMetrics()
      } catch (error) {
        console.error('❌ Error collecting metrics:', error)
      }
    }, 60000)
  }
  
  private startHealthChecks(): void {
    // Health checks every 5 minutes
    setInterval(async () => {
      try {
        const status = this.getCurrentStatus()
        if (status.status === 'critical') {
          this.addAlert('critical', `System health critical: ${status.issues.join(', ')}`)
        } else if (status.status === 'warning') {
          this.addAlert('warning', `System performance warning: ${status.issues.join(', ')}`)
        }
      } catch (error) {
        console.error('❌ Error in health check:', error)
      }
    }, 300000)
  }
  
  /**
   * Get all stored metrics
   */
  getAllMetrics(): PerformanceMetrics[] {
    return [...this.metrics]
  }
  
  /**
   * Get all benchmark results
   */
  getAllBenchmarks(): BenchmarkResult[] {
    return [...this.benchmarks]
  }
  
  /**
   * Get all alerts
   */
  getAlerts(level?: 'warning' | 'critical'): Array<{ timestamp: string; level: string; message: string }> {
    return level ? this.alerts.filter(alert => alert.level === level) : [...this.alerts]
  }
  
  /**
   * Clear historical data
   */
  clearHistory(): void {
    this.metrics.length = 0
    this.benchmarks.length = 0
    this.alerts.length = 0
    this.requestTimes.length = 0
    this.tenantResolutionTimes.length = 0
    this.activeTenantSet.clear()
    this.requestCount = 0
    this.errorCount = 0
    console.log('🗑️ Performance history cleared')
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Export convenience functions
export const recordRequest = (responseTime: number, isError?: boolean) => 
  performanceMonitor.recordRequest(responseTime, isError)

export const recordTenantResolution = (tenantSlug: string, responseTime: number) =>
  performanceMonitor.recordTenantResolution(tenantSlug, responseTime)

export const getCurrentPerformanceStatus = () =>
  performanceMonitor.getCurrentStatus()

export const runPerformanceBenchmark = (scenario: {
  name: string
  tenantCount: number
  concurrentRequests: number
  duration: number
  requestType: 'tenant_resolution' | 'database_query' | 'full_request'
}) => performanceMonitor.runBenchmark(scenario)
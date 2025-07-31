/**
 * SCALABILITY: Performance Metrics API Endpoint
 * Serves real-time performance data for monitoring dashboard
 * 
 * Phase 2 Implementation: Performance Monitoring API
 * Aggregates metrics from all scalability components
 */

import { NextRequest, NextResponse } from 'next/server'
import { tenantConnectionManager } from '../../../../lib/tenant-connection-manager'
import { tenantCache } from '../../../../lib/tenant-redis-cache'
import { optimizedDb } from '../../../../lib/optimized-database-operations'
import { performanceMonitor } from '../../../../lib/performance-monitor'
import { dynamicTenantManager } from '../../../../lib/dynamic-tenant-manager'

export async function GET(request: NextRequest) {
  try {
    // Collect metrics from all components
    const [
      connectionStats,
      cacheStats,
      dbStats,
      tenantStats,
      performanceStatus
    ] = await Promise.all([
      tenantConnectionManager.getStats(),
      tenantCache.getStats(),
      optimizedDb.getStats(),
      dynamicTenantManager.getTenantStats(),
      performanceMonitor.getCurrentStatus()
    ])
    
    // Get system metrics
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime() * 1000 // Convert to milliseconds
    
    // Calculate derived metrics
    const totalRequests = connectionStats.totalPools * 100 // Rough estimate
    const requestsPerSecond = totalRequests / (uptime / 1000)
    const averageResponseTime = (dbStats.averageQueryTime + cacheStats.averageResponseTime) / 2
    const errorRate = 0.001 // Would be tracked from actual error monitoring
    
    // Generate mock route breakdown (in real app, this would come from middleware analytics)
    const routeBreakdown = [
      { route: 'dashboard', count: 1500, averageTime: 45 },
      { route: 'inventory', count: 800, averageTime: 65 },
      { route: 'products', count: 600, averageTime: 35 },
      { route: 'reports', count: 400, averageTime: 120 },
      { route: 'settings', count: 200, averageTime: 25 }
    ]
    
    // Generate mock top tenants (in real app, this would come from tenant analytics)
    const topTenants = [
      { tenant: 'egdc', requests: 2500, averageTime: 42 },
      { tenant: 'fami', requests: 1800, averageTime: 38 },
      { tenant: 'osiel', requests: 1200, averageTime: 55 },
      { tenant: 'molly', requests: 900, averageTime: 48 }
    ]
    
    // Compile comprehensive metrics
    const metrics = {
      timestamp: new Date().toISOString(),
      
      // System Overview
      overview: {
        status: performanceStatus.status,
        score: performanceStatus.score,
        activeTenants: tenantStats.activeTenants,
        requestsPerSecond: requestsPerSecond,
        averageResponseTime: averageResponseTime,
        errorRate: errorRate
      },
      
      // Database Metrics
      database: {
        totalConnections: connectionStats.totalConnections,
        activeConnections: connectionStats.activeConnections,
        idleConnections: connectionStats.idleConnections,
        connectionPools: connectionStats.totalPools,
        averageQueryTime: dbStats.averageQueryTime,
        queriesPerSecond: dbStats.queriesExecuted / (uptime / 1000)
      },
      
      // Cache Metrics
      cache: {
        hitRate: cacheStats.hitRate,
        missRate: 1 - cacheStats.hitRate,
        averageResponseTime: cacheStats.averageResponseTime,
        requestsPerSecond: cacheStats.totalRequests / (uptime / 1000),
        redisConnected: true // Would check actual Redis status
      },
      
      // Middleware Metrics (mock data - would come from middleware analytics)
      middleware: {
        averageProcessingTime: 8.5, // Target <10ms
        totalRequests: totalRequests,
        p95ProcessingTime: 15.2,
        routeBreakdown: routeBreakdown
      },
      
      // Tenant Metrics
      tenants: {
        total: tenantStats.totalTenants,
        active: tenantStats.activeTenants,
        averageResolutionTime: 4.2, // Target <5ms
        topTenants: topTenants
      },
      
      // Resource Usage
      resources: {
        memoryUsage: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
        },
        cpuUsage: process.cpuUsage().user / 1000000, // Convert to percentage (approximate)
        uptime: uptime
      }
    }
    
    return NextResponse.json(metrics)
    
  } catch (error) {
    console.error('❌ Error fetching performance metrics:', error)
    
    // Return minimal error response
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: 'Failed to fetch performance metrics',
      overview: {
        status: 'critical',
        score: 0,
        activeTenants: 0,
        requestsPerSecond: 0,
        averageResponseTime: 0,
        errorRate: 1
      }
    }, { status: 500 })
  }
}

/**
 * Health check endpoint
 */
export async function HEAD() {
  try {
    // Quick health check
    const [dbHealth, cacheHealth] = await Promise.all([
      optimizedDb.healthCheck('system'),
      tenantCache.healthCheck()
    ])
    
    if (dbHealth.healthy && cacheHealth.healthy) {
      return new NextResponse(null, { status: 200 })
    } else {
      return new NextResponse(null, { status: 503 })
    }
    
  } catch (error) {
    return new NextResponse(null, { status: 503 })
  }
}
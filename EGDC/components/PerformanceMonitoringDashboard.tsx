/**
 * SCALABILITY: Real-Time Performance Monitoring Dashboard
 * Visual monitoring of all scalability improvements with actionable insights
 * 
 * Phase 2 Implementation: Performance Monitoring Dashboard
 * Real-time visualization of database, cache, middleware, and system performance
 */

'use client'

import React, { useState, useEffect } from 'react'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface PerformanceDashboardProps {
  refreshInterval?: number // milliseconds
  showAdvancedMetrics?: boolean
}

interface DashboardMetrics {
  timestamp: string
  
  // System Overview
  overview: {
    status: 'healthy' | 'warning' | 'critical'
    score: number
    activeTenants: number
    requestsPerSecond: number
    averageResponseTime: number
    errorRate: number
  }
  
  // Database Metrics
  database: {
    totalConnections: number
    activeConnections: number
    idleConnections: number
    connectionPools: number
    averageQueryTime: number
    queriesPerSecond: number
  }
  
  // Cache Metrics
  cache: {
    hitRate: number
    missRate: number
    averageResponseTime: number
    requestsPerSecond: number
    redisConnected: boolean
  }
  
  // Middleware Metrics
  middleware: {
    averageProcessingTime: number
    totalRequests: number
    p95ProcessingTime: number
    routeBreakdown: Array<{
      route: string
      count: number
      averageTime: number
    }>
  }
  
  // Tenant Metrics
  tenants: {
    total: number
    active: number
    averageResolutionTime: number
    topTenants: Array<{
      tenant: string
      requests: number
      averageTime: number
    }>
  }
  
  // Resource Usage
  resources: {
    memoryUsage: {
      used: number
      total: number
      percentage: number
    }
    cpuUsage: number
    uptime: number
  }
}

export default function PerformanceMonitoringDashboard({ 
  refreshInterval = 30000,
  showAdvancedMetrics = false 
}: PerformanceDashboardProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [historicalData, setHistoricalData] = useState<DashboardMetrics[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [alerts, setAlerts] = useState<Array<{
    id: string
    level: 'warning' | 'critical'
    message: string
    timestamp: string
  }>>([])
  
  // Fetch performance metrics
  const fetchMetrics = async () => {
    try {
      // In a real implementation, this would call your performance monitoring API
      const response = await fetch('/api/performance/metrics')
      const data = await response.json()
      
      setMetrics(data)
      
      // Add to historical data (keep last 50 points)
      setHistoricalData(prev => [...prev.slice(-49), data])
      
      // Check for alerts
      checkForAlerts(data)
      
    } catch (error) {
      console.error('Error fetching performance metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Check for performance alerts
  const checkForAlerts = (data: DashboardMetrics) => {
    const newAlerts: typeof alerts = []
    
    if (data.overview.averageResponseTime > 1000) {
      newAlerts.push({
        id: `response-time-${Date.now()}`,
        level: 'warning',
        message: `High response time: ${data.overview.averageResponseTime}ms`,
        timestamp: new Date().toISOString()
      })
    }
    
    if (data.overview.errorRate > 0.05) {
      newAlerts.push({
        id: `error-rate-${Date.now()}`,
        level: 'critical',
        message: `High error rate: ${(data.overview.errorRate * 100).toFixed(1)}%`,
        timestamp: new Date().toISOString()
      })
    }
    
    if (data.cache.hitRate < 0.8) {
      newAlerts.push({
        id: `cache-hit-${Date.now()}`,
        level: 'warning',
        message: `Low cache hit rate: ${(data.cache.hitRate * 100).toFixed(1)}%`,
        timestamp: new Date().toISOString()
      })
    }
    
    if (data.database.activeConnections / data.database.totalConnections > 0.9) {
      newAlerts.push({
        id: `db-connections-${Date.now()}`,
        level: 'critical',
        message: 'Database connection pool near capacity',
        timestamp: new Date().toISOString()
      })
    }
    
    setAlerts(prev => [...prev, ...newAlerts].slice(-10)) // Keep last 10 alerts
  }
  
  // Auto-refresh effect
  useEffect(() => {
    fetchMetrics() // Initial fetch
    
    const interval = setInterval(fetchMetrics, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])
  
  // Status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'critical': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }
  
  // Chart colors
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1']
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-lg">Loading performance metrics...</span>
      </div>
    )
  }
  
  if (!metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load performance metrics</p>
        <button 
          onClick={fetchMetrics}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }
  
  return (
    <div className="space-y-6 p-6 bg-gray-50">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            🚀 Scalability Performance Dashboard
          </h1>
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(metrics.overview.status)}`}>
              {metrics.overview.status.toUpperCase()}
            </div>
            <div className="text-2xl font-bold text-blue-600">
              Score: {metrics.overview.score}/100
            </div>
          </div>
        </div>
      </div>
      
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-red-600">🚨 Active Alerts</h2>
          <div className="space-y-2">
            {alerts.slice(-5).map(alert => (
              <div key={alert.id} className={`p-3 rounded ${alert.level === 'critical' ? 'bg-red-100 border-red-400' : 'bg-yellow-100 border-yellow-400'} border`}>
                <div className="flex justify-between items-center">
                  <span className="font-medium">{alert.message}</span>
                  <span className="text-sm text-gray-500">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded">
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Active Tenants</p>
              <p className="text-2xl font-bold">{metrics.overview.activeTenants}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded">
              <span className="text-2xl">⚡</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Requests/Second</p>
              <p className="text-2xl font-bold">{metrics.overview.requestsPerSecond.toFixed(1)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded">
              <span className="text-2xl">⏱️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Avg Response Time</p>
              <p className="text-2xl font-bold">{metrics.overview.averageResponseTime.toFixed(0)}ms</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded">
              <span className="text-2xl">🚫</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Error Rate</p>
              <p className="text-2xl font-bold">{(metrics.overview.errorRate * 100).toFixed(2)}%</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Response Time Trend */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">📈 Response Time Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={historicalData.slice(-20)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={(value) => new Date(value).toLocaleTimeString()} 
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(value) => new Date(value).toLocaleString()}
              formatter={(value: number) => [`${value.toFixed(0)}ms`, 'Response Time']}
            />
            <Line 
              type="monotone" 
              dataKey="overview.averageResponseTime" 
              stroke="#8884d8" 
              strokeWidth={2}
              dot={{ fill: '#8884d8' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Database & Cache Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Database Connections */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">🗄️ Database Connections</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Total Pools:</span>
              <span className="font-bold">{metrics.database.connectionPools}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Active Connections:</span>
              <span className="font-bold text-green-600">{metrics.database.activeConnections}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Idle Connections:</span>
              <span className="font-bold text-blue-600">{metrics.database.idleConnections}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ 
                  width: `${(metrics.database.activeConnections / metrics.database.totalConnections) * 100}%` 
                }}
              ></div>
            </div>
            <p className="text-sm text-gray-500">
              Utilization: {((metrics.database.activeConnections / metrics.database.totalConnections) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
        
        {/* Cache Performance */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">⚡ Cache Performance</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Hits', value: metrics.cache.hitRate * 100 },
                  { name: 'Misses', value: metrics.cache.missRate * 100 }
                ]}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                <Cell fill="#82ca9d" />
                <Cell fill="#ff7300" />
              </Pie>
              <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between">
              <span>Hit Rate:</span>
              <span className="font-bold text-green-600">
                {(metrics.cache.hitRate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Avg Response:</span>
              <span className="font-bold">
                {metrics.cache.averageResponseTime.toFixed(1)}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span>Redis Status:</span>
              <span className={`font-bold ${metrics.cache.redisConnected ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.cache.redisConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Middleware Performance */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">🔧 Middleware Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {metrics.middleware.averageProcessingTime.toFixed(1)}ms
            </div>
            <div className="text-sm text-gray-500">Average Processing Time</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {metrics.middleware.p95ProcessingTime.toFixed(1)}ms
            </div>
            <div className="text-sm text-gray-500">95th Percentile</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {metrics.middleware.totalRequests.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">Total Requests</div>
          </div>
        </div>
        
        {/* Route Breakdown */}
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-3">Route Performance</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={metrics.middleware.routeBreakdown.slice(0, 5)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="route" />
              <YAxis />
              <Tooltip formatter={(value: number) => [`${value.toFixed(1)}ms`, 'Avg Time']} />
              <Bar dataKey="averageTime" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Resource Usage */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">💻 Resource Usage</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-3">Memory Usage</h3>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-blue-600 h-4 rounded-full" 
                style={{ width: `${metrics.resources.memoryUsage.percentage}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {(metrics.resources.memoryUsage.used / 1024 / 1024).toFixed(0)}MB / 
              {(metrics.resources.memoryUsage.total / 1024 / 1024).toFixed(0)}MB 
              ({metrics.resources.memoryUsage.percentage.toFixed(1)}%)
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-3">System Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>CPU Usage:</span>
                <span className="font-bold">{metrics.resources.cpuUsage.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Uptime:</span>
                <span className="font-bold">
                  {Math.floor(metrics.resources.uptime / 1000 / 60 / 60)}h 
                  {Math.floor((metrics.resources.uptime / 1000 / 60) % 60)}m
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Top Tenants */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">🏆 Top Active Tenants</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Tenant</th>
                <th className="text-left py-2">Requests</th>
                <th className="text-left py-2">Avg Response Time</th>
              </tr>
            </thead>
            <tbody>
              {metrics.tenants.topTenants.slice(0, 5).map((tenant, index) => (
                <tr key={tenant.tenant} className="border-b">
                  <td className="py-2 font-medium">{tenant.tenant}</td>
                  <td className="py-2">{tenant.requests.toLocaleString()}</td>
                  <td className="py-2">{tenant.averageTime.toFixed(0)}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Footer */}
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">
          Last updated: {new Date(metrics.timestamp).toLocaleString()}
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Dashboard refreshes every {refreshInterval / 1000} seconds
        </p>
      </div>
    </div>
  )
}
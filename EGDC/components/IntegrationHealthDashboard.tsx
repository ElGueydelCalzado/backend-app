'use client'

/**
 * ENTERPRISE INTEGRATION HEALTH DASHBOARD
 * 
 * Features:
 * - Real-time integration status monitoring
 * - Performance metrics visualization
 * - Alert management and incident response
 * - Business KPI tracking
 * - Automated health checks and recovery
 * - Integration-specific analytics
 */

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area
} from 'recharts'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Globe,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Zap,
  Shield,
  Database,
  Server,
  Users,
  ShoppingCart,
  CreditCard,
  Truck
} from 'lucide-react'

interface IntegrationStatus {
  id: string
  name: string
  platform: string
  status: 'healthy' | 'warning' | 'critical' | 'offline'
  lastSync: string
  syncSuccess: number
  errorCount: number
  responseTime: number
  uptime: number
  rateLimitRemaining: number
  nextSync: string
}

interface BusinessMetric {
  name: string
  value: number
  target?: number
  change: number
  changeType: 'increase' | 'decrease' | 'stable'
  unit: string
  icon: any
}

interface AlertData {
  id: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  description: string
  timestamp: string
  resolved: boolean
  integration?: string
}

interface PerformanceData {
  timestamp: string
  responseTime: number
  throughput: number
  errorRate: number
  successRate: number
}

const COLORS = {
  healthy: '#10B981',
  warning: '#F59E0B',
  critical: '#EF4444',
  offline: '#6B7280'
}

const CHART_COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444']

export default function IntegrationHealthDashboard() {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([])
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetric[]>([])
  const [alerts, setAlerts] = useState<AlertData[]>([])
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h')
  const refreshInterval = useRef<NodeJS.Timeout>()

  useEffect(() => {
    fetchDashboardData()
    
    if (autoRefresh) {
      refreshInterval.current = setInterval(fetchDashboardData, 30000) // Refresh every 30 seconds
    }

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current)
      }
    }
  }, [autoRefresh, selectedTimeRange])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch integration statuses
      const integrationsResponse = await fetch('/api/integrations/health')
      const integrationsData = await integrationsResponse.json()
      
      // Fetch business metrics
      const metricsResponse = await fetch('/api/metrics/business')
      const metricsData = await metricsResponse.json()
      
      // Fetch alerts
      const alertsResponse = await fetch('/api/alerts/active')
      const alertsData = await alertsResponse.json()
      
      // Fetch performance data  
      const performanceResponse = await fetch(`/api/metrics/performance?range=${selectedTimeRange}`)
      const performanceData = await performanceResponse.json()

      if (integrationsData.success) {
        setIntegrations(integrationsData.data)
      }
      
      if (metricsData.success) {
        const formattedMetrics: BusinessMetric[] = [
          {
            name: 'Daily Revenue',
            value: metricsData.data.revenue || 0,
            target: 50000,
            change: metricsData.data.revenueChange || 0,
            changeType: (metricsData.data.revenueChange || 0) > 0 ? 'increase' : 
                       (metricsData.data.revenueChange || 0) < 0 ? 'decrease' : 'stable',
            unit: 'USD',
            icon: DollarSign
          },
          {
            name: 'Active Users',
            value: metricsData.data.activeUsers || 0,
            target: 1000,
            change: metricsData.data.activeUsersChange || 0,
            changeType: (metricsData.data.activeUsersChange || 0) > 0 ? 'increase' : 
                       (metricsData.data.activeUsersChange || 0) < 0 ? 'decrease' : 'stable',
            unit: 'users',
            icon: Users
          },
          {
            name: 'Orders Processed',
            value: metricsData.data.orders || 0,
            change: metricsData.data.ordersChange || 0,
            changeType: (metricsData.data.ordersChange || 0) > 0 ? 'increase' : 
                       (metricsData.data.ordersChange || 0) < 0 ? 'decrease' : 'stable',
            unit: 'orders',
            icon: ShoppingCart
          },
          {
            name: 'Payment Success Rate',
            value: metricsData.data.paymentSuccessRate || 0,
            target: 98,
            change: metricsData.data.paymentSuccessRateChange || 0,
            changeType: (metricsData.data.paymentSuccessRateChange || 0) > 0 ? 'increase' : 
                       (metricsData.data.paymentSuccessRateChange || 0) < 0 ? 'decrease' : 'stable',
            unit: '%',
            icon: CreditCard
          }
        ]
        setBusinessMetrics(formattedMetrics)
      }
      
      if (alertsData.success) {
        setAlerts(alertsData.data)
      }
      
      if (performanceData.success) {
        setPerformanceData(performanceData.data)
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchDashboardData()
  }

  const handleIntegrationAction = async (integrationId: string, action: string) => {
    try {
      const response = await fetch(`/api/integrations/${integrationId}/${action}`, {
        method: 'POST'
      })
      
      if (response.ok) {
        fetchDashboardData() // Refresh data after action
      }
    } catch (error) {
      console.error(`Error performing ${action} on integration ${integrationId}:`, error)
    }
  }

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}/resolve`, {
        method: 'POST'
      })
      
      if (response.ok) {
        setAlerts(alerts.filter(alert => alert.id !== alertId))
      }
    } catch (error) {
      console.error('Error resolving alert:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'offline':
        return <Minus className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    return COLORS[status as keyof typeof COLORS] || COLORS.offline
  }

  const getTrendIcon = (changeType: string) => {
    switch (changeType) {
      case 'increase':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'decrease':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const overallHealth = integrations.reduce((acc, integration) => {
    switch (integration.status) {
      case 'healthy':
        acc.healthy++
        break
      case 'warning':
        acc.warning++
        break
      case 'critical':
        acc.critical++
        break
      case 'offline':
        acc.offline++
        break
    }
    return acc
  }, { healthy: 0, warning: 0, critical: 0, offline: 0 })

  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical' && !alert.resolved)
  const warningAlerts = alerts.filter(alert => alert.severity === 'warning' && !alert.resolved)

  const healthData = [
    { name: 'Healthy', value: overallHealth.healthy, color: COLORS.healthy },
    { name: 'Warning', value: overallHealth.warning, color: COLORS.warning },
    { name: 'Critical', value: overallHealth.critical, color: COLORS.critical },
    { name: 'Offline', value: overallHealth.offline, color: COLORS.offline }
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integration Health Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage all marketplace and payment integrations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Zap className={`h-4 w-4 mr-2 ${autoRefresh ? 'text-green-500' : 'text-gray-400'}`} />
            Auto Refresh {autoRefresh ? 'On' : 'Off'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical Issues Detected</AlertTitle>
          <AlertDescription>
            {criticalAlerts.length} critical alert{criticalAlerts.length > 1 ? 's' : ''} require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {businessMetrics.map((metric) => {
          const Icon = metric.icon
          return (
            <Card key={metric.name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metric.unit === 'USD' ? '$' : ''}{metric.value.toLocaleString()}{metric.unit === '%' ? '%' : ''}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {getTrendIcon(metric.changeType)}
                  <span className="ml-1">
                    {Math.abs(metric.change)}{metric.unit === '%' ? 'pp' : metric.unit} from yesterday
                  </span>
                </div>
                {metric.target && (
                  <Progress 
                    value={(metric.value / metric.target) * 100} 
                    className="mt-2"
                  />
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main Dashboard */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Health Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Health
                </CardTitle>
                <CardDescription>
                  Overall integration health status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={healthData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {healthData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {healthData.map((item) => (
                    <div key={item.name} className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">
                        {item.name}: {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Trends
                </CardTitle>
                <CardDescription>
                  Response time and throughput over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="responseTime" 
                        stackId="1"
                        stroke={CHART_COLORS[0]} 
                        fill={CHART_COLORS[0]}
                        fillOpacity={0.3}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="throughput" 
                        stackId="2"
                        stroke={CHART_COLORS[1]} 
                        fill={CHART_COLORS[1]}
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <div className="grid gap-4">
            {integrations.map((integration) => (
              <Card key={integration.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(integration.status)}
                      <div>
                        <CardTitle className="text-lg">{integration.name}</CardTitle>
                        <CardDescription>
                          {integration.platform} • Last sync: {integration.lastSync}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge 
                      variant="outline"
                      style={{ 
                        borderColor: getStatusColor(integration.status),
                        color: getStatusColor(integration.status)
                      }}
                    >
                      {integration.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Success Rate</div>
                      <div className="text-lg font-semibold">{integration.syncSuccess}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Response Time</div>
                      <div className="text-lg font-semibold">{integration.responseTime}ms</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Uptime</div>
                      <div className="text-lg font-semibold">{integration.uptime}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Rate Limit</div>
                      <div className="text-lg font-semibold">{integration.rateLimitRemaining}</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleIntegrationAction(integration.id, 'sync')}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Force Sync
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleIntegrationAction(integration.id, 'test')}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Test Connection
                    </Button>
                    {integration.status !== 'healthy' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleIntegrationAction(integration.id, 'restart')}
                      >
                        <Server className="h-4 w-4 mr-2" />
                        Restart
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <label className="text-sm font-medium">Time Range:</label>
            <select 
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="px-3 py-1 border rounded-md"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Response Time</CardTitle>
                <CardDescription>Average response time across all integrations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="responseTime" stroke={CHART_COLORS[0]} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Success Rate</CardTitle>
                <CardDescription>Integration success rate over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="successRate" stroke={CHART_COLORS[2]} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-muted-foreground">No active alerts</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              alerts.map((alert) => (
                <Alert key={alert.id} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <AlertTitle className="flex items-center gap-2">
                        {alert.title}
                        <Badge variant="outline">{alert.severity}</Badge>
                        {alert.integration && (
                          <Badge variant="secondary">{alert.integration}</Badge>
                        )}
                      </AlertTitle>
                      <AlertDescription className="mt-1">
                        {alert.description}
                        <div className="text-xs text-muted-foreground mt-1">
                          {alert.timestamp}
                        </div>
                      </AlertDescription>
                    </div>
                    {!alert.resolved && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => resolveAlert(alert.id)}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                </Alert>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
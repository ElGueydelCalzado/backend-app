'use client'

import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package,
  BarChart3, PieChart, Activity, Calendar, Filter, Download, RefreshCw,
  ArrowUp, ArrowDown, Eye, Target, Zap, Globe
} from 'lucide-react'

interface AnalyticsMetric {
  id: string
  name: string
  value: number | string
  previousValue?: number
  change?: number
  changeType?: 'increase' | 'decrease' | 'neutral'
  format: 'currency' | 'number' | 'percentage' | 'text'
  icon: React.ComponentType<any>
  color: string
}

interface ChartData {
  name: string
  value: number
  color?: string
}

interface TimeSeriesData {
  date: string
  revenue: number
  orders: number
  conversion: number
  traffic: number
}

interface TopProduct {
  id: number
  name: string
  brand: string
  revenue: number
  orders: number
  margin: number
  growth: number
}

interface ChannelPerformance {
  channel: string
  revenue: number
  orders: number
  conversion: number
  cac: number // Customer Acquisition Cost
  ltv: number // Lifetime Value
}

const BusinessIntelligenceDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30d')
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([])
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [channelPerformance, setChannelPerformance] = useState<ChannelPerformance[]>([])
  const [revenueByCategory, setRevenueByCategory] = useState<ChartData[]>([])
  const [customerSegments, setCustomerSegments] = useState<ChartData[]>([])

  useEffect(() => {
    fetchAnalyticsData()
  }, [dateRange])

  const fetchAnalyticsData = async () => {
    setLoading(true)
    try {
      const [
        metricsRes,
        timeSeriesRes,
        productsRes,
        channelsRes,
        categoriesRes,
        segmentsRes
      ] = await Promise.all([
        fetch(`/api/analytics/metrics?period=${dateRange}`),
        fetch(`/api/analytics/timeseries?period=${dateRange}`),
        fetch(`/api/analytics/top-products?period=${dateRange}`),
        fetch(`/api/analytics/channels?period=${dateRange}`),
        fetch(`/api/analytics/categories?period=${dateRange}`),
        fetch(`/api/analytics/customer-segments?period=${dateRange}`)
      ])

      if (metricsRes.ok) {
        const data = await metricsRes.json()
        setMetrics(data.metrics || [])
      }

      if (timeSeriesRes.ok) {
        const data = await timeSeriesRes.json()
        setTimeSeriesData(data.timeSeries || [])
      }

      if (productsRes.ok) {
        const data = await productsRes.json()
        setTopProducts(data.products || [])
      }

      if (channelsRes.ok) {
        const data = await channelsRes.json()
        setChannelPerformance(data.channels || [])
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        setRevenueByCategory(data.categories || [])
      }

      if (segmentsRes.ok) {
        const data = await segmentsRes.json()
        setCustomerSegments(data.segments || [])
      }

    } catch (error) {
      console.error('Error fetching analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatValue = (value: number | string, format: string): string => {
    if (typeof value === 'string') return value

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('es-MX', {
          style: 'currency',
          currency: 'MXN'
        }).format(value)
      case 'percentage':
        return `${value.toFixed(1)}%`
      case 'number':
        return new Intl.NumberFormat('es-MX').format(value)
      default:
        return value.toString()
    }
  }

  const getChangeIcon = (changeType?: string) => {
    switch (changeType) {
      case 'increase':
        return <ArrowUp className="w-4 h-4 text-green-600" />
      case 'decrease':
        return <ArrowDown className="w-4 h-4 text-red-600" />
      default:
        return null
    }
  }

  const getChangeColor = (changeType?: string) => {
    switch (changeType) {
      case 'increase':
        return 'text-green-600'
      case 'decrease':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const exportData = async (type: string) => {
    try {
      const response = await fetch(`/api/analytics/export?type=${type}&period=${dateRange}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `analytics-${type}-${dateRange}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting data:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inteligencia de Negocios</h1>
            <p className="text-gray-600">Panel de análisis y métricas empresariales</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="90d">Últimos 90 días</option>
              <option value="1y">Último año</option>
            </select>
            
            <button
              onClick={fetchAnalyticsData}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Actualizar</span>
            </button>
            
            <button
              onClick={() => exportData('full')}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <div key={metric.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${metric.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                {metric.change !== undefined && (
                  <div className={`flex items-center space-x-1 ${getChangeColor(metric.changeType)}`}>
                    {getChangeIcon(metric.changeType)}
                    <span className="text-sm font-medium">
                      {formatValue(Math.abs(metric.change), 'percentage')}
                    </span>
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">{metric.name}</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {formatValue(metric.value, metric.format)}
                </p>
                {metric.previousValue !== undefined && (
                  <p className="text-sm text-gray-500 mt-1">
                    vs. {formatValue(metric.previousValue, metric.format)} anterior
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Time Series Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Tendencias de Rendimiento</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Ingresos</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Órdenes</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Conversión</span>
            </div>
          </div>
        </div>

        {timeSeriesData.length > 0 ? (
          <div className="h-64 flex items-end space-x-2">
            {timeSeriesData.slice(-30).map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center space-y-1">
                <div className="w-full flex flex-col space-y-1">
                  <div 
                    className="bg-blue-500 rounded-t"
                    style={{ 
                      height: `${(data.revenue / Math.max(...timeSeriesData.map(d => d.revenue))) * 200}px` 
                    }}
                  />
                  <div 
                    className="bg-green-500"
                    style={{ 
                      height: `${(data.orders / Math.max(...timeSeriesData.map(d => d.orders))) * 50}px` 
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500 transform rotate-45 origin-left">
                  {new Date(data.date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            <Activity className="w-16 h-16 mb-4 text-gray-300" />
            <p>No hay datos de tendencias disponibles</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Products */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Productos Top</h3>
            <Package className="w-5 h-5 text-gray-400" />
          </div>

          {topProducts.length > 0 ? (
            <div className="space-y-4">
              {topProducts.slice(0, 5).map((product, index) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {product.brand} {product.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {product.orders} órdenes • {product.margin.toFixed(1)}% margen
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      {formatValue(product.revenue, 'currency')}
                    </div>
                    <div className={`text-sm flex items-center ${
                      product.growth >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {product.growth >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {Math.abs(product.growth).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No hay datos de productos disponibles</p>
            </div>
          )}
        </div>

        {/* Channel Performance */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Rendimiento por Canal</h3>
            <Globe className="w-5 h-5 text-gray-400" />
          </div>

          {channelPerformance.length > 0 ? (
            <div className="space-y-4">
              {channelPerformance.map((channel) => (
                <div key={channel.channel} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{channel.channel}</h4>
                    <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {channel.conversion.toFixed(1)}% conversión
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Ingresos</div>
                      <div className="font-semibold text-green-600">
                        {formatValue(channel.revenue, 'currency')}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Órdenes</div>
                      <div className="font-semibold">{channel.orders}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">CAC</div>
                      <div className="font-semibold text-orange-600">
                        {formatValue(channel.cac, 'currency')}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">LTV</div>
                      <div className="font-semibold text-purple-600">
                        {formatValue(channel.ltv, 'currency')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Globe className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No hay datos de canales disponibles</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue by Category */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Ingresos por Categoría</h3>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>

          {revenueByCategory.length > 0 ? (
            <div className="space-y-3">
              {revenueByCategory.map((category) => (
                <div key={category.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color || '#3B82F6' }}
                    />
                    <span className="text-gray-900">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatValue(category.value, 'currency')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <PieChart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No hay datos de categorías disponibles</p>
            </div>
          )}
        </div>

        {/* Customer Segments */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Segmentos de Clientes</h3>
            <Users className="w-5 h-5 text-gray-400" />
          </div>

          {customerSegments.length > 0 ? (
            <div className="space-y-3">
              {customerSegments.map((segment) => (
                <div key={segment.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: segment.color || '#10B981' }}
                    />
                    <span className="text-gray-900">{segment.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatValue(segment.value, 'number')} clientes
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No hay datos de segmentos disponibles</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Insights */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Zap className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Insights Rápidos</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Oportunidad</span>
            </div>
            <p className="text-sm text-gray-700">
              El calzado deportivo muestra un crecimiento del 15% este mes. 
              Considera aumentar el inventario.
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Eye className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Tendencia</span>
            </div>
            <p className="text-sm text-gray-700">
              Las ventas móviles representan el 65% del tráfico. 
              Optimiza la experiencia móvil.
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Crecimiento</span>
            </div>
            <p className="text-sm text-gray-700">
              Los clientes VIP generan 3x más ingresos. 
              Expande el programa de lealtad.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BusinessIntelligenceDashboard
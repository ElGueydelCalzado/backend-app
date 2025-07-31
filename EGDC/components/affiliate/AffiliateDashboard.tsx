'use client'

import React, { useState, useEffect } from 'react'
import { 
  DollarSign, TrendingUp, MousePointer, Users, Link, Calendar,
  Eye, BarChart3, PieChart, Download, Settings, Plus, Copy,
  ExternalLink, Star, Medal, Award, Trophy
} from 'lucide-react'

interface AffiliateStats {
  clicks: number
  conversions: number
  conversionRate: number
  commissions: number
  earnings: number
  topProducts: any[]
  clicksByDay: any[]
}

interface Affiliate {
  id: string
  email: string
  firstName: string
  lastName: string
  tier: 'starter' | 'bronze' | 'silver' | 'gold' | 'platinum'
  commissionRate: number
  referralCode: string
  totalEarnings: number
  totalCommissions: number
  totalClicks: number
  totalConversions: number
  conversionRate: number
}

interface AffiliateLink {
  id: string
  title: string
  shortUrl: string
  clickCount: number
  conversionCount: number
  isActive: boolean
  createdAt: string
}

const AffiliateDashboard: React.FC = () => {
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null)
  const [stats, setStats] = useState<AffiliateStats | null>(null)
  const [links, setLinks] = useState<AffiliateLink[]>([])
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [loading, setLoading] = useState(true)
  const [showLinkModal, setShowLinkModal] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [period])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const [affiliateRes, statsRes, linksRes] = await Promise.all([
        fetch('/api/affiliate/profile'),
        fetch(`/api/affiliate/stats?period=${period}`),
        fetch('/api/affiliate/links')
      ])

      if (affiliateRes.ok) {
        const affiliateData = await affiliateRes.json()
        setAffiliate(affiliateData.affiliate)
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData.stats)
      }

      if (linksRes.ok) {
        const linksData = await linksRes.json()
        setLinks(linksData.links)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTierColor = (tier: string) => {
    const colors = {
      starter: 'text-gray-600 bg-gray-100',
      bronze: 'text-amber-700 bg-amber-100',
      silver: 'text-gray-700 bg-gray-200',
      gold: 'text-yellow-700 bg-yellow-100',
      platinum: 'text-purple-700 bg-purple-100'
    }
    return colors[tier as keyof typeof colors] || colors.starter
  }

  const getTierIcon = (tier: string) => {
    const icons = {
      starter: Star,
      bronze: Medal,
      silver: Medal,
      gold: Award,
      platinum: Trophy
    }
    const Icon = icons[tier as keyof typeof icons] || Star
    return <Icon className="w-4 h-4" />
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // Show success notification
    alert('¡Copiado al portapapeles!')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-MX').format(num)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!affiliate) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Error al cargar datos del afiliado</h2>
        <button 
          onClick={fetchDashboardData}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Panel de Afiliado</h1>
            <p className="text-gray-600">
              Bienvenido, {affiliate.firstName} {affiliate.lastName}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getTierColor(affiliate.tier)}`}>
              {getTierIcon(affiliate.tier)}
              <span>Tier {affiliate.tier.charAt(0).toUpperCase() + affiliate.tier.slice(1)}</span>
            </div>
            
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="90d">Últimos 90 días</option>
              <option value="1y">Último año</option>
            </select>
          </div>
        </div>

        {/* Referral Code */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-900">Tu Código de Referido</h3>
              <div className="flex items-center space-x-2 mt-1">
                <code className="text-lg font-mono font-bold text-blue-700">{affiliate.referralCode}</code>
                <button
                  onClick={() => copyToClipboard(affiliate.referralCode)}
                  className="p-1 hover:bg-blue-200 rounded transition-colors"
                >
                  <Copy className="w-4 h-4 text-blue-600" />
                </button>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-600">Comisión actual</div>
              <div className="text-2xl font-bold text-blue-900">{affiliate.commissionRate}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clics</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(stats?.clicks || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <MousePointer className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-gray-500">
              Total histórico: {formatNumber(affiliate.totalClicks)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversiones</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(stats?.conversions || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-gray-500">
              Total histórico: {formatNumber(affiliate.totalConversions)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tasa de Conversión</p>
              <p className="text-2xl font-bold text-gray-900">
                {(stats?.conversionRate || 0).toFixed(1)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-gray-500">
              Histórico: {affiliate.conversionRate.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Comisiones</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats?.earnings || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-gray-500">
              Total ganado: {formatCurrency(affiliate.totalEarnings)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Rendimiento Diario</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          
          {stats?.clicksByDay && stats.clicksByDay.length > 0 ? (
            <div className="space-y-3">
              {stats.clicksByDay.slice(-7).map((day: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {new Date(day.date).toLocaleDateString('es-MX', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ 
                          width: `${Math.min((day.clicks / Math.max(...stats.clicksByDay.map((d: any) => d.clicks))) * 100, 100)}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8 text-right">
                      {day.clicks}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No hay datos de clics para mostrar</p>
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Productos Top</h3>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>

          {stats?.topProducts && stats.topProducts.length > 0 ? (
            <div className="space-y-4">
              {stats.topProducts.slice(0, 5).map((product: any, index: number) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {product.marca} {product.modelo}
                    </div>
                    <div className="text-sm text-gray-600">
                      {product.clicks} clics • {product.conversions} conversiones
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      {formatCurrency(product.total_commission || 0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <PieChart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No hay productos para mostrar</p>
            </div>
          )}
        </div>
      </div>

      {/* Affiliate Links */}
      <div className="mt-8 bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Mis Enlaces de Afiliado</h3>
            <button
              onClick={() => setShowLinkModal(true)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Enlace</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          {links.length > 0 ? (
            <div className="space-y-4">
              {links.map((link) => (
                <div key={link.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{link.title}</h4>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        link.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {link.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-3">
                    <input
                      type="text"
                      value={link.shortUrl}
                      readOnly
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(link.shortUrl)}
                      className="p-2 hover:bg-gray-100 rounded transition-colors"
                    >
                      <Copy className="w-4 h-4 text-gray-600" />
                    </button>
                    <a
                      href={link.shortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-gray-100 rounded transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-gray-600" />
                    </a>
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>{formatNumber(link.clickCount)} clics</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{formatNumber(link.conversionCount)} conversiones</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Creado {new Date(link.createdAt).toLocaleDateString('es-MX')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Link className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes enlaces creados</h3>
              <p className="text-gray-600 mb-6">
                Crea tu primer enlace de afiliado para comenzar a ganar comisiones
              </p>
              <button
                onClick={() => setShowLinkModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Crear Mi Primer Enlace
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Solicitar Pago</h3>
            <Download className="w-6 h-6" />
          </div>
          <p className="text-blue-100 text-sm mb-4">
            Tienes {formatCurrency(affiliate.totalCommissions)} disponible para retirar
          </p>
          <button className="w-full bg-white text-blue-600 py-2 rounded font-medium hover:bg-blue-50 transition-colors">
            Solicitar Retiro
          </button>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Materiales de Marketing</h3>
            <Download className="w-6 h-6" />
          </div>
          <p className="text-green-100 text-sm mb-4">
            Descarga banners, imágenes y contenido promocional
          </p>
          <button className="w-full bg-white text-green-600 py-2 rounded font-medium hover:bg-green-50 transition-colors">
            Ver Recursos
          </button>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Configuración</h3>
            <Settings className="w-6 h-6" />
          </div>
          <p className="text-purple-100 text-sm mb-4">
            Actualiza tu perfil, métodos de pago y preferencias
          </p>
          <button className="w-full bg-white text-purple-600 py-2 rounded font-medium hover:bg-purple-50 transition-colors">
            Configurar
          </button>
        </div>
      </div>
    </div>
  )
}

export default AffiliateDashboard
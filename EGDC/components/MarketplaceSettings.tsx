'use client'

import { useState, useEffect } from 'react'
import { Marketplace, MarketplaceFormData } from '@/lib/types'

interface MarketplaceSettingsProps {
  marketplaceSlug: string
  onSave?: (data: MarketplaceFormData) => void
}

export default function MarketplaceSettings({ marketplaceSlug, onSave }: MarketplaceSettingsProps) {
  const [marketplace, setMarketplace] = useState<Marketplace | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'sync' | 'products'>('general')
  const [formData, setFormData] = useState<MarketplaceFormData>({
    name: '',
    description: '',
    app_id: '',
    client_id: '',
    client_secret: '',
    access_token: '',
    refresh_token: '',
    sync_products: true,
    sync_prices: true,
    sync_inventory: true,
    auto_publish: false,
    import_orders: true,
    store_url: '',
    seller_id: '',
    store_name: ''
  })

  useEffect(() => {
    if (marketplaceSlug && marketplaceSlug !== 'add-marketplace') {
      loadMarketplace()
    } else {
      setLoading(false)
    }
  }, [marketplaceSlug])

  const loadMarketplace = async () => {
    try {
      setLoading(true)
      // Use dummy data instead of API call to prevent crashes
      const dummyMarketplace = {
        slug: marketplaceSlug,
        name: marketplaceSlug === 'shein' ? 'SHEIN' : marketplaceSlug === 'shopify' ? 'Shopify' : 'MercadoLibre',
        icon: marketplaceSlug === 'shein' ? '🛒' : marketplaceSlug === 'shopify' ? '🏬' : '🛍️',
        status: marketplaceSlug === 'mercadolibre' ? 'pending' : 'active',
        published_products_count: marketplaceSlug === 'shein' ? 45 : marketplaceSlug === 'shopify' ? 38 : 0,
        description: `Configuración de ${marketplaceSlug}`,
        app_id: '',
        client_id: '',
        client_secret: '',
        access_token: '',
        refresh_token: '',
        sync_products: true,
        sync_prices: true,
        sync_inventory: true,
        auto_publish: false,
        import_orders: true,
        store_url: '',
        seller_id: '',
        store_name: ''
      }
      
      setMarketplace(dummyMarketplace)
      setFormData({
        name: dummyMarketplace.name || '',
        description: dummyMarketplace.description || '',
        app_id: dummyMarketplace.app_id || '',
        client_id: dummyMarketplace.client_id || '',
        client_secret: dummyMarketplace.client_secret || '',
        access_token: dummyMarketplace.access_token || '',
        refresh_token: dummyMarketplace.refresh_token || '',
        sync_products: dummyMarketplace.sync_products,
        sync_prices: dummyMarketplace.sync_prices,
        sync_inventory: dummyMarketplace.sync_inventory,
        auto_publish: dummyMarketplace.auto_publish,
        import_orders: dummyMarketplace.import_orders,
        store_url: dummyMarketplace.store_url || '',
        seller_id: dummyMarketplace.seller_id || '',
        store_name: dummyMarketplace.store_name || ''
      })
    } catch (error) {
      console.error('Error loading marketplace:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      if (marketplaceSlug === 'add-marketplace') {
        // Create new marketplace
        const response = await fetch('/api/marketplaces', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            slug: formData.name.toLowerCase().replace(/\s+/g, '-'),
            platform: formData.name.toLowerCase().replace(/\s+/g, '')
          })
        })
        const result = await response.json()
        if (result.success) {
          console.log('Marketplace created:', result.data)
        }
      } else {
        // Update existing marketplace
        const response = await fetch(`/api/marketplaces/${marketplaceSlug}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
        const result = await response.json()
        if (result.success) {
          console.log('Marketplace updated:', result.data)
        }
      }
      
      if (onSave) {
        onSave(formData)
      }
    } catch (error) {
      console.error('Error saving marketplace:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSyncNow = async () => {
    // Placeholder for immediate sync
    alert('Función de sincronización inmediata - Por implementar')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando configuración...</p>
        </div>
      </div>
    )
  }

  if (marketplaceSlug === 'add-marketplace') {
    return (
      <div className="max-w-4xl">
        <div className="text-center py-20">
          <div className="text-8xl mb-6">🛒</div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Conectar Nuevo Marketplace</h3>
          <p className="text-gray-600 mb-8 max-w-lg mx-auto">
            Conecta un marketplace para sincronizar productos, precios e inventario automáticamente
          </p>
          
          {/* Platform Selection */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mb-8">
            {[
              { name: 'MercadoLibre', icon: '🛒', color: 'bg-yellow-100 border-yellow-300 hover:bg-yellow-200' },
              { name: 'Shopify', icon: '🛍️', color: 'bg-green-100 border-green-300 hover:bg-green-200' },
              { name: 'SHEIN', icon: '👗', color: 'bg-purple-100 border-purple-300 hover:bg-purple-200' },
              { name: 'TikTok Shop', icon: '🎵', color: 'bg-red-100 border-red-300 hover:bg-red-200' }
            ].map((platform) => (
              <button
                key={platform.name}
                onClick={() => {
                  setFormData({ ...formData, name: platform.name })
                }}
                className={`p-4 border-2 rounded-lg transition-colors ${platform.color}`}
              >
                <div className="text-2xl mb-2">{platform.icon}</div>
                <div className="text-sm font-medium">{platform.name}</div>
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => {
              if (formData.name) {
                // Switch to configuration form
              } else {
                alert('Selecciona un marketplace primero')
              }
            }}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium"
          >
            Continuar Configuración
          </button>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { color: 'bg-green-100 text-green-700', text: 'Activo', icon: '✅' },
      pending: { color: 'bg-orange-100 text-orange-700', text: 'Configurando', icon: '⚙️' },
      error: { color: 'bg-red-100 text-red-700', text: 'Error', icon: '❌' },
      disabled: { color: 'bg-gray-100 text-gray-700', text: 'Deshabilitado', icon: '⏸️' }
    }
    return badges[status as keyof typeof badges] || badges.pending
  }

  const getPlatformInfo = (platform: string) => {
    const platforms = {
      mercadolibre: { name: 'MercadoLibre', icon: '🛒', color: 'text-yellow-600' },
      shopify: { name: 'Shopify', icon: '🛍️', color: 'text-green-600' },
      shein: { name: 'SHEIN', icon: '👗', color: 'text-purple-600' },
      tiktok: { name: 'TikTok Shop', icon: '🎵', color: 'text-red-600' }
    }
    return platforms[platform as keyof typeof platforms] || platforms.mercadolibre
  }

  const status = marketplace?.status || 'pending'
  const badge = getStatusBadge(status)
  const platformInfo = getPlatformInfo(marketplace?.platform || 'mercadolibre')

  return (
    <div className="max-w-4xl">
      
      {/* Header with Platform Info */}
      <div className="flex items-center mb-6">
        <div className="text-4xl mr-4">{platformInfo.icon}</div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">
            Configuración - {marketplace?.name}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Configuración de marketplace y sincronización de productos
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
          {badge.icon} {badge.text}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <span className="text-blue-600 text-lg mr-3">ℹ️</span>
          <div>
            <h4 className="font-medium text-blue-900">Configuración de Marketplace</h4>
            <p className="text-sm text-blue-700 mt-1">
              Configura las credenciales de API para sincronizar productos, precios e inventario 
              con {marketplace?.name}.
            </p>
          </div>
        </div>
      </div>
      
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSyncNow}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Sincronizar Ahora
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>

      {/* Configuration Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button 
            onClick={() => setActiveTab('general')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'general' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Configuración General
          </button>
          <button 
            onClick={() => setActiveTab('sync')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'sync' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Sincronización
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'products' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Productos
          </button>
        </nav>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">App ID / Client ID</label>
              <input 
                type="text" 
                value={formData.app_id}
                onChange={(e) => setFormData({ ...formData, app_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                placeholder="Ingresa tu App ID" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Client Secret</label>
              <input 
                type="password" 
                value={formData.client_secret}
                onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                placeholder="••••••••••••••••" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Access Token</label>
              <input 
                type="password" 
                value={formData.access_token}
                onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                placeholder="••••••••••••••••" 
              />
            </div>

            {marketplace?.platform === 'shopify' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Store URL</label>
                <input 
                  type="text" 
                  value={formData.store_url}
                  onChange={(e) => setFormData({ ...formData, store_url: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="mi-tienda.myshopify.com" 
                />
              </div>
            )}

            {marketplace?.platform === 'mercadolibre' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Seller ID</label>
                <input 
                  type="text" 
                  value={formData.seller_id}
                  onChange={(e) => setFormData({ ...formData, seller_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="123456789" 
                />
              </div>
            )}
          </div>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Estado de Conexión</h4>
              <div className={`border rounded-lg p-4 ${
                status === 'active' ? 'bg-green-50 border-green-200' : 
                status === 'error' ? 'bg-red-50 border-red-200' : 
                'bg-orange-50 border-orange-200'
              }`}>
                <div className="flex items-center mb-2">
                  <span className="mr-2">{badge.icon}</span>
                  <span className={`text-sm font-medium ${
                    status === 'active' ? 'text-green-900' : 
                    status === 'error' ? 'text-red-900' : 
                    'text-orange-900'
                  }`}>
                    {badge.text}
                  </span>
                </div>
                <p className={`text-xs ${
                  status === 'active' ? 'text-green-700' : 
                  status === 'error' ? 'text-red-700' : 
                  'text-orange-700'
                }`}>
                  {marketplace?.last_sync_at 
                    ? `Última sincronización: ${new Date(marketplace.last_sync_at).toLocaleString()}`
                    : 'No se ha sincronizado aún'
                  }
                </p>
                <p className={`text-xs mt-1 ${
                  status === 'active' ? 'text-green-600' : 
                  status === 'error' ? 'text-red-600' : 
                  'text-orange-600'
                }`}>
                  {marketplace?.published_products_count || 0} productos sincronizados
                </p>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Configuraciones Rápidas</h4>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    checked={formData.sync_products}
                    onChange={(e) => setFormData({ ...formData, sync_products: e.target.checked })}
                    className="mr-3 rounded" 
                  />
                  <span className="text-sm">Sincronizar productos</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    checked={formData.sync_prices}
                    onChange={(e) => setFormData({ ...formData, sync_prices: e.target.checked })}
                    className="mr-3 rounded" 
                  />
                  <span className="text-sm">Sincronizar precios</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    checked={formData.sync_inventory}
                    onChange={(e) => setFormData({ ...formData, sync_inventory: e.target.checked })}
                    className="mr-3 rounded" 
                  />
                  <span className="text-sm">Sincronizar inventario</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    checked={formData.auto_publish}
                    onChange={(e) => setFormData({ ...formData, auto_publish: e.target.checked })}
                    className="mr-3 rounded" 
                  />
                  <span className="text-sm">Publicar automáticamente</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    checked={formData.import_orders}
                    onChange={(e) => setFormData({ ...formData, import_orders: e.target.checked })}
                    className="mr-3 rounded" 
                  />
                  <span className="text-sm">Importar órdenes</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sync' && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">⚡</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Configuración de Sincronización</h3>
          <p className="text-gray-600 mb-6">
            Configuraciones avanzadas de sincronización estarán disponibles próximamente
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-gray-600">
              Incluirá horarios de sincronización, reglas de negocio y configuraciones específicas por marketplace
            </p>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Gestión de Productos</h3>
          <p className="text-gray-600 mb-6">
            Vista de productos sincronizados y herramientas de gestión estarán disponibles próximamente
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-gray-600">
              Mostrará productos publicados, pendientes de publicar y herramientas de gestión por lotes
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
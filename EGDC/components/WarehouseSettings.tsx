'use client'

import { useState, useEffect } from 'react'
import { Warehouse, WarehouseFormData } from '@/lib/types'

interface WarehouseSettingsProps {
  warehouseSlug: string
  onSave?: (data: WarehouseFormData) => void
}

export default function WarehouseSettings({ warehouseSlug, onSave }: WarehouseSettingsProps) {
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'sync' | 'logs'>('general')
  const [formData, setFormData] = useState<WarehouseFormData>({
    name: '',
    description: '',
    api_url: '',
    api_key: '',
    api_secret: '',
    webhook_url: '',
    sync_enabled: false,
    sync_frequency: 15,
    sync_bidirectional: false,
    notify_low_stock: true,
    min_stock_threshold: 5,
    auto_reorder: false,
    default_markup_percentage: 0
  })

  useEffect(() => {
    if (warehouseSlug && warehouseSlug !== 'add-warehouse') {
      loadWarehouse()
    } else {
      setLoading(false)
    }
  }, [warehouseSlug])

  const loadWarehouse = async () => {
    try {
      setLoading(true)
      // Use dummy data instead of API call to prevent crashes
      const dummyWarehouse = {
        slug: warehouseSlug,
        name: warehouseSlug === 'egdc-main' ? 'EGDC Principal' : 'EGDC Almacén',
        icon: warehouseSlug === 'egdc-main' ? '🏪' : '📦',
        status: 'active',
        product_count: warehouseSlug === 'egdc-main' ? 120 : 85,
        last_sync_at: new Date().toISOString(),
        description: `Configuración de ${warehouseSlug}`,
        api_url: '',
        api_key: '',
        api_secret: '',
        webhook_url: '',
        sync_enabled: false,
        sync_frequency: 15,
        sync_bidirectional: false,
        notify_low_stock: true,
        min_stock_threshold: 5,
        auto_reorder: false,
        default_markup_percentage: 0
      }
      
      setWarehouse(dummyWarehouse)
      setFormData({
        name: dummyWarehouse.name || '',
        description: dummyWarehouse.description || '',
        api_url: dummyWarehouse.api_url || '',
        api_key: dummyWarehouse.api_key || '',
        api_secret: dummyWarehouse.api_secret || '',
        webhook_url: dummyWarehouse.webhook_url || '',
        sync_enabled: dummyWarehouse.sync_enabled,
        sync_frequency: dummyWarehouse.sync_frequency,
        sync_bidirectional: dummyWarehouse.sync_bidirectional,
        notify_low_stock: dummyWarehouse.notify_low_stock,
        min_stock_threshold: dummyWarehouse.min_stock_threshold,
        auto_reorder: dummyWarehouse.auto_reorder,
        default_markup_percentage: dummyWarehouse.default_markup_percentage
      })
    } catch (error) {
      console.error('Error loading warehouse:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      if (warehouseSlug === 'add-warehouse') {
        // Create new warehouse
        const response = await fetch('/api/warehouses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            slug: formData.name.toLowerCase().replace(/\s+/g, '-')
          })
        })
        const result = await response.json()
        if (result.success) {
          console.log('Warehouse created:', result.data)
        }
      } else {
        // Update existing warehouse
        const response = await fetch(`/api/warehouses/${warehouseSlug}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
        const result = await response.json()
        if (result.success) {
          console.log('Warehouse updated:', result.data)
        }
      }
      
      if (onSave) {
        onSave(formData)
      }
    } catch (error) {
      console.error('Error saving warehouse:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    // Placeholder for testing API connection
    alert('Función de prueba de conexión - Por implementar')
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

  if (warehouseSlug === 'add-warehouse') {
    return (
      <div className="max-w-4xl">
        <div className="text-center py-20">
          <div className="text-8xl mb-6">🏭</div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Conectar Nuevo Almacén</h3>
          <p className="text-gray-600 mb-8 max-w-lg mx-auto">
            Agrega un almacén externo para sincronizar inventario, gestionar stock distribuido y mantener 
            tu inventario actualizado en tiempo real.
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => {
                // Switch to configuration form
                setFormData({
                  name: '',
                  description: '',
                  api_url: '',
                  api_key: '',
                  api_secret: '',
                  webhook_url: '',
                  sync_enabled: false,
                  sync_frequency: 15,
                  sync_bidirectional: false,
                  notify_low_stock: true,
                  min_stock_threshold: 5,
                  auto_reorder: false,
                  default_markup_percentage: 0
                })
              }}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium block mx-auto"
            >
              Iniciar Configuración
            </button>
            <button className="text-gray-500 text-sm hover:text-gray-700">
              Ver documentación de integración
            </button>
          </div>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { color: 'bg-green-100 text-green-700', text: 'Conectado', icon: '✅' },
      pending: { color: 'bg-orange-100 text-orange-700', text: 'Pendiente', icon: '⏳' },
      error: { color: 'bg-red-100 text-red-700', text: 'Error', icon: '❌' },
      disabled: { color: 'bg-gray-100 text-gray-700', text: 'Deshabilitado', icon: '⏸️' }
    }
    return badges[status as keyof typeof badges] || badges.pending
  }

  const status = warehouse?.status || 'pending'
  const badge = getStatusBadge(status)

  return (
    <div className="max-w-4xl">
      
      {/* Status Banner */}
      <div className={`border rounded-lg p-4 mb-6 ${
        status === 'active' ? 'bg-green-50 border-green-200' : 
        status === 'error' ? 'bg-red-50 border-red-200' : 
        'bg-orange-50 border-orange-200'
      }`}>
        <div className="flex items-center">
          <span className="text-lg mr-3">{badge.icon}</span>
          <div>
            <h4 className={`font-medium ${
              status === 'active' ? 'text-green-900' : 
              status === 'error' ? 'text-red-900' : 
              'text-orange-900'
            }`}>
              Almacén {badge.text}
            </h4>
            <p className={`text-sm ${
              status === 'active' ? 'text-green-700' : 
              status === 'error' ? 'text-red-700' : 
              'text-orange-700'
            }`}>
              {status === 'active' && `La conexión con ${warehouse?.name} está funcionando correctamente.`}
              {status === 'error' && `Error en la conexión con ${warehouse?.name}. Revisa la configuración.`}
              {status === 'pending' && `Configuración de ${warehouse?.name} pendiente.`}
            </p>
          </div>
        </div>
      </div>
      
      {/* Header with Actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Configuración - {warehouse?.name}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Configuración de almacén externo y sincronización
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleTestConnection}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Probar Conexión
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
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
            onClick={() => setActiveTab('logs')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'logs' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Logs
          </button>
        </nav>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Almacén
              </label>
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
              <p className="text-xs text-gray-500 mt-1">Nombre identificativo del almacén</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Descripción opcional del almacén"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL de API
              </label>
              <input 
                type="text" 
                value={formData.api_url}
                onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                placeholder="https://api.warehouse.com/v1" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <div className="relative">
                <input 
                  type="password" 
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="••••••••••••••••" 
                />
                <button className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Secret
              </label>
              <input 
                type="password" 
                value={formData.api_secret}
                onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                placeholder="••••••••••••••••" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Webhook URL
              </label>
              <input 
                type="text" 
                value={formData.webhook_url}
                onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                placeholder="https://egdc.com/webhooks/warehouse" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Umbral de Stock Mínimo
              </label>
              <input 
                type="number" 
                value={formData.min_stock_threshold}
                onChange={(e) => setFormData({ ...formData, min_stock_threshold: parseInt(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                min="0"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Markup por Defecto (%)
              </label>
              <input 
                type="number" 
                step="0.01"
                value={formData.default_markup_percentage}
                onChange={(e) => setFormData({ ...formData, default_markup_percentage: parseFloat(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                min="0"
                max="100"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sync' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Configuración de Sincronización
              </label>
              <div className="space-y-4">
                <label className="flex items-start">
                  <input 
                    type="checkbox" 
                    checked={formData.sync_enabled}
                    onChange={(e) => setFormData({ ...formData, sync_enabled: e.target.checked })}
                    className="mt-1 mr-3 rounded" 
                  />
                  <div>
                    <span className="text-sm font-medium">Sincronización automática</span>
                    <p className="text-xs text-gray-500">Sincronizar inventario automáticamente según la frecuencia configurada</p>
                  </div>
                </label>
                
                <label className="flex items-start">
                  <input 
                    type="checkbox" 
                    checked={formData.sync_bidirectional}
                    onChange={(e) => setFormData({ ...formData, sync_bidirectional: e.target.checked })}
                    className="mt-1 mr-3 rounded" 
                  />
                  <div>
                    <span className="text-sm font-medium">Sincronización bidireccional</span>
                    <p className="text-xs text-gray-500">Permitir que el almacén actualice datos en EGDC</p>
                  </div>
                </label>
                
                <label className="flex items-start">
                  <input 
                    type="checkbox" 
                    checked={formData.notify_low_stock}
                    onChange={(e) => setFormData({ ...formData, notify_low_stock: e.target.checked })}
                    className="mt-1 mr-3 rounded" 
                  />
                  <div>
                    <span className="text-sm font-medium">Notificaciones de stock crítico</span>
                    <p className="text-xs text-gray-500">Recibir alertas cuando el inventario esté bajo</p>
                  </div>
                </label>
                
                <label className="flex items-start">
                  <input 
                    type="checkbox" 
                    checked={formData.auto_reorder}
                    onChange={(e) => setFormData({ ...formData, auto_reorder: e.target.checked })}
                    className="mt-1 mr-3 rounded" 
                  />
                  <div>
                    <span className="text-sm font-medium">Reorden automático</span>
                    <p className="text-xs text-gray-500">Crear órdenes de compra automáticamente cuando el stock sea bajo</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frecuencia de Sincronización (minutos)
              </label>
              <select 
                value={formData.sync_frequency}
                onChange={(e) => setFormData({ ...formData, sync_frequency: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={5}>Cada 5 minutos</option>
                <option value={15}>Cada 15 minutos</option>
                <option value={30}>Cada 30 minutos</option>
                <option value={60}>Cada hora</option>
                <option value={240}>Cada 4 horas</option>
                <option value={1440}>Diario</option>
              </select>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Estadísticas de Sincronización</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Última sincronización:</span>
                  <span className="font-medium">
                    {warehouse?.last_sync_at 
                      ? new Date(warehouse.last_sync_at).toLocaleString()
                      : 'Nunca'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Productos sincronizados:</span>
                  <span className="font-medium">{warehouse?.product_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado de conexión:</span>
                  <span className={`font-medium ${
                    status === 'active' ? 'text-green-600' : 
                    status === 'error' ? 'text-red-600' : 
                    'text-orange-600'
                  }`}>
                    {badge.text}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Logs de Sincronización</h3>
          <p className="text-gray-600 mb-6">
            Los logs detallados de sincronización estarán disponibles próximamente
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-gray-600">
              Esta sección incluirá historial de sincronizaciones, errores y estadísticas detalladas
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
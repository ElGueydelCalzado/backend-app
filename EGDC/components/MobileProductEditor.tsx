'use client'

import { useState } from 'react'
import { Product } from '@/lib/types'
import { X, Save, DollarSign, Package, Tag, Palette, Hash, ChevronRight } from 'lucide-react'

interface MobileProductEditorProps {
  product: Product | null
  onSave: (product: Product) => void
  onClose: () => void
  isNew?: boolean
  availableCategories?: string[]
}

export default function MobileProductEditor({
  product,
  onSave,
  onClose,
  isNew = false,
  availableCategories = []
}: MobileProductEditorProps) {
  const [formData, setFormData] = useState<Partial<Product>>(
    product || {
      categoria: '',
      marca: '',
      modelo: '',
      color: '',
      talla: '',
      sku: '',
      ean: '',
      costo: 0,
      shein_modifier: 1.5,
      shopify_modifier: 1.8,
      meli_modifier: 2.0,
      inv_egdc: 0,
      inv_fami: 0,
      inv_osiel: 0,
      inv_molly: 0,
      shein: false,
      meli: false,
      shopify: false,
      tiktok: false,
      upseller: false,
      go_trendier: false,
      google_drive: '',
      // Auto-calculated fields - will be set by database
      precio_shein: null,
      precio_shopify: null,
      precio_meli: null,
      inventory_total: null,
      fecha: null,
      created_at: null,
      updated_at: null
    }
  )

  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'inventory' | 'platforms'>('basic')
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(['basic']))

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNext = () => {
    const tabOrder = ['basic', 'pricing', 'inventory', 'platforms']
    const currentIndex = tabOrder.indexOf(activeTab)
    
    if (currentIndex < tabOrder.length - 1) {
      const nextTab = tabOrder[currentIndex + 1] as typeof activeTab
      setActiveTab(nextTab)
      setVisitedTabs(prev => new Set([...prev, nextTab]))
    }
  }

  const handleSave = () => {
    // Required fields validation
    if (!formData.categoria || formData.categoria.trim() === '') {
      alert('La Categoría es requerida')
      return
    }
    
    if (!formData.marca || formData.marca.trim() === '') {
      alert('La Marca es requerida')
      return
    }
    
    if (!formData.sku || formData.sku.trim() === '') {
      alert('El SKU es requerido')
      return
    }

    // Set default values if missing for quick save
    const productToSave = {
      ...formData,
      modelo: formData.modelo || 'Sin modelo',
      costo: formData.costo || 0,
      color: formData.color || '',
      talla: formData.talla || '',
      ean: formData.ean || ''
    }
    
    onSave(productToSave as Product)
  }

  const renderBasicInfo = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Tag className="inline h-4 w-4 mr-1" />
          Categoría *
        </label>
        <select
          required
          value={formData.categoria || ''}
          onChange={(e) => handleInputChange('categoria', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base bg-white"
        >
          <option value="">Seleccionar categoría...</option>
          {availableCategories.map(categoria => (
            <option key={categoria} value={categoria}>{categoria}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Package className="inline h-4 w-4 mr-1" />
          Marca *
        </label>
        <input
          type="text"
          required
          value={formData.marca || ''}
          onChange={(e) => handleInputChange('marca', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
          placeholder="Ej: Nike, Adidas, Puma"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Modelo *
        </label>
        <input
          type="text"
          required
          value={formData.modelo || ''}
          onChange={(e) => handleInputChange('modelo', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
          placeholder="Ej: Air Max, Stan Smith"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Palette className="inline h-4 w-4 mr-1" />
            Color
          </label>
          <input
            type="text"
            value={formData.color || ''}
            onChange={(e) => handleInputChange('color', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            placeholder="Ej: Negro, Blanco"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Talla
          </label>
          <input
            type="text"
            value={formData.talla || ''}
            onChange={(e) => handleInputChange('talla', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            placeholder="Ej: 38, 40, 42"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Hash className="inline h-4 w-4 mr-1" />
          SKU
        </label>
        <input
          type="text"
          value={formData.sku || ''}
          onChange={(e) => handleInputChange('sku', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
          placeholder="Código único del producto"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          EAN/Código de Barras
        </label>
        <input
          type="text"
          value={formData.ean || ''}
          onChange={(e) => handleInputChange('ean', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
          placeholder="Código de barras"
        />
      </div>
    </div>
  )

  const renderPricing = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <DollarSign className="inline h-4 w-4 mr-1" />
          Costo *
        </label>
        <input
          type="number"
          step="0.01"
          required
          value={formData.costo || ''}
          onChange={(e) => handleInputChange('costo', parseFloat(e.target.value) || 0)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
          placeholder="0.00"
        />
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">Modificadores de Precio</h4>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SHEIN Modifier
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.shein_modifier || ''}
              onChange={(e) => handleInputChange('shein_modifier', parseFloat(e.target.value) || 1.5)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shopify Modifier
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.shopify_modifier || ''}
              onChange={(e) => handleInputChange('shopify_modifier', parseFloat(e.target.value) || 1.8)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              MercadoLibre Modifier
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.meli_modifier || ''}
              onChange={(e) => handleInputChange('meli_modifier', parseFloat(e.target.value) || 2.0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderInventory = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            EGDC
          </label>
          <input
            type="number"
            value={formData.inv_egdc || ''}
            onChange={(e) => handleInputChange('inv_egdc', parseInt(e.target.value) || 0)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            FAMI
          </label>
          <input
            type="number"
            value={formData.inv_fami || ''}
            onChange={(e) => handleInputChange('inv_fami', parseInt(e.target.value) || 0)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Osiel
          </label>
          <input
            type="number"
            value={formData.inv_osiel || ''}
            onChange={(e) => handleInputChange('inv_osiel', parseInt(e.target.value) || 0)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Molly
          </label>
          <input
            type="number"
            value={formData.inv_molly || ''}
            onChange={(e) => handleInputChange('inv_molly', parseInt(e.target.value) || 0)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
          />
        </div>
      </div>
    </div>
  )

  const renderPlatforms = () => (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">Plataformas de Venta</h4>
        
        <div className="space-y-3">
          {[
            { key: 'shein', label: 'SHEIN', color: 'bg-black' },
            { key: 'shopify', label: 'Shopify', color: 'bg-green-600' },
            { key: 'meli', label: 'MercadoLibre', color: 'bg-yellow-500' },
            { key: 'tiktok', label: 'TikTok', color: 'bg-pink-600' },
            { key: 'upseller', label: 'Upseller', color: 'bg-purple-600' },
            { key: 'go_trendier', label: 'Go Trendier', color: 'bg-blue-600' }
          ].map(platform => (
            <label key={platform.key} className="flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={formData[platform.key as keyof Product] as boolean || false}
                onChange={(e) => handleInputChange(platform.key, e.target.checked)}
                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className={`w-4 h-4 rounded ${platform.color}`}></div>
              <span className="text-sm font-medium text-gray-700">{platform.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Google Drive Link
        </label>
        <input
          type="url"
          value={formData.google_drive || ''}
          onChange={(e) => handleInputChange('google_drive', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
          placeholder="https://drive.google.com/..."
        />
      </div>
    </div>
  )

  const tabs = [
    { id: 'basic', label: 'Básico', icon: <Package className="h-4 w-4" /> },
    { id: 'pricing', label: 'Precios', icon: <DollarSign className="h-4 w-4" /> },
    { id: 'inventory', label: 'Stock', icon: <Hash className="h-4 w-4" /> },
    { id: 'platforms', label: 'Plataformas', icon: <Tag className="h-4 w-4" /> }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-white w-full h-[90vh] rounded-t-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-6 pb-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {isNew ? 'Nuevo Producto' : 'Editar Producto'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map(tab => {
            const isVisited = visitedTabs.has(tab.id)
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any)
                  setVisitedTabs(prev => new Set([...prev, tab.id]))
                }}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap relative ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {isNew && isVisited && !isActive && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                )}
                {isNew && !isVisited && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                )}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'basic' && renderBasicInfo()}
          {activeTab === 'pricing' && renderPricing()}
          {activeTab === 'inventory' && renderInventory()}
          {activeTab === 'platforms' && renderPlatforms()}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            
            {/* Show "Siguiente" button for first 3 tabs, "Guardar" only on platforms tab */}
            {activeTab !== 'platforms' ? (
              <button
                onClick={handleNext}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <span>Siguiente</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Guardar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
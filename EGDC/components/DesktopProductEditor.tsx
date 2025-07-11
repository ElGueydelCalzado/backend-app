'use client'

import { useState } from 'react'
import { Product } from '@/lib/types'
import { X, Save, DollarSign, Package, Tag, Palette, Hash, MapPin } from 'lucide-react'

interface DesktopProductEditorProps {
  product: Product | null
  onSave: (product: Product) => void
  onClose: () => void
  isNew?: boolean
}

export default function DesktopProductEditor({
  product,
  onSave,
  onClose,
  isNew = false
}: DesktopProductEditorProps) {
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
      inv_bodega_principal: 0,
      inv_tienda_centro: 0,
      inv_tienda_norte: 0,
      inv_tienda_sur: 0,
      inv_online: 0,
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

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = () => {
    if (formData.marca && formData.modelo && formData.categoria) {
      onSave(formData as Product)
    }
  }

  const renderBasicInfo = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Tag className="inline h-4 w-4 mr-1" />
          Categoría *
        </label>
        <input
          type="text"
          required
          value={formData.categoria || ''}
          onChange={(e) => handleInputChange('categoria', e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base transition-colors"
          placeholder="Ej: Zapatos, Botas, Tenis"
        />
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
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base transition-colors"
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
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base transition-colors"
          placeholder="Ej: Air Max, Stan Smith"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Palette className="inline h-4 w-4 mr-1" />
          Color
        </label>
        <input
          type="text"
          value={formData.color || ''}
          onChange={(e) => handleInputChange('color', e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base transition-colors"
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
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base transition-colors"
          placeholder="Ej: 38, 40, 42"
        />
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
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base transition-colors"
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
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base transition-colors"
          placeholder="Código de barras"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Google Drive Link
        </label>
        <input
          type="url"
          value={formData.google_drive || ''}
          onChange={(e) => handleInputChange('google_drive', e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base transition-colors"
          placeholder="https://drive.google.com/..."
        />
      </div>
    </div>
  )

  const renderPricing = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base transition-colors"
          placeholder="0.00"
        />
      </div>

      <div className="md:col-span-2">
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-lg border-2 border-orange-200">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Modificadores de Precio
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SHEIN Modifier
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.shein_modifier || ''}
                onChange={(e) => handleInputChange('shein_modifier', parseFloat(e.target.value) || 1.5)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shopify Modifier
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.shopify_modifier || ''}
                onChange={(e) => handleInputChange('shopify_modifier', parseFloat(e.target.value) || 1.8)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                MercadoLibre Modifier
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.meli_modifier || ''}
                onChange={(e) => handleInputChange('meli_modifier', parseFloat(e.target.value) || 2.0)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base transition-colors"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderInventory = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <MapPin className="inline h-4 w-4 mr-1" />
          EGDC
        </label>
        <input
          type="number"
          value={formData.inv_egdc || ''}
          onChange={(e) => handleInputChange('inv_egdc', parseInt(e.target.value) || 0)}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base transition-colors"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <MapPin className="inline h-4 w-4 mr-1" />
          FAMI
        </label>
        <input
          type="number"
          value={formData.inv_fami || ''}
          onChange={(e) => handleInputChange('inv_fami', parseInt(e.target.value) || 0)}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base transition-colors"
        />
      </div>
    </div>
  )

  const renderPlatforms = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="md:col-span-2">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border-2 border-blue-200">
          <h4 className="font-semibold text-gray-900 mb-4">Plataformas de Venta</h4>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { key: 'shein', label: 'SHEIN', color: 'bg-orange-500' },
              { key: 'shopify', label: 'Shopify', color: 'bg-green-600' },
              { key: 'meli', label: 'MercadoLibre', color: 'bg-yellow-500' },
              { key: 'tiktok', label: 'TikTok', color: 'bg-pink-600' },
              { key: 'upseller', label: 'Upseller', color: 'bg-purple-600' },
              { key: 'go_trendier', label: 'Go Trendier', color: 'bg-blue-600' }
            ].map(platform => (
              <label key={platform.key} className="flex items-center space-x-3 p-4 hover:bg-white hover:shadow-md rounded-lg cursor-pointer transition-all border-2 border-transparent hover:border-gray-200">
                <input
                  type="checkbox"
                  checked={formData[platform.key as keyof Product] as boolean || false}
                  onChange={(e) => handleInputChange(platform.key, e.target.checked)}
                  className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 transition-colors"
                />
                <div className={`w-4 h-4 rounded ${platform.color}`}></div>
                <span className="text-sm font-medium text-gray-700">{platform.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const tabs = [
    { id: 'basic', label: 'Básico', icon: <Package className="h-5 w-5" /> },
    { id: 'pricing', label: 'Precios', icon: <DollarSign className="h-5 w-5" /> },
    { id: 'inventory', label: 'Stock', icon: <Hash className="h-5 w-5" /> },
    { id: 'platforms', label: 'Plataformas', icon: <Tag className="h-5 w-5" /> }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-xl flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100">
          <h2 className="text-2xl font-bold text-gray-900">
            {isNew ? 'Nuevo Producto' : 'Editar Producto'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:shadow-md rounded-lg transition-all"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-4 border-b-2 font-medium text-sm transition-all ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'basic' && renderBasicInfo()}
          {activeTab === 'pricing' && renderPricing()}
          {activeTab === 'inventory' && renderInventory()}
          {activeTab === 'platforms' && renderPlatforms()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-colors flex items-center space-x-2 shadow-lg"
            >
              <Save className="h-5 w-5" />
              <span>Guardar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
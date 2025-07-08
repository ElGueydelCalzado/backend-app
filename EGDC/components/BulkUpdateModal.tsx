'use client'

import { useState } from 'react'
import { Product } from '@/lib/supabase'

interface BulkUpdateModalProps {
  isOpen: boolean
  selectedProducts: Product[]
  onClose: () => void
  onUpdate: (updates: Partial<Product>) => void
}

export default function BulkUpdateModal({ 
  isOpen, 
  selectedProducts, 
  onClose, 
  onUpdate 
}: BulkUpdateModalProps) {
  const [updates, setUpdates] = useState<Partial<Product>>({})
  const [isUpdating, setIsUpdating] = useState(false)

  if (!isOpen) return null

  const handleUpdate = async () => {
    setIsUpdating(true)
    onUpdate(updates)
    setIsUpdating(false)
    onClose()
    setUpdates({})
  }

  const handleCancel = () => {
    onClose()
    setUpdates({})
  }

  const updateFields = [
    { key: 'google_drive', label: 'Google Drive URL', type: 'text' },
    { key: 'costo', label: 'Costo', type: 'number' },
    { key: 'shein_modifier', label: 'Modificador SHEIN', type: 'number' },
    { key: 'shopify_modifier', label: 'Modificador Shopify', type: 'number' },
    { key: 'meli_modifier', label: 'Modificador MercadoLibre', type: 'number' },
    { key: 'inv_egdc', label: 'Inventario EGDC', type: 'number' },
    { key: 'inv_fami', label: 'Inventario FAMI', type: 'number' },
    { key: 'categoria', label: 'Categoría', type: 'text' },
    { key: 'marca', label: 'Marca', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'color', label: 'Color', type: 'text' },
    { key: 'talla', label: 'Talla', type: 'text' },
    { key: 'sku', label: 'SKU', type: 'text' },
    { key: 'ean', label: 'EAN', type: 'text' },
  ]

  const platformFields = [
    { key: 'shein', label: 'SHEIN' },
    { key: 'meli', label: 'MercadoLibre' },
    { key: 'shopify', label: 'Shopify' },
    { key: 'tiktok', label: 'TikTok' },
    { key: 'upseller', label: 'Upseller' },
    { key: 'go_trendier', label: 'Go Trendier' },
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-100 to-purple-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              Actualización Masiva
              <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-bold rounded-full">
                {selectedProducts.length} productos
              </span>
            </h2>
            <button
              onClick={handleCancel}
              disabled={isUpdating}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Campos a Actualizar</h3>
            <p className="text-sm text-gray-600 mb-4">
              Solo se actualizarán los campos que completes. Los campos vacíos se mantendrán sin cambios.
            </p>

            {/* Regular Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {updateFields.map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={updates[field.key as keyof Product]?.toString() || ''}
                    onChange={(e) => {
                      const value = field.type === 'number' && e.target.value 
                        ? parseFloat(e.target.value) 
                        : e.target.value || undefined
                      setUpdates(prev => ({ ...prev, [field.key]: value }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={`Nuevo ${field.label.toLowerCase()}`}
                    step={field.type === 'number' ? '0.01' : undefined}
                  />
                </div>
              ))}
            </div>

            {/* Platform Checkboxes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Plataformas (marcar para activar, desmarcar para desactivar)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {platformFields.map(field => (
                  <label key={field.key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={updates[field.key as keyof Product] === true}
                      onChange={(e) => {
                        const value = e.target.checked ? true : false
                        setUpdates(prev => ({ ...prev, [field.key]: value }))
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                    />
                    <span className="text-sm text-gray-700">{field.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Selected Products Preview */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-800 mb-2">Productos Seleccionados:</h4>
            <div className="max-h-32 overflow-y-auto">
              <div className="space-y-1 text-sm">
                {selectedProducts.slice(0, 10).map(product => (
                  <div key={product.id} className="flex items-center justify-between">
                    <span className="font-mono text-xs bg-white px-2 py-1 rounded">
                      {product.sku || 'Sin SKU'}
                    </span>
                    <span className="text-gray-600">
                      {[product.marca, product.modelo].filter(Boolean).join(' ') || 'Sin nombre'}
                    </span>
                  </div>
                ))}
                {selectedProducts.length > 10 && (
                  <div className="text-gray-500 text-center py-2">
                    ...y {selectedProducts.length - 10} productos más
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between">
          <button
            onClick={handleCancel}
            disabled={isUpdating}
            className="px-4 py-2 text-gray-600 font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleUpdate}
            disabled={isUpdating || Object.keys(updates).length === 0}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isUpdating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Actualizando...
              </>
            ) : (
              <>
                <span>📝</span>
                Actualizar {selectedProducts.length} Productos
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
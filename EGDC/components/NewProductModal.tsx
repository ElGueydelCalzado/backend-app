'use client'

import { useState } from 'react'

interface NewProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ProductForm {
  categoria: string
  marca: string
  modelo: string
  color: string
  talla: string
  sku: string
  ean: string
  costo: number | null
  shein_modifier: number | null
  shopify_modifier: number | null
  meli_modifier: number | null
  inv_egdc: number | null
  inv_fami: number | null
}

const initialForm: ProductForm = {
  categoria: '',
  marca: '',
  modelo: '',
  color: '',
  talla: '',
  sku: '',
  ean: '',
  costo: null,
  shein_modifier: 1.5,
  shopify_modifier: 2.0,
  meli_modifier: 2.5,
  inv_egdc: 0,
  inv_fami: 0
}

export default function NewProductModal({ isOpen, onClose, onSuccess }: NewProductModalProps) {
  const [form, setForm] = useState<ProductForm>(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleInputChange = (field: keyof ProductForm, value: string | number | null) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    
    try {
      // Basic validation
      if (!form.categoria || !form.marca || !form.modelo || !form.sku) {
        throw new Error('Por favor completa los campos requeridos: Categoría, Marca, Modelo y SKU')
      }

      // TODO: Implement API call to create product
      console.log('Creating product:', form)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setForm(initialForm) // Reset form
      onSuccess()
      onClose()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear producto')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (!saving) {
      setForm(initialForm)
      setError(null)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-100/60 via-white to-green-100/60 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <span className="text-2xl mr-3">➕</span>
            Nuevo Producto
          </h2>
          <button
            onClick={handleClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <span className="mr-2">📝</span>
              Información Básica
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.categoria}
                  onChange={(e) => handleInputChange('categoria', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                  placeholder="Ej: Alpargatas"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marca <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.marca}
                  onChange={(e) => handleInputChange('marca', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                  placeholder="Ej: Adidas"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modelo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.modelo}
                  onChange={(e) => handleInputChange('modelo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                  placeholder="Ej: Stan Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input
                  type="text"
                  value={form.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                  placeholder="Ej: Verde"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Talla</label>
                <input
                  type="text"
                  value={form.talla}
                  onChange={(e) => handleInputChange('talla', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                  placeholder="Ej: 42"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                  placeholder="Ej: ADI-SS-V-42"
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <span className="mr-2">💰</span>
              Precios
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Costo</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.costo || ''}
                  onChange={(e) => handleInputChange('costo', e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mod. SHEIN</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.shein_modifier || ''}
                  onChange={(e) => handleInputChange('shein_modifier', e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                  placeholder="1.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mod. Shopify</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.shopify_modifier || ''}
                  onChange={(e) => handleInputChange('shopify_modifier', e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                  placeholder="2.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mod. MercadoLibre</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.meli_modifier || ''}
                  onChange={(e) => handleInputChange('meli_modifier', e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                  placeholder="2.5"
                />
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <span className="mr-2">📦</span>
              Inventario Inicial
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'inv_egdc', label: 'EGDC' },
                { key: 'inv_fami', label: 'FAMI' }
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type="number"
                    min="0"
                    value={form[key as keyof ProductForm]?.toString() || ''}
                    onChange={(e) => handleInputChange(key as keyof ProductForm, e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <span>💾</span>
                  Crear Producto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
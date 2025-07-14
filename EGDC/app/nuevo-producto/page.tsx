'use client'

import { useState } from 'react'
import TabNavigation from '@/components/TabNavigation'
import MessageArea from '@/components/MessageArea'

interface Message {
  text: string
  type: 'success' | 'error' | 'info'
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
  inv_osiel: number | null
  inv_molly: number | null
  shein: boolean
  shopify: boolean
  meli: boolean
  tiktok: boolean
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
  inv_fami: 0,
  inv_osiel: 0,
  inv_molly: 0,
  shein: false,
  shopify: false,
  meli: false,
  tiktok: false
}

export default function NuevoProductoPage() {
  const [form, setForm] = useState<ProductForm>(initialForm)
  const [message, setMessage] = useState<Message | null>(null)
  const [saving, setSaving] = useState(false)

  const handleInputChange = (field: keyof ProductForm, value: string | number | boolean | null) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      // Basic validation
      if (!form.categoria || !form.marca || !form.modelo || !form.sku) {
        throw new Error('Por favor completa los campos requeridos: Categoría, Marca, Modelo y SKU')
      }

      // TODO: Implement API call to create product
      console.log('Creating product:', form)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setMessage({ text: '¡Producto creado exitosamente!', type: 'success' })
      setForm(initialForm) // Reset form
      
    } catch (error) {
      setMessage({ 
        text: error instanceof Error ? error.message : 'Error al crear producto', 
        type: 'error' 
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-700 bg-clip-text text-transparent flex items-center">
                <span className="text-4xl mr-3">🏪</span>
                Inventario EGDC
              </h1>
            </div>
          </div>
          <TabNavigation currentTab="nuevo-producto" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <MessageArea message={message} />

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-100/60 via-white to-orange-100/60">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <span className="text-2xl mr-3">➕</span>
              Nuevo Producto
            </h2>
            <p className="text-sm text-gray-700 mt-1">Completa la información del nuevo producto para el inventario</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {/* Basic Information */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
                    placeholder="Ej: Stan Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input
                    type="text"
                    value={form.color}
                    onChange={(e) => handleInputChange('color', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
                    placeholder="Ej: Verde"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Talla</label>
                  <input
                    type="text"
                    value={form.talla}
                    onChange={(e) => handleInputChange('talla', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
                    placeholder="Ej: ADI-SS-V-42"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">EAN</label>
                  <input
                    type="text"
                    value={form.ean}
                    onChange={(e) => handleInputChange('ean', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
                    placeholder="Código de barras"
                  />
                </div>
              </div>
            </div>

            {/* Pricing Information */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">💰</span>
                Precios y Modificadores
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Costo</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.costo || ''}
                    onChange={(e) => handleInputChange('costo', e.target.value ? parseFloat(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
                    placeholder="2.5"
                  />
                </div>
              </div>
            </div>

            {/* Initial Inventory */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">📦</span>
                Inventario Inicial
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {[
                  { key: 'inv_egdc', label: 'EGDC' },
                  { key: 'inv_fami', label: 'FAMI' },
                  { key: 'inv_osiel', label: 'Bodega' },
                  { key: 'inv_osiel', label: 'Centro' },
                  { key: 'inv_molly', label: 'Norte' },
                  { key: 'inv_molly', label: 'Sur' },
                  { key: 'inv_molly', label: 'Online' }
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input
                      type="number"
                      min="0"
                      value={form[key as keyof ProductForm]?.toString() || ''}
                      onChange={(e) => handleInputChange(key as keyof ProductForm, e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Platform Availability */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">🛒</span>
                Disponibilidad en Plataformas
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { key: 'shein', label: 'SHEIN' },
                  { key: 'shopify', label: 'Shopify' },
                  { key: 'meli', label: 'MercadoLibre' },
                  { key: 'tiktok', label: 'TikTok' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form[key as keyof ProductForm] as boolean}
                      onChange={(e) => handleInputChange(key as keyof ProductForm, e.target.checked)}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setForm(initialForm)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={saving}
              >
                Limpiar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <span className="mr-2">💾</span>
                    Crear Producto
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
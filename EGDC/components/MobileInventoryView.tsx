'use client'

import { useState, useMemo } from 'react'
import { Product } from '@/lib/supabase'
import { Search, Filter, Plus, MoreVertical, Edit, Trash2, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react'
import BarcodeScannerButton from './BarcodeScannerButton'

interface MobileInventoryViewProps {
  products: Product[]
  onEdit: (product: Product) => void
  onDelete: (id: number) => void
  onAdd: () => void
  searchTerm: string
  onSearch: (term: string) => void
  showFilters: boolean
  onToggleFilters: () => void
}

export default function MobileInventoryView({
  products,
  onEdit,
  onDelete,
  onAdd,
  searchTerm,
  onSearch,
  showFilters,
  onToggleFilters
}: MobileInventoryViewProps) {
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null)
  const [showActions, setShowActions] = useState<number | null>(null)
  const [scanResult, setScanResult] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  // Handle barcode scan result
  const handleProductFound = (product: Product) => {
    setScanResult({
      type: 'success',
      message: `Producto encontrado: ${product.marca} ${product.modelo}`
    })
    
    // Auto-search for the product
    onSearch(`${product.marca} ${product.modelo}`)
    
    // Clear message after 3 seconds
    setTimeout(() => setScanResult(null), 3000)
  }

  const handleProductNotFound = (barcode: string) => {
    setScanResult({
      type: 'error',
      message: `No se encontró producto con código: ${barcode}`
    })
    
    // Clear message after 3 seconds
    setTimeout(() => setScanResult(null), 3000)
  }

  // Mobile-optimized product cards
  const renderProductCard = (product: Product) => (
    <div
      key={product.id}
      className="bg-white rounded-lg shadow-sm border border-gray-200 mb-3 p-4 active:bg-gray-50 transition-colors"
    >
      {/* Product Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {product.marca} {product.modelo}
          </h3>
          <p className="text-sm text-gray-500 truncate">
            {product.categoria} • {product.color} • {product.talla}
          </p>
        </div>
        <button
          onClick={() => setShowActions(showActions === product.id ? null : product.id)}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <MoreVertical className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Quick Info Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">SKU</p>
          <p className="text-sm font-medium text-gray-900">{product.sku}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Stock Total</p>
          <p className={`text-sm font-medium ${
            product.inventory_total < 5 ? 'text-red-600' : 
            product.inventory_total < 10 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {product.inventory_total}
          </p>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Precios</span>
          <span className="text-xs text-gray-500">Costo: ${product.costo}</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">EGDC</span>
            <span className="text-sm font-medium text-gray-900">${product.precio_shopify}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">SHEIN</span>
            <span className="text-sm font-medium text-gray-900">${product.precio_shein}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">MercadoLibre</span>
            <span className="text-sm font-medium text-gray-900">${product.precio_meli}</span>
          </div>
        </div>
      </div>

      {/* Action Menu */}
      {showActions === product.id && (
        <div className="border-t border-gray-100 pt-3 mt-3">
          <div className="flex space-x-2">
            <button
              onClick={() => {
                onEdit(product)
                setShowActions(null)
              }}
              className="flex-1 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center space-x-2"
            >
              <Edit className="h-4 w-4" />
              <span>Editar</span>
            </button>
            <button
              onClick={() => {
                onDelete(product.id)
                setShowActions(null)
              }}
              className="flex-1 bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center justify-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>Eliminar</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex-1 min-h-0">
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
          />
        </div>

        {/* Scan Result Message */}
        {scanResult && (
          <div className={`mb-3 p-3 rounded-lg border flex items-center space-x-2 ${
            scanResult.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {scanResult.type === 'success' ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{scanResult.message}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={onToggleFilters}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg border font-medium text-sm transition-colors ${
              showFilters 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
          </button>
          
          <BarcodeScannerButton
            onProductFound={handleProductFound}
            onProductNotFound={handleProductNotFound}
            size="md"
            variant="outline"
            className="flex-1"
          />
          
          <button
            onClick={onAdd}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-green-600 text-white font-medium text-sm hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar</span>
          </button>
        </div>
      </div>

      {/* Product List */}
      <div className="flex-1 overflow-y-auto p-4">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron productos
            </h3>
            <p className="text-gray-500">
              Intenta ajustar los filtros o el término de búsqueda
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map(renderProductCard)}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={onAdd}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-20"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  )
}
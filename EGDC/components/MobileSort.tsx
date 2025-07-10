'use client'

import { useState } from 'react'
import { X, Check } from 'lucide-react'

interface SortConfig {
  field: 'alphabetical' | 'price' | 'stock' | 'date' | 'category'
  direction: 'asc' | 'desc'
}

interface Filters {
  categories: Set<string>
  brands: Set<string>
  models: Set<string>
  colors: Set<string>
  sizes: Set<string>
  priceRange: { min: number; max: number }
}

interface MobileSortProps {
  sortConfig: SortConfig
  onSortChange: (config: SortConfig) => void
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  onClose: () => void
  priceRange: { min: number; max: number }
}

export default function MobileSort({
  sortConfig,
  onSortChange,
  filters,
  onFiltersChange,
  onClose,
  priceRange
}: MobileSortProps) {
  const [activeTab, setActiveTab] = useState<'sort' | 'price'>('sort')

  const sortOptions = [
    { field: 'alphabetical', direction: 'asc', label: 'A-Z (Alfabético)', icon: '🔤' },
    { field: 'alphabetical', direction: 'desc', label: 'Z-A (Alfabético)', icon: '🔤' },
    { field: 'price', direction: 'asc', label: 'Precio: Menor a Mayor', icon: '💰' },
    { field: 'price', direction: 'desc', label: 'Precio: Mayor a Menor', icon: '💰' },
    { field: 'stock', direction: 'desc', label: 'Stock: Mayor a Menor', icon: '📦' },
    { field: 'stock', direction: 'asc', label: 'Stock: Menor a Mayor', icon: '📦' },
    { field: 'date', direction: 'desc', label: 'Más Recientes', icon: '📅' },
    { field: 'date', direction: 'asc', label: 'Más Antiguos', icon: '📅' },
    { field: 'category', direction: 'asc', label: 'Categoría A-Z', icon: '📂' },
    { field: 'category', direction: 'desc', label: 'Categoría Z-A', icon: '📂' },
  ] as const

  const handleSortSelect = (field: SortConfig['field'], direction: SortConfig['direction']) => {
    onSortChange({ field, direction })
  }

  const handlePriceRangeChange = (min: number, max: number) => {
    onFiltersChange({
      ...filters,
      priceRange: { min, max }
    })
  }

  const getCurrentSortLabel = () => {
    const current = sortOptions.find(
      option => option.field === sortConfig.field && option.direction === sortConfig.direction
    )
    return current?.label || 'Alfabético A-Z'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-white w-full h-[80vh] rounded-t-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Ordenar y Filtrar</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('sort')}
            className={`flex-1 py-3 px-4 font-medium text-sm ${
              activeTab === 'sort'
                ? 'border-b-2 border-orange-500 text-orange-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🔄 Ordenar
          </button>
          <button
            onClick={() => setActiveTab('price')}
            className={`flex-1 py-3 px-4 font-medium text-sm ${
              activeTab === 'price'
                ? 'border-b-2 border-orange-500 text-orange-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            💰 Precio
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'sort' && (
            <div className="space-y-3">
              <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-800">
                  <strong>Ordenando por:</strong> {getCurrentSortLabel()}
                </p>
              </div>
              
              {sortOptions.map((option, index) => {
                const isSelected = sortConfig.field === option.field && sortConfig.direction === option.direction
                
                return (
                  <button
                    key={index}
                    onClick={() => handleSortSelect(option.field, option.direction)}
                    className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50 text-orange-800'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{option.icon}</span>
                      <span className="font-medium text-left">{option.label}</span>
                    </div>
                    {isSelected && (
                      <Check className="h-5 w-5 text-orange-600" />
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {activeTab === 'price' && (
            <div className="space-y-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Rango de Precios</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Filtra productos por rango de precio (basado en precio Shopify/costo)
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio Mínimo: ${filters.priceRange.min}
                  </label>
                  <input
                    type="range"
                    min={priceRange.min}
                    max={priceRange.max}
                    step="50"
                    value={filters.priceRange.min}
                    onChange={(e) => handlePriceRangeChange(parseInt(e.target.value), filters.priceRange.max)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio Máximo: ${filters.priceRange.max}
                  </label>
                  <input
                    type="range"
                    min={priceRange.min}
                    max={priceRange.max}
                    step="50"
                    value={filters.priceRange.max}
                    onChange={(e) => handlePriceRangeChange(filters.priceRange.min, parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mínimo
                    </label>
                    <input
                      type="number"
                      value={filters.priceRange.min}
                      onChange={(e) => handlePriceRangeChange(parseInt(e.target.value) || 0, filters.priceRange.max)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Máximo
                    </label>
                    <input
                      type="number"
                      value={filters.priceRange.max}
                      onChange={(e) => handlePriceRangeChange(filters.priceRange.min, parseInt(e.target.value) || 10000)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="10000"
                    />
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Productos en rango:</strong> ${filters.priceRange.min} - ${filters.priceRange.max}
                  </p>
                </div>

                <button
                  onClick={() => handlePriceRangeChange(priceRange.min, priceRange.max)}
                  className="w-full py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Restablecer Rango
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  )
}
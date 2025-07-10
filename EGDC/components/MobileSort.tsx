'use client'

import { useState } from 'react'
import { X, Check } from 'lucide-react'

interface SortConfig {
  field: 'alphabetical' | 'price' | 'stock' | 'date'
  direction: 'asc' | 'desc'
  priceFields?: ('precio_shein' | 'precio_shopify' | 'precio_meli' | 'costo')[]
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
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY)
    setCurrentY(e.touches[0].clientY)
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    setCurrentY(e.touches[0].clientY)
  }

  const handleTouchEnd = () => {
    if (!isDragging) return
    const deltaY = currentY - startY
    
    // If swiped down more than 100px, close the modal
    if (deltaY > 100) {
      onClose()
    }
    
    setIsDragging(false)
    setStartY(0)
    setCurrentY(0)
  }

  const sortOptions = [
    { field: 'alphabetical', direction: 'asc', label: 'A-Z (Alfabético)', icon: '🔤' },
    { field: 'alphabetical', direction: 'desc', label: 'Z-A (Alfabético)', icon: '🔤' },
    { field: 'price', direction: 'asc', label: 'Precio: Menor a Mayor', icon: '💰' },
    { field: 'price', direction: 'desc', label: 'Precio: Mayor a Menor', icon: '💰' },
    { field: 'stock', direction: 'desc', label: 'Stock: Mayor a Menor', icon: '📦' },
    { field: 'stock', direction: 'asc', label: 'Stock: Menor a Mayor', icon: '📦' },
    { field: 'date', direction: 'desc', label: 'Más Recientes', icon: '📅' },
    { field: 'date', direction: 'asc', label: 'Más Antiguos', icon: '📅' },
  ] as const

  const handleSortSelect = (field: SortConfig['field'], direction: SortConfig['direction']) => {
    onSortChange({ 
      field, 
      direction,
      priceFields: field === 'price' ? (sortConfig.priceFields || ['precio_shopify']) : undefined
    })
  }

  const handlePriceFieldToggle = (priceField: 'precio_shein' | 'precio_shopify' | 'precio_meli' | 'costo') => {
    const currentFields = sortConfig.priceFields || ['precio_shopify']
    const newFields = currentFields.includes(priceField)
      ? currentFields.filter(f => f !== priceField)
      : [...currentFields, priceField]
    
    // Ensure at least one field is selected
    if (newFields.length === 0) {
      return
    }
    
    onSortChange({
      ...sortConfig,
      priceFields: newFields
    })
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
    let label = current?.label || 'Alfabético A-Z'
    if (sortConfig.field === 'price' && sortConfig.priceFields && sortConfig.priceFields.length > 0) {
      const priceLabels = {
        precio_shein: 'SHEIN',
        precio_shopify: 'Shopify',
        precio_meli: 'MeLi',
        costo: 'Costo'
      }
      const selectedLabels = sortConfig.priceFields.map(field => priceLabels[field]).join(', ')
      label += ` (${selectedLabels})`
    }
    return label
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div 
        className="bg-white w-full h-[80vh] rounded-t-xl flex flex-col"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: isDragging && currentY > startY ? `translateY(${Math.min(currentY - startY, 200)}px)` : 'translateY(0)',
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        {/* Swipe Indicator */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-8 h-1 bg-gray-300 rounded-full"></div>
        </div>

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
              
              <div className="grid grid-cols-2 gap-2">
                {sortOptions.map((option, index) => {
                  const isSelected = sortConfig.field === option.field && sortConfig.direction === option.direction
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleSortSelect(option.field, option.direction)}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50 text-orange-800'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-lg mb-1">{option.icon}</span>
                      <span className="font-medium text-xs text-center leading-tight">{option.label}</span>
                      {isSelected && (
                        <Check className="h-3 w-3 text-orange-600 mt-1" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === 'price' && (
            <div className="space-y-4">
              {/* Price Field Selection */}
              <div className="mb-6">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { field: 'precio_shein', label: 'SHEIN', icon: '🟠' },
                    { field: 'precio_shopify', label: 'Shopify', icon: '🟢' },
                    { field: 'precio_meli', label: 'MeLi', icon: '🟡' },
                    { field: 'costo', label: 'Costo', icon: '💰' },
                  ].map((priceOption) => {
                    const isSelected = (sortConfig.priceFields || ['precio_shopify']).includes(priceOption.field as any)
                    return (
                      <button
                        key={priceOption.field}
                        onClick={() => handlePriceFieldToggle(priceOption.field as any)}
                        className={`flex items-center justify-center space-x-2 p-3 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50 text-orange-800'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-lg">{priceOption.icon}</span>
                        <span className="font-medium text-sm">{priceOption.label}</span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-orange-600" />
                        )}
                      </button>
                    )
                  })}
                </div>
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
                  Reset
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
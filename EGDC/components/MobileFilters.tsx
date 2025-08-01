'use client'

import { useState } from 'react'
import { X, ChevronDown, ChevronUp } from 'lucide-react'

interface Filters {
  categories: Set<string>
  brands: Set<string>
  models: Set<string>
  colors: Set<string>
  sizes: Set<string>
  priceRange: { min: number; max: number }
}

interface MobileFiltersProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  uniqueValues: {
    categories: Set<string>
    brands: Set<string>
    models: Set<string>
    colors: Set<string>
    sizes: Set<string>
  }
  onClose: () => void
}

export default function MobileFilters({
  filters,
  onFiltersChange,
  uniqueValues,
  onClose
}: MobileFiltersProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['categories', 'brands'])
  )
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
    const newY = e.touches[0].clientY
    setCurrentY(newY)
    
    // Only allow downward swipes to prevent interference
    const deltaY = newY - startY
    if (deltaY > 0) {
      e.preventDefault()
    }
  }

  const handleTouchEnd = () => {
    if (!isDragging) return
    const deltaY = currentY - startY
    
    // If swiped down more than 80px, close the modal
    if (deltaY > 80) {
      onClose()
    }
    
    setIsDragging(false)
    setStartY(0)
    setCurrentY(0)
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const handleFilterChange = (filterType: keyof Filters, value: string, checked: boolean) => {
    const newFilters = { ...filters }
    if (filterType !== 'priceRange') {
      if (checked) {
        (newFilters[filterType] as Set<string>).add(value)
      } else {
        (newFilters[filterType] as Set<string>).delete(value)
      }
    }
    onFiltersChange(newFilters)
  }

  const clearAllFilters = () => {
    onFiltersChange({
      categories: new Set(),
      brands: new Set(),
      models: new Set(),
      colors: new Set(),
      sizes: new Set(),
      priceRange: filters.priceRange
    })
  }

  const getActiveFiltersCount = () => {
    return filters.categories.size + filters.brands.size + filters.models.size + filters.colors.size + filters.sizes.size
  }

  const renderFilterSection = (
    title: string,
    filterType: keyof Filters,
    values: Set<string>,
    icon?: React.ReactNode
  ) => {
    const isExpanded = expandedSections.has(filterType)
    const activeCount = filterType === 'priceRange' ? 0 : (filters[filterType] as Set<string>).size

    return (
      <div className="border-b border-gray-200">
        <button
          onClick={() => toggleSection(filterType)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            {icon}
            <span className="font-medium text-gray-900">{title}</span>
            {activeCount > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {activeCount}
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>

        {isExpanded && (
          <div className="px-4 pb-4">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {Array.from(values).map((value) => (
                <label
                  key={value}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filterType === 'priceRange' ? false : (filters[filterType] as Set<string>).has(value)}
                    onChange={(e) => handleFilterChange(filterType, value, e.target.checked)}
                    className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 flex-1">{value}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
      onClick={(e) => {
        // Close if clicking the backdrop (outside the modal)
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        className="bg-white w-full max-h-[80vh] rounded-t-xl overflow-hidden"
        style={{
          transform: isDragging && currentY > startY ? `translateY(${Math.min(currentY - startY, 200)}px)` : 'translateY(0)',
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        {/* Swipe Indicator + Header - Draggable Area */}
        <div 
          className="cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Swipe Indicator */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-gray-400 rounded-full"></div>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
              {getActiveFiltersCount() > 0 && (
                <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
                  {getActiveFiltersCount()} activos
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Filter Sections */}
        <div className="flex-1 overflow-y-auto">
          {renderFilterSection(
            'Categorías',
            'categories',
            uniqueValues.categories,
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
          )}
          {renderFilterSection(
            'Marcas',
            'brands',
            uniqueValues.brands,
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
          )}
          {renderFilterSection(
            'Modelos',
            'models',
            uniqueValues.models,
            <div className="w-4 h-4 bg-green-500 rounded"></div>
          )}
          {renderFilterSection(
            'Colores',
            'colors',
            uniqueValues.colors,
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          )}
          {renderFilterSection(
            'Tallas',
            'sizes',
            uniqueValues.sizes,
            <div className="w-4 h-4 bg-pink-500 rounded"></div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex space-x-3">
            <button
              onClick={clearAllFilters}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
            >
              Limpiar Todo
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
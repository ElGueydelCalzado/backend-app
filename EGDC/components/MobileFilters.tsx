'use client'

import { useState } from 'react'
import { X, ChevronDown, ChevronUp } from 'lucide-react'

interface Filters {
  categories: Set<string>
  brands: Set<string>
  models: Set<string>
  colors: Set<string>
  sizes: Set<string>
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
    if (checked) {
      newFilters[filterType].add(value)
    } else {
      newFilters[filterType].delete(value)
    }
    onFiltersChange(newFilters)
  }

  const clearAllFilters = () => {
    onFiltersChange({
      categories: new Set(),
      brands: new Set(),
      models: new Set(),
      colors: new Set(),
      sizes: new Set()
    })
  }

  const getActiveFiltersCount = () => {
    return Object.values(filters).reduce((count, filterSet) => count + filterSet.size, 0)
  }

  const renderFilterSection = (
    title: string,
    filterType: keyof Filters,
    values: Set<string>,
    icon?: React.ReactNode
  ) => {
    const isExpanded = expandedSections.has(filterType)
    const activeCount = filters[filterType].size

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
                    checked={filters[filterType].has(value)}
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-white w-full max-h-[80vh] rounded-t-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
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
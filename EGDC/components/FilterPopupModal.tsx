'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { X, RotateCcw, ChevronDown } from 'lucide-react'
import { Product } from '@/lib/types'
import ColumnControls, { ColumnConfig } from './ColumnControls'

interface Filters {
  categories: Set<string>
  brands: Set<string>
  models: Set<string>
  colors: Set<string>
  sizes: Set<string>
}

interface SortConfig {
  field: 'alphabetical' | 'price' | 'stock' | 'date'
  direction: 'asc' | 'desc'
  priceFields?: ('precio_shein' | 'precio_shopify' | 'precio_meli' | 'costo')[]
}

interface UniqueValues {
  categories: Set<string>
  brands: Set<string>
  models: Set<string>
  colors: Set<string>
  sizes: Set<string>
}

interface FilterPopupModalProps {
  isOpen: boolean
  onClose: () => void
  filters: Filters
  uniqueValues: UniqueValues
  allData: Product[]
  onFilterChange: (filterType: keyof Filters, value: string, checked: boolean) => void
  onClearFilters: () => void
  
  // Column props
  columnConfig: ColumnConfig[]
  onColumnToggle: (key: string, visible: boolean) => void
  onPresetSelect: (preset: string) => void
  
  // Sort props
  sortConfig?: SortConfig
  onSortChange?: (config: SortConfig) => void
}

type FilterTab = 'filtros' | 'columnas' | 'ordenar'

const FILTER_TABS = [
  { id: 'filtros' as FilterTab, label: 'FILTROS', icon: '⚗️' },
  { id: 'columnas' as FilterTab, label: 'COLUMNAS', icon: '📊' },
  { id: 'ordenar' as FilterTab, label: 'ORDENAR', icon: '🔄' }
]

interface CompactDropdownProps {
  label: string
  icon: string
  options: string[]
  selectedValues: Set<string>
  onSelectionChange: (value: string, checked: boolean) => void
  disabled?: boolean
}

function CompactDropdown({ 
  label, 
  icon, 
  options, 
  selectedValues, 
  onSelectionChange, 
  disabled = false 
}: CompactDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const selectedCount = selectedValues.size
  const hasSelection = selectedCount > 0

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || options.length === 0}
        className={`
          w-full px-3 py-2 text-left text-sm border rounded-lg transition-colors
          flex items-center justify-between
          ${disabled || options.length === 0
            ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
            : hasSelection
              ? 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100'
              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
          }
        `}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span>{icon}</span>
          <span className="truncate">{label}</span>
          {hasSelection && (
            <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-orange-200 text-orange-800 rounded-full flex-shrink-0">
              {selectedCount}
            </span>
          )}
        </div>
        <ChevronDown 
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              No {label.toLowerCase()} disponibles
            </div>
          ) : (
            <div className="py-1">
              {options.map((option) => (
                <label
                  key={option}
                  className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedValues.has(option)}
                    onChange={(e) => onSelectionChange(option, e.target.checked)}
                    className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2 mr-3"
                  />
                  <span className="text-sm text-gray-700 truncate">{option}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function FilterPopupModal({
  isOpen,
  onClose,
  filters,
  uniqueValues,
  allData,
  onFilterChange,
  onClearFilters,
  columnConfig,
  onColumnToggle,
  onPresetSelect,
  sortConfig,
  onSortChange
}: FilterPopupModalProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('filtros')

  if (!isOpen) return null

  // Simple calculations without complex memoization to avoid React errors
  const getAvailableBrands = () => {
    if (filters.categories.size === 0) return Array.from(uniqueValues.brands).sort()
    
    const brands = new Set<string>()
    allData.forEach(item => {
      if (item.categoria && filters.categories.has(item.categoria) && item.marca) {
        brands.add(item.marca)
      }
    })
    return Array.from(brands).sort()
  }

  const getAvailableModels = () => {
    if (filters.categories.size === 0 && filters.brands.size === 0) {
      return Array.from(uniqueValues.models).sort()
    }
    
    const models = new Set<string>()
    allData.forEach(item => {
      const categoryMatch = filters.categories.size === 0 || (item.categoria && filters.categories.has(item.categoria))
      const brandMatch = filters.brands.size === 0 || (item.marca && filters.brands.has(item.marca))
      
      if (categoryMatch && brandMatch && item.modelo) {
        models.add(item.modelo)
      }
    })
    return Array.from(models).sort()
  }

  const getAvailableColors = () => {
    if (filters.categories.size === 0 && filters.brands.size === 0 && filters.models.size === 0) {
      return Array.from(uniqueValues.colors).sort()
    }
    
    const colors = new Set<string>()
    allData.forEach(item => {
      const categoryMatch = filters.categories.size === 0 || (item.categoria && filters.categories.has(item.categoria))
      const brandMatch = filters.brands.size === 0 || (item.marca && filters.brands.has(item.marca))
      const modelMatch = filters.models.size === 0 || (item.modelo && filters.models.has(item.modelo))
      
      if (categoryMatch && brandMatch && modelMatch && item.color) {
        colors.add(item.color)
      }
    })
    return Array.from(colors).sort()
  }

  const getAvailableSizes = () => {
    if (filters.categories.size === 0 && filters.brands.size === 0 && filters.models.size === 0 && filters.colors.size === 0) {
      return Array.from(uniqueValues.sizes).sort()
    }
    
    const sizes = new Set<string>()
    allData.forEach(item => {
      const categoryMatch = filters.categories.size === 0 || (item.categoria && filters.categories.has(item.categoria))
      const brandMatch = filters.brands.size === 0 || (item.marca && filters.brands.has(item.marca))
      const modelMatch = filters.models.size === 0 || (item.modelo && filters.models.has(item.modelo))
      const colorMatch = filters.colors.size === 0 || (item.color && filters.colors.has(item.color))
      
      if (categoryMatch && brandMatch && modelMatch && colorMatch && item.talla) {
        sizes.add(item.talla)
      }
    })
    return Array.from(sizes).sort()
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'filtros':
        return (
          <div className="space-y-4">
            <CompactDropdown
              label="Categorías"
              icon="📂"
              options={Array.from(uniqueValues.categories).sort()}
              selectedValues={filters.categories}
              onSelectionChange={(value, checked) => onFilterChange('categories', value, checked)}
            />
            <CompactDropdown
              label="Marcas"
              icon="🏷️"
              options={getAvailableBrands()}
              selectedValues={filters.brands}
              onSelectionChange={(value, checked) => onFilterChange('brands', value, checked)}
              disabled={filters.categories.size === 0}
            />
            <CompactDropdown
              label="Modelos"
              icon="📦"
              options={getAvailableModels()}
              selectedValues={filters.models}
              onSelectionChange={(value, checked) => onFilterChange('models', value, checked)}
              disabled={filters.categories.size === 0 && filters.brands.size === 0}
            />
            <CompactDropdown
              label="Colores"
              icon="🎨"
              options={getAvailableColors()}
              selectedValues={filters.colors}
              onSelectionChange={(value, checked) => onFilterChange('colors', value, checked)}
              disabled={filters.categories.size === 0 && filters.brands.size === 0 && filters.models.size === 0}
            />
            <CompactDropdown
              label="Tallas"
              icon="📏"
              options={getAvailableSizes()}
              selectedValues={filters.sizes}
              onSelectionChange={(value, checked) => onFilterChange('sizes', value, checked)}
              disabled={filters.categories.size === 0 && filters.brands.size === 0 && filters.models.size === 0 && filters.colors.size === 0}
            />
          </div>
        )
      case 'columnas':
        return (
          <div className="h-full">
            <ColumnControls
              columns={columnConfig}
              onColumnToggle={onColumnToggle}
              onPresetSelect={onPresetSelect}
              compact={false}
            />
          </div>
        )
      case 'ordenar':
        return sortConfig && onSortChange ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <span className="mr-2">🔄</span>
                Ordenar
              </h3>
            </div>
            
            <div className="space-y-3">
              <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-800">
                  <strong>Ordenando por:</strong> {(() => {
                    const sortOptions = [
                      { field: 'alphabetical', direction: 'asc', label: 'A-Z (Alfabético)' },
                      { field: 'alphabetical', direction: 'desc', label: 'Z-A (Alfabético)' },
                      { field: 'price', direction: 'asc', label: 'Precio: Menor a Mayor' },
                      { field: 'price', direction: 'desc', label: 'Precio: Mayor a Menor' },
                      { field: 'stock', direction: 'desc', label: 'Stock: Mayor a Menor' },
                      { field: 'stock', direction: 'asc', label: 'Stock: Menor a Mayor' },
                      { field: 'date', direction: 'desc', label: 'Más Recientes' },
                      { field: 'date', direction: 'asc', label: 'Más Antiguos' },
                    ]
                    const current = sortOptions.find(
                      option => option.field === sortConfig.field && option.direction === sortConfig.direction
                    )
                    return current?.label || 'Personalizado'
                  })()}
                </p>
              </div>
              
              {/* Sort Options */}
              <div className="space-y-2">
                {[
                  { field: 'alphabetical', direction: 'asc', label: 'A-Z (Alfabético)', icon: '🔤' },
                  { field: 'alphabetical', direction: 'desc', label: 'Z-A (Alfabético)', icon: '🔤' },
                  { field: 'price', direction: 'asc', label: 'Precio: Menor a Mayor', icon: '💰' },
                  { field: 'price', direction: 'desc', label: 'Precio: Mayor a Menor', icon: '💰' },
                  { field: 'stock', direction: 'desc', label: 'Stock: Mayor a Menor', icon: '📦' },
                  { field: 'stock', direction: 'asc', label: 'Stock: Menor a Mayor', icon: '📦' },
                  { field: 'date', direction: 'desc', label: 'Más Recientes', icon: '📅' },
                  { field: 'date', direction: 'asc', label: 'Más Antiguos', icon: '📅' },
                ].map((option) => (
                  <button
                    key={`${option.field}-${option.direction}`}
                    onClick={() => onSortChange({
                      field: option.field as SortConfig['field'],
                      direction: option.direction as SortConfig['direction'],
                      priceFields: sortConfig.priceFields
                    })}
                    className={`
                      w-full px-3 py-2 text-left text-sm border rounded-lg transition-colors
                      flex items-center gap-3
                      ${sortConfig.field === option.field && sortConfig.direction === option.direction
                        ? 'bg-orange-50 text-orange-800 border-orange-200'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                      }
                    `}
                  >
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Sort functionality not available</p>
          </div>
        )
      default:
        return null
    }
  }

  const getTotalActiveFilters = () => {
    try {
      return Object.values(filters).reduce((total, filterSet) => {
        if (filterSet && typeof filterSet.size === 'number') {
          return total + filterSet.size
        }
        return total
      }, 0)
    } catch (error) {
      console.warn('Error calculating active filters:', error)
      return 0
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <div className="flex items-center gap-2">
              {getTotalActiveFilters() > 0 && (
                <button
                  onClick={onClearFilters}
                  className="flex items-center gap-1 px-3 py-1 text-sm text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  Clear All
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-3 px-2 text-sm font-medium
                  transition-colors duration-200 border-b-2 border-transparent
                  ${activeTab === tab.id
                    ? 'text-orange-600 border-orange-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <span className="text-xs">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.id === 'filtros' && getTotalActiveFilters() > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-orange-100 text-orange-700 rounded-full">
                    {getTotalActiveFilters()}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-4 overflow-hidden">
            <div className="h-full">
              {renderTabContent()}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {getTotalActiveFilters()} filter{getTotalActiveFilters() !== 1 ? 's' : ''} active
              </span>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
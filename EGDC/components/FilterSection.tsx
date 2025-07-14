'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Product } from '@/lib/types'

interface Filters {
  categories: Set<string>
  brands: Set<string>
  models: Set<string>
  colors: Set<string>
  sizes: Set<string>
}

interface UniqueValues {
  categories: Set<string>
  brands: Set<string>
  models: Set<string>
  colors: Set<string>
  sizes: Set<string>
}

interface FilterSectionProps {
  filters: Filters
  uniqueValues: UniqueValues
  allData: Product[]
  onFilterChange: (filterType: keyof Filters, value: string, checked: boolean) => void
  compact?: boolean
}

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
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const clearAll = () => {
    selectedValues.forEach(value => {
      onSelectionChange(value, false)
    })
  }

  return (
    <div className="flex items-center gap-4 py-3">
      {/* Label */}
      <div className="flex items-center min-w-[120px]">
        <span className="text-base mr-2">{icon}</span>
        <span className="text-sm font-medium text-gray-700">{label.toUpperCase()}</span>
      </div>
      
      {/* Dropdown */}
      <div className="relative flex-1 max-w-xs" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
            disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'hover:border-gray-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-sm truncate ${selectedValues.size > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
              {selectedValues.size > 0 
                ? `${selectedValues.size} seleccionado${selectedValues.size > 1 ? 's' : ''}`
                : disabled ? 'No disponible' : 'Seleccionar...'
              }
            </span>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {isOpen && !disabled && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-auto">
            {selectedValues.size > 0 && (
              <div className="p-2 border-b border-gray-200">
                <button
                  onClick={clearAll}
                  className="w-full px-2 py-1 text-xs text-left text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  ✕ Limpiar selección
                </button>
              </div>
            )}
            
            <div className="p-1">
              {options.length > 0 ? (
                options.map(option => (
                  <label key={option} className="flex items-center justify-between px-2 py-1.5 hover:bg-blue-50 rounded cursor-pointer transition-colors">
                    <span className="text-sm text-gray-900 truncate flex-1 mr-2" title={option}>{option}</span>
                    <input
                      type="checkbox"
                      checked={selectedValues.has(option)}
                      onChange={(e) => onSelectionChange(option, e.target.checked)}
                      className="h-3 w-4 text-blue-600 focus:ring-1 focus:ring-blue-500 border-gray-300 rounded-sm ml-2"
                    />
                  </label>
                ))
              ) : (
                <div className="p-2 text-center text-gray-500 text-xs">
                  No hay opciones disponibles
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function FilterSection({ 
  filters, 
  uniqueValues, 
  allData, 
  onFilterChange,
  compact = false
}: FilterSectionProps) {

  // PERFORMANCE OPTIMIZATION: Memoize expensive filter calculations
  
  // Create filter keys for memoization dependencies
  const filterKeys = useMemo(() => ({
    categoriesArray: Array.from(filters.categories).sort(),
    brandsArray: Array.from(filters.brands).sort(),
    modelsArray: Array.from(filters.models).sort(),
    colorsArray: Array.from(filters.colors).sort(),
    sizesArray: Array.from(filters.sizes).sort()
  }), [filters])

  // Memoized available brands calculation
  const availableBrands = useMemo(() => {
    if (filterKeys.categoriesArray.length === 0) return []
    
    const brands = new Set<string>()
    allData.forEach(item => {
      if (item.categoria && filters.categories.has(item.categoria) && item.marca) {
        brands.add(item.marca)
      }
    })
    return Array.from(brands).sort()
  }, [allData, filterKeys.categoriesArray, filters.categories])

  // Memoized available models calculation
  const availableModels = useMemo(() => {
    if (filterKeys.categoriesArray.length === 0 && filterKeys.brandsArray.length === 0) return []
    
    const models = new Set<string>()
    allData.forEach(item => {
      const categoryMatch = filters.categories.size === 0 || (item.categoria && filters.categories.has(item.categoria))
      const brandMatch = filters.brands.size === 0 || (item.marca && filters.brands.has(item.marca))
      
      if (categoryMatch && brandMatch && item.modelo) {
        models.add(item.modelo)
      }
    })
    return Array.from(models).sort()
  }, [allData, filterKeys.categoriesArray, filterKeys.brandsArray, filters.categories, filters.brands])

  // Memoized available colors calculation
  const availableColors = useMemo(() => {
    if (filterKeys.categoriesArray.length === 0 && filterKeys.brandsArray.length === 0 && filterKeys.modelsArray.length === 0) return []
    
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
  }, [allData, filterKeys.categoriesArray, filterKeys.brandsArray, filterKeys.modelsArray, filters.categories, filters.brands, filters.models])

  // Memoized available sizes calculation
  const availableSizes = useMemo(() => {
    if (filterKeys.categoriesArray.length === 0 && filterKeys.brandsArray.length === 0 && filterKeys.modelsArray.length === 0 && filterKeys.colorsArray.length === 0) return []
    
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
  }, [allData, filterKeys.categoriesArray, filterKeys.brandsArray, filterKeys.modelsArray, filterKeys.colorsArray, filters.categories, filters.brands, filters.models, filters.colors])

  const clearAllFilters = () => {
    // Clear each filter properly using the onFilterChange callback
    // This ensures React state is updated correctly without direct mutation
    filters.categories.forEach(cat => onFilterChange('categories', cat, false))
    filters.brands.forEach(brand => onFilterChange('brands', brand, false))
    filters.models.forEach(model => onFilterChange('models', model, false))
    filters.colors.forEach(color => onFilterChange('colors', color, false))
    filters.sizes.forEach(size => onFilterChange('sizes', size, false))
  }

  const totalFilters = filters.categories.size + filters.brands.size + filters.models.size + filters.colors.size + filters.sizes.size

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 flex items-center">
            <span className="mr-2">🔍</span>
            Filtros
          </h3>
          {totalFilters > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {totalFilters}
              </span>
              <button
                onClick={clearAllFilters}
                className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
              >
                ✕
              </button>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
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
            options={availableBrands}
            selectedValues={filters.brands}
            onSelectionChange={(value, checked) => onFilterChange('brands', value, checked)}
            disabled={filters.categories.size === 0}
          />
          <CompactDropdown
            label="Modelos"
            icon="👟"
            options={availableModels}
            selectedValues={filters.models}
            onSelectionChange={(value, checked) => onFilterChange('models', value, checked)}
            disabled={filters.categories.size === 0 && filters.brands.size === 0}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200/50 mb-6 backdrop-blur-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-100/60 via-white to-indigo-100/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <span className="text-xl mr-3 drop-shadow-sm">🔍</span>
              Filtros de Búsqueda
            </h3>
            <p className="text-sm text-gray-700 mt-1 font-medium">
              Selecciona filtros jerárquicos para encontrar productos específicos
            </p>
          </div>
          
          {totalFilters > 0 && (
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                {totalFilters} filtros activos
              </span>
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors"
              >
                ✕ Limpiar todo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter Dropdowns */}
      <div className="p-6">
        <div className="space-y-1">
          
          {/* Categories */}
          <CompactDropdown
            label="Categorías"
            icon="📂"
            options={Array.from(uniqueValues.categories).sort()}
            selectedValues={filters.categories}
            onSelectionChange={(value, checked) => onFilterChange('categories', value, checked)}
          />

          {/* Brands */}
          <CompactDropdown
            label="Marcas"
            icon="🏷️"
            options={availableBrands}
            selectedValues={filters.brands}
            onSelectionChange={(value, checked) => onFilterChange('brands', value, checked)}
            disabled={filters.categories.size === 0}
          />

          {/* Models */}
          <CompactDropdown
            label="Modelos"
            icon="👟"
            options={availableModels}
            selectedValues={filters.models}
            onSelectionChange={(value, checked) => onFilterChange('models', value, checked)}
            disabled={filters.categories.size === 0 && filters.brands.size === 0}
          />

          {/* Colors */}
          <CompactDropdown
            label="Colores"
            icon="🎨"
            options={availableColors}
            selectedValues={filters.colors}
            onSelectionChange={(value, checked) => onFilterChange('colors', value, checked)}
            disabled={filters.categories.size === 0 && filters.brands.size === 0 && filters.models.size === 0}
          />

          {/* Sizes */}
          <CompactDropdown
            label="Tallas"
            icon="📐"
            options={availableSizes}
            selectedValues={filters.sizes}
            onSelectionChange={(value, checked) => onFilterChange('sizes', value, checked)}
            disabled={filters.categories.size === 0 && filters.brands.size === 0 && filters.models.size === 0 && filters.colors.size === 0}
          />

        </div>

        {/* Usage Guide */}
        {totalFilters === 0 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <div className="flex items-start">
              <span className="text-xl mr-3">💡</span>
              <div>
                <h4 className="text-sm font-semibold text-blue-800 mb-2">Cómo usar los filtros:</h4>
                <p className="text-sm text-blue-700">
                  Los filtros son jerárquicos: <strong>Categorías</strong> → <strong>Marcas</strong> → <strong>Modelos</strong> → <strong>Colores</strong> → <strong>Tallas</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Active Filter Tags */}
        {totalFilters > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Filtros activos:</h4>
            <div className="flex flex-wrap gap-2">
              {Array.from(filters.categories).map(cat => (
                <span key={`cat-${cat}`} className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800 font-medium">
                  📂 {cat}
                  <button onClick={() => onFilterChange('categories', cat, false)} className="ml-2 text-blue-600 hover:text-blue-800">×</button>
                </span>
              ))}
              {Array.from(filters.brands).map(brand => (
                <span key={`brand-${brand}`} className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-green-100 text-green-800 font-medium">
                  🏷️ {brand}
                  <button onClick={() => onFilterChange('brands', brand, false)} className="ml-2 text-green-600 hover:text-green-800">×</button>
                </span>
              ))}
              {Array.from(filters.models).map(model => (
                <span key={`model-${model}`} className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-purple-100 text-purple-800 font-medium">
                  👟 {model}
                  <button onClick={() => onFilterChange('models', model, false)} className="ml-2 text-purple-600 hover:text-purple-800">×</button>
                </span>
              ))}
              {Array.from(filters.colors).map(color => (
                <span key={`color-${color}`} className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-orange-100 text-orange-800 font-medium">
                  🎨 {color}
                  <button onClick={() => onFilterChange('colors', color, false)} className="ml-2 text-orange-600 hover:text-orange-800">×</button>
                </span>
              ))}
              {Array.from(filters.sizes).map(size => (
                <span key={`size-${size}`} className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 font-medium">
                  📐 {size}
                  <button onClick={() => onFilterChange('sizes', size, false)} className="ml-2 text-yellow-600 hover:text-yellow-800">×</button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
import { useState } from 'react'
import { Product } from '@/lib/types'

interface Filters {
  categories: Set<string>
  brands: Set<string>
  models: Set<string>
}

interface UniqueValues {
  categories: Set<string>
  brands: Set<string>
  models: Set<string>
}

interface SearchAndFiltersProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  filters: Filters
  uniqueValues: UniqueValues
  allData: Product[]
  onFilterChange: (filterType: keyof Filters, value: string, checked: boolean) => void
  onClearFilters: () => void
}

export default function SearchAndFilters({
  searchTerm,
  onSearchChange,
  filters,
  uniqueValues,
  allData,
  onFilterChange,
  onClearFilters
}: SearchAndFiltersProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Calculate available brands based on selected categories
  const getAvailableBrands = () => {
    const hasCategoryFilter = filters.categories.size > 0
    const availableBrands = new Set<string>()
    
    allData.forEach(item => {
      if (!hasCategoryFilter || (item.categoria && filters.categories.has(item.categoria))) {
        if (item.marca) availableBrands.add(item.marca)
      }
    })
    
    return Array.from(availableBrands).sort()
  }

  // Calculate available models based on selected categories and brands
  const getAvailableModels = () => {
    const hasCategoryFilter = filters.categories.size > 0
    const hasBrandFilter = filters.brands.size > 0
    const availableModels = new Set<string>()
    
    allData.forEach(item => {
      const categoryMatch = !hasCategoryFilter || (item.categoria && filters.categories.has(item.categoria))
      const brandMatch = !hasBrandFilter || (item.marca && filters.brands.has(item.marca))
      
      if (categoryMatch && brandMatch) {
        if (item.modelo) availableModels.add(item.modelo)
      }
    })
    
    return Array.from(availableModels).sort()
  }

  const hasActiveFilters = filters.categories.size > 0 || filters.brands.size > 0 || filters.models.size > 0

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-200 p-3 sm:p-4 mb-6">
      {/* Search Bar */}
      <div className="mb-3 sm:mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          <svg className="inline-block w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Search Products
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by name, brand, model, SKU..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="block w-full pl-12 pr-12 py-3 text-base border-2 border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:placeholder-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
          />
          {searchTerm && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
              <button
                onClick={() => onSearchChange('')}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Filter Tags */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
          <span className="text-sm font-semibold text-gray-700">🏷️ Quick Filters:</span>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
          >
            {showAdvancedFilters ? (
              <>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                Hide Advanced
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Show Advanced
              </>
            )}
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {/* Category Quick Filters */}
          {Array.from(uniqueValues.categories).sort().map(category => (
            <button
              key={category}
              onClick={() => onFilterChange('categories', category, !filters.categories.has(category))}
              className={`px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-all transform hover:scale-105 ${
                filters.categories.has(category)
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md border-2 border-blue-400'
                  : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 shadow-sm'
              }`}
            >
              {category}
            </button>
          ))}
          
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="px-3 sm:px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-md border-2 border-red-400 transition-all transform hover:scale-105"
            >
              ✖ Clear All
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="border-t border-gray-200 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Categories */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📂 Categories ({filters.categories.size} selected)
              </label>
              <div className="max-h-32 overflow-y-auto bg-gray-50 border border-gray-200 rounded-lg p-2 space-y-1">
                {Array.from(uniqueValues.categories).sort().map(category => (
                  <label key={category} className="flex items-center text-sm cursor-pointer hover:bg-gray-100 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={filters.categories.has(category)}
                      onChange={(e) => onFilterChange('categories', category, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                    />
                    <span className="text-gray-900">{category}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Brands */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🏷️ Brands ({filters.brands.size} selected)
              </label>
              <div className="max-h-32 overflow-y-auto bg-gray-50 border border-gray-200 rounded-lg p-2 space-y-1">
                {getAvailableBrands().map(brand => (
                  <label key={brand} className="flex items-center text-sm cursor-pointer hover:bg-gray-100 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={filters.brands.has(brand)}
                      onChange={(e) => onFilterChange('brands', brand, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                    />
                    <span className="text-gray-900">{brand}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Models */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                👟 Models ({filters.models.size} selected)
              </label>
              <div className="max-h-32 overflow-y-auto bg-gray-50 border border-gray-200 rounded-lg p-2 space-y-1">
                {getAvailableModels().map(model => (
                  <label key={model} className="flex items-center text-sm cursor-pointer hover:bg-gray-100 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={filters.models.has(model)}
                      onChange={(e) => onFilterChange('models', model, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                    />
                    <span className="text-gray-900">{model}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-gray-700">Active Filters:</span>
            <div className="flex flex-wrap gap-1">
              {Array.from(filters.categories).map(category => (
                <span key={`cat-${category}`} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  📂 {category}
                  <button
                    onClick={() => onFilterChange('categories', category, false)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
              {Array.from(filters.brands).map(brand => (
                <span key={`brand-${brand}`} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                  🏷️ {brand}
                  <button
                    onClick={() => onFilterChange('brands', brand, false)}
                    className="ml-1 text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              ))}
              {Array.from(filters.models).map(model => (
                <span key={`model-${model}`} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                  👟 {model}
                  <button
                    onClick={() => onFilterChange('models', model, false)}
                    className="ml-1 text-purple-600 hover:text-purple-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
'use client'

import { useState } from 'react'
import { X, RotateCcw } from 'lucide-react'
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

interface FilterPopupModalProps {
  isOpen: boolean
  onClose: () => void
  filters: Filters
  uniqueValues: UniqueValues
  allData: Product[]
  onFilterChange: (filterType: keyof Filters, value: string, checked: boolean) => void
  onClearFilters: () => void
}

type FilterTab = 'categories' | 'brands' | 'models' | 'colors' | 'sizes'

const FILTER_TABS = [
  { id: 'categories' as FilterTab, label: 'Categories', icon: '📂' },
  { id: 'brands' as FilterTab, label: 'Brands', icon: '🏷️' },
  { id: 'models' as FilterTab, label: 'Models', icon: '📦' },
  { id: 'colors' as FilterTab, label: 'Colors', icon: '🎨' },
  { id: 'sizes' as FilterTab, label: 'Sizes', icon: '📏' }
]

export default function FilterPopupModal({
  isOpen,
  onClose,
  filters,
  uniqueValues,
  allData,
  onFilterChange,
  onClearFilters
}: FilterPopupModalProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('categories')

  if (!isOpen) return null

  // Calculate available options based on current filters
  const getAvailableOptions = (filterType: FilterTab) => {
    const hasOtherFilters = Object.keys(filters).some(key => 
      key !== filterType && (filters[key as keyof Filters] as Set<string>).size > 0
    )
    
    if (!hasOtherFilters) {
      return Array.from(uniqueValues[filterType]).sort()
    }

    const availableOptions = new Set<string>()
    
    allData.forEach(item => {
      // Check if item matches all other active filters
      const matchesOtherFilters = Object.keys(filters).every(key => {
        if (key === filterType) return true
        const filterSet = filters[key as keyof Filters] as Set<string>
        if (filterSet.size === 0) return true
        const itemValue = item[key as keyof Product] as string
        return itemValue && filterSet.has(itemValue)
      })

      if (matchesOtherFilters) {
        const value = item[filterType as keyof Product] as string
        if (value) availableOptions.add(value)
      }
    })
    
    return Array.from(availableOptions).sort()
  }

  const renderFilterOptions = (filterType: FilterTab) => {
    const options = getAvailableOptions(filterType)
    const activeFilters = filters[filterType]

    return (
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {options.map((option) => (
          <label
            key={option}
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer group"
          >
            <input
              type="checkbox"
              checked={activeFilters.has(option)}
              onChange={(e) => onFilterChange(filterType, option, e.target.checked)}
              className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700 group-hover:text-gray-900">
              {option}
            </span>
          </label>
        ))}
        {options.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">
            No {filterType} available
          </p>
        )}
      </div>
    )
  }

  const getTotalActiveFilters = () => {
    return Object.values(filters).reduce((total, filterSet) => total + filterSet.size, 0)
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
                {filters[tab.id].size > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-orange-100 text-orange-700 rounded-full">
                    {filters[tab.id].size}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-4 overflow-hidden">
            <div className="h-full">
              {renderFilterOptions(activeTab)}
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
'use client'

import { useState } from 'react'
import { Search, Filter, X } from 'lucide-react'

interface UnifiedSearchBarProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  onFilterClick: () => void
  hasActiveFilters: boolean
  activeFilterCount: number
}

export default function UnifiedSearchBar({
  searchTerm,
  onSearchChange,
  onFilterClick,
  hasActiveFilters,
  activeFilterCount
}: UnifiedSearchBarProps) {
  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
      <div className="flex items-center h-full">
        {/* Search Icon */}
        <div className="flex-shrink-0 pl-4 pr-3">
          <Search className="h-5 w-5 text-gray-400" />
        </div>

        {/* Search Input */}
        <div className="flex-1 relative min-w-0">
          <input
            type="text"
            placeholder="Search by name, brand, model, SKU, EAN..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full py-3 text-base bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-gray-400 text-gray-900"
            style={{ backgroundColor: 'transparent', boxShadow: 'none' }}
          />
        </div>

        {/* Clear Search Button */}
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Divider */}
        <div className="flex-shrink-0 w-px h-6 bg-gray-300 mx-2" />

        {/* Filter Button */}
        <button
          onClick={onFilterClick}
          className={`
            flex-shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-medium
            transition-colors duration-200 rounded-r-lg
            ${hasActiveFilters 
              ? 'text-orange-600 bg-orange-50 hover:bg-orange-100' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
        >
          <Filter className="h-4 w-4" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-orange-100 text-orange-700 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
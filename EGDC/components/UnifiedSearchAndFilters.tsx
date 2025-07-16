'use client'

import { useState } from 'react'
import { Product } from '@/lib/types'
import UnifiedSearchBar from './UnifiedSearchBar'
import FilterPopupModal from './FilterPopupModal'

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

interface UnifiedSearchAndFiltersProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  filters: Filters
  uniqueValues: UniqueValues
  allData: Product[]
  onFilterChange: (filterType: keyof Filters, value: string, checked: boolean) => void
  onClearFilters: () => void
}

export default function UnifiedSearchAndFilters({
  searchTerm,
  onSearchChange,
  filters,
  uniqueValues,
  allData,
  onFilterChange,
  onClearFilters
}: UnifiedSearchAndFiltersProps) {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

  const hasActiveFilters = Object.values(filters).some(filterSet => filterSet.size > 0)
  const activeFilterCount = Object.values(filters).reduce((total, filterSet) => total + filterSet.size, 0)

  const handleFilterClick = () => {
    setIsFilterModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsFilterModalOpen(false)
  }

  return (
    <div className="mb-6">
      <UnifiedSearchBar
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        onFilterClick={handleFilterClick}
        hasActiveFilters={hasActiveFilters}
        activeFilterCount={activeFilterCount}
      />

      <FilterPopupModal
        isOpen={isFilterModalOpen}
        onClose={handleCloseModal}
        filters={filters}
        uniqueValues={uniqueValues}
        allData={allData}
        onFilterChange={onFilterChange}
        onClearFilters={onClearFilters}
      />
    </div>
  )
}
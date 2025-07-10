'use client'

import { useState } from 'react'
import FilterSection from './FilterSection'
import ColumnControls, { ColumnConfig } from './ColumnControls'

interface SortConfig {
  field: 'alphabetical' | 'price' | 'stock' | 'date' | 'category'
  direction: 'asc' | 'desc'
}

interface SidebarTabsProps {
  // Filter props
  filters: any
  uniqueValues: any
  allData: any[]
  onFilterChange: (filterType: any, value: string, checked: boolean) => void
  
  // Column props
  columnConfig: ColumnConfig[]
  onColumnToggle: (key: string, visible: boolean) => void
  onPresetSelect: (preset: string) => void
  
  // Sort props
  sortConfig?: SortConfig
  onSortChange?: (config: SortConfig) => void
  
  compact?: boolean
}

export default function SidebarTabs({
  filters,
  uniqueValues,
  allData,
  onFilterChange,
  columnConfig,
  onColumnToggle,
  onPresetSelect,
  sortConfig,
  onSortChange,
  compact = false
}: SidebarTabsProps) {
  const [activeTab, setActiveTab] = useState<'filtros' | 'columnas' | 'ordenar'>('filtros')

  const tabs = [
    {
      id: 'filtros' as const,
      label: 'Filtros',
      icon: '🔍',
      count: filters.categories.size + filters.brands.size + filters.models.size + filters.colors.size + filters.sizes.size
    },
    {
      id: 'columnas' as const,
      label: 'Columnas',
      icon: '👁',
      count: columnConfig.filter(col => col.visible).length
    },
    ...(sortConfig && onSortChange ? [{
      id: 'ordenar' as const,
      label: 'Ordenar',
      icon: '🔄',
      count: 1
    }] : [])
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Tab Headers */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 px-4 py-3 text-sm font-medium transition-colors relative
              ${activeTab === tab.id
                ? 'bg-white text-orange-700 border-b-2 border-orange-500'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }
            `}
          >
            <div className="flex items-center justify-center gap-2">
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`
                  text-xs px-2 py-1 rounded-full
                  ${activeTab === tab.id
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-200 text-gray-600'
                  }
                `}>
                  {tab.count}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'filtros' ? (
          <div className="p-4">
            <FilterSection
              filters={filters}
              uniqueValues={uniqueValues}
              allData={allData}
              onFilterChange={onFilterChange}
              compact={true}
            />
          </div>
        ) : activeTab === 'columnas' ? (
          <div className="p-4">
            <ColumnControls
              columns={columnConfig}
              onColumnToggle={onColumnToggle}
              onPresetSelect={onPresetSelect}
              compact={false}
            />
          </div>
        ) : activeTab === 'ordenar' && sortConfig && onSortChange ? (
          <div className="p-4">
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
                        { field: 'category', direction: 'asc', label: 'Categoría A-Z' },
                        { field: 'category', direction: 'desc', label: 'Categoría Z-A' },
                      ]
                      const current = sortOptions.find(
                        option => option.field === sortConfig.field && option.direction === sortConfig.direction
                      )
                      return current?.label || 'Alfabético A-Z'
                    })()}
                  </p>
                </div>
                
                {[
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
                ].map((option, index) => {
                  const isSelected = sortConfig.field === option.field && sortConfig.direction === option.direction
                  
                  return (
                    <button
                      key={index}
                      onClick={() => onSortChange({ field: option.field as any, direction: option.direction as any })}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
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
                        <span className="text-orange-600">✓</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
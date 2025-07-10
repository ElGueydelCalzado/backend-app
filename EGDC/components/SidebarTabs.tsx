'use client'

import { useState } from 'react'
import FilterSection from './FilterSection'
import ColumnControls, { ColumnConfig } from './ColumnControls'

interface SortConfig {
  field: 'alphabetical' | 'price' | 'stock' | 'date'
  direction: 'asc' | 'desc'
  priceFields?: ('precio_shein' | 'precio_shopify' | 'precio_meli' | 'costo')[]
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
                      ]
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
                    })()}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { field: 'alphabetical', direction: 'asc', label: 'A-Z (Alfabético)', icon: '🔤' },
                    { field: 'alphabetical', direction: 'desc', label: 'Z-A (Alfabético)', icon: '🔤' },
                    { field: 'price', direction: 'asc', label: 'Precio: Menor a Mayor', icon: '💰' },
                    { field: 'price', direction: 'desc', label: 'Precio: Mayor a Menor', icon: '💰' },
                    { field: 'stock', direction: 'desc', label: 'Stock: Mayor a Menor', icon: '📦' },
                    { field: 'stock', direction: 'asc', label: 'Stock: Menor a Mayor', icon: '📦' },
                    { field: 'date', direction: 'desc', label: 'Más Recientes', icon: '📅' },
                    { field: 'date', direction: 'asc', label: 'Más Antiguos', icon: '📅' },
                  ].map((option, index) => {
                    const isSelected = sortConfig.field === option.field && sortConfig.direction === option.direction
                    
                    return (
                      <button
                        key={index}
                        onClick={() => onSortChange({ 
                          field: option.field as any, 
                          direction: option.direction as any,
                          priceFields: option.field === 'price' ? (sortConfig.priceFields || ['precio_shopify']) : undefined
                        })}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50 text-orange-800'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-lg mb-1">{option.icon}</span>
                        <span className="font-medium text-xs text-center leading-tight">{option.label}</span>
                        {isSelected && (
                          <span className="text-orange-600 text-xs mt-1">✓</span>
                        )}
                      </button>
                    )
                  })}
                </div>
                
                {/* Price Field Selection */}
                {sortConfig.field === 'price' && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { field: 'precio_shein', label: 'SHEIN', icon: '🟠' },
                        { field: 'precio_shopify', label: 'Shopify', icon: '🟢' },
                        { field: 'precio_meli', label: 'MercadoLibre', icon: '🟡' },
                        { field: 'costo', label: 'Costo', icon: '💰' },
                      ].map((priceOption) => {
                        const isSelected = (sortConfig.priceFields || ['precio_shopify']).includes(priceOption.field as any)
                        return (
                          <button
                            key={priceOption.field}
                            onClick={() => {
                              const currentFields = sortConfig.priceFields || ['precio_shopify']
                              const newFields = currentFields.includes(priceOption.field as any)
                                ? currentFields.filter(f => f !== priceOption.field)
                                : [...currentFields, priceOption.field as any]
                              
                              // Ensure at least one field is selected
                              if (newFields.length === 0) return
                              
                              onSortChange({ 
                                ...sortConfig, 
                                priceFields: newFields
                              })
                            }}
                            className={`flex items-center justify-center space-x-2 p-2 rounded border transition-all ${
                              isSelected
                                ? 'border-blue-500 bg-blue-100 text-blue-800'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <span>{priceOption.icon}</span>
                            <span className="text-xs font-medium">{priceOption.label}</span>
                            {isSelected && (
                              <span className="text-blue-600 text-xs">✓</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
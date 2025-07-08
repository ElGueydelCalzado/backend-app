'use client'

import { useState } from 'react'
import FilterSection from './FilterSection'
import ColumnControls, { ColumnConfig } from './ColumnControls'

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
  compact = false
}: SidebarTabsProps) {
  const [activeTab, setActiveTab] = useState<'filtros' | 'columnas'>('filtros')

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
    }
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
        ) : (
          <div className="p-4">
            <ColumnControls
              columns={columnConfig}
              onColumnToggle={onColumnToggle}
              onPresetSelect={onPresetSelect}
              compact={false}
            />
          </div>
        )}
      </div>
    </div>
  )
}
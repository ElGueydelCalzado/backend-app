'use client'

import { useState } from 'react'

export type WarehouseFilter = 'egdc' | 'fami' | 'osiel' | 'molly'

interface WarehouseTabsProps {
  activeWarehouse: WarehouseFilter
  onWarehouseChange: (warehouse: WarehouseFilter) => void
  productCounts?: {
    egdc: number
    fami: number
    osiel: number
    molly: number
  }
  isDemoMode?: boolean // Show when using dummy data
}

const WAREHOUSE_TABS = [
  { id: 'egdc' as WarehouseFilter, label: 'EGDC', icon: '🏪', color: 'bg-orange-500 hover:bg-orange-600', type: 'own' },
  { id: 'fami' as WarehouseFilter, label: 'FAMI', icon: '🏭', color: 'bg-green-500 hover:bg-green-600', type: 'supplier' },
  { id: 'osiel' as WarehouseFilter, label: 'Osiel', icon: '📦', color: 'bg-purple-500 hover:bg-purple-600', type: 'supplier' },
  { id: 'molly' as WarehouseFilter, label: 'Molly', icon: '🛍️', color: 'bg-pink-500 hover:bg-pink-600', type: 'supplier' }
]

export default function WarehouseTabs({ 
  activeWarehouse, 
  onWarehouseChange, 
  productCounts,
  isDemoMode = false
}: WarehouseTabsProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center gap-2 overflow-x-auto">
        
        {isDemoMode && (
          <div className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-full mr-2 flex-shrink-0">
            🧪 DEMO
          </div>
        )}
        
        {WAREHOUSE_TABS.map((tab) => {
          const isActive = activeWarehouse === tab.id
          const count = productCounts?.[tab.id] || 0
          
          return (
            <button
              key={tab.id}
              onClick={() => onWarehouseChange(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                transition-all duration-200 flex-shrink-0
                ${isActive 
                  ? `${tab.color} text-white shadow-md` 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {productCounts && (
                <span className={`
                  px-2 py-0.5 rounded-full text-xs font-bold
                  ${isActive 
                    ? 'bg-white bg-opacity-20 text-white' 
                    : 'bg-gray-200 text-gray-600'
                  }
                `}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
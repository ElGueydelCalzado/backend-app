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
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className={`
      bg-white border-b border-gray-200 px-6 relative
      transition-all duration-300 ease-in-out
      ${isCollapsed ? 'py-1' : 'py-3'}
    `}>
      {/* Collapse Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`
          absolute -right-3 z-20
          w-6 h-6 
          bg-gradient-to-r from-orange-500 to-orange-600 
          text-white 
          rounded-full 
          shadow-lg 
          hover:from-orange-600 hover:to-orange-700
          transition-all duration-200
          flex items-center justify-center
          text-xs font-bold
          ${isCollapsed ? 'top-2' : 'top-6'}
        `}
        title={isCollapsed ? 'Expandir pestañas de almacén' : 'Contraer pestañas de almacén'}
      >
        {isCollapsed ? '→' : '←'}
      </button>

      <div className={`
        flex items-center gap-2 overflow-x-auto
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'opacity-0 max-h-0 overflow-hidden' : 'opacity-100 max-h-20'}
      `}>
        
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
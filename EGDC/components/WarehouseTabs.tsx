'use client'

import { useState, useEffect } from 'react'

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
  { id: 'egdc' as WarehouseFilter, label: 'EGDC', icon: '🏪', type: 'own' },
  { id: 'fami' as WarehouseFilter, label: 'FAMI', icon: '🏭', type: 'supplier' },
  { id: 'osiel' as WarehouseFilter, label: 'Osiel', icon: '📦', type: 'supplier' },
  { id: 'molly' as WarehouseFilter, label: 'Molly', icon: '🛍️', type: 'supplier' }
]

export default function WarehouseTabs({ 
  activeWarehouse, 
  onWarehouseChange, 
  productCounts,
  isDemoMode = false
}: WarehouseTabsProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile and set initial collapse state
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      // Start collapsed on mobile, expanded on desktop
      setIsCollapsed(mobile)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div className={`
      bg-white border-b border-gray-200 px-6 relative
      transition-all duration-300 ease-in-out
      ${isCollapsed ? 'py-0.5' : 'py-1'}
    `}>
      {/* Collapse Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="
          absolute right-2 top-2 z-20
          w-5 h-5 
          bg-gradient-to-r from-orange-500 to-orange-600 
          text-white 
          rounded-full 
          shadow-lg 
          hover:from-orange-600 hover:to-orange-700
          transition-all duration-200
          flex items-center justify-center
          text-xs font-bold
        "
        title={isCollapsed ? 'Expandir pestañas de almacén' : 'Contraer pestañas de almacén'}
      >
        {isCollapsed ? '↓' : '↑'}
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
                flex items-center gap-2 px-3 py-1 text-sm font-medium 
                transition-colors duration-200 border-b-2 border-transparent flex-shrink-0
                ${isActive 
                  ? 'text-orange-600 border-orange-600' 
                  : 'text-gray-700 hover:text-orange-600 hover:border-orange-300'
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {productCounts && (
                <span className={`
                  px-2 py-0.5 rounded-full text-xs font-bold ml-1
                  ${isActive 
                    ? 'bg-orange-100 text-orange-700' 
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
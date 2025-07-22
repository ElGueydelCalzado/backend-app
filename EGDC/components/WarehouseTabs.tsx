'use client'

import { useState, useEffect } from 'react'

export type WarehouseFilter = string

interface WarehouseTab {
  id: WarehouseFilter
  label: string
  icon: string
  type: 'own' | 'supplier' | 'external'
  tenant_id?: string // Real tenant ID from database
  business_type?: 'retailer' | 'wholesaler'
  access_mode?: string
  supplier_info?: {
    minimum_order?: number
    payment_terms?: string
    specialties?: string[]
    lead_time_days?: number
  }
}

interface WarehouseTabsProps {
  activeWarehouse: WarehouseFilter
  onWarehouseChange: (warehouse: WarehouseFilter) => void
  warehouses?: WarehouseTab[]
  productCounts?: Record<string, number>
  isDemoMode?: boolean // Show when using dummy data
  isLoading?: boolean
}

// 🔒 DEFAULT WAREHOUSES - Enhanced with real tenant information
const DEFAULT_WAREHOUSE_TABS: WarehouseTab[] = [
  { 
    id: 'egdc', 
    label: 'EGDC', 
    icon: '🏪', 
    type: 'own',
    business_type: 'retailer',
    access_mode: 'full_access'
  },
  { 
    id: 'fami', 
    label: 'FAMI', 
    icon: '🏭', 
    type: 'supplier',
    business_type: 'wholesaler',
    access_mode: 'catalog_browse',
    supplier_info: {
      minimum_order: 5,
      payment_terms: 'Net 30',
      specialties: ['Athletic Footwear', 'Work Boots', 'Casual Shoes'],
      lead_time_days: 7
    }
  },
  { 
    id: 'osiel', 
    label: 'Osiel', 
    icon: '📦', 
    type: 'supplier',
    business_type: 'wholesaler',
    access_mode: 'catalog_browse',
    supplier_info: {
      minimum_order: 3,
      payment_terms: 'Net 15',
      specialties: ['Work Boots', 'Safety Footwear', 'Industrial Shoes'],
      lead_time_days: 5
    }
  },
  { 
    id: 'molly', 
    label: 'Molly', 
    icon: '🛍️', 
    type: 'supplier',
    business_type: 'wholesaler',
    access_mode: 'catalog_browse',
    supplier_info: {
      minimum_order: 2,
      payment_terms: 'Net 15',
      specialties: ['Fashion Footwear', 'Comfort Shoes', 'Sandals'],
      lead_time_days: 10
    }
  }
]

export default function WarehouseTabs({ 
  activeWarehouse, 
  onWarehouseChange, 
  warehouses = DEFAULT_WAREHOUSE_TABS,
  productCounts,
  isDemoMode = false,
  isLoading = false
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
        
        {warehouses.map((tab) => {
          const isActive = activeWarehouse === tab.id
          const count = productCounts?.[tab.id] || 0
          const isSupplier = tab.business_type === 'wholesaler'
          const isOwnBusiness = tab.type === 'own'
          
          return (
            <div key={tab.id} className="relative group">
              <button
                onClick={() => onWarehouseChange(tab.id)}
                disabled={isLoading}
                className={`
                  flex items-center gap-2 px-3 py-1 text-sm font-medium 
                  transition-all duration-200 border-b-2 border-transparent flex-shrink-0
                  relative
                  ${isLoading 
                    ? 'opacity-50 cursor-not-allowed' 
                    : ''
                  }
                  ${isActive 
                    ? 'text-orange-600 border-orange-600' 
                    : 'text-gray-700 hover:text-orange-600 hover:border-orange-300'
                  }
                `}
              >
                {/* Business Type Indicator */}
                <div className="relative">
                  <span className="text-lg">{tab.icon}</span>
                  {isSupplier && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border border-white" 
                          title="Proveedor Mayorista" />
                  )}
                  {isOwnBusiness && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-white" 
                          title="Tu Negocio" />
                  )}
                </div>
                
                <div className="flex flex-col items-start">
                  <span>{tab.label}</span>
                  {isSupplier && tab.supplier_info && (
                    <span className="text-xs text-gray-500">
                      Min: {tab.supplier_info.minimum_order} | {tab.supplier_info.payment_terms}
                    </span>
                  )}
                </div>
                
                {/* Product Count Badge */}
                {productCounts && (
                  <span className={`
                    px-2 py-0.5 rounded-full text-xs font-bold ml-1
                    ${isActive 
                      ? 'bg-orange-100 text-orange-700' 
                      : 'bg-gray-200 text-gray-600'
                    }
                  `}>
                    {isLoading ? '...' : count}
                  </span>
                )}
                
                {/* Supplier Badge */}
                {isSupplier && (
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded ml-1">
                    SUPPLIER
                  </span>
                )}
              </button>
              
              {/* Supplier Info Tooltip */}
              {isSupplier && tab.supplier_info && (
                <div className="
                  absolute top-full left-0 mt-1 p-3 bg-white rounded-lg shadow-lg border z-50
                  min-w-64 opacity-0 group-hover:opacity-100 transition-opacity duration-200
                  pointer-events-none group-hover:pointer-events-auto
                ">
                  <div className="text-sm">
                    <div className="font-semibold text-gray-900 mb-2">{tab.label} - Información del Proveedor</div>
                    
                    <div className="space-y-1 text-gray-600">
                      <div className="flex justify-between">
                        <span>Pedido mínimo:</span>
                        <span className="font-medium">{tab.supplier_info.minimum_order} pares</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Términos de pago:</span>
                        <span className="font-medium">{tab.supplier_info.payment_terms}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Tiempo de entrega:</span>
                        <span className="font-medium">{tab.supplier_info.lead_time_days} días</span>
                      </div>
                      
                      {tab.supplier_info.specialties && (
                        <div className="mt-2">
                          <span className="font-medium text-gray-700">Especialidades:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {tab.supplier_info.specialties.map((specialty, index) => (
                              <span key={index} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                {specialty}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
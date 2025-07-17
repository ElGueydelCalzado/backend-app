'use client'

import { useState, useEffect } from 'react'
import { Warehouse, Marketplace, MainTab } from '@/lib/types'

export type SidebarState = 'collapsed' | 'open' | 'hover'

interface ExpandableSidebarProps {
  activeTab: MainTab
  onTabChange: (tab: MainTab) => void
  activeSubPage?: string
  onSubPageChange?: (subPage: string) => void
  className?: string
}

export default function ExpandableSidebar({ 
  activeTab, 
  onTabChange, 
  activeSubPage, 
  onSubPageChange,
  className = '' 
}: ExpandableSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<MainTab>>(new Set([activeTab]))
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([])
  const [loading, setLoading] = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Load warehouses and marketplaces data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [warehousesRes, marketplacesRes] = await Promise.all([
        fetch('/api/warehouses'),
        fetch('/api/marketplaces')
      ])

      if (warehousesRes.ok) {
        const warehousesData = await warehousesRes.json()
        if (warehousesData.success) {
          setWarehouses(warehousesData.data)
        }
      }

      if (marketplacesRes.ok) {
        const marketplacesData = await marketplacesRes.json()
        if (marketplacesData.success) {
          setMarketplaces(marketplacesData.data)
        }
      }
    } catch (error) {
      console.error('Error loading sidebar data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (section: MainTab) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
    onTabChange(section)
  }

  const handleSubPageSelect = (subPage: string) => {
    if (onSubPageChange) {
      onSubPageChange(subPage)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { color: 'bg-green-100 text-green-700', text: 'Conectado' },
      pending: { color: 'bg-orange-100 text-orange-700', text: 'Pendiente' },
      error: { color: 'bg-red-100 text-red-700', text: 'Error' },
      disabled: { color: 'bg-gray-100 text-gray-700', text: 'Deshabilitado' }
    }
    return badges[status as keyof typeof badges] || badges.pending
  }

  const formatLastSync = (lastSync?: string) => {
    if (!lastSync) return 'Nunca'
    const date = new Date(lastSync)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `hace ${diffMins} min`
    if (diffMins < 1440) return `hace ${Math.floor(diffMins / 60)} h`
    return date.toLocaleDateString()
  }

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-80'} bg-white border-r border-gray-200 flex flex-col overflow-hidden transition-all duration-300 ease-in-out relative z-40 ${className}`}>
      
      {/* Collapse/Expand Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-4 w-8 h-8 bg-orange-500 hover:bg-orange-600 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center text-white transition-all duration-200"
        style={{ 
          left: isCollapsed ? '48px' : '312px',
          zIndex: 9999 
        }}
        title={isCollapsed ? 'Expandir panel' : 'Contraer panel'}
      >
        {isCollapsed ? (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 5l7 7-7 7V5z" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15 19l-7-7 7-7v14z" />
          </svg>
        )}
      </button>

      {/* Sidebar Header */}
      {!isCollapsed && (
        <div className="p-4 border-b border-gray-200">
          <p className="text-sm text-gray-500">Sistema de inventario</p>
        </div>
      )}

      {/* Expandable Navigation */}
      <div className="flex-1 overflow-y-auto">
        
        {isCollapsed ? (
          /* Collapsed State - Icon Only */
          <div className="p-2 space-y-2 pt-12">
            <div className="flex flex-col items-center space-y-2">
              <button 
                onClick={() => {
                  setIsCollapsed(false)
                  onTabChange('productos')
                }}
                className={`w-10 h-10 rounded flex items-center justify-center text-lg cursor-pointer transition-colors ${
                  activeTab === 'productos' 
                    ? 'bg-orange-100 text-orange-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Productos"
              >
                📦
              </button>
              <button 
                onClick={() => {
                  setIsCollapsed(false)
                  onTabChange('inventario')
                }}
                className={`w-10 h-10 rounded flex items-center justify-center text-lg cursor-pointer transition-colors ${
                  activeTab === 'inventario' 
                    ? 'bg-orange-100 text-orange-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Inventario"
              >
                📊
              </button>
              <button 
                onClick={() => {
                  setIsCollapsed(false)
                  onTabChange('bodegas')
                }}
                className={`w-10 h-10 rounded flex items-center justify-center text-lg cursor-pointer transition-colors ${
                  activeTab === 'bodegas' 
                    ? 'bg-orange-100 text-orange-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Bodegas"
              >
                🏪
              </button>
              <button 
                onClick={() => {
                  setIsCollapsed(false)
                  onTabChange('tiendas')
                }}
                className={`w-10 h-10 rounded flex items-center justify-center text-lg cursor-pointer transition-colors ${
                  activeTab === 'tiendas' 
                    ? 'bg-orange-100 text-orange-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Tiendas"
              >
                🏬
              </button>
            </div>
          </div>
        ) : (
          /* Expanded State - Full Content */
          <>
            {/* PRODUCTOS SECTION */}
            <div className="border-b border-gray-200">
              <button
                onClick={() => toggleSection('productos')}
                className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors ${
                  activeTab === 'productos' ? 'bg-orange-50 border-r-2 border-orange-500' : ''
                }`}
              >
                <div className="flex items-center">
                  <span className="text-lg mr-3">📦</span>
                  <span className="font-medium text-gray-900">Productos</span>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${
                    expandedSections.has('productos') ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
          
          {expandedSections.has('productos') && (
            <div className="bg-gray-50 py-2">
              <button
                onClick={() => {
                  onTabChange('productos')
                  handleSubPageSelect('catalogo')
                }}
                className={`w-full px-8 py-2 text-left text-sm transition-colors ${
                  activeSubPage === 'catalogo' 
                    ? 'text-blue-700 bg-blue-50' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Gestión de Catálogo
              </button>
              <button className="w-full px-8 py-2 text-left text-sm text-gray-400 cursor-not-allowed">
                Categorías (Próximamente)
              </button>
              <button className="w-full px-8 py-2 text-left text-sm text-gray-400 cursor-not-allowed">
                Atributos (Próximamente)
              </button>
            </div>
          )}
        </div>

        {/* INVENTARIO SECTION */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleSection('inventario')}
            className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors ${
              activeTab === 'inventario' ? 'bg-orange-50 border-r-2 border-orange-500' : ''
            }`}
          >
            <div className="flex items-center">
              <span className="text-lg mr-3">📊</span>
              <span className="font-medium text-gray-900">Inventario</span>
            </div>
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform ${
                expandedSections.has('inventario') ? 'rotate-90' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {expandedSections.has('inventario') && (
            <div className="bg-gray-50 py-2">
              <button className="w-full px-8 py-2 text-left text-sm text-gray-400 cursor-not-allowed">
                Movimientos (Próximamente)
              </button>
              <button className="w-full px-8 py-2 text-left text-sm text-gray-400 cursor-not-allowed">
                Reportes (Próximamente)
              </button>
              <button className="w-full px-8 py-2 text-left text-sm text-gray-400 cursor-not-allowed">
                Alertas (Próximamente)
              </button>
            </div>
          )}
        </div>

        {/* BODEGAS SECTION */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleSection('bodegas')}
            className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors ${
              activeTab === 'bodegas' ? 'bg-orange-50 border-r-2 border-orange-500' : ''
            }`}
          >
            <div className="flex items-center">
              <span className="text-lg mr-3">🏪</span>
              <div>
                <span className="font-medium text-gray-900">Bodegas</span>
                <div className="text-xs text-gray-500">Almacenes conectados</div>
              </div>
            </div>
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform ${
                expandedSections.has('bodegas') ? 'rotate-90' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {expandedSections.has('bodegas') && (
            <div className="bg-gray-50 py-2 space-y-1">
              {loading ? (
                <div className="px-8 py-2 text-sm text-gray-500">Cargando almacenes...</div>
              ) : (
                <>
                  {warehouses.map((warehouse) => {
                    const badge = getStatusBadge(warehouse.status)
                    return (
                      <button
                        key={warehouse.slug}
                        onClick={() => {
                          onTabChange('bodegas')
                          handleSubPageSelect(warehouse.slug)
                        }}
                        className={`w-full px-8 py-2 text-left text-sm transition-colors rounded-r-lg mr-2 ${
                          activeSubPage === warehouse.slug
                            ? 'bg-blue-100 text-blue-700 border-l-2 border-blue-500'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="mr-2">{warehouse.icon}</span>
                            <span>{warehouse.name}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
                            {badge.text}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 ml-6">
                          {warehouse.product_count} productos • Sync: {formatLastSync(warehouse.last_sync_at)}
                        </div>
                      </button>
                    )
                  })}
                  
                  {/* Add New Warehouse */}
                  <button
                    onClick={() => {
                      onTabChange('bodegas')
                      handleSubPageSelect('add-warehouse')
                    }}
                    className="w-full px-8 py-2 text-left text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-r-lg mr-2 mt-2"
                  >
                    <div className="flex items-center">
                      <span className="mr-2">➕</span>
                      <span>Conectar Nuevo Almacén</span>
                    </div>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* TIENDAS SECTION */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleSection('tiendas')}
            className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors ${
              activeTab === 'tiendas' ? 'bg-orange-50 border-r-2 border-orange-500' : ''
            }`}
          >
            <div className="flex items-center">
              <span className="text-lg mr-3">🏬</span>
              <div>
                <span className="font-medium text-gray-900">Tiendas</span>
                <div className="text-xs text-gray-500">Marketplaces conectados</div>
              </div>
            </div>
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform ${
                expandedSections.has('tiendas') ? 'rotate-90' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {expandedSections.has('tiendas') && (
            <div className="bg-gray-50 py-2 space-y-1">
              {loading ? (
                <div className="px-8 py-2 text-sm text-gray-500">Cargando marketplaces...</div>
              ) : (
                <>
                  {marketplaces.map((marketplace) => {
                    const badge = getStatusBadge(marketplace.status)
                    return (
                      <button
                        key={marketplace.slug}
                        onClick={() => {
                          onTabChange('tiendas')
                          handleSubPageSelect(marketplace.slug)
                        }}
                        className={`w-full px-8 py-2 text-left text-sm transition-colors rounded-r-lg mr-2 ${
                          activeSubPage === marketplace.slug
                            ? 'bg-blue-100 text-blue-700 border-l-2 border-blue-500'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="mr-2">{marketplace.icon}</span>
                            <span>{marketplace.name}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
                            {badge.text}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 ml-6">
                          {marketplace.published_products_count} productos publicados
                        </div>
                      </button>
                    )
                  })}
                  
                  {/* Add New Marketplace */}
                  <button
                    onClick={() => {
                      onTabChange('tiendas')
                      handleSubPageChange('add-marketplace')
                    }}
                    className="w-full px-8 py-2 text-left text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-r-lg mr-2 mt-2"
                  >
                    <div className="flex items-center">
                      <span className="mr-2">➕</span>
                      <span>Conectar Marketplace</span>
                    </div>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  )
}
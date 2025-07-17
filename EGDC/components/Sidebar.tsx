'use client'

import { useState, useEffect } from 'react'
import { Warehouse, Marketplace, MainTab, SubPageItem } from '@/lib/types'

export type SidebarState = 'collapsed' | 'open' | 'hover'
export type SidebarTab = MainTab

interface SidebarProps {
  children?: React.ReactNode
  state: SidebarState
  onStateChange: (state: SidebarState) => void
  activeTab: SidebarTab
  onTabChange: (tab: SidebarTab) => void
  activeSubPage?: string
  onSubPageChange?: (subPage: string) => void
  className?: string
}

// Simple sidebar tabs component
interface SimpleSidebarTabsProps {
  activeTab: SidebarTab
  onTabChange: (tab: SidebarTab) => void
}

function SimpleSidebarTabs({ activeTab, onTabChange }: SimpleSidebarTabsProps) {
  const tabs = [
    { id: 'productos' as SidebarTab, label: 'Productos', icon: '📦' },
    { id: 'inventario' as SidebarTab, label: 'Inventario', icon: '📊' },
    { id: 'bodegas' as SidebarTab, label: 'Bodegas', icon: '🏪' },
    { id: 'tiendas' as SidebarTab, label: 'Tiendas', icon: '🏬' }
  ]
  
  return (
    <div className="h-full flex">
      {/* Tab Headers */}
      <div className="flex flex-col w-20 border-r border-gray-200 bg-gray-50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              px-2 py-4 text-sm font-medium transition-colors border-b border-gray-200
              ${activeTab === tab.id
                ? 'bg-white text-orange-700 border-r-2 border-r-orange-500'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }
            `}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg">{tab.icon}</span>
              <span className="text-xs font-medium text-center">{tab.label}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Tab Content - now controlled by parent */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="text-sm text-gray-500 text-center py-8">
          Content controlled by parent component
        </div>
      </div>
    </div>
  )
}

export default function Sidebar({ 
  children, 
  state, 
  onStateChange, 
  activeTab, 
  onTabChange, 
  activeSubPage, 
  onSubPageChange,
  className = '' 
}: SidebarProps) {
  const [isHovering, setIsHovering] = useState(false)
  const [isHoveringToggleButton, setIsHoveringToggleButton] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<MainTab>>(new Set([activeTab]))
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([])
  const [loading, setLoading] = useState(true)
  
  const sidebarWidths = {
    collapsed: 'w-12',
    open: 'w-64',
    hover: 'w-64'
  }

  const toggleState = () => {
    // Only toggle between collapsed and open (not hover)
    const nextState = {
      collapsed: 'open' as SidebarState,
      open: 'collapsed' as SidebarState,
      hover: 'collapsed' as SidebarState // If somehow in hover state, go to collapsed
    }
    onStateChange(nextState[state])
  }

  const handleMouseEnter = () => {
    if (state === 'collapsed' && !isHoveringToggleButton) {
      setIsHovering(true)
      onStateChange('hover')
    }
  }

  const handleMouseLeave = () => {
    if (state === 'hover' && !isHoveringToggleButton) {
      setIsHovering(false)
      onStateChange('collapsed')
    }
  }

  const handleToggleButtonMouseEnter = () => {
    setIsHoveringToggleButton(true)
  }

  const handleToggleButtonMouseLeave = () => {
    setIsHoveringToggleButton(false)
    // If we were in hover state and leaving the toggle button, collapse
    if (state === 'hover') {
      setTimeout(() => {
        if (!isHovering) {
          onStateChange('collapsed')
        }
      }, 100) // Small delay to prevent flicker
    }
  }

  // Determine if we should show full content (open or hover)
  const showFullContent = state === 'open' || state === 'hover'

  return (
    <div 
      className={`
        ${sidebarWidths[state]} 
        ${state === 'hover' ? 'transition-all duration-200 ease-out' : 'transition-all duration-300 ease-in-out'}
        bg-white 
        border-r border-gray-200 
        ${state === 'hover' ? 'shadow-lg' : ''}
        relative
        ${state === 'hover' ? 'z-30' : ''}
        ${className}
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Toggle Button */}
      <button
        onClick={toggleState}
        onMouseEnter={handleToggleButtonMouseEnter}
        onMouseLeave={handleToggleButtonMouseLeave}
        className="
          absolute -right-2 top-4 z-20
          w-4 h-4 
          bg-gray-600 
          text-white 
          rounded-sm 
          hover:bg-gray-700
          transition-colors duration-200
          flex items-center justify-center
          text-xs
        "
        title={state === 'collapsed' ? 'Expandir panel' : 'Contraer panel'}
      >
        {state === 'collapsed' ? '→' : '←'}
      </button>

      {/* Sidebar Content */}
      <div className="h-full overflow-hidden">
        {!showFullContent ? (
          /* Collapsed State - Minimal Icons */
          <div className="p-2 space-y-2 pt-12">
            <div className="flex flex-col items-center space-y-2">
              <button 
                onClick={() => onTabChange('productos')}
                className={`w-8 h-8 rounded flex items-center justify-center text-sm cursor-pointer transition-colors ${
                  activeTab === 'productos' 
                    ? 'bg-orange-100 text-orange-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Productos"
              >
                📦
              </button>
              <button 
                onClick={() => onTabChange('inventario')}
                className={`w-8 h-8 rounded flex items-center justify-center text-sm cursor-pointer transition-colors ${
                  activeTab === 'inventario' 
                    ? 'bg-orange-100 text-orange-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Inventario"
              >
                📊
              </button>
              <button 
                onClick={() => onTabChange('bodegas')}
                className={`w-8 h-8 rounded flex items-center justify-center text-sm cursor-pointer transition-colors ${
                  activeTab === 'bodegas' 
                    ? 'bg-orange-100 text-orange-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Bodegas"
              >
                🏪
              </button>
              <button 
                onClick={() => onTabChange('tiendas')}
                className={`w-8 h-8 rounded flex items-center justify-center text-sm cursor-pointer transition-colors ${
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
          <div className="h-full flex flex-col pt-12">
            <SimpleSidebarTabs 
              activeTab={activeTab}
              onTabChange={onTabChange}
            />
          </div>
        )}
      </div>

      {/* Invisible hover trigger area for collapsed state */}
      {state === 'collapsed' && (
        <div 
          className="absolute top-0 -right-2 w-4 h-full z-10"
          onMouseEnter={handleMouseEnter}
        />
      )}
    </div>
  )
}
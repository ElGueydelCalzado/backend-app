'use client'

import { useState } from 'react'

export type SidebarState = 'collapsed' | 'open' | 'hover'

interface SidebarProps {
  children: React.ReactNode
  state: SidebarState
  onStateChange: (state: SidebarState) => void
  className?: string
}

export default function Sidebar({ children, state, onStateChange, className = '' }: SidebarProps) {
  const [isHovering, setIsHovering] = useState(false)
  
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
    if (state === 'collapsed') {
      setIsHovering(true)
      onStateChange('hover')
    }
  }

  const handleMouseLeave = () => {
    if (state === 'hover') {
      setIsHovering(false)
      onStateChange('collapsed')
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
        title={state === 'collapsed' ? 'Expandir filtros' : 'Contraer filtros'}
      >
        {state === 'collapsed' ? '→' : '←'}
      </button>

      {/* Sidebar Content */}
      <div className="h-full overflow-hidden">
        {!showFullContent ? (
          /* Collapsed State - Minimal Icons */
          <div className="p-2 space-y-4 pt-12">
            <div className="flex flex-col items-center space-y-3">
              <div 
                className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-gray-600 text-sm cursor-pointer hover:bg-gray-200 transition-colors"
                title="Filtros"
              >
                ⚡
              </div>
              <div 
                className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-gray-600 text-sm cursor-pointer hover:bg-gray-200 transition-colors"
                title="Estadísticas"
              >
                📊
              </div>
              <div 
                className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-gray-600 text-sm cursor-pointer hover:bg-gray-200 transition-colors"
                title="Columnas"
              >
                👁
              </div>
            </div>
          </div>
        ) : (
          /* Expanded States - Full Content (Open or Hover) */
          <div className={`h-full overflow-y-auto ${state === 'hover' ? 'opacity-95' : 'opacity-100'}`}>
            {children}
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
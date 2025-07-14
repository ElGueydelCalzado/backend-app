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
    collapsed: 'w-16',
    open: 'w-80',
    hover: 'w-80'
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
        border-r-2 border-gray-200/70 
        ${state === 'hover' ? 'shadow-2xl border-orange-200/50' : 'shadow-lg'}
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
          absolute -right-3 top-6 z-20
          w-6 h-6 
          bg-gradient-to-r from-orange-500 to-orange-600 
          text-white 
          rounded-full 
          shadow-lg 
          hover:from-orange-600 hover:to-orange-700
          transition-all duration-200
          flex items-center justify-center
          text-xs font-bold
        "
        title={state === 'collapsed' ? 'Expandir filtros (o hover para vista temporal)' : 
               state === 'hover' ? 'Fijar filtros expandidos' : 
               'Contraer filtros'}
      >
        {state === 'collapsed' ? '→' : '←'}
      </button>

      {/* Sidebar Content */}
      <div className="h-full overflow-hidden">
        {!showFullContent ? (
          /* Collapsed State - Icons Only */
          <div className="p-2 space-y-3">
            <div className="flex flex-col items-center space-y-2">
              <div 
                className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white text-lg cursor-pointer hover:scale-110 transition-transform"
                title="Filtros"
              >
                🔍
              </div>
              <div 
                className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center text-white text-lg cursor-pointer hover:scale-110 transition-transform"
                title="Estadísticas"
              >
                📊
              </div>
              <div 
                className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-lg cursor-pointer hover:scale-110 transition-transform"
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
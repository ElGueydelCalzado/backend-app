'use client'

import { useState } from 'react'

export type SidebarState = 'collapsed' | 'open'

interface SidebarProps {
  children: React.ReactNode
  state: SidebarState
  onStateChange: (state: SidebarState) => void
  className?: string
}

export default function Sidebar({ children, state, onStateChange, className = '' }: SidebarProps) {
  const sidebarWidths = {
    collapsed: 'w-16',
    open: 'w-80'
  }

  const toggleState = () => {
    const nextState = {
      collapsed: 'open' as SidebarState,
      open: 'collapsed' as SidebarState
    }
    onStateChange(nextState[state])
  }

  return (
    <div className={`
      ${sidebarWidths[state]} 
      transition-all duration-300 ease-in-out
      bg-white 
      border-r-2 border-gray-200/70 
      shadow-lg 
      relative
      ${className}
    `}>
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
        title={`Cambiar a ${state === 'collapsed' ? 'expandido' : 'contraído'}`}
      >
        {state === 'collapsed' ? '→' : '←'}
      </button>

      {/* Sidebar Content */}
      <div className="h-full overflow-hidden">
        {state === 'collapsed' ? (
          /* Collapsed State - Icons Only */
          <div className="p-2 space-y-3">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white text-lg">
                🔍
              </div>
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center text-white text-lg">
                📊
              </div>
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-lg">
                👁
              </div>
            </div>
          </div>
        ) : (
          /* Expanded States - Full Content */
          <div className="h-full overflow-y-auto">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
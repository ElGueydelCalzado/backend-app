'use client'

import { useState } from 'react'

export type SidebarState = 'collapsed' | 'open' | 'hover'

interface SidebarProps {
  children?: React.ReactNode
  state: SidebarState
  onStateChange: (state: SidebarState) => void
  className?: string
}

// Simple sidebar tabs component
function SimpleSidebarTabs() {
  const [activeTab, setActiveTab] = useState('tab1')
  
  const tabs = [
    { id: 'tab1', label: 'Tab 1', icon: '📋' },
    { id: 'tab2', label: 'Tab 2', icon: '📊' },
    { id: 'tab3', label: 'Tab 3', icon: '⚙️' }
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
              flex-1 px-2 py-3 text-sm font-medium transition-colors
              ${activeTab === tab.id
                ? 'bg-white text-orange-700 border-b-2 border-orange-500'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }
            `}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg">{tab.icon}</span>
              <span className="text-xs">{tab.label}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'tab1' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800">Tab 1 Content</h3>
            <p className="text-sm text-gray-600">This is the content for Tab 1.</p>
          </div>
        )}
        {activeTab === 'tab2' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800">Tab 2 Content</h3>
            <p className="text-sm text-gray-600">This is the content for Tab 2.</p>
          </div>
        )}
        {activeTab === 'tab3' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800">Tab 3 Content</h3>
            <p className="text-sm text-gray-600">This is the content for Tab 3.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Sidebar({ children, state, onStateChange, className = '' }: SidebarProps) {
  const [isHovering, setIsHovering] = useState(false)
  const [isHoveringToggleButton, setIsHoveringToggleButton] = useState(false)
  
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
          <div className="p-2 space-y-4 pt-12">
            <div className="flex flex-col items-center space-y-3">
              <div 
                className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-gray-600 text-sm cursor-pointer hover:bg-gray-200 transition-colors"
                title="Tab 1"
              >
                1
              </div>
              <div 
                className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-gray-600 text-sm cursor-pointer hover:bg-gray-200 transition-colors"
                title="Tab 2"
              >
                2
              </div>
              <div 
                className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-gray-600 text-sm cursor-pointer hover:bg-gray-200 transition-colors"
                title="Tab 3"
              >
                3
              </div>
            </div>
          </div>
        ) : (
          /* Expanded State - Full Content */
          <div className="h-full flex flex-col pt-12">
            <SimpleSidebarTabs />
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
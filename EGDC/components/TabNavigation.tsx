'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

interface TabNavigationProps {
  currentTab?: string
}

export default function TabNavigation({ currentTab }: TabNavigationProps) {
  const pathname = usePathname()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  const tabs = [
    {
      id: 'resumen',
      label: 'Resumen',
      icon: '📊',
      href: '/',
      active: pathname === '/',
      disabled: false
    },
    {
      id: 'inventario', 
      label: 'Inventario',
      icon: '📦',
      href: '/inventario',
      active: pathname === '/inventario',
      disabled: false
    },
    {
      id: 'ventas',
      label: 'Ventas',
      icon: '💰',
      href: '/ventas',
      active: pathname === '/ventas',
      disabled: true
    },
    {
      id: 'analiticas',
      label: 'Analíticas',
      icon: '📈',
      href: '/analiticas',
      active: pathname === '/analiticas',
      disabled: true
    },
    {
      id: 'tbd1',
      label: 'TBD 1',
      icon: '🔧',
      href: '/tbd1',
      active: pathname === '/tbd1',
      disabled: true
    },
    {
      id: 'tbd2',
      label: 'TBD 2',
      icon: '⚙️',
      href: '/tbd2',
      active: pathname === '/tbd2',
      disabled: true
    }
  ]

  // Auto-scroll active tab into view
  useEffect(() => {
    const activeTabIndex = tabs.findIndex(tab => tab.active)
    if (activeTabIndex !== -1 && scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const activeTab = container.children[activeTabIndex] as HTMLElement
      if (activeTab) {
        const containerRect = container.getBoundingClientRect()
        const tabRect = activeTab.getBoundingClientRect()
        
        if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
          activeTab.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
          })
        }
      }
    }
  }, [pathname])

  return (
    <nav className="mt-3" role="tablist" aria-label="Navegación principal">
      {/* Desktop: Original layout */}
      <div className="hidden md:flex flex-wrap gap-2">
        {tabs.map((tab) => {
          if (tab.disabled) {
            return (
              <div
                key={tab.id}
                className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-400 bg-gray-100 cursor-not-allowed border border-gray-200"
                aria-disabled="true"
                title="Próximamente disponible"
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </div>
            )
          }

          return (
            <Link
              key={tab.id}
              href={tab.href}
              role="tab"
              aria-selected={tab.active}
              aria-controls={`${tab.id}-panel`}
              className={`
                inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 border-2
                ${tab.active 
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-600 shadow-lg transform scale-105' 
                  : 'bg-white text-gray-700 border-gray-300 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 shadow-md hover:shadow-lg'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Mobile: Horizontal slider */}
      <div className="md:hidden relative">
        {/* Gradient overlays for scroll indicators */}
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white via-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white via-white to-transparent z-10 pointer-events-none" />
        
        {/* Scrollable tab container */}
        <div 
          ref={scrollContainerRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth px-6 -mx-6 py-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {tabs.map((tab) => {
            if (tab.disabled) {
              return (
                <div
                  key={tab.id}
                  className="flex-shrink-0 flex flex-col items-center justify-center min-w-[80px] h-16 rounded-xl bg-gray-50 border border-gray-200 cursor-not-allowed"
                  aria-disabled="true"
                  title="Próximamente disponible"
                >
                  <span className="text-lg mb-1 opacity-50">{tab.icon}</span>
                  <span className="text-xs font-medium text-gray-400 text-center leading-none">{tab.label}</span>
                </div>
              )
            }

            return (
              <Link
                key={tab.id}
                href={tab.href}
                role="tab"
                aria-selected={tab.active}
                aria-controls={`${tab.id}-panel`}
                className={`
                  flex-shrink-0 flex flex-col items-center justify-center min-w-[80px] h-16 rounded-xl transition-all duration-300 transform active:scale-95
                  ${tab.active 
                    ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 scale-105' 
                    : 'bg-white text-gray-600 border border-gray-200 shadow-sm hover:shadow-md hover:border-orange-200 hover:text-orange-600'
                  }
                `}
              >
                <span className={`text-lg mb-1 ${tab.active ? 'animate-pulse' : ''}`}>
                  {tab.icon}
                </span>
                <span className="text-xs font-semibold text-center leading-none">
                  {tab.label}
                </span>
              </Link>
            )
          })}
        </div>
        
        {/* Active tab indicator dots */}
        <div className="flex justify-center mt-3">
          <div className="flex space-x-1.5">
            {tabs.filter(tab => !tab.disabled).map((tab) => (
              <div
                key={`indicator-${tab.id}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  tab.active 
                    ? 'w-6 bg-orange-500 shadow-sm' 
                    : 'w-1.5 bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface TabNavigationProps {
  currentTab?: string
}

export default function TabNavigation({ currentTab }: TabNavigationProps) {
  const pathname = usePathname()
  
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
    }
  ]

  return (
    <nav className="mt-3" role="tablist" aria-label="Navegación principal">
      <div className="flex flex-wrap gap-2">
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
      
      {/* Tab indicators for mobile */}
      <div className="mt-4 flex justify-center sm:hidden">
        <div className="flex space-x-2">
          {tabs.filter(tab => !tab.disabled).map((tab) => (
            <div
              key={`indicator-${tab.id}`}
              className={`h-2 w-8 rounded-full transition-colors duration-200 ${
                tab.active ? 'bg-orange-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </nav>
  )
}
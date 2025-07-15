'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

interface TabNavigationProps {
  currentTab?: string
}

export default function TabNavigation({ currentTab }: TabNavigationProps) {
  const pathname = usePathname()
  
  const tabs = [
    {
      id: 'resumen',
      label: 'Resumen',
      href: '/',
      active: pathname === '/',
      disabled: false
    },
    {
      id: 'productos',
      label: 'Productos',
      href: '/productos',
      active: pathname === '/productos',
      disabled: true
    },
    {
      id: 'ventas',
      label: 'Ventas',
      href: '/ventas',
      active: pathname === '/ventas',
      disabled: true
    },
    {
      id: 'inventario',
      label: 'Inventario',
      href: '/inventario',
      active: pathname === '/inventario',
      disabled: false
    },
    {
      id: 'compras',
      label: 'Compras',
      href: '/compras',
      active: pathname === '/compras',
      disabled: true
    },
    {
      id: 'clientes',
      label: 'Clientes',
      href: '/clientes',
      active: pathname === '/clientes',
      disabled: true
    },
    {
      id: 'analiticas',
      label: 'Analiticas',
      href: '/analiticas',
      active: pathname === '/analiticas',
      disabled: true
    },
    {
      id: 'finanzas',
      label: 'Finanzas',
      href: '/finanzas',
      active: pathname === '/finanzas',
      disabled: true
    }
  ]


  return (
    <div className="flex items-center justify-between h-12 px-6 bg-white border-b border-gray-200">
      {/* Logo Section */}
      <div className="flex items-center space-x-4">
        <div className="text-xl font-bold text-orange-600">EGDC</div>
      </div>

      {/* Navigation Tabs - Desktop only */}
      <nav className="hidden md:flex items-center space-x-6" role="tablist" aria-label="Navegación principal">
        {tabs.map((tab) => {
          if (tab.disabled) {
            return (
              <div
                key={tab.id}
                className="px-3 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
                aria-disabled="true"
                title="Próximamente disponible"
              >
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
                px-3 py-2 text-sm font-medium transition-colors duration-200 border-b-2 border-transparent
                ${tab.active 
                  ? 'text-orange-600 border-orange-600' 
                  : 'text-gray-700 hover:text-orange-600 hover:border-orange-300'
                }
              `}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>

      {/* Account & Notifications Section */}
      <div className="flex items-center space-x-4">
        <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors" title="Ayuda">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors relative" title="Notificaciones">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5-5 5-5h-5m-6 10l-5-5 5-5" />
          </svg>
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">3</span>
        </button>
        <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors" title="Configuración">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">A</span>
          </div>
          <span className="text-sm text-gray-700">Admin</span>
        </div>
      </div>
    </div>
  )
}
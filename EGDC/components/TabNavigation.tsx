'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useState, useEffect } from 'react'
import UserAccountDropdown from './UserAccountDropdown'
import { useAccessibility } from './AccessibilityProvider'
import { ThemeToggleCompact } from './ThemeToggle'

// Helper function to extract tenant from pathname
function getTenantFromPath(pathname: string): string | null {
  const pathParts = pathname.split('/').filter(Boolean)
  // For path-based architecture: /tenant/page
  return pathParts.length > 0 ? pathParts[0] : null
}

interface TabNavigationProps {
  currentTab?: string
}

export default function TabNavigation({ currentTab }: TabNavigationProps) {
  const pathname = usePathname()
  const tenant = getTenantFromPath(pathname)
  const { announceMessage, language } = useAccessibility()
  const [focusedTabIndex, setFocusedTabIndex] = useState(0)
  
  // Create tenant-prefixed URLs for path-based architecture
  const createTenantUrl = (path: string) => {
    if (!tenant) return path // Fallback for root paths
    return path === '/' ? `/${tenant}/dashboard` : `/${tenant}${path}`
  }
  
  // Check if path matches current location (accounting for tenant prefix)
  const isActivePath = (basePath: string) => {
    if (!tenant) return pathname === basePath
    const tenantPath = basePath === '/' ? `/${tenant}/dashboard` : `/${tenant}${basePath}`
    return pathname === tenantPath || pathname.startsWith(tenantPath + '/')
  }
  
  const tabs = [
    {
      id: 'resumen',
      label: language === 'es' ? 'Resumen' : 'Summary',
      href: createTenantUrl('/'),
      active: isActivePath('/'),
      disabled: false,
      description: language === 'es' ? 'Vista general del negocio' : 'Business overview'
    },
    {
      id: 'inventario',
      label: language === 'es' ? 'Inventario' : 'Inventory',
      href: createTenantUrl('/inventory'), // Inventory management interface
      active: isActivePath('/inventory'),
      disabled: false,
      description: language === 'es' ? 'Gestión de productos e inventario' : 'Product and inventory management'
    },
    {
      id: 'ventas',
      label: language === 'es' ? 'Ventas' : 'Sales',
      href: createTenantUrl('/ventas'),
      active: isActivePath('/ventas'),
      disabled: true,
      description: language === 'es' ? 'Gestión de ventas y pedidos' : 'Sales and order management'
    },
    {
      id: 'compras',
      label: language === 'es' ? 'Compras' : 'Purchases',
      href: createTenantUrl('/compras'),
      active: isActivePath('/compras'),
      disabled: true,
      description: language === 'es' ? 'Gestión de compras y proveedores' : 'Purchase and supplier management'
    },
    {
      id: 'clientes',
      label: language === 'es' ? 'Clientes' : 'Customers',
      href: createTenantUrl('/clientes'),
      active: isActivePath('/clientes'),
      disabled: true,
      description: language === 'es' ? 'Gestión de clientes' : 'Customer management'
    },
    {
      id: 'analiticas',
      label: language === 'es' ? 'Analiticas' : 'Analytics',
      href: createTenantUrl('/analiticas'),
      active: isActivePath('/analiticas'),
      disabled: true,
      description: language === 'es' ? 'Reportes y análisis' : 'Reports and analytics'
    },
    {
      id: 'finanzas',
      label: language === 'es' ? 'Finanzas' : 'Finance',
      href: createTenantUrl('/finanzas'),
      active: isActivePath('/finanzas'),
      disabled: true,
      description: language === 'es' ? 'Gestión financiera' : 'Financial management'
    },
    {
      id: 'account',
      label: language === 'es' ? 'Cuenta' : 'Account',
      href: createTenantUrl('/account'),
      active: isActivePath('/account'),
      disabled: false,
      description: language === 'es' ? 'Configuración de cuenta' : 'Account settings'
    }
  ]

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        const prevIndex = index > 0 ? index - 1 : tabs.length - 1
        setFocusedTabIndex(prevIndex)
        break
      case 'ArrowRight':
        event.preventDefault()
        const nextIndex = index < tabs.length - 1 ? index + 1 : 0
        setFocusedTabIndex(nextIndex)
        break
      case 'Home':
        event.preventDefault()
        setFocusedTabIndex(0)
        break
      case 'End':
        event.preventDefault()
        setFocusedTabIndex(tabs.length - 1)
        break
    }
  }

  // Announce tab changes for screen readers
  useEffect(() => {
    const activeTab = tabs.find(tab => tab.active)
    if (activeTab) {
      announceMessage(
        language === 'es' 
          ? `Navegando a ${activeTab.label}: ${activeTab.description}`
          : `Navigating to ${activeTab.label}: ${activeTab.description}`
      )
    }
  }, [pathname, announceMessage, language])


  return (
    <header className="egdc-header h-14 px-6" role="banner">
      <div className="flex items-center justify-between h-full">
        {/* Logo Section */}
        <div className="flex items-center space-x-4">
          <h1 className="egdc-logo text-xl">EGDC</h1>
        </div>

        {/* Navigation Tabs - Desktop only */}
        <nav 
          className="hidden md:flex items-center space-x-1" 
          role="tablist" 
          aria-label={language === 'es' ? 'Navegación principal' : 'Main navigation'}
        >
          {tabs.map((tab, index) => {
            if (tab.disabled) {
              return (
                <div
                  key={tab.id}
                  className="egdc-nav-tab disabled px-4 py-3 text-sm touch-target"
                  aria-disabled="true"
                  aria-describedby={`${tab.id}-tooltip`}
                  title={language === 'es' ? 'Próximamente disponible' : 'Coming soon'}
                >
                  {tab.label}
                  <div id={`${tab.id}-tooltip`} className="sr-only">
                    {language === 'es' ? 'Función no disponible' : 'Feature not available'}
                  </div>
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
                aria-describedby={`${tab.id}-description`}
                tabIndex={focusedTabIndex === index ? 0 : -1}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onFocus={() => setFocusedTabIndex(index)}
                className={`egdc-nav-tab ${tab.active ? 'active' : ''} px-4 py-3 text-sm touch-target focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:rounded`}
              >
                {tab.label}
                <div id={`${tab.id}-description`} className="sr-only">
                  {tab.description}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Account & Notifications Section */}
        <div className="flex items-center space-x-2">
          <button 
            className="touch-target p-2 text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:rounded" 
            aria-label={language === 'es' ? 'Ayuda y soporte' : 'Help and support'}
            title={language === 'es' ? 'Ayuda' : 'Help'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          
          <button 
            className="touch-target p-2 text-gray-500 hover:text-gray-700 transition-colors relative focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:rounded" 
            aria-label={language === 'es' ? 'Notificaciones (3 sin leer)' : 'Notifications (3 unread)'}
            title={language === 'es' ? 'Notificaciones' : 'Notifications'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5-5 5-5h-5m-6 10l-5-5 5-5" />
            </svg>
            <span 
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-medium"
              aria-label={language === 'es' ? '3 notificaciones sin leer' : '3 unread notifications'}
            >
              3
            </span>
          </button>
          
          <button 
            className="touch-target p-2 text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:rounded" 
            aria-label={language === 'es' ? 'Configuración de la aplicación' : 'Application settings'}
            title={language === 'es' ? 'Configuración' : 'Settings'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Theme Toggle */}
          <ThemeToggleCompact />
          
          <UserAccountDropdown />
        </div>
      </div>
    </header>
  )
}
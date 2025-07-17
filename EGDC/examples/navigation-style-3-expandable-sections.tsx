// EXAMPLE 3: EXPANDABLE/COLLAPSIBLE SECTIONS - Sub-pages as expandable sections in sidebar

'use client'

import { useState } from 'react'

type MainTab = 'productos' | 'inventario' | 'bodegas' | 'tiendas'
type BodegaSubPage = 'fami' | 'molly' | 'osiel' | 'add-new'
type TiendaSubPage = 'mercadolibre' | 'shopify' | 'shein' | 'tiktok' | 'add-new'

export default function ExpandableSectionsNavigation() {
  const [activeTab, setActiveTab] = useState<MainTab>('bodegas')
  const [activeBodega, setActiveBodega] = useState<BodegaSubPage>('fami')
  const [activeTienda, setActiveTienda] = useState<TiendaSubPage>('mercadolibre')
  
  // Control which sections are expanded
  const [expandedSections, setExpandedSections] = useState<Set<MainTab>>(new Set(['bodegas']))

  const toggleSection = (section: MainTab) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
    setActiveTab(section)
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* LEFT SIDEBAR - Expandable Sections */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">EGDC - Gestión</h2>
          <p className="text-sm text-gray-500">Sistema de inventario</p>
        </div>

        {/* Expandable Navigation */}
        <div className="flex-1 overflow-y-auto">
          
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
                  onClick={() => setActiveTab('productos')}
                  className="w-full px-8 py-2 text-left text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100"
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
                
                {/* FAMI Warehouse */}
                <button
                  onClick={() => setActiveBodega('fami')}
                  className={`w-full px-8 py-2 text-left text-sm transition-colors rounded-r-lg mr-2 ${
                    activeBodega === 'fami'
                      ? 'bg-blue-100 text-blue-700 border-l-2 border-blue-500'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="mr-2">🏭</span>
                      <span>FAMI</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                      Conectado
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 ml-6">
                    2,450 productos • Sync: 5 min ago
                  </div>
                </button>
                
                {/* MOLLY Warehouse */}
                <button
                  onClick={() => setActiveBodega('molly')}
                  className={`w-full px-8 py-2 text-left text-sm transition-colors rounded-r-lg mr-2 ${
                    activeBodega === 'molly'
                      ? 'bg-blue-100 text-blue-700 border-l-2 border-blue-500'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="mr-2">🏭</span>
                      <span>MOLLY</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                      Conectado
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 ml-6">
                    1,320 productos • Sync: 2 min ago
                  </div>
                </button>
                
                {/* OSIEL Warehouse */}
                <button
                  onClick={() => setActiveBodega('osiel')}
                  className={`w-full px-8 py-2 text-left text-sm transition-colors rounded-r-lg mr-2 ${
                    activeBodega === 'osiel'
                      ? 'bg-blue-100 text-blue-700 border-l-2 border-blue-500'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="mr-2">🏭</span>
                      <span>OSIEL</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                      Pendiente
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 ml-6">
                    Configuración requerida
                  </div>
                </button>
                
                {/* Add New Warehouse */}
                <button
                  onClick={() => setActiveBodega('add-new')}
                  className="w-full px-8 py-2 text-left text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-r-lg mr-2 mt-2"
                >
                  <div className="flex items-center">
                    <span className="mr-2">➕</span>
                    <span>Conectar Nuevo Almacén</span>
                  </div>
                </button>
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
                
                {/* MercadoLibre */}
                <button
                  onClick={() => setActiveTienda('mercadolibre')}
                  className={`w-full px-8 py-2 text-left text-sm transition-colors rounded-r-lg mr-2 ${
                    activeTienda === 'mercadolibre'
                      ? 'bg-blue-100 text-blue-700 border-l-2 border-blue-500'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="mr-2">🛒</span>
                      <span>MercadoLibre</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                      Activo
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 ml-6">
                    850 productos publicados
                  </div>
                </button>
                
                {/* Shopify */}
                <button
                  onClick={() => setActiveTienda('shopify')}
                  className={`w-full px-8 py-2 text-left text-sm transition-colors rounded-r-lg mr-2 ${
                    activeTienda === 'shopify'
                      ? 'bg-blue-100 text-blue-700 border-l-2 border-blue-500'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="mr-2">🛍️</span>
                      <span>Shopify</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                      Activo
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 ml-6">
                    1,200 productos • egdc.shop
                  </div>
                </button>
                
                {/* SHEIN */}
                <button
                  onClick={() => setActiveTienda('shein')}
                  className={`w-full px-8 py-2 text-left text-sm transition-colors rounded-r-lg mr-2 ${
                    activeTienda === 'shein'
                      ? 'bg-blue-100 text-blue-700 border-l-2 border-blue-500'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="mr-2">👗</span>
                      <span>SHEIN</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                      Error
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 ml-6">
                    API Key expirada
                  </div>
                </button>
                
                {/* TikTok Shop */}
                <button
                  onClick={() => setActiveTienda('tiktok')}
                  className={`w-full px-8 py-2 text-left text-sm transition-colors rounded-r-lg mr-2 ${
                    activeTienda === 'tiktok'
                      ? 'bg-blue-100 text-blue-700 border-l-2 border-blue-500'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="mr-2">🎵</span>
                      <span>TikTok Shop</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                      Config.
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 ml-6">
                    Configuración en progreso
                  </div>
                </button>
                
                {/* Add New Marketplace */}
                <button
                  onClick={() => setActiveTienda('add-new')}
                  className="w-full px-8 py-2 text-left text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-r-lg mr-2 mt-2"
                >
                  <div className="flex items-center">
                    <span className="mr-2">➕</span>
                    <span>Conectar Marketplace</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT CONTENT AREA */}
      <div className="flex-1 flex flex-col">
        
        {/* Content Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {activeTab === 'productos' && 'Gestión de Productos'}
                {activeTab === 'inventario' && 'Control de Inventario'}
                {activeTab === 'bodegas' && (
                  activeBodega === 'add-new' 
                    ? 'Conectar Nuevo Almacén' 
                    : `Configuración - ${activeBodega?.toUpperCase()}`
                )}
                {activeTab === 'tiendas' && (
                  activeTienda === 'add-new' 
                    ? 'Conectar Nuevo Marketplace'
                    : activeTienda === 'mercadolibre' ? 'MercadoLibre'
                    : activeTienda === 'shopify' ? 'Shopify'
                    : activeTienda === 'shein' ? 'SHEIN'
                    : activeTienda === 'tiktok' ? 'TikTok Shop'
                    : ''
                )}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {activeTab === 'bodegas' && activeBodega !== 'add-new' && 'Configuración de almacén externo y sincronización'}
                {activeTab === 'tiendas' && activeTienda !== 'add-new' && 'Configuración de marketplace y sincronización de productos'}
              </p>
            </div>
            
            {activeTab === 'bodegas' && activeBodega !== 'add-new' && (
              <div className="flex items-center gap-3">
                <button className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                  Probar Conexión
                </button>
                <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Guardar Cambios
                </button>
              </div>
            )}
            
            {activeTab === 'tiendas' && activeTienda !== 'add-new' && (
              <div className="flex items-center gap-3">
                <button className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                  Sincronizar Ahora
                </button>
                <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Guardar Configuración
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full">
            
            {activeTab === 'bodegas' && (
              <div>
                {activeBodega !== 'add-new' ? (
                  <div className="max-w-4xl">
                    
                    {/* Status Banner */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                      <div className="flex items-center">
                        <span className="text-green-600 text-lg mr-3">✅</span>
                        <div>
                          <h4 className="font-medium text-green-900">Almacén Conectado</h4>
                          <p className="text-sm text-green-700">
                            La conexión con {activeBodega?.toUpperCase()} está funcionando correctamente. 
                            Última sincronización: hace 5 minutos.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Configuration Tabs */}
                    <div className="border-b border-gray-200 mb-6">
                      <nav className="flex space-x-8">
                        <button className="py-2 px-1 border-b-2 border-blue-500 text-blue-600 font-medium text-sm">
                          Configuración General
                        </button>
                        <button className="py-2 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm">
                          Sincronización
                        </button>
                        <button className="py-2 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm">
                          Logs
                        </button>
                      </nav>
                    </div>
                    
                    {/* Form Fields */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nombre del Almacén
                          </label>
                          <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                            value={activeBodega?.toUpperCase()} 
                          />
                          <p className="text-xs text-gray-500 mt-1">Nombre identificativo del almacén</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            URL de API
                          </label>
                          <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                            placeholder="https://api.warehouse.com/v1" 
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            API Key
                          </label>
                          <div className="relative">
                            <input 
                              type="password" 
                              className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                              placeholder="••••••••••••••••" 
                            />
                            <button className="absolute inset-y-0 right-0 pr-3 flex items-center">
                              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Configuración de Sincronización
                          </label>
                          <div className="space-y-4">
                            <label className="flex items-start">
                              <input type="checkbox" className="mt-1 mr-3 rounded" defaultChecked />
                              <div>
                                <span className="text-sm font-medium">Sincronización automática</span>
                                <p className="text-xs text-gray-500">Sincronizar inventario automáticamente cada 15 minutos</p>
                              </div>
                            </label>
                            
                            <label className="flex items-start">
                              <input type="checkbox" className="mt-1 mr-3 rounded" defaultChecked />
                              <div>
                                <span className="text-sm font-medium">Notificaciones de stock crítico</span>
                                <p className="text-xs text-gray-500">Recibir alertas cuando el inventario esté bajo</p>
                              </div>
                            </label>
                            
                            <label className="flex items-start">
                              <input type="checkbox" className="mt-1 mr-3 rounded" />
                              <div>
                                <span className="text-sm font-medium">Sincronización bidireccional</span>
                                <p className="text-xs text-gray-500">Permitir que el almacén actualice datos en EGDC</p>
                              </div>
                            </label>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Frecuencia de Sincronización
                          </label>
                          <select className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option>Cada 15 minutos</option>
                            <option>Cada 30 minutos</option>
                            <option>Cada hora</option>
                            <option>Manual únicamente</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <div className="text-8xl mb-6">🏭</div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-4">Conectar Nuevo Almacén</h3>
                    <p className="text-gray-600 mb-8 max-w-lg mx-auto">
                      Agrega un almacén externo para sincronizar inventario, gestionar stock distribuido y mantener 
                      tu inventario actualizado en tiempo real.
                    </p>
                    <div className="space-y-3">
                      <button className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium block mx-auto">
                        Iniciar Configuración
                      </button>
                      <button className="text-gray-500 text-sm hover:text-gray-700">
                        Ver documentación de integración
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tiendas' && (
              <div>
                <div className="max-w-4xl">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start">
                      <span className="text-blue-600 text-lg mr-3">ℹ️</span>
                      <div>
                        <h4 className="font-medium text-blue-900">Configuración de Marketplace</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Configura las credenciales de API para sincronizar productos, precios e inventario 
                          con {activeTienda === 'mercadolibre' ? 'MercadoLibre' : activeTienda === 'shopify' ? 'Shopify' : activeTienda === 'shein' ? 'SHEIN' : 'TikTok Shop'}.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">App ID / Client ID</label>
                        <input 
                          type="text" 
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                          placeholder="Ingresa tu App ID" 
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Client Secret</label>
                        <input 
                          type="password" 
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                          placeholder="••••••••••••••••" 
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Access Token</label>
                        <input 
                          type="password" 
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                          placeholder="••••••••••••••••" 
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Estado de Conexión</h4>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center mb-2">
                            <span className="text-green-600 mr-2">●</span>
                            <span className="text-sm font-medium text-green-900">Conectado</span>
                          </div>
                          <p className="text-xs text-green-700">Última sincronización: hace 5 minutos</p>
                          <p className="text-xs text-green-600 mt-1">850 productos sincronizados</p>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Configuraciones</h4>
                        <div className="space-y-3">
                          <label className="flex items-center">
                            <input type="checkbox" className="mr-3 rounded" defaultChecked />
                            <span className="text-sm">Sincronizar precios</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="mr-3 rounded" defaultChecked />
                            <span className="text-sm">Sincronizar inventario</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="mr-3 rounded" />
                            <span className="text-sm">Publicar automáticamente</span>
                          </label>
                          <label className="flex items-center">
                            <input type="checkbox" className="mr-3 rounded" defaultChecked />
                            <span className="text-sm">Importar órdenes</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
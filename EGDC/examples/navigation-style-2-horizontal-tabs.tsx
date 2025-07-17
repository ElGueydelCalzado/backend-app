// EXAMPLE 2: HORIZONTAL TABS STYLE - Sub-pages as horizontal tabs within main content area

'use client'

import { useState } from 'react'

type MainTab = 'productos' | 'inventario' | 'bodegas' | 'tiendas'
type BodegaSubPage = 'fami' | 'molly' | 'osiel' | 'add-new'
type TiendaSubPage = 'mercadolibre' | 'shopify' | 'shein' | 'tiktok' | 'add-new'

export default function HorizontalTabsNavigation() {
  const [activeTab, setActiveTab] = useState<MainTab>('bodegas')
  const [activeBodega, setActiveBodega] = useState<BodegaSubPage>('fami')
  const [activeTienda, setActiveTienda] = useState<TiendaSubPage>('mercadolibre')

  return (
    <div className="flex h-screen bg-gray-50">
      {/* LEFT SIDEBAR - Only Main Tabs */}
      <div className="w-20 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-2 space-y-2 pt-12">
          <div className="flex flex-col items-center space-y-2">
            
            {/* Productos Tab */}
            <button 
              onClick={() => setActiveTab('productos')}
              className={`w-12 h-12 rounded-lg flex items-center justify-center text-sm cursor-pointer transition-colors ${
                activeTab === 'productos' 
                  ? 'bg-orange-100 text-orange-700 border-2 border-orange-500' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Productos"
            >
              <div className="flex flex-col items-center">
                <span className="text-lg">📦</span>
                <span className="text-xs mt-1">Prod.</span>
              </div>
            </button>
            
            {/* Inventario Tab */}
            <button 
              onClick={() => setActiveTab('inventario')}
              className={`w-12 h-12 rounded-lg flex items-center justify-center text-sm cursor-pointer transition-colors ${
                activeTab === 'inventario' 
                  ? 'bg-orange-100 text-orange-700 border-2 border-orange-500' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Inventario"
            >
              <div className="flex flex-col items-center">
                <span className="text-lg">📊</span>
                <span className="text-xs mt-1">Inv.</span>
              </div>
            </button>
            
            {/* Bodegas Tab */}
            <button 
              onClick={() => setActiveTab('bodegas')}
              className={`w-12 h-12 rounded-lg flex items-center justify-center text-sm cursor-pointer transition-colors ${
                activeTab === 'bodegas' 
                  ? 'bg-orange-100 text-orange-700 border-2 border-orange-500' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Bodegas"
            >
              <div className="flex flex-col items-center">
                <span className="text-lg">🏪</span>
                <span className="text-xs mt-1">Bod.</span>
              </div>
            </button>
            
            {/* Tiendas Tab */}
            <button 
              onClick={() => setActiveTab('tiendas')}
              className={`w-12 h-12 rounded-lg flex items-center justify-center text-sm cursor-pointer transition-colors ${
                activeTab === 'tiendas' 
                  ? 'bg-orange-100 text-orange-700 border-2 border-orange-500' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Tiendas"
            >
              <div className="flex flex-col items-center">
                <span className="text-lg">🏬</span>
                <span className="text-xs mt-1">Tiend.</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col">
        
        {/* PAGE HEADER */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {activeTab === 'productos' && 'Gestión de Productos'}
            {activeTab === 'inventario' && 'Control de Inventario'}
            {activeTab === 'bodegas' && 'Gestión de Almacenes'}
            {activeTab === 'tiendas' && 'Configuración de Tiendas'}
          </h1>
        </div>

        {/* HORIZONTAL SUB-TABS */}
        {activeTab === 'bodegas' && (
          <div className="bg-white border-b border-gray-200">
            <div className="px-6">
              <nav className="flex space-x-8">
                
                {/* FAMI Tab */}
                <button
                  onClick={() => setActiveBodega('fami')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeBodega === 'fami'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>🏭</span>
                    <span>FAMI</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Conectado
                    </span>
                  </div>
                </button>
                
                {/* MOLLY Tab */}
                <button
                  onClick={() => setActiveBodega('molly')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeBodega === 'molly'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>🏭</span>
                    <span>MOLLY</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Conectado
                    </span>
                  </div>
                </button>
                
                {/* OSIEL Tab */}
                <button
                  onClick={() => setActiveBodega('osiel')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeBodega === 'osiel'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>🏭</span>
                    <span>OSIEL</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                      Pendiente
                    </span>
                  </div>
                </button>
                
                {/* Add New Tab */}
                <button
                  onClick={() => setActiveBodega('add-new')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeBodega === 'add-new'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>➕</span>
                    <span>Agregar Almacén</span>
                  </div>
                </button>
              </nav>
            </div>
          </div>
        )}

        {activeTab === 'tiendas' && (
          <div className="bg-white border-b border-gray-200">
            <div className="px-6">
              <nav className="flex space-x-8 overflow-x-auto">
                
                {/* MercadoLibre Tab */}
                <button
                  onClick={() => setActiveTienda('mercadolibre')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTienda === 'mercadolibre'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>🛒</span>
                    <span>MercadoLibre</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Activo
                    </span>
                  </div>
                </button>
                
                {/* Shopify Tab */}
                <button
                  onClick={() => setActiveTienda('shopify')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTienda === 'shopify'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>🛍️</span>
                    <span>Shopify</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Activo
                    </span>
                  </div>
                </button>
                
                {/* SHEIN Tab */}
                <button
                  onClick={() => setActiveTienda('shein')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTienda === 'shein'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>👗</span>
                    <span>SHEIN</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      Error
                    </span>
                  </div>
                </button>
                
                {/* TikTok Shop Tab */}
                <button
                  onClick={() => setActiveTienda('tiktok')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTienda === 'tiktok'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>🎵</span>
                    <span>TikTok Shop</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                      Config.
                    </span>
                  </div>
                </button>
                
                {/* Add New Tab */}
                <button
                  onClick={() => setActiveTienda('add-new')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTienda === 'add-new'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>➕</span>
                    <span>Conectar Marketplace</span>
                  </div>
                </button>
              </nav>
            </div>
          </div>
        )}

        {/* CONTENT AREA */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="bg-white rounded-lg shadow p-6 h-full">
            
            {activeTab === 'bodegas' && (
              <div>
                {activeBodega !== 'add-new' ? (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-gray-900">
                        Configuración de {activeBodega.toUpperCase()}
                      </h2>
                      <div className="flex items-center gap-3">
                        <button className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                          Probar Conexión
                        </button>
                        <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                          Guardar Cambios
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Almacén</label>
                          <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                            value={activeBodega.toUpperCase()} 
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">URL de API</label>
                          <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                            placeholder="https://api.warehouse.com/v1" 
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                          <input 
                            type="password" 
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                            placeholder="••••••••••••••••" 
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">Configuración de Sincronización</label>
                          <div className="space-y-3">
                            <label className="flex items-center">
                              <input type="checkbox" className="mr-3 rounded" defaultChecked />
                              <span className="text-sm">Sincronizar inventario automáticamente</span>
                            </label>
                            <label className="flex items-center">
                              <input type="checkbox" className="mr-3 rounded" defaultChecked />
                              <span className="text-sm">Notificar cambios de stock crítico</span>
                            </label>
                            <label className="flex items-center">
                              <input type="checkbox" className="mr-3 rounded" />
                              <span className="text-sm">Sincronización bidireccional</span>
                            </label>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Frecuencia de Sincronización</label>
                          <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option>Cada 15 minutos</option>
                            <option>Cada 30 minutos</option>
                            <option>Cada hora</option>
                            <option>Manual</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4">🏭</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Agregar Nuevo Almacén</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Conecta un nuevo almacén externo para sincronizar inventario y gestionar stock distribuido
                    </p>
                    <button className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 font-medium">
                      Iniciar Configuración
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tiendas' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Configuración de {activeTienda === 'mercadolibre' ? 'MercadoLibre' : activeTienda === 'shopify' ? 'Shopify' : activeTienda === 'shein' ? 'SHEIN' : activeTienda === 'tiktok' ? 'TikTok Shop' : 'Nuevo Marketplace'}
                  </h2>
                  <div className="flex items-center gap-3">
                    <button className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                      Sincronizar Ahora
                    </button>
                    <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                      Guardar Configuración
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <span className="text-blue-600 text-lg">ℹ️</span>
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-blue-900">Configuración de API</h4>
                          <p className="text-sm text-blue-700 mt-1">
                            Configura las credenciales de API para sincronizar productos, precios e inventario con tu tienda.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">App ID / Client ID</label>
                        <input 
                          type="text" 
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                          placeholder="Ingresa tu App ID" 
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Client Secret</label>
                        <input 
                          type="password" 
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                          placeholder="••••••••••••••••" 
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Access Token</label>
                        <input 
                          type="password" 
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                          placeholder="••••••••••••••••" 
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Estado de Conexión</h4>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center">
                          <span className="text-green-600 mr-2">●</span>
                          <span className="text-sm font-medium text-green-900">Conectado</span>
                        </div>
                        <p className="text-xs text-green-700 mt-1">Última sincronización: hace 5 minutos</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Configuraciones de Sincronización</h4>
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
// EXAMPLE 1: VERTICAL LIST STYLE - Sub-pages as vertical list items under main tabs

'use client'

import { useState } from 'react'

type MainTab = 'productos' | 'inventario' | 'bodegas' | 'tiendas'
type BodegaSubPage = 'fami' | 'molly' | 'osiel' | 'add-new'
type TiendaSubPage = 'mercadolibre' | 'shopify' | 'shein' | 'tiktok' | 'add-new'

export default function VerticalListNavigation() {
  const [activeTab, setActiveTab] = useState<MainTab>('bodegas')
  const [activeBodega, setActiveBodega] = useState<BodegaSubPage>('fami')
  const [activeTienda, setActiveTienda] = useState<TiendaSubPage>('mercadolibre')

  return (
    <div className="flex h-screen bg-gray-50">
      {/* LEFT SIDEBAR - Main Tabs + Sub-pages */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        
        {/* MAIN TABS */}
        <div className="border-b border-gray-200">
          <div className="p-2 space-y-1">
            {/* Productos Tab */}
            <button
              onClick={() => setActiveTab('productos')}
              className={`w-full px-3 py-2 text-left rounded-md text-sm font-medium transition-colors ${
                activeTab === 'productos' 
                  ? 'bg-orange-100 text-orange-700 border-l-4 border-orange-500' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📦 Productos
            </button>
            
            {/* Inventario Tab */}
            <button
              onClick={() => setActiveTab('inventario')}
              className={`w-full px-3 py-2 text-left rounded-md text-sm font-medium transition-colors ${
                activeTab === 'inventario' 
                  ? 'bg-orange-100 text-orange-700 border-l-4 border-orange-500' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📊 Inventario
            </button>
            
            {/* Bodegas Tab */}
            <button
              onClick={() => setActiveTab('bodegas')}
              className={`w-full px-3 py-2 text-left rounded-md text-sm font-medium transition-colors ${
                activeTab === 'bodegas' 
                  ? 'bg-orange-100 text-orange-700 border-l-4 border-orange-500' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              🏪 Bodegas
            </button>
            
            {/* Tiendas Tab */}
            <button
              onClick={() => setActiveTab('tiendas')}
              className={`w-full px-3 py-2 text-left rounded-md text-sm font-medium transition-colors ${
                activeTab === 'tiendas' 
                  ? 'bg-orange-100 text-orange-700 border-l-4 border-orange-500' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              🏬 Tiendas
            </button>
          </div>
        </div>

        {/* SUB-PAGES SECTION */}
        <div className="flex-1 p-2 overflow-y-auto">
          {activeTab === 'bodegas' && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Almacenes
              </div>
              
              {/* FAMI Warehouse */}
              <button
                onClick={() => setActiveBodega('fami')}
                className={`w-full px-3 py-2 text-left rounded text-sm transition-colors ${
                  activeBodega === 'fami'
                    ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>🏭 FAMI</span>
                  <span className="text-xs text-green-600">●</span>
                </div>
              </button>
              
              {/* MOLLY Warehouse */}
              <button
                onClick={() => setActiveBodega('molly')}
                className={`w-full px-3 py-2 text-left rounded text-sm transition-colors ${
                  activeBodega === 'molly'
                    ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>🏭 MOLLY</span>
                  <span className="text-xs text-green-600">●</span>
                </div>
              </button>
              
              {/* OSIEL Warehouse */}
              <button
                onClick={() => setActiveBodega('osiel')}
                className={`w-full px-3 py-2 text-left rounded text-sm transition-colors ${
                  activeBodega === 'osiel'
                    ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>🏭 OSIEL</span>
                  <span className="text-xs text-orange-500">●</span>
                </div>
              </button>
              
              {/* Add New Warehouse */}
              <button
                onClick={() => setActiveBodega('add-new')}
                className="w-full px-3 py-2 text-left rounded text-sm text-gray-500 hover:bg-gray-50 border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors"
              >
                ➕ Agregar Almacén
              </button>
            </div>
          )}

          {activeTab === 'tiendas' && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Marketplaces
              </div>
              
              {/* MercadoLibre */}
              <button
                onClick={() => setActiveTienda('mercadolibre')}
                className={`w-full px-3 py-2 text-left rounded text-sm transition-colors ${
                  activeTienda === 'mercadolibre'
                    ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>🛒 MercadoLibre</span>
                  <span className="text-xs text-green-600">●</span>
                </div>
              </button>
              
              {/* Shopify */}
              <button
                onClick={() => setActiveTienda('shopify')}
                className={`w-full px-3 py-2 text-left rounded text-sm transition-colors ${
                  activeTienda === 'shopify'
                    ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>🛍️ Shopify</span>
                  <span className="text-xs text-green-600">●</span>
                </div>
              </button>
              
              {/* SHEIN */}
              <button
                onClick={() => setActiveTienda('shein')}
                className={`w-full px-3 py-2 text-left rounded text-sm transition-colors ${
                  activeTienda === 'shein'
                    ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>👗 SHEIN</span>
                  <span className="text-xs text-red-500">●</span>
                </div>
              </button>
              
              {/* TikTok Shop */}
              <button
                onClick={() => setActiveTienda('tiktok')}
                className={`w-full px-3 py-2 text-left rounded text-sm transition-colors ${
                  activeTienda === 'tiktok'
                    ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>🎵 TikTok Shop</span>
                  <span className="text-xs text-orange-500">●</span>
                </div>
              </button>
              
              {/* Add New Marketplace */}
              <button
                onClick={() => setActiveTienda('add-new')}
                className="w-full px-3 py-2 text-left rounded text-sm text-gray-500 hover:bg-gray-50 border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors"
              >
                ➕ Conectar Marketplace
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT CONTENT AREA */}
      <div className="flex-1 p-6">
        <div className="bg-white rounded-lg shadow p-6 h-full">
          {activeTab === 'bodegas' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Configuración - {activeBodega === 'fami' ? 'FAMI' : activeBodega === 'molly' ? 'MOLLY' : activeBodega === 'osiel' ? 'OSIEL' : 'Nuevo Almacén'}
              </h2>
              
              {activeBodega !== 'add-new' ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Almacén</label>
                      <input type="text" className="w-full border border-gray-300 rounded-md px-3 py-2" value={activeBodega.toUpperCase()} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Estado de Conexión</label>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">●</span>
                        <span className="text-sm">Conectado</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">URL de API</label>
                    <input type="text" className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="https://api.warehouse.com/v1" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Configuración de Sincronización</label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" defaultChecked />
                        Sincronizar inventario cada 15 minutos
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" defaultChecked />
                        Notificar cambios de stock
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        Sincronización bidireccional
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🏭</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Agregar Nuevo Almacén</h3>
                  <p className="text-gray-600 mb-4">Conecta un nuevo almacén a tu sistema</p>
                  <button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
                    Comenzar Configuración
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tiendas' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Configuración - {activeTienda === 'mercadolibre' ? 'MercadoLibre' : activeTienda === 'shopify' ? 'Shopify' : activeTienda === 'shein' ? 'SHEIN' : activeTienda === 'tiktok' ? 'TikTok Shop' : 'Nuevo Marketplace'}
              </h2>
              
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <p className="text-blue-800 text-sm">
                    🔧 Configuración de marketplace para sincronización de productos y órdenes
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                    <input type="password" className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="••••••••••••••••" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">●</span>
                      <span className="text-sm">Activo</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
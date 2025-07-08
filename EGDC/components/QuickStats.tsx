import { useMemo } from 'react'
import { Product } from '@/lib/supabase'

interface QuickStatsProps {
  products: Product[]
  filteredProducts: Product[]
}

const LOW_STOCK_THRESHOLD = 10

export default function QuickStats({ products, filteredProducts }: QuickStatsProps) {
  // PERFORMANCE OPTIMIZATION: Memoize expensive calculations
  
  // Basic stats - memoized
  const basicStats = useMemo(() => {
    const totalProducts = products.length
    const totalInventory = products.reduce((sum, product) => sum + (product.inventory_total || 0), 0)
    
    return { totalProducts, totalInventory }
  }, [products])

  // Stock analysis - memoized
  const stockAnalysis = useMemo(() => {
    const lowStockProducts = products.filter(product => 
      (product.inventory_total || 0) <= LOW_STOCK_THRESHOLD && (product.inventory_total || 0) > 0
    )
    const outOfStockProducts = products.filter(product => (product.inventory_total || 0) === 0)
    
    return { lowStockProducts, outOfStockProducts }
  }, [products])
  
  // Unique values - memoized
  const uniqueValues = useMemo(() => {
    const categories = new Set<string>()
    const brands = new Set<string>()
    
    products.forEach(p => {
      if (p.categoria) categories.add(p.categoria)
      if (p.marca) brands.add(p.marca)
    })
    
    return {
      uniqueCategories: categories,
      uniqueBrands: brands
    }
  }, [products])
  
  // Financial calculations - memoized
  const financialStats = useMemo(() => {
    let totalValue = 0
    let totalCost = 0
    
    products.forEach(product => {
      const cost = product.costo || 0
      const inventory = product.inventory_total || 0
      
      totalValue += cost * inventory
      totalCost += cost
    })
    
    const averagePrice = products.length > 0 ? totalCost / products.length : 0
    
    return { totalValue, averagePrice }
  }, [products])

  // Platform distribution - memoized
  const platformStats = useMemo(() => {
    let shein = 0, shopify = 0, meli = 0, tiktok = 0
    
    products.forEach(p => {
      if (p.shein) shein++
      if (p.shopify) shopify++
      if (p.meli) meli++
      if (p.tiktok) tiktok++
    })
    
    return { shein, shopify, meli, tiktok }
  }, [products])

  // Location inventory - memoized
  const locationStats = useMemo(() => {
    let egdc = 0, fami = 0
    
    products.forEach(p => {
      egdc += p.inv_egdc || 0
      fami += p.inv_fami || 0
    })
    
    return [
      { name: 'EGDC', total: egdc, icon: '🏢' },
      { name: 'FAMI', total: fami, icon: '🏭' }
    ]
  }, [products])

  // Extract values from memoized calculations
  const { totalProducts, totalInventory } = basicStats
  const { lowStockProducts, outOfStockProducts } = stockAnalysis
  const { uniqueCategories, uniqueBrands } = uniqueValues
  const { totalValue, averagePrice } = financialStats

  const getStatusColor = (value: number, threshold: number, isGood: boolean = true) => {
    if (isGood) {
      return value >= threshold ? 'text-green-600 bg-green-50' : 'text-yellow-600 bg-yellow-50'
    } else {
      return value === 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
    }
  }

  return (
    <div className="bg-gradient-to-br from-blue-100/70 via-indigo-50 to-purple-100/70 rounded-xl shadow-xl border border-blue-200/50 p-4 sm:p-6 mb-6 backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="mb-2 sm:mb-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
            <span className="text-2xl mr-2 drop-shadow-sm">📊</span>
            Panel de Control
          </h2>
          <p className="text-sm text-gray-700 mt-1 font-medium">Información de inventario en tiempo real</p>
        </div>
        {filteredProducts.length !== totalProducts && (
          <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
            Filtered: {filteredProducts.length} of {totalProducts}
          </div>
        )}
      </div>

      {/* Main Stats Grid - Mobile Optimized */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
        
        {/* Total Products */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 sm:p-4 text-center text-white shadow-lg transform hover:scale-105 transition-transform">
          <div className="text-lg sm:text-2xl font-bold">{totalProducts}</div>
          <div className="text-xs sm:text-sm font-medium opacity-90 mt-1">
            <span className="hidden sm:inline">📦 </span>Productos
          </div>
        </div>

        {/* Total Inventory */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-3 sm:p-4 text-center text-white shadow-lg transform hover:scale-105 transition-transform">
          <div className="text-lg sm:text-2xl font-bold">{totalInventory.toLocaleString()}</div>
          <div className="text-xs sm:text-sm font-medium opacity-90 mt-1">
            <span className="hidden sm:inline">📍 </span>Stock Total
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl p-3 sm:p-4 text-center text-white shadow-lg transform hover:scale-105 transition-transform">
          <div className="text-lg sm:text-2xl font-bold">{lowStockProducts.length}</div>
          <div className="text-xs sm:text-sm font-medium opacity-90 mt-1">
            <span className="hidden sm:inline">⚠️ </span>Stock Bajo
          </div>
        </div>

        {/* Out of Stock */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-3 sm:p-4 text-center text-white shadow-lg transform hover:scale-105 transition-transform">
          <div className="text-lg sm:text-2xl font-bold">{outOfStockProducts.length}</div>
          <div className="text-xs sm:text-sm font-medium opacity-90 mt-1">
            <span className="hidden sm:inline">❌ </span>Sin Stock
          </div>
        </div>

        {/* Categories */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-3 sm:p-4 text-center text-white shadow-lg transform hover:scale-105 transition-transform">
          <div className="text-lg sm:text-2xl font-bold">{uniqueCategories.size}</div>
          <div className="text-xs sm:text-sm font-medium opacity-90 mt-1">
            <span className="hidden sm:inline">📂 </span>Categorías
          </div>
        </div>

        {/* Brands */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-3 sm:p-4 text-center text-white shadow-lg transform hover:scale-105 transition-transform">
          <div className="text-lg sm:text-2xl font-bold">{uniqueBrands.size}</div>
          <div className="text-xs sm:text-sm font-medium opacity-90 mt-1">
            <span className="hidden sm:inline">🏷️ </span>Marcas
          </div>
        </div>
      </div>

      {/* Secondary Stats - Mobile Optimized */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Inventory by Location */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center text-lg">
            <span className="text-xl mr-2">📍</span>
            Inventario por Ubicación
          </h3>
          <div className="space-y-3">
            {locationStats.map(location => (
              <div key={location.name} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="text-sm font-medium text-gray-700 flex items-center">
                  <span className="text-lg mr-2">{location.icon}</span>
                  {location.name}
                </span>
                <span className="font-bold text-gray-900 bg-white px-2 py-1 rounded-md text-sm">
                  {location.total.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Distribution */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center text-lg">
            <span className="text-xl mr-2">🛒</span>
            Disponibilidad por Plataforma
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <span className="text-sm font-medium text-blue-800 flex items-center">
                <span className="w-4 h-4 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full mr-3"></span>
                SHEIN
              </span>
              <span className="font-bold text-blue-900 bg-white px-2 py-1 rounded-md text-sm">{platformStats.shein}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              <span className="text-sm font-medium text-green-800 flex items-center">
                <span className="w-4 h-4 bg-gradient-to-r from-green-400 to-green-500 rounded-full mr-3"></span>
                Shopify
              </span>
              <span className="font-bold text-green-900 bg-white px-2 py-1 rounded-md text-sm">{platformStats.shopify}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
              <span className="text-sm font-medium text-yellow-800 flex items-center">
                <span className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full mr-3"></span>
                MercadoLibre
              </span>
              <span className="font-bold text-yellow-900 bg-white px-2 py-1 rounded-md text-sm">{platformStats.meli}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors">
              <span className="text-sm font-medium text-pink-800 flex items-center">
                <span className="w-4 h-4 bg-gradient-to-r from-pink-400 to-pink-500 rounded-full mr-3"></span>
                TikTok
              </span>
              <span className="font-bold text-pink-900 bg-white px-2 py-1 rounded-md text-sm">{platformStats.tiktok}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="mt-4 sm:mt-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl shadow-md border border-emerald-100 p-4 sm:p-5">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center text-lg">
          <span className="text-xl mr-2">💰</span>
          Resumen Financiero
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-emerald-100">
            <div className="text-xl sm:text-2xl font-bold text-emerald-600">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="text-xs sm:text-sm text-gray-600 mt-1 font-medium">Valor Total del Inventario</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-emerald-100">
            <div className="text-xl sm:text-2xl font-bold text-emerald-600">${averagePrice.toFixed(2)}</div>
            <div className="text-xs sm:text-sm text-gray-600 mt-1 font-medium">Costo Promedio por Producto</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow-sm border border-emerald-100">
            <div className="text-xl sm:text-2xl font-bold text-emerald-600">
              ${totalInventory > 0 ? (totalValue / totalInventory).toFixed(2) : '0.00'}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 mt-1 font-medium">Valor por Unidad</div>
          </div>
        </div>
      </div>

      {/* Quick Actions - Only show for out of stock products */}
      {outOfStockProducts.length > 0 && (
        <div className="mt-4 sm:mt-6 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl shadow-md p-4 sm:p-5">
          <h3 className="font-bold text-orange-800 mb-3 flex items-center text-lg">
            <span className="text-xl mr-2">⚠️</span>
            Attention Required
          </h3>
          <div className="space-y-2">
            <div className="flex items-center p-2 bg-red-100 border border-red-200 rounded-lg">
              <span className="text-red-600 mr-2">❌</span>
              <span className="text-sm font-medium text-red-800">
                {outOfStockProducts.length} productos con 0 stock
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
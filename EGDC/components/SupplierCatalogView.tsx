'use client'

import { useState, useEffect, useMemo } from 'react'
import { Product } from '@/lib/types'

interface SupplierCatalogProps {
  supplier_tenant_id: string
  supplier_name: string
  supplier_info?: {
    minimum_order?: number
    payment_terms?: string
    specialties?: string[]
    lead_time_days?: number
  }
  products: Product[]
  isLoading?: boolean
  onCreatePurchaseOrder: (items: CartItem[]) => void
}

interface CartItem {
  product: Product
  quantity: number
  unit_cost: number
  line_total: number
}

export default function SupplierCatalogView({
  supplier_tenant_id,
  supplier_name,
  supplier_info,
  products,
  isLoading = false,
  onCreatePurchaseOrder
}: SupplierCatalogProps) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const [sortBy, setSortBy] = useState<'marca' | 'precio' | 'categoria'>('marca')
  const [showCartSidebar, setShowCartSidebar] = useState(false)

  // Calculate cart totals
  const cartSummary = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.line_total, 0)
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)
    const meetsMinimum = supplier_info?.minimum_order ? totalItems >= supplier_info.minimum_order : true
    
    return {
      subtotal,
      totalItems,
      meetsMinimum,
      minimumRequired: supplier_info?.minimum_order || 0
    }
  }, [cart, supplier_info])

  // Sort products
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      switch (sortBy) {
        case 'marca':
          return a.marca.localeCompare(b.marca)
        case 'precio':
          return (a.costo || 0) - (b.costo || 0)
        case 'categoria':
          return a.categoria.localeCompare(b.categoria)
        default:
          return 0
      }
    })
  }, [products, sortBy])

  // Add to cart function
  const addToCart = (product: Product, quantity: number = 1) => {
    const unitCost = product.costo || 0
    const existingItemIndex = cart.findIndex(item => item.product.id === product.id)
    
    if (existingItemIndex >= 0) {
      const updatedCart = [...cart]
      updatedCart[existingItemIndex].quantity += quantity
      updatedCart[existingItemIndex].line_total = updatedCart[existingItemIndex].quantity * unitCost
      setCart(updatedCart)
    } else {
      const newItem: CartItem = {
        product,
        quantity,
        unit_cost: unitCost,
        line_total: quantity * unitCost
      }
      setCart([...cart, newItem])
    }
  }

  // Update cart item quantity
  const updateCartQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }
    
    setCart(cart.map(item => 
      item.product.id === productId 
        ? { ...item, quantity: newQuantity, line_total: newQuantity * item.unit_cost }
        : item
    ))
  }

  // Remove from cart
  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId))
  }

  // Clear cart
  const clearCart = () => {
    setCart([])
  }

  // Create purchase order
  const handleCreateOrder = () => {
    if (!cartSummary.meetsMinimum) {
      alert(`Pedido mínimo requerido: ${cartSummary.minimumRequired} pares. Actual: ${cartSummary.totalItems} pares.`)
      return
    }
    
    onCreatePurchaseOrder(cart)
    clearCart()
    setShowCartSidebar(false)
  }

  // Get inventory count based on supplier
  const getSupplierInventory = (product: Product) => {
    if (supplier_tenant_id.includes('fami')) return product.inv_fami || 0
    if (supplier_tenant_id.includes('osiel')) return product.inv_osiel || 0
    if (supplier_tenant_id.includes('molly')) return product.inv_molly || 0
    return 0
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando catálogo de {supplier_name}...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Supplier Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-lg mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">{supplier_name} - Catálogo Mayorista</h2>
            <div className="flex flex-wrap gap-4 text-blue-100">
              {supplier_info?.minimum_order && (
                <span>📦 Mín: {supplier_info.minimum_order} pares</span>
              )}
              {supplier_info?.payment_terms && (
                <span>💳 {supplier_info.payment_terms}</span>
              )}
              {supplier_info?.lead_time_days && (
                <span>🚚 Entrega: {supplier_info.lead_time_days} días</span>
              )}
            </div>
          </div>
          
          {/* Cart Button */}
          <button
            onClick={() => setShowCartSidebar(true)}
            className="relative bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            🛒 Carrito
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </button>
        </div>
        
        {/* Specialties */}
        {supplier_info?.specialties && (
          <div className="mt-4">
            <span className="text-blue-200 text-sm">Especialidades: </span>
            <div className="flex flex-wrap gap-2 mt-1">
              {supplier_info.specialties.map((specialty, index) => (
                <span key={index} className="bg-blue-500 bg-opacity-50 px-2 py-1 rounded text-sm">
                  {specialty}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {products.length} productos disponibles
          </span>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="marca">Ordenar por Marca</option>
            <option value="precio">Ordenar por Precio</option>
            <option value="categoria">Ordenar por Categoría</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 rounded text-sm ${viewMode === 'table' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
          >
            📋 Tabla
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 rounded text-sm ${viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
          >
            ⚏ Cuadrícula
          </button>
        </div>
      </div>

      {/* Products Display */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Mayorista</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disponible</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedProducts.map((product) => {
                  const inventory = getSupplierInventory(product)
                  const inCart = cart.find(item => item.product.id === product.id)
                  
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {product.marca} {product.modelo}
                          </div>
                          <div className="text-sm text-gray-500">
                            {product.categoria} • {product.color} • Talla {product.talla}
                          </div>
                          <div className="text-xs text-gray-400">
                            SKU: {product.sku}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-lg font-semibold text-green-600">
                          ${(product.costo || 0).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">Precio mayorista</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          inventory > 10 
                            ? 'bg-green-100 text-green-800' 
                            : inventory > 0 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {inventory} unidades
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {inventory > 0 ? (
                          <div className="flex items-center gap-2">
                            {inCart ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateCartQuantity(product.id, inCart.quantity - 1)}
                                  className="w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center font-medium">{inCart.quantity}</span>
                                <button
                                  onClick={() => updateCartQuantity(product.id, inCart.quantity + 1)}
                                  className="w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                                >
                                  +
                                </button>
                                <button
                                  onClick={() => removeFromCart(product.id)}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  Quitar
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(product)}
                                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                              >
                                + Agregar
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Sin stock</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedProducts.map((product) => {
            const inventory = getSupplierInventory(product)
            const inCart = cart.find(item => item.product.id === product.id)
            
            return (
              <div key={product.id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm">{product.marca} {product.modelo}</h3>
                  <p className="text-xs text-gray-500">{product.categoria} • {product.color}</p>
                  <p className="text-xs text-gray-400">Talla {product.talla}</p>
                </div>
                
                <div className="mb-3">
                  <div className="text-xl font-bold text-green-600">${(product.costo || 0).toFixed(2)}</div>
                  <div className="text-xs text-gray-500">Precio mayorista</div>
                </div>
                
                <div className="mb-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    inventory > 10 
                      ? 'bg-green-100 text-green-800' 
                      : inventory > 0 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {inventory} disponibles
                  </span>
                </div>
                
                {inventory > 0 ? (
                  inCart ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => updateCartQuantity(product.id, inCart.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-600 rounded"
                        >
                          -
                        </button>
                        <span className="font-medium">{inCart.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(product.id, inCart.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-600 rounded"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(product.id)}
                        className="w-full text-red-600 text-sm hover:text-red-800"
                      >
                        Quitar del carrito
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(product)}
                      className="w-full bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                    >
                      Agregar al carrito
                    </button>
                  )
                ) : (
                  <div className="text-center text-gray-400 text-sm py-2">Sin stock</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Cart Sidebar */}
      {showCartSidebar && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowCartSidebar(false)} />
          <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl flex flex-col">
            {/* Cart Header */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Carrito de Compras</h3>
                <button
                  onClick={() => setShowCartSidebar(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">{supplier_name}</p>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <div className="text-4xl mb-2">🛒</div>
                  <p>Tu carrito está vacío</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.product.id} className="border-b pb-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{item.product.marca} {item.product.modelo}</h4>
                          <p className="text-xs text-gray-500">{item.product.color} • Talla {item.product.talla}</p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-600 rounded text-sm"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-600 rounded text-sm"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">${item.line_total.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">${item.unit_cost.toFixed(2)} c/u</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="border-t p-4 space-y-4">
                {/* Order Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total de pares:</span>
                    <span className={`font-medium ${cartSummary.meetsMinimum ? 'text-green-600' : 'text-red-600'}`}>
                      {cartSummary.totalItems} / {cartSummary.minimumRequired} mín
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Subtotal:</span>
                    <span className="font-semibold">${cartSummary.subtotal.toFixed(2)}</span>
                  </div>
                  {!cartSummary.meetsMinimum && (
                    <p className="text-xs text-red-600">
                      Necesitas {cartSummary.minimumRequired - cartSummary.totalItems} pares más para el pedido mínimo
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={handleCreateOrder}
                    disabled={!cartSummary.meetsMinimum}
                    className={`w-full py-2 rounded font-medium ${
                      cartSummary.meetsMinimum
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Crear Orden de Compra
                  </button>
                  <button
                    onClick={clearCart}
                    className="w-full py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                  >
                    Vaciar Carrito
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
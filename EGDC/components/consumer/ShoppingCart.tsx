'use client'

import React, { useState, useEffect } from 'react'
import { X, Plus, Minus, ShoppingBag, Trash2, Heart, ArrowRight } from 'lucide-react'

interface CartItem {
  id: number
  productId: number
  quantity: number
  product: {
    id: number
    marca: string | null
    modelo: string | null
    color: string | null
    talla: string | null
    sku: string | null
    google_drive: string | null
    precio_shopify: number | null
    inventory_total: number | null
  }
}

interface ShoppingCartProps {
  isOpen: boolean
  onClose: () => void
  onCheckout: () => void
}

const ShoppingCart: React.FC<ShoppingCartProps> = ({ isOpen, onClose, onCheckout }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState<Set<number>>(new Set())

  // Fetch cart items
  useEffect(() => {
    if (isOpen) {
      fetchCartItems()
    }
  }, [isOpen])

  const fetchCartItems = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/consumer/cart')
      if (response.ok) {
        const data = await response.json()
        setCartItems(data.items || [])
      }
    } catch (error) {
      console.error('Error fetching cart items:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(itemId)
      return
    }

    setUpdating(prev => new Set(prev).add(itemId))
    
    try {
      const response = await fetch(`/api/consumer/cart/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity })
      })

      if (response.ok) {
        setCartItems(prev => 
          prev.map(item => 
            item.id === itemId ? { ...item, quantity: newQuantity } : item
          )
        )
      }
    } catch (error) {
      console.error('Error updating quantity:', error)
    } finally {
      setUpdating(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }

  const removeItem = async (itemId: number) => {
    setUpdating(prev => new Set(prev).add(itemId))
    
    try {
      const response = await fetch(`/api/consumer/cart/${itemId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setCartItems(prev => prev.filter(item => item.id !== itemId))
      }
    } catch (error) {
      console.error('Error removing item:', error)
    } finally {
      setUpdating(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }

  const moveToWishlist = async (itemId: number, productId: number) => {
    try {
      // Add to wishlist
      await fetch('/api/consumer/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      })

      // Remove from cart
      await removeItem(itemId)
    } catch (error) {
      console.error('Error moving to wishlist:', error)
    }
  }

  const clearCart = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/consumer/cart', {
        method: 'DELETE'
      })

      if (response.ok) {
        setCartItems([])
      }
    } catch (error) {
      console.error('Error clearing cart:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.product.precio_shopify || 0) * item.quantity
    }, 0)
  }

  const calculateShipping = () => {
    const subtotal = calculateSubtotal()
    return subtotal > 1000 ? 0 : 150 // Free shipping over $1000
  }

  const calculateTax = () => {
    return calculateSubtotal() * 0.16 // 16% IVA
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateShipping() + calculateTax()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Carrito de Compras</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <ShoppingBag className="w-16 h-16 mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Tu carrito está vacío</h3>
              <p className="text-center">Añade algunos productos para comenzar</p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {/* Items */}
              {cartItems.map((item) => (
                <div key={item.id} className="flex space-x-4 p-4 border border-gray-200 rounded-lg">
                  <img
                    src={item.product.google_drive || '/placeholder-shoe.jpg'}
                    alt={`${item.product.marca} ${item.product.modelo}`}
                    className="w-16 h-16 object-cover rounded"
                  />
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">
                      {item.product.marca} {item.product.modelo}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {item.product.color} - Talla {item.product.talla}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={updating.has(item.id)}
                          className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        
                        <span className="w-8 text-center font-medium">
                          {updating.has(item.id) ? '...' : item.quantity}
                        </span>
                        
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={updating.has(item.id) || (item.product.inventory_total && item.quantity >= item.product.inventory_total)}
                          className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-semibold">
                          ${((item.product.precio_shopify || 0) * item.quantity).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          ${item.product.precio_shopify?.toLocaleString()} c/u
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center space-x-4 mt-2">
                      <button
                        onClick={() => moveToWishlist(item.id, item.productId)}
                        className="flex items-center space-x-1 text-sm text-gray-600 hover:text-red-600 transition-colors"
                      >
                        <Heart className="w-4 h-4" />
                        <span>Guardar para después</span>
                      </button>
                      
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={updating.has(item.id)}
                        className="flex items-center space-x-1 text-sm text-gray-600 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Clear Cart */}
              {cartItems.length > 0 && (
                <button
                  onClick={clearCart}
                  className="w-full text-center text-sm text-gray-600 hover:text-red-600 py-2 transition-colors"
                >
                  Vaciar carrito
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="border-t bg-gray-50 p-6">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>${calculateSubtotal().toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span>Envío:</span>
                <span className={calculateShipping() === 0 ? 'text-green-600' : ''}>
                  {calculateShipping() === 0 ? 'GRATIS' : `$${calculateShipping().toLocaleString()}`}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span>IVA (16%):</span>
                <span>${calculateTax().toLocaleString()}</span>
              </div>
              
              <hr className="my-2" />
              
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>${calculateTotal().toLocaleString()}</span>
              </div>
              
              {calculateShipping() > 0 && (
                <p className="text-xs text-gray-600 text-center">
                  Envío gratis en compras mayores a $1,000
                </p>
              )}
            </div>
            
            <button
              onClick={onCheckout}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors"
            >
              <span>Proceder al Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            
            <button
              onClick={onClose}
              className="w-full mt-2 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Continuar comprando
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ShoppingCart
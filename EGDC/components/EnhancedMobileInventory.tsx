'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Product } from '@/lib/types'
import { useAccessibility } from './AccessibilityProvider'
import { useOfflineManager } from './OfflineManager'
import { Search, Filter, Plus, MoreVertical, Edit, Trash2, Camera, Share, BookmarkPlus } from 'lucide-react'

interface EnhancedMobileInventoryProps {
  products: Product[]
  onEdit: (product: Product) => void
  onDelete: (id: number) => void
  onAdd: () => void
  searchTerm: string
  onSearch: (term: string) => void
  showFilters: boolean
  onToggleFilters: () => void
}

interface TouchPosition {
  x: number
  y: number
}

export default function EnhancedMobileInventory({
  products,
  onEdit,
  onDelete,
  onAdd,
  searchTerm,
  onSearch,
  showFilters,
  onToggleFilters
}: EnhancedMobileInventoryProps) {
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null)
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
  const [touchStart, setTouchStart] = useState<TouchPosition | null>(null)
  const [touchEnd, setTouchEnd] = useState<TouchPosition | null>(null)
  const [vibrationSupported, setVibrationSupported] = useState(false)
  const [shareSupported, setShareSupported] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { language, announceMessage, reducedMotion } = useAccessibility()
  const { queueOfflineAction, isOnline } = useOfflineManager()

  // Check for device capabilities
  useEffect(() => {
    setVibrationSupported('vibrate' in navigator)
    setShareSupported('share' in navigator)
  }, [])

  // Handle touch gestures
  const handleTouchStart = useCallback((e: React.TouchEvent, productId: number) => {
    const touch = e.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
    setSelectedProduct(productId)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return
    
    const touch = e.touches[0]
    setTouchEnd({ x: touch.clientX, y: touch.clientY })
    
    const deltaX = touch.clientX - touchStart.x
    const deltaY = Math.abs(touch.clientY - touchStart.y)
    
    // Only consider horizontal swipes (reduce vertical scrolling interference)
    if (Math.abs(deltaX) > 50 && deltaY < 100) {
      if (deltaX > 0) {
        setSwipeDirection('right')
      } else {
        setSwipeDirection('left')
      }
      
      // Haptic feedback
      if (vibrationSupported && !reducedMotion) {
        navigator.vibrate(50)
      }
    }
  }, [touchStart, vibrationSupported, reducedMotion])

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd || !selectedProduct) return

    const deltaX = touchEnd.x - touchStart.x
    const deltaY = Math.abs(touchEnd.y - touchStart.y)

    // Significant horizontal swipe
    if (Math.abs(deltaX) > 100 && deltaY < 100) {
      const product = products.find(p => p.id === selectedProduct)
      if (product) {
        if (deltaX > 0) {
          // Right swipe - Edit
          onEdit(product)
          announceMessage(
            language === 'es' 
              ? `Editando ${product.marca} ${product.modelo}`
              : `Editing ${product.marca} ${product.modelo}`
          )
        } else {
          // Left swipe - Delete
          onDelete(product.id)
          announceMessage(
            language === 'es' 
              ? `Eliminando ${product.marca} ${product.modelo}`
              : `Deleting ${product.marca} ${product.modelo}`
          )
        }
        
        // Strong haptic feedback for action
        if (vibrationSupported && !reducedMotion) {
          navigator.vibrate([100, 50, 100])
        }
      }
    }

    // Reset touch state
    setTouchStart(null)
    setTouchEnd(null)
    setSwipeDirection(null)
    setSelectedProduct(null)
  }, [touchStart, touchEnd, selectedProduct, products, onEdit, onDelete, vibrationSupported, reducedMotion, language, announceMessage])

  // Voice search functionality
  const handleVoiceSearch = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      announceMessage(
        language === 'es' 
          ? 'Búsqueda por voz no disponible en este navegador'
          : 'Voice search not available in this browser'
      )
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.lang = language === 'es' ? 'es-ES' : 'en-US'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => {
      announceMessage(
        language === 'es' 
          ? 'Escuchando... Di lo que quieres buscar'
          : 'Listening... Say what you want to search for'
      )
      if (vibrationSupported) {
        navigator.vibrate(100)
      }
    }

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      onSearch(transcript)
      announceMessage(
        language === 'es' 
          ? `Buscando: ${transcript}`
          : `Searching for: ${transcript}`
      )
    }

    recognition.onerror = () => {
      announceMessage(
        language === 'es' 
          ? 'Error en la búsqueda por voz'
          : 'Voice search error'
      )
    }

    recognition.start()
  }, [language, announceMessage, onSearch, vibrationSupported])

  // Share product functionality
  const handleShareProduct = useCallback(async (product: Product) => {
    if (!shareSupported) {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(
          `${product.marca} ${product.modelo} - SKU: ${product.sku}`
        )
        announceMessage(
          language === 'es' 
            ? 'Información del producto copiada al portapapeles'
            : 'Product information copied to clipboard'
        )
      } catch (error) {
        console.error('Failed to copy to clipboard:', error)
      }
      return
    }

    try {
      await navigator.share({
        title: `${product.marca} ${product.modelo}`,
        text: `${product.marca} ${product.modelo} - SKU: ${product.sku}\nStock: ${product.inventory_total}`,
        url: window.location.href
      })
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error)
      }
    }
  }, [shareSupported, language, announceMessage])

  // Optimized product card with touch gestures
  const renderProductCard = (product: Product, index: number) => (
    <div
      key={product.id}
      className={`
        bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-3 p-4 
        transition-all duration-200 touch-target
        ${selectedProduct === product.id && swipeDirection ? 
          swipeDirection === 'right' ? 'transform translate-x-4 bg-green-50' : 'transform -translate-x-4 bg-red-50'
          : 'transform translate-x-0'
        }
        ${!reducedMotion ? 'hover:shadow-md active:scale-98' : ''}
      `}
      onTouchStart={(e) => handleTouchStart(e, product.id)}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="article"
      aria-labelledby={`product-${product.id}-title`}
      aria-describedby={`product-${product.id}-details`}
    >
      {/* Swipe Instructions */}
      {selectedProduct === product.id && swipeDirection && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 text-white rounded-lg z-10">
          <div className="text-center">
            <div className="text-2xl mb-2">
              {swipeDirection === 'right' ? '✏️' : '🗑️'}
            </div>
            <div className="text-sm font-medium">
              {swipeDirection === 'right' 
                ? (language === 'es' ? 'Editar' : 'Edit')
                : (language === 'es' ? 'Eliminar' : 'Delete')
              }
            </div>
          </div>
        </div>
      )}

      {/* Product Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 
            id={`product-${product.id}-title`}
            className="text-lg font-semibold text-gray-900 dark:text-white truncate"
          >
            {product.marca} {product.modelo}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {product.categoria} • {product.color} • {product.talla}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleShareProduct(product)}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors touch-target"
            aria-label={language === 'es' ? 'Compartir producto' : 'Share product'}
          >
            <Share className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => setSelectedProduct(selectedProduct === product.id ? null : product.id)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors touch-target"
            aria-label={language === 'es' ? 'Más opciones' : 'More options'}
            aria-expanded={selectedProduct === product.id}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Product Details Grid */}
      <div 
        id={`product-${product.id}-details`}
        className="grid grid-cols-2 gap-3 mb-3"
      >
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {language === 'es' ? 'SKU' : 'SKU'}
          </p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{product.sku}</p>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {language === 'es' ? 'Stock Total' : 'Total Stock'}
          </p>
          <p className={`text-sm font-medium ${
            product.inventory_total < 5 ? 'text-red-600' : 
            product.inventory_total < 10 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {product.inventory_total}
            {product.inventory_total < 5 && (
              <span className="ml-1 text-xs">⚠️</span>
            )}
          </p>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="border-t border-gray-100 dark:border-gray-600 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {language === 'es' ? 'Precios' : 'Prices'}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {language === 'es' ? 'Costo' : 'Cost'}: ${product.costo}
          </span>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="text-gray-500 dark:text-gray-400">EGDC</div>
            <div className="font-medium text-gray-900 dark:text-white">${product.precio_shopify}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500 dark:text-gray-400">SHEIN</div>
            <div className="font-medium text-gray-900 dark:text-white">${product.precio_shein}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500 dark:text-gray-400">MercadoLibre</div>
            <div className="font-medium text-gray-900 dark:text-white">${product.precio_meli}</div>
          </div>
        </div>
      </div>

      {/* Expanded Actions */}
      {selectedProduct === product.id && (
        <div className="border-t border-gray-100 dark:border-gray-600 pt-3 mt-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onEdit(product)
                setSelectedProduct(null)
              }}
              className="flex items-center justify-center space-x-2 bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors touch-target"
            >
              <Edit className="h-4 w-4" />
              <span>{language === 'es' ? 'Editar' : 'Edit'}</span>
            </button>
            
            <button
              onClick={() => {
                onDelete(product.id)
                setSelectedProduct(null)
              }}
              className="flex items-center justify-center space-x-2 bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-800 transition-colors touch-target"
            >
              <Trash2 className="h-4 w-4" />
              <span>{language === 'es' ? 'Eliminar' : 'Delete'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400 flex items-center">
          <span className="mr-1">⚠️</span>
          {language === 'es' ? 'Los cambios se sincronizarán cuando vuelva la conexión' : 'Changes will sync when connection returns'}
        </div>
      )}
    </div>
  )

  return (
    <div className="flex-1 min-h-0 bg-gray-50 dark:bg-gray-900">
      {/* Enhanced Mobile Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 sticky top-0 z-10">
        {/* Search Bar with Voice */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={language === 'es' ? 'Buscar productos...' : 'Search products...'}
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            aria-label={language === 'es' ? 'Buscar productos' : 'Search products'}
          />
          
          {/* Voice Search Button */}
          {('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) && (
            <button
              onClick={handleVoiceSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-blue-600 transition-colors touch-target"
              aria-label={language === 'es' ? 'Búsqueda por voz' : 'Voice search'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          )}
        </div>

        {/* Action Buttons Row */}
        <div className="flex space-x-2">
          <button
            onClick={onToggleFilters}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg border font-medium text-sm transition-colors touch-target ${
              showFilters 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
            aria-pressed={showFilters}
          >
            <Filter className="h-4 w-4" />
            <span>{language === 'es' ? 'Filtros' : 'Filters'}</span>
          </button>
          
          <button
            onClick={onAdd}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-green-600 text-white font-medium text-sm hover:bg-green-700 transition-colors touch-target"
          >
            <Plus className="h-4 w-4" />
            <span>{language === 'es' ? 'Agregar' : 'Add'}</span>
          </button>
        </div>

        {/* Swipe Instructions */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
          {language === 'es' 
            ? '← Desliza izquierda para eliminar • Desliza derecha para editar →'
            : '← Swipe left to delete • Swipe right to edit →'
          }
        </div>
      </div>

      {/* Product List with Touch Optimization */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain'
        }}
      >
        {products.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {language === 'es' ? 'No se encontraron productos' : 'No products found'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {language === 'es' 
                ? 'Intenta ajustar los filtros o el término de búsqueda'
                : 'Try adjusting your filters or search term'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product, index) => renderProductCard(product, index))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={onAdd}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 z-20 touch-target"
        style={{
          transform: !reducedMotion ? 'scale(1)' : undefined,
        }}
        onMouseDown={() => !reducedMotion && vibrationSupported && navigator.vibrate(50)}
        aria-label={language === 'es' ? 'Agregar nuevo producto' : 'Add new product'}
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  )
}
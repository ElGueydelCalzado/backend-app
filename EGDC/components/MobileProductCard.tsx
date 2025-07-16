'use client'

import { useState, useRef, useEffect } from 'react'
import { Product } from '@/lib/types'
import { ChevronDown, ChevronUp, Package, MapPin, DollarSign, Trash2 } from 'lucide-react'
import ImagePreviewModal from './ImagePreviewModal'

interface MobileProductCardProps {
  product: Product
  onEdit?: (product: Product) => void
  onSelect?: (productId: number, selected: boolean) => void
  onDelete?: (product: Product) => void
  isSelected?: boolean
}

export default function MobileProductCard({ 
  product, 
  onEdit, 
  onSelect, 
  onDelete,
  isSelected = false 
}: MobileProductCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [showDeletePanel, setShowDeletePanel] = useState(false)
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const currentX = useRef(0)
  const cardRef = useRef<HTMLDivElement>(null)

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent expansion when clicking on action buttons
    if ((e.target as HTMLElement).closest('.action-button')) {
      return
    }
    toggleExpanded()
  }

  const totalInventory = (product.inv_egdc || 0) + 
                        (product.inv_fami || 0) + 
                        (product.inv_osiel || 0) + 
                        (product.inv_molly || 0)

  const getStockStatus = () => {
    if (totalInventory === 0) return { status: 'Sin Stock', color: 'text-red-600 bg-red-50' }
    if (totalInventory < 5) return { status: 'Stock Bajo', color: 'text-yellow-600 bg-yellow-50' }
    return { status: 'En Stock', color: 'text-green-600 bg-green-50' }
  }

  const stockStatus = getStockStatus()

  // Simplified swipe detection using CSS and manual implementation
  const handleSwipeStart = (e: React.TouchEvent) => {
    if (isExpanded) return
    
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    currentX.current = e.touches[0].clientX
  }

  const handleSwipeMove = (e: React.TouchEvent) => {
    if (isExpanded) return

    currentX.current = e.touches[0].clientX
    const deltaX = currentX.current - startX.current
    const deltaY = e.touches[0].clientY - startY.current

    // Only engage swipe mode for clear horizontal movement
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 15) {
      setIsDragging(true)
      e.preventDefault()
      e.stopPropagation()
      
      // Only allow left swipe for delete
      if (deltaX < 0) {
        const clampedOffset = Math.max(deltaX, -100)
        setSwipeOffset(clampedOffset)
        setShowDeletePanel(true)
      } else {
        setSwipeOffset(0)
        setShowDeletePanel(false)
      }
    }
  }

  const handleSwipeEnd = (e: React.TouchEvent) => {
    if (!isDragging || isExpanded) return

    const deltaX = currentX.current - startX.current
    
    if (deltaX < -50) {
      setSwipeOffset(-100)
      setShowDeletePanel(true)
    } else {
      setSwipeOffset(0)
      setShowDeletePanel(false)
    }

    setIsDragging(false)
  }

  const handleDeleteClick = () => {
    console.log('🚨 DELETE BUTTON CLICKED - Product:', product.marca, product.modelo, 'ID:', product.id)
    console.log('🚨 onDelete function exists:', !!onDelete)
    setShowDeleteConfirm(true)
    // Reset card position
    setSwipeOffset(0)
    setShowDeletePanel(false)
  }

  const handleDeleteConfirm = () => {
    console.log('🚨 DELETE CONFIRMED - Product:', product.marca, product.modelo, 'ID:', product.id)
    console.log('🚨 Calling onDelete function...', !!onDelete)
    onDelete?.(product)
    setShowDeleteConfirm(false)
  }

  const handleDeleteCancel = () => {
    console.log('❌ Delete cancelled for product:', product.marca, product.modelo)
    setShowDeleteConfirm(false)
  }

  const resetCardPosition = () => {
    setSwipeOffset(0)
    setShowDeletePanel(false)
  }

  // Remove document-level touch prevention - let natural scrolling work

  return (
    <div 
      className="relative overflow-hidden rounded-xl"
      style={{ 
        overscrollBehaviorX: 'none',
        overscrollBehaviorY: 'auto',
        touchAction: 'pan-y',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {/* Delete Panel - Behind the card (right side) */}
      <div 
        className={`
          absolute inset-0 bg-red-500 flex items-center justify-end pr-6 rounded-xl
          transition-opacity duration-200
          ${showDeletePanel ? 'opacity-100' : 'opacity-0'}
        `}
      >
        <button
          onClick={handleDeleteClick}
          className="flex flex-col items-center text-white font-medium"
        >
          <Trash2 className="w-6 h-6 mb-1" />
          <span className="text-xs">Eliminar</span>
        </button>
      </div>


      {/* Main Card - Slides over the delete panel */}
      <div 
        ref={cardRef}
        className={`
          relative bg-white rounded-xl border-2 cursor-pointer
          ${isExpanded ? 'border-orange-300 shadow-lg' : 'border-gray-200 shadow-sm hover:shadow-md'}
          ${isSelected ? 'ring-2 ring-orange-400' : ''}
          transition-all duration-200
        `}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out'
        }}
        onClick={handleCardClick}
      >
      
      {/* Compact Card Content */}
      <div className="p-2">
        {/* Basic Product Info */}
        <div className="space-y-1">
          {/* Edit Button - Top Right Corner */}
          <div className="absolute -top-0.5 -right-0.5 z-10">
            <button
              className="action-button w-5 h-5 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center text-xs transition-colors shadow-sm"
              onClick={(e) => {
                e.stopPropagation()
                onEdit?.(product)
              }}
              title="Editar producto"
            >
              ✏️
            </button>
          </div>

          {/* Photo Button - Top Left Corner */}
          {product.google_drive && (
            <div className="absolute -top-0.5 -left-0.5 z-10">
              <button
                className="action-button w-5 h-5 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center text-xs transition-colors shadow-sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowImagePreview(true)
                }}
                title="Ver imágenes del producto"
              >
                📷
              </button>
            </div>
          )}

          {/* Marca, Modelo */}
          <div className="flex items-center" style={{ marginLeft: product.google_drive ? '32px' : '0' }}>
            <h3 className="font-semibold text-gray-900 text-base leading-tight">
              {product.marca}
              <span className="ml-2">{product.modelo}</span>
            </h3>
          </div>

          {/* Categoría, Color, Talla + Stock Status */}
          <div className="flex flex-wrap items-center gap-1 text-xs text-gray-600">
            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs">
              {product.categoria}
            </span>
            <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-xs">
              {product.color}
            </span>
            <span className="bg-gray-50 text-gray-700 px-1.5 py-0.5 rounded text-xs">
              T{product.talla}
            </span>
            <div className={`flex flex-col items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color} ml-auto`}>
              <span>{stockStatus.status}</span>
              <span className="font-bold text-gray-900">{totalInventory}</span>
            </div>
          </div>
        </div>

        {/* Expand/Collapse Indicator */}
        <div className="flex justify-center mt-1">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-2 space-y-2">
          
          {/* Product Details Section */}
          <div>
            <h4 className="font-medium text-gray-800 mb-1 flex items-center gap-1 text-sm">
              <Package className="w-3 h-3" />
              Detalles
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">SKU:</span>
                <p className="font-medium">{product.sku || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500">EAN:</span>
                <p className="font-medium">{product.ean || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500">Costo:</span>
                <p className="font-medium">${product.costo || 0}</p>
              </div>
              <div>
                <span className="text-gray-500">Fecha:</span>
                <p className="font-medium">
                  {product.fecha ? new Date(product.fecha).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Physical Dimensions */}
          {(product.height_cm || product.length_cm || product.thickness_cm || product.weight_grams) && (
            <div>
              <h4 className="font-medium text-gray-800 mb-1 flex items-center gap-1 text-sm">
                <span className="text-sm">📐</span>
                Dimensiones
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {product.height_cm && (
                  <div>
                    <span className="text-gray-500">Alto:</span>
                    <p className="font-medium">{product.height_cm} cm</p>
                  </div>
                )}
                {product.length_cm && (
                  <div>
                    <span className="text-gray-500">Largo:</span>
                    <p className="font-medium">{product.length_cm} cm</p>
                  </div>
                )}
                {product.thickness_cm && (
                  <div>
                    <span className="text-gray-500">Grosor:</span>
                    <p className="font-medium">{product.thickness_cm} cm</p>
                  </div>
                )}
                {product.weight_grams && (
                  <div>
                    <span className="text-gray-500">Peso:</span>
                    <p className="font-medium">{product.weight_grams}g</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Multi-Location Inventory */}
          <div>
            <h4 className="font-medium text-gray-800 mb-1 flex items-center gap-1 text-sm">
              <MapPin className="w-3 h-3" />
              Almacén
            </h4>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div className="flex justify-between p-1 bg-gray-50 rounded text-xs">
                <span>EGDC:</span>
                <span className="font-medium">{product.inv_egdc || 0}</span>
              </div>
              <div className="flex justify-between p-1 bg-gray-50 rounded text-xs">
                <span>FAMI:</span>
                <span className="font-medium">{product.inv_fami || 0}</span>
              </div>
              <div className="flex justify-between p-1 bg-gray-50 rounded text-xs">
                <span>Osiel:</span>
                <span className="font-medium">{product.inv_osiel || 0}</span>
              </div>
              <div className="flex justify-between p-1 bg-gray-50 rounded text-xs">
                <span>Molly:</span>
                <span className="font-medium">{product.inv_molly || 0}</span>
              </div>
            </div>
          </div>

          {/* Pricing Information */}
          <div>
            <h4 className="font-medium text-gray-800 mb-1 flex items-center gap-1 text-sm">
              <DollarSign className="w-3 h-3" />
              Precios
            </h4>
            <div className="grid grid-cols-3 gap-1 text-xs">
              <div className="flex flex-col items-center p-1 bg-orange-50 rounded">
                <span className="text-gray-600 text-xs">SHEIN</span>
                <span className="font-medium text-xs">${product.precio_shein || 0}</span>
              </div>
              <div className="flex flex-col items-center p-1 bg-green-50 rounded">
                <span className="text-gray-600 text-xs">Shopify</span>
                <span className="font-medium text-xs">${product.precio_shopify || 0}</span>
              </div>
              <div className="flex flex-col items-center p-1 bg-yellow-50 rounded">
                <span className="text-gray-600 text-xs">MeLi</span>
                <span className="font-medium text-xs">${product.precio_meli || 0}</span>
              </div>
            </div>
          </div>

          {/* Platform Availability */}
          <div>
            <h4 className="font-medium text-gray-800 mb-1 text-sm">Plataformas</h4>
            <div className="relative">
              {/* Gradient overlays for scroll indicators */}
              <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white via-white to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white via-white to-transparent z-10 pointer-events-none" />
              
              {/* Scrollable platform container */}
              <div className="flex gap-1 overflow-x-auto scrollbar-hide scroll-smooth py-0.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {product.shein && (
                  <span className="flex-shrink-0 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                    SHEIN
                  </span>
                )}
                {product.shopify && (
                  <span className="flex-shrink-0 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    Shopify
                  </span>
                )}
                {product.meli && (
                  <span className="flex-shrink-0 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                    MeLi
                  </span>
                )}
                {product.tiktok && (
                  <span className="flex-shrink-0 px-3 py-1.5 bg-black text-white rounded-full text-xs font-medium">
                    TikTok
                  </span>
                )}
                {product.upseller && (
                  <span className="flex-shrink-0 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    Upseller
                  </span>
                )}
                {product.go_trendier && (
                  <span className="flex-shrink-0 px-3 py-1.5 bg-pink-100 text-pink-700 rounded-full text-xs font-medium">
                    Go Trendier
                  </span>
                )}
              </div>
            </div>
          </div>

        </div>
      )}
      </div>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={showImagePreview}
        onClose={() => setShowImagePreview(false)}
        googleDriveUrl={product.google_drive || ''}
        productName={`${product.marca} ${product.modelo}`}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Eliminar Producto
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                ¿Está seguro de que desea eliminar <strong>{product.marca} {product.modelo}</strong>? Esta acción no se puede deshacer.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleDeleteCancel}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
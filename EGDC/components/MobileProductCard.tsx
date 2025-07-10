'use client'

import { useState } from 'react'
import { Product } from '@/lib/supabase'
import { ChevronDown, ChevronUp, Package, MapPin, DollarSign } from 'lucide-react'

interface MobileProductCardProps {
  product: Product
  onEdit?: (product: Product) => void
  onSelect?: (productId: number, selected: boolean) => void
  isSelected?: boolean
}

export default function MobileProductCard({ 
  product, 
  onEdit, 
  onSelect, 
  isSelected = false 
}: MobileProductCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

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
                        (product.inv_bodega_principal || 0) + 
                        (product.inv_tienda_centro || 0) + 
                        (product.inv_tienda_norte || 0) + 
                        (product.inv_tienda_sur || 0) + 
                        (product.inv_online || 0)

  const getStockStatus = () => {
    if (totalInventory === 0) return { status: 'Sin Stock', color: 'text-red-600 bg-red-50' }
    if (totalInventory < 5) return { status: 'Stock Bajo', color: 'text-yellow-600 bg-yellow-50' }
    return { status: 'En Stock', color: 'text-green-600 bg-green-50' }
  }

  const stockStatus = getStockStatus()

  return (
    <div 
      className={`
        bg-white rounded-xl border-2 transition-all duration-300 cursor-pointer
        ${isExpanded ? 'border-orange-300 shadow-lg' : 'border-gray-200 shadow-sm hover:shadow-md'}
        ${isSelected ? 'ring-2 ring-orange-400' : ''}
      `}
      onClick={handleCardClick}
    >
      {/* Compact Card Content */}
      <div className="p-3">
        {/* Basic Product Info */}
        <div className="space-y-2">
          {/* Marca, Modelo + Image Button */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-lg leading-tight">
              {product.marca}
              <span className="ml-2">{product.modelo}</span>
            </h3>
            {product.google_drive && (
              <button
                className="action-button flex-shrink-0 w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center text-sm transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(product.google_drive!, '_blank')
                }}
                title="Ver imágenes del producto"
              >
                📷
              </button>
            )}
          </div>

          {/* Categoría, Color, Talla + Stock Status */}
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
              {product.categoria}
            </span>
            <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded">
              {product.color}
            </span>
            <span className="bg-gray-50 text-gray-700 px-2 py-1 rounded">
              Talla {product.talla}
            </span>
            <div className={`flex flex-col items-center px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color} ml-auto`}>
              <span>{stockStatus.status}</span>
              <span className="font-bold text-gray-900">{totalInventory}</span>
            </div>
          </div>
        </div>

        {/* Expand/Collapse Indicator */}
        <div className="flex justify-center mt-2">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          
          {/* Product Details Section */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Detalles del Producto
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
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

          {/* Multi-Location Inventory */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Almacén
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span>EGDC:</span>
                <span className="font-medium">{product.inv_egdc || 0}</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span>FAMI:</span>
                <span className="font-medium">{product.inv_fami || 0}</span>
              </div>
            </div>
          </div>

          {/* Pricing Information */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Precios
            </h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex flex-col items-center p-2 bg-orange-50 rounded">
                <span className="text-gray-600">SHEIN</span>
                <span className="font-medium text-sm">${product.precio_shein || 0}</span>
              </div>
              <div className="flex flex-col items-center p-2 bg-green-50 rounded">
                <span className="text-gray-600">Shopify</span>
                <span className="font-medium text-sm">${product.precio_shopify || 0}</span>
              </div>
              <div className="flex flex-col items-center p-2 bg-yellow-50 rounded">
                <span className="text-gray-600">MeLi</span>
                <span className="font-medium text-sm">${product.precio_meli || 0}</span>
              </div>
            </div>
          </div>

          {/* Platform Availability */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Plataformas</h4>
            <div className="flex flex-wrap gap-2">
              {product.shein && (
                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                  SHEIN
                </span>
              )}
              {product.shopify && (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                  Shopify
                </span>
              )}
              {product.meli && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                  MercadoLibre
                </span>
              )}
              {product.tiktok && (
                <span className="px-2 py-1 bg-black text-white rounded-full text-xs">
                  TikTok
                </span>
              )}
              {product.upseller && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                  Upseller
                </span>
              )}
              {product.go_trendier && (
                <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full text-xs">
                  Go Trendier
                </span>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button 
              className="action-button w-full bg-orange-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-orange-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                onEdit?.(product)
              }}
            >
              Editar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
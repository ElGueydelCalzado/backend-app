'use client'

import { Product } from '@/lib/types'
import MobileProductCard from './MobileProductCard'

interface MobileProductCardListProps {
  products: Product[]
  onEdit?: (product: Product) => void
  onSelect?: (productId: number, selected: boolean) => void
  onDelete?: (product: Product) => void
  onCreateNew?: (afterProduct: Product) => void
  selectedProducts?: Set<number>
  loading?: boolean
}

export default function MobileProductCardList({
  products,
  onEdit,
  onSelect,
  onDelete,
  onCreateNew,
  selectedProducts = new Set(),
  loading = false
}: MobileProductCardListProps) {
  
  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(3)].map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="w-6 h-6 bg-gray-200 rounded"></div>
              <div className="w-16 h-6 bg-gray-200 rounded-full"></div>
            </div>
            <div className="space-y-3">
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="flex gap-2">
                <div className="h-6 bg-gray-200 rounded w-20"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
                <div className="h-6 bg-gray-200 rounded w-18"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2m13-8l-4 4 4 4M6 5l4 4-4 4" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay productos</h3>
        <p className="text-gray-500 text-sm max-w-sm">
          No se encontraron productos que coincidan con los filtros aplicados.
        </p>
      </div>
    )
  }

  return (
    <div 
      className="space-y-4 p-4"
      style={{ 
        overscrollBehaviorX: 'contain',
        overscrollBehaviorY: 'auto'
      }}
    >
      {/* Products Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-900">
          Productos ({products.length})
        </h2>
        {selectedProducts.size > 0 && (
          <div className="text-sm text-orange-600 font-medium">
            {selectedProducts.size} seleccionado{selectedProducts.size !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Product Cards */}
      <div className="space-y-2">
        {products.map((product) => (
          <MobileProductCard
            key={product.id}
            product={product}
            onEdit={onEdit}
            onSelect={onSelect}
            onDelete={onDelete}
            onCreateNew={onCreateNew}
            isSelected={selectedProducts.has(product.id)}
          />
        ))}
      </div>

      {/* Load More / Pagination could go here */}
      {products.length > 10 && (
        <div className="flex justify-center pt-6">
          <div className="text-sm text-gray-500">
            Mostrando {products.length} productos
          </div>
        </div>
      )}
    </div>
  )
}
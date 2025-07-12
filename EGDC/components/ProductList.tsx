import { useState } from 'react'
import { Product } from '@/lib/types'
import ProductCard from './ProductCard'

interface ProductListProps {
  products: Product[]
  onProductEdit: (index: number, field: keyof Product, value: string | number | null) => void
}

export default function ProductList({ products, onProductEdit }: ProductListProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedItems(newExpanded)
  }

  const handleEdit = (index: number, field: keyof Product, value: string | number | null) => {
    onProductEdit(index, field, value)
  }

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-gray-400 text-6xl mb-4">📦</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
        <p className="text-gray-500">
          Try adjusting your search or filter criteria to see more products.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* List Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            📋 Products ({products.length})
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <button
              onClick={() => setExpandedItems(new Set(products.map((_, i) => i)))}
              className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={() => setExpandedItems(new Set())}
              className="px-3 py-1 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Click on any product to view and edit detailed information
        </p>
      </div>

      {/* Product Cards */}
      <div className="space-y-3">
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            isExpanded={expandedItems.has(index)}
            onToggleExpand={() => toggleExpanded(index)}
            onEdit={(field, value) => handleEdit(index, field, value)}
          />
        ))}
      </div>

      {/* List Footer */}
      {products.length > 10 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-600">
            Showing {products.length} products. 
            {products.length > 50 && (
              <span className="text-blue-600 ml-1">
                Consider using filters to narrow down your results.
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  )
}
'use client'

import { useState } from 'react'
import { Product } from '@/lib/types'

interface BulkDeleteConfirmModalProps {
  isOpen: boolean
  products: Product[]
  onConfirm: () => void
  onCancel: () => void
}

export default function BulkDeleteConfirmModal({ 
  isOpen, 
  products, 
  onConfirm, 
  onCancel 
}: BulkDeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  if (!isOpen || products.length === 0) return null

  const handleConfirm = async () => {
    setIsDeleting(true)
    onConfirm()
    setIsDeleting(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
        {/* Content */}
        <div className="p-4 text-center">
          <p className="text-sm font-semibold text-gray-800 mb-1">
            ¿Seguro de que deseas eliminar {products.length} producto{products.length > 1 ? 's' : ''}?
          </p>
          <p className="text-xs text-gray-600 mb-3">
            Esta acción no se puede deshacer.
          </p>

          {/* Products List */}
          <div className="text-left text-xs text-gray-700 bg-gray-100 px-3 py-2 rounded mb-4 max-h-32 overflow-y-auto">
            <p className="font-semibold mb-1">Productos a eliminar:</p>
            {products.slice(0, 5).map((product, index) => (
              <div key={product.id} className="mb-1">
                • {product.marca} {product.modelo} ({product.color}, {product.talla})
              </div>
            ))}
            {products.length > 5 && (
              <div className="text-gray-500 italic">
                ... y {products.length - 5} más
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 py-3 bg-gray-50 flex justify-center gap-2 rounded-b-lg">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-3 py-1 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}
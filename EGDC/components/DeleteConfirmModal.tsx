'use client'

import { useState } from 'react'
import { Product } from '@/lib/supabase'

interface DeleteConfirmModalProps {
  isOpen: boolean
  product: Product | null
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirmModal({ 
  isOpen, 
  product, 
  onConfirm, 
  onCancel 
}: DeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  if (!isOpen || !product) return null

  const handleConfirm = async () => {
    setIsDeleting(true)
    onConfirm()
    setIsDeleting(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-xs w-full">
        {/* Content */}
        <div className="p-4 text-center">
          <p className="text-sm font-semibold text-gray-800 mb-1">
            ¿Seguro de que deseas eliminar el SKU?
          </p>
          <p className="text-xs text-gray-600 mb-3">
            Esta acción no se puede deshacer.
          </p>

          {/* SKU */}
          <div className="text-sm font-bold text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded mb-4">
            {product.sku || 'Sin SKU'}
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
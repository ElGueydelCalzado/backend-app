'use client'

import { useState } from 'react'
import { X, Upload, Download, FileText, AlertCircle } from 'lucide-react'

interface MobileImportExportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: () => void
  onExport: () => void
}

export default function MobileImportExportModal({
  isOpen,
  onClose,
  onImport,
  onExport
}: MobileImportExportModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Import / Export
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6">
          {/* Import Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Importar Productos</h3>
                <p className="text-sm text-gray-500">Cargar productos desde archivo Excel/CSV</p>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Formato requerido:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Archivo Excel (.xlsx) o CSV (.csv)</li>
                    <li>Columnas: categoria, marca, modelo, color, talla, sku, costo</li>
                    <li>SKU debe ser único para cada producto</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                onImport()
                onClose()
              }}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-5 h-5" />
              Seleccionar Archivo para Importar
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200"></div>

          {/* Export Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Download className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Exportar Productos</h3>
                <p className="text-sm text-gray-500">Descargar productos actuales a Excel</p>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-green-800">
                  <p className="font-medium mb-1">El archivo incluirá:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Todos los productos visibles con filtros actuales</li>
                    <li>Información completa: precios, inventario, plataformas</li>
                    <li>Formato Excel (.xlsx) listo para edición</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                onExport()
                onClose()
              }}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              <Download className="w-5 h-5" />
              Descargar Productos Actuales
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
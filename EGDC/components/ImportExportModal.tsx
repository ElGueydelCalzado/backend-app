'use client'

import { useState } from 'react'
import { X, Upload, Download, FileText, AlertCircle } from 'lucide-react'

interface ImportExportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: () => void
  onExport: (format: 'csv' | 'xlsx') => void
  selectedProductsCount?: number
}

type ImportExportTab = 'import' | 'export'

const TABS = [
  { id: 'import' as ImportExportTab, label: 'IMPORTAR', icon: '📤' },
  { id: 'export' as ImportExportTab, label: 'EXPORTAR', icon: '📥' }
]

export default function ImportExportModal({
  isOpen,
  onClose,
  onImport,
  onExport,
  selectedProductsCount = 0
}: ImportExportModalProps) {
  const [activeTab, setActiveTab] = useState<ImportExportTab>('import')

  if (!isOpen) return null

  const renderTabContent = () => {
    switch (activeTab) {
      case 'import':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Importar Productos</h3>
                <p className="text-sm text-gray-500">Cargar productos desde archivo Excel/CSV</p>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-2">Formato requerido:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Archivo Excel (.xlsx) o CSV (.csv)</li>
                    <li>Columnas: categoria, marca, modelo, color, talla, sku, costo</li>
                    <li>SKU debe ser único para cada producto</li>
                    <li>Los productos duplicados serán actualizados</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                onImport()
                onClose()
              }}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-5 h-5" />
              Seleccionar Archivo para Importar
            </button>
          </div>
        )
      
      case 'export':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Download className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Exportar Productos</h3>
                <p className="text-sm text-gray-500">
                  Descargar {selectedProductsCount > 0 ? `${selectedProductsCount} productos seleccionados` : 'todos los productos'} a Excel/CSV
                </p>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-green-800">
                  <p className="font-semibold mb-2">El archivo incluirá:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>{selectedProductsCount > 0 ? 'Productos seleccionados únicamente' : 'Todos los productos visibles con filtros actuales'}</li>
                    <li>Información completa: precios, inventario, plataformas</li>
                    <li>Datos listos para edición y reimportación</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  onExport('csv')
                  onClose()
                }}
                className="flex items-center justify-center gap-3 px-6 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                <span>📄</span>
                Descargar CSV
              </button>
              <button
                onClick={() => {
                  onExport('xlsx')
                  onClose()
                }}
                className="flex items-center justify-center gap-3 px-6 py-4 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
              >
                <span>📊</span>
                Descargar Excel
              </button>
            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Importar / Exportar</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-4 px-4 text-sm font-medium
                  transition-colors duration-200 border-b-2 border-transparent
                  ${activeTab === tab.id
                    ? 'text-blue-600 border-blue-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  )
}
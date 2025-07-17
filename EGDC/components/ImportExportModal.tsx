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
  const [isDragOver, setIsDragOver] = useState(false)

  if (!isOpen) return null

  // Simple drag & drop handlers - no useCallback to avoid React errors
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    const file = files[0] // Take first file only
    
    if (file) {
      // Same validation as file picker
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
      
      if (validTypes.includes(file.type) || file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        console.log('File dropped for import:', file.name, 'Size:', Math.round(file.size / 1024), 'KB')
        onImport()
        onClose()
      } else {
        alert('Por favor suelta un archivo válido (.xlsx, .xls, o .csv)')
      }
    }
  }

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

            {/* Template Download Button */}
            <button
              onClick={() => {
                // Create CSV template with proper headers and example data
                const headers = ['categoria', 'marca', 'modelo', 'color', 'talla', 'sku', 'costo']
                const exampleRows = [
                  'Zapatos,Nike,Air Max 90,Blanco,42,NIKE-AM90-WHT-42,150.00',
                  'Sandalias,Adidas,Cloudfoam,Negro,40,ADIDAS-CF-BLK-40,80.00',
                  'Botas,Timberland,6-inch Premium,Marrón,43,TIMB-6P-BRN-43,220.00'
                ]
                const csvContent = headers.join(',') + '\n' + exampleRows.join('\n')
                
                // Create and download file
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
                const url = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = 'plantilla-productos.csv'
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                window.URL.revokeObjectURL(url)
              }}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
            >
              <FileText className="w-5 h-5" />
              Descargar Plantilla CSV
            </button>

            {/* Drag & Drop Area */}
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                isDragOver 
                  ? 'border-blue-500 bg-blue-100' 
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                // Same file picker logic as the button below
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = '.xlsx,.xls,.csv'
                input.style.display = 'none'
                
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file) {
                    const validTypes = [
                      'text/csv',
                      'application/vnd.ms-excel',
                      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    ]
                    
                    if (validTypes.includes(file.type) || file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                      console.log('File selected via drag area:', file.name, 'Size:', Math.round(file.size / 1024), 'KB')
                      onImport()
                      onClose()
                    } else {
                      alert('Por favor selecciona un archivo válido (.xlsx, .xls, o .csv)')
                    }
                  }
                  document.body.removeChild(input)
                }
                
                document.body.appendChild(input)
                input.click()
              }}
            >
              <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragOver ? 'text-blue-600' : 'text-gray-400'}`} />
              <p className={`text-lg font-medium mb-2 ${isDragOver ? 'text-blue-700' : 'text-gray-700'}`}>
                {isDragOver ? '¡Suelta el archivo aquí!' : 'Arrastra tu archivo aquí o haz clic para seleccionar'}
              </p>
              <p className="text-sm text-gray-500">
                Archivos soportados: .xlsx, .xls, .csv (máximo 10MB)
              </p>
            </div>

            {/* File Selection Button */}
            <button
              onClick={() => {
                // Create file input element
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = '.xlsx,.xls,.csv'
                input.style.display = 'none'
                
                // Handle file selection
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file) {
                    // Validate file type
                    const validTypes = [
                      'text/csv',
                      'application/vnd.ms-excel',
                      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    ]
                    
                    if (validTypes.includes(file.type) || file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                      console.log('File selected for import:', file.name, 'Size:', Math.round(file.size / 1024), 'KB')
                      // Call the import handler
                      onImport()
                      onClose()
                    } else {
                      alert('Por favor selecciona un archivo válido (.xlsx, .xls, o .csv)')
                    }
                  }
                  // Clean up
                  document.body.removeChild(input)
                }
                
                // Add to DOM and trigger click
                document.body.appendChild(input)
                input.click()
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
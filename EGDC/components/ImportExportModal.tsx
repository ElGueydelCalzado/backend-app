'use client'

import { useState } from 'react'
import { X, Upload, Download, FileText, AlertCircle } from 'lucide-react'

interface ImportExportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportSuccess: (message: string) => void
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
  onImportSuccess,
  onExport,
  selectedProductsCount = 0
}: ImportExportModalProps) {
  const [activeTab, setActiveTab] = useState<ImportExportTab>('import')
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  if (!isOpen) return null

  // Handle actual file import processing
  const handleFileImport = async (file: File) => {
    try {
      setIsProcessing(true)
      
      // Create form data for upload
      const formData = new FormData()
      formData.append('file', file)
      
      // Call the bulk import API
      const response = await fetch('/api/inventory/bulk-import', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Use the new processed_count and message from upsert API
        const count = result.processed_count || result.imported_or_updated || result.imported_count || 'Productos'
        const message = result.message || `¡${count} productos procesados exitosamente!`
        onImportSuccess(message)
        onClose()
      } else {
        throw new Error(result.error || 'Error al procesar archivo')
      }
    } catch (error) {
      console.error('Import error:', error)
      onImportSuccess(`Error al importar: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setIsProcessing(false)
    }
  }

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
        handleFileImport(file)
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
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-800">
                  <p className="font-medium mb-1">UPSERT: Excel/CSV • REQUERIDO: categoria, marca, modelo, color, talla, sku • SKU existente=actualiza, SKU nuevo=crea • Preserva datos existentes</p>
                </div>
              </div>
            </div>

            {/* Template Download Button */}
            <button
              onClick={() => {
                // Create CSV template with ALL database columns - matching BulkImportModal
                const headers = [
                  'categoria', 'marca', 'modelo', 'color', 'talla', 'sku', 'ean', 
                  'height_cm', 'length_cm', 'thickness_cm', 'weight_grams', 'costo', 
                  'google_drive', 'shein_modifier', 'shopify_modifier', 'meli_modifier', 
                  'inv_egdc', 'inv_fami', 'shein', 'meli', 'shopify', 'tiktok', 'upseller', 'go_trendier'
                ]
                
                // Create example rows with proper data types
                const exampleRows = [
                  'Alpargatas,Nike,Air Max 90,Negro,25,NIKE-AM90-001,1234567890123,12.5,30.0,11.0,650,150.00,https://drive.google.com/file/123,1.5,2.0,2.5,10,5,true,false,true,false,false,false',
                  'Botas,Adidas,Stan Smith,Blanco,26,ADIDAS-SS-002,1234567890124,13.0,32.5,10.5,580,120.00,,1.6,2.1,2.6,8,3,false,true,true,true,false,false',
                  'Tenis,Puma,RS-X,Azul,27,PUMA-RSX-003,1234567890125,11.5,28.0,12.0,720,95.00,,1.4,1.9,2.4,15,7,true,true,false,false,true,true'
                ]
                
                const csvContent = headers.join(',') + '\n' + exampleRows.join('\n')
                
                // Create and download file
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
                const url = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = 'plantilla_productos_EGDC.csv'
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
                      handleFileImport(file)
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
              disabled={isProcessing}
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
                      handleFileImport(file)
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
              className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-semibold transition-colors ${
                isProcessing 
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Upload className="w-5 h-5" />
              {isProcessing ? 'Procesando archivo...' : 'Seleccionar Archivo para Importar'}
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
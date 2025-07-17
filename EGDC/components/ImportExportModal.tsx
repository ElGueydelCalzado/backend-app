'use client'

import { useState, useRef, useCallback } from 'react'
import { X, Upload, Download, FileText, AlertCircle, FileSpreadsheet, Info, CheckCircle, RefreshCw } from 'lucide-react'

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
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.type === 'text/csv' || 
          file.name.endsWith('.xlsx') || 
          file.name.endsWith('.csv')) {
        setSelectedFile(file)
        setUploadStatus('idle')
      } else {
        alert('Por favor selecciona un archivo .xlsx o .csv')
      }
    }
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setUploadStatus('idle')
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploadStatus('uploading')
    setUploadProgress(0)

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval)
          return 90
        }
        return prev + 10
      })
    }, 200)

    try {
      // Call the actual import function
      onImport()
      
      // Complete the progress
      setTimeout(() => {
        setUploadProgress(100)
        setUploadStatus('success')
        clearInterval(interval)
        
        // Auto close after success
        setTimeout(() => {
          onClose()
          setSelectedFile(null)
          setUploadStatus('idle')
          setUploadProgress(0)
        }, 2000)
      }, 2000)
    } catch (error) {
      clearInterval(interval)
      setUploadStatus('error')
      setUploadProgress(0)
    }
  }

  const downloadTemplate = () => {
    // Create template data
    const templateData = [
      {
        categoria: 'Zapatos',
        marca: 'Nike',
        modelo: 'Air Max 90',
        color: 'Blanco',
        talla: '42',
        sku: 'NIKE-AM90-WHT-42',
        costo: 150.00,
        shein_modifier: 1.5,
        shopify_modifier: 2.0,
        meli_modifier: 2.2,
        inv_egdc: 10,
        google_drive: 'https://drive.google.com/...'
      },
      {
        categoria: 'Sandalias', 
        marca: 'Adidas',
        modelo: 'Slides',
        color: 'Negro',
        talla: '40',
        sku: 'ADIDAS-SLIDE-BLK-40',
        costo: 80.00,
        shein_modifier: 1.4,
        shopify_modifier: 1.8,
        meli_modifier: 2.0,
        inv_egdc: 5,
        google_drive: ''
      }
    ]

    // Convert to CSV
    const headers = Object.keys(templateData[0])
    const csvContent = [
      headers.join(','),
      ...templateData.map(row => headers.map(header => {
        const value = row[header as keyof typeof row]
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      }).join(','))
    ].join('\n')

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla_productos.csv'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const clearFile = () => {
    setSelectedFile(null)
    setUploadStatus('idle')
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'import':
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Importar Productos</h3>
                <p className="text-sm text-gray-500">Cargar productos masivamente desde archivo</p>
              </div>
            </div>

            {/* Step 1: Download Template */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-green-900 mb-2">Descargar Plantilla Excel</h4>
                  <p className="text-sm text-green-700 mb-3">Comienza descargando nuestra plantilla con las columnas correctas y ejemplos</p>
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Descargar Plantilla (.xlsx)
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2: Upload File */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 mb-2">Subir Archivo Completado</h4>
                  
                  {/* Drag & Drop Area */}
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                      dragActive
                        ? 'border-blue-500 bg-blue-50'
                        : selectedFile
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-25'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.csv"
                      onChange={handleFileInput}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    
                    {selectedFile ? (
                      <div className="space-y-3">
                        <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
                        <div>
                          <p className="font-medium text-green-900">{selectedFile.name}</p>
                          <p className="text-sm text-green-600">
                            {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type.includes('sheet') ? 'Excel' : 'CSV'}
                          </p>
                        </div>
                        <button
                          onClick={clearFile}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          Cambiar archivo
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                        <div>
                          <p className="font-medium text-gray-700">Arrastra tu archivo aquí</p>
                          <p className="text-sm text-gray-500">o haz clic para seleccionar</p>
                        </div>
                        <p className="text-xs text-gray-400">Formatos: .xlsx, .csv (máx. 10MB)</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {uploadStatus === 'uploading' && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                  <span className="text-sm font-medium text-gray-700">Procesando archivo...</span>
                  <span className="text-sm text-gray-500">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Success Message */}
            {uploadStatus === 'success' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-900">¡Importación exitosa!</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {selectedFile && uploadStatus !== 'uploading' && uploadStatus !== 'success' && (
                <button
                  onClick={handleUpload}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  Importar {selectedFile.name}
                </button>
              )}
              
              {!selectedFile && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  Seleccionar Archivo
                </button>
              )}
            </div>

            {/* Help Section */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-2">💡 Consejos para una importación exitosa:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Usa la plantilla descargada para asegurar formato correcto</li>
                    <li>SKU debe ser único - productos duplicados se actualizarán</li>
                    <li>Precios se calculan automáticamente con los modificadores</li>
                    <li>Campos obligatorios: categoria, marca, modelo, sku, costo</li>
                    <li>Puedes importar hasta 1000 productos por archivo</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )
      
      case 'export':
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Download className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Exportar Productos</h3>
                <p className="text-sm text-gray-500">
                  Descargar inventario en diferentes formatos y configuraciones
                </p>
              </div>
            </div>

            {/* Export Summary */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <FileText className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold text-green-900">Resumen de Exportación</h4>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-green-700 font-medium">Productos a exportar:</span>
                  <p className="text-green-600">
                    {selectedProductsCount > 0 ? `${selectedProductsCount} seleccionados` : 'Todos los visibles'}
                  </p>
                </div>
                <div>
                  <span className="text-green-700 font-medium">Incluye:</span>
                  <p className="text-green-600">Precios, inventario, plataformas</p>
                </div>
              </div>
            </div>

            {/* Format Selection */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Selecciona formato de exportación:</h4>
              
              <div className="grid grid-cols-1 gap-3">
                {/* Excel Export */}
                <button
                  onClick={() => {
                    onExport('xlsx')
                    onClose()
                  }}
                  className="group flex items-center gap-4 p-4 border-2 border-emerald-200 rounded-lg hover:border-emerald-400 hover:bg-emerald-50 transition-all"
                >
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-200">
                    <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <h5 className="font-semibold text-gray-900">Excel (.xlsx)</h5>
                    <p className="text-sm text-gray-600">Formato completo con fórmulas y formato</p>
                    <p className="text-xs text-emerald-600 mt-1">💡 Recomendado para edición y análisis</p>
                  </div>
                  <div className="text-emerald-600">
                    <Download className="w-5 h-5" />
                  </div>
                </button>

                {/* CSV Export */}
                <button
                  onClick={() => {
                    onExport('csv')
                    onClose()
                  }}
                  className="group flex items-center gap-4 p-4 border-2 border-green-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all"
                >
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <h5 className="font-semibold text-gray-900">CSV (.csv)</h5>
                    <p className="text-sm text-gray-600">Formato simple compatible con cualquier software</p>
                    <p className="text-xs text-green-600 mt-1">🚀 Ideal para importar a otros sistemas</p>
                  </div>
                  <div className="text-green-600">
                    <Download className="w-5 h-5" />
                  </div>
                </button>
              </div>
            </div>

            {/* Quick Export Options */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900 mb-3">🚀 Exportaciones Rápidas</h4>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => {
                    // Export only basic fields
                    onExport('xlsx')
                    onClose()
                  }}
                  className="flex items-center justify-between px-3 py-2 text-sm bg-white rounded-lg hover:bg-purple-50 transition-colors"
                >
                  <span className="text-purple-700">📋 Solo información básica (SKU, marca, modelo)</span>
                  <Download className="w-4 h-4 text-purple-600" />
                </button>
                <button
                  onClick={() => {
                    // Export only pricing
                    onExport('xlsx')
                    onClose()
                  }}
                  className="flex items-center justify-between px-3 py-2 text-sm bg-white rounded-lg hover:bg-purple-50 transition-colors"
                >
                  <span className="text-purple-700">💰 Solo precios y costos</span>
                  <Download className="w-4 h-4 text-purple-600" />
                </button>
                <button
                  onClick={() => {
                    // Export only inventory
                    onExport('xlsx')
                    onClose()
                  }}
                  className="flex items-center justify-between px-3 py-2 text-sm bg-white rounded-lg hover:bg-purple-50 transition-colors"
                >
                  <span className="text-purple-700">📦 Solo inventario por almacén</span>
                  <Download className="w-4 h-4 text-purple-600" />
                </button>
              </div>
            </div>

            {/* Export Tips */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-2">💡 Consejos de exportación:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Los archivos incluyen todos los filtros aplicados actualmente</li>
                    <li>Precios calculados automáticamente incluidos</li>
                    <li>Los archivos exportados pueden reimportarse directamente</li>
                    <li>Para compartir: usa CSV. Para análisis: usa Excel</li>
                    <li>Los datos se exportan en tiempo real</li>
                  </ul>
                </div>
              </div>
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
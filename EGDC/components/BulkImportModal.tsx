'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'

interface BulkImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (importedCount: number) => void
  existingProducts?: ParsedProduct[]
}

interface ParsedProduct {
  categoria: string | null
  marca: string | null
  modelo: string | null
  color: string | null
  talla: string | null
  sku: string | null
  ean?: string | null
  // Physical dimensions and weight
  height_cm?: number | null
  length_cm?: number | null
  thickness_cm?: number | null
  weight_grams?: number | null
  costo?: number | null
  google_drive?: string | null
  shein_modifier?: number | null
  shopify_modifier?: number | null
  meli_modifier?: number | null
  inv_egdc?: number | null
  inv_fami?: number | null
  shein?: boolean | null
  meli?: boolean | null
  shopify?: boolean | null
  tiktok?: boolean | null
  upseller?: boolean | null
  go_trendier?: boolean | null
}

interface ImportError {
  row: number
  field: string
  message: string
  value: any
}

export default function BulkImportModal({ isOpen, onClose, onSuccess, existingProducts = [] }: BulkImportModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedProduct[]>([])
  const [errors, setErrors] = useState<ImportError[]>([])
  const [importing, setImporting] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const downloadTemplate = () => {
    const headers = [
      'categoria', 'marca', 'modelo', 'color', 'talla', 'sku', 'ean', 'height_cm', 'length_cm', 'thickness_cm', 'weight_grams', 'costo', 'google_drive', 'shein_modifier', 'shopify_modifier', 'meli_modifier', 'inv_egdc', 'inv_fami', 'shein', 'meli', 'shopify', 'tiktok', 'upseller', 'go_trendier'
    ]
    
    const csvContent = headers.join(',') + '\n' +
      'Alpargatas,Nike,Air Max 90,Negro,25,NIKE-AM90-001,1234567890123,12.5,30.0,11.0,650,150.00,https://drive.google.com/file/123,1.5,2.0,2.5,10,5,true,false,true,false,false,false' + '\n' +
      'Botas,Adidas,Stan Smith,Blanco,26,ADIDAS-SS-002,1234567890124,13.0,32.5,10.5,580,120.00,,1.6,2.1,2.6,8,3,false,true,true,true,false,false' + '\n' +
      'Tenis,Puma,RS-X,Azul,27,PUMA-RSX-003,1234567890125,11.5,28.0,12.0,720,95.00,,1.4,1.9,2.4,15,7,true,true,false,false,true,true'
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla_productos_EGDC.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const parseFileData = (data: any[][]): ParsedProduct[] => {
    if (!data || data.length < 2) return []

    const headers = data[0].map((h: any) => String(h).trim().toLowerCase())
    console.log('📊 Headers found:', headers)
    const products: ParsedProduct[] = []
    const newErrors: ImportError[] = []

    // Check for duplicate SKUs within the import file
    const skuSet = new Set<string>()
    const eanSet = new Set<string>()

    // Get existing SKUs and EANs for duplicate checking
    const existingSKUs = new Set(existingProducts.map(p => p.sku).filter(Boolean))
    const existingEANs = new Set(existingProducts.map(p => p.ean).filter(Boolean))

    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      
      // Skip empty rows
      if (!row || row.every(cell => !cell || String(cell).trim() === '')) {
        continue
      }
      
      const product: any = {}
      
      // Debug problematic rows
      if (i >= 70 && i <= 80) {
        console.log(`🔍 Row ${i + 1}:`, row)
      }

      headers.forEach((header, index) => {
        const rawValue = row[index]
        const value = rawValue !== null && rawValue !== undefined ? String(rawValue).trim() : ''
        
        switch (header) {
          case 'costo':
          case 'shein_modifier':
          case 'shopify_modifier':
          case 'meli_modifier':
          case 'height_cm':
          case 'length_cm':
          case 'thickness_cm':
            product[header] = value ? parseFloat(value) : null
            if (value && isNaN(parseFloat(value))) {
              newErrors.push({
                row: i,
                field: header,
                message: 'Debe ser un número válido',
                value
              })
            }
            break
          case 'inv_egdc':
          case 'inv_fami':
          case 'weight_grams':
            product[header] = value ? parseInt(value) : (header === 'weight_grams' ? null : 0)
            if (value && isNaN(parseInt(value))) {
              newErrors.push({
                row: i,
                field: header,
                message: 'Debe ser un número entero',
                value
              })
            }
            break
          case 'shein':
          case 'meli':
          case 'shopify':
          case 'tiktok':
          case 'upseller':
          case 'go_trendier':
            product[header] = value.toLowerCase() === 'true' || value === '1'
            break
          default:
            product[header] = value
        }
      })

      // Debug parsed product for problematic rows
      if (i >= 70 && i <= 80) {
        console.log(`📋 Row ${i + 1} product:`, {
          categoria: product.categoria,
          marca: product.marca,
          modelo: product.modelo,
          color: product.color,
          talla: product.talla,
          sku: product.sku
        })
      }

      // Validate required fields
      const requiredFields = ['categoria', 'marca', 'modelo', 'color', 'talla', 'sku']
      requiredFields.forEach(field => {
        const fieldValue = product[field]
        const isValid = fieldValue !== null && fieldValue !== undefined && fieldValue !== '' && String(fieldValue).trim() !== ''
        
        if (!isValid) {
          // Debug logging for problematic rows
          if (i >= 70 && i <= 80) {
            console.log(`❌ Row ${i + 1}, Field "${field}": "${fieldValue}" (type: ${typeof fieldValue})`)
          }
          newErrors.push({
            row: i + 1, // Add 1 to show correct Excel row number
            field,
            message: 'Campo requerido',
            value: fieldValue
          })
        }
      })

      // Check for duplicate SKUs
      if (product.sku && product.sku.trim() !== '') {
        if (existingSKUs.has(product.sku)) {
          newErrors.push({
            row: i + 1, // Add 1 to show correct Excel row number
            field: 'sku',
            message: 'SKU ya existe en la base de datos',
            value: product.sku
          })
        } else if (skuSet.has(product.sku)) {
          newErrors.push({
            row: i + 1, // Add 1 to show correct Excel row number
            field: 'sku',
            message: 'SKU duplicado en el archivo',
            value: product.sku
          })
        } else {
          skuSet.add(product.sku)
        }
      }

      // Check for duplicate EANs
      if (product.ean && product.ean.trim() !== '') {
        if (existingEANs.has(product.ean)) {
          newErrors.push({
            row: i + 1, // Add 1 to show correct Excel row number
            field: 'ean',
            message: 'EAN ya existe en la base de datos',
            value: product.ean
          })
        } else if (eanSet.has(product.ean)) {
          newErrors.push({
            row: i + 1, // Add 1 to show correct Excel row number
            field: 'ean',
            message: 'EAN duplicado en el archivo',
            value: product.ean
          })
        } else {
          eanSet.add(product.ean)
        }
      }

      products.push(product as ParsedProduct)
    }

    setErrors(newErrors)
    return products
  }

  const parseCSV = (text: string): ParsedProduct[] => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []

    const data = lines.map(line => {
      // Simple CSV parsing - could be enhanced for quoted fields
      return line.split(',').map(cell => cell.trim())
    })

    return parseFileData(data)
  }

  const parseExcel = (buffer: ArrayBuffer): ParsedProduct[] => {
    try {
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      
      return parseFileData(data as any[][])
    } catch (error) {
      console.error('Excel parsing error:', error)
      setErrors([{
        row: 1,
        field: 'file',
        message: 'Error al leer archivo Excel',
        value: error instanceof Error ? error.message : 'Error desconocido'
      }])
      return []
    }
  }

  const processFile = (selectedFile: File) => {
    setFile(selectedFile)
    
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase()
    
    if (fileExtension === 'csv') {
      // Handle CSV files
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const parsed = parseCSV(text)
        setParsedData(parsed)
        setStep('preview')
      }
      reader.readAsText(selectedFile)
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Handle Excel files
      const reader = new FileReader()
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer
        const parsed = parseExcel(buffer)
        setParsedData(parsed)
        setStep('preview')
      }
      reader.readAsArrayBuffer(selectedFile)
    } else {
      setErrors([{
        row: 1,
        field: 'file',
        message: 'Formato de archivo no soportado. Use CSV, XLSX o XLS.',
        value: selectedFile.name
      }])
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return
    processFile(selectedFile)
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const selectedFile = files[0]
      processFile(selectedFile)
    }
  }

  const handleImport = async () => {
    if (errors.length > 0) {
      alert('Por favor corrige los errores antes de importar')
      return
    }

    setImporting(true)
    try {
      const response = await fetch('/api/inventory/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ products: parsedData }),
        // Increase timeout for large imports
        signal: AbortSignal.timeout(300000) // 5 minutes
      })

      const result = await response.json()

      if (!response.ok) {
        if (response.status === 409 && result.duplicates) {
          // Handle duplicate errors specifically
          const duplicateErrors = result.duplicates.map((dup: any) => ({
            row: dup.row,
            field: dup.field,
            message: dup.error,
            value: dup.sku || dup.ean
          }))
          setErrors(duplicateErrors)
          alert(`Se encontraron ${duplicateErrors.length} productos duplicados. Revisa los errores y corrige el archivo.`)
          return
        }
        throw new Error(result.error || 'Error en la importación')
      }

      onSuccess(result.imported || parsedData.length)
      handleClose()

    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al importar productos')
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    setStep('upload')
    setFile(null)
    setParsedData([])
    setErrors([])
    setImporting(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <span className="text-6xl">📤</span>
        <h3 className="text-xl font-bold text-gray-800 mt-4">Importación Masiva</h3>
        <p className="text-gray-600 mt-2">Carga múltiples productos desde un archivo CSV</p>
      </div>

      <div className="space-y-4">
        <button
          onClick={downloadTemplate}
          className="w-full px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center gap-2"
        >
          <span>📥</span>
          Descargar Plantilla CSV
        </button>

        <div 
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            isDragOver 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="cursor-pointer">
            <div className="space-y-2">
              <div className={`text-4xl ${isDragOver ? 'animate-bounce' : ''}`}>
                {isDragOver ? '📤' : '📁'}
              </div>
              <p className={`text-lg font-medium ${isDragOver ? 'text-blue-700' : 'text-gray-600'}`}>
                {isDragOver ? 'Suelta el archivo aquí' : 'Seleccionar archivo o arrastrarlo aquí'}
              </p>
              <p className="text-sm text-gray-500">
                Formatos soportados: .csv, .xlsx, .xls
              </p>
            </div>
          </label>
        </div>
      </div>
    </div>
  )

  const renderPreviewStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Vista Previa</h3>
          <p className="text-sm text-gray-600">
            {parsedData.length} productos encontrados
            {errors.length > 0 && (
              <span className="text-red-600 ml-2">• {errors.length} errores</span>
            )}
          </p>
        </div>
        <button
          onClick={() => setStep('upload')}
          className="px-3 py-1 text-gray-600 hover:text-gray-800 transition-colors"
        >
          ← Volver
        </button>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-32 overflow-y-auto">
          <h4 className="font-medium text-red-800 mb-2">Errores encontrados:</h4>
          <div className="space-y-1 text-sm">
            {errors.slice(0, 10).map((error, index) => (
              <p key={index} className="text-red-700">
                Fila {error.row}, Campo "{error.field}": {error.message}
              </p>
            ))}
            {errors.length > 10 && (
              <p className="text-red-600 font-medium">
                ...y {errors.length - 10} errores más
              </p>
            )}
          </div>
        </div>
      )}

      <div className="border border-gray-200 rounded-lg max-h-64 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">SKU</th>
              <th className="px-3 py-2 text-left">Categoría</th>
              <th className="px-3 py-2 text-left">Marca</th>
              <th className="px-3 py-2 text-left">Modelo</th>
              <th className="px-3 py-2 text-left">Costo</th>
            </tr>
          </thead>
          <tbody>
            {parsedData.slice(0, 20).map((product, index) => (
              <tr key={index} className="border-t border-gray-100">
                <td className="px-3 py-2">{product.sku}</td>
                <td className="px-3 py-2">{product.categoria}</td>
                <td className="px-3 py-2">{product.marca}</td>
                <td className="px-3 py-2">{product.modelo}</td>
                <td className="px-3 py-2">${product.costo || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {parsedData.length > 20 && (
          <div className="px-3 py-2 bg-gray-50 text-center text-sm text-gray-600">
            ...y {parsedData.length - 20} productos más
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-100 to-purple-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Importación Masiva</h2>
            <button
              onClick={handleClose}
              disabled={importing}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'upload' && renderUploadStep()}
          {step === 'preview' && renderPreviewStep()}
        </div>

        {/* Footer */}
        {step === 'preview' && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between">
            <button
              onClick={() => setStep('upload')}
              disabled={importing}
              className="px-4 py-2 text-gray-600 font-medium disabled:opacity-50"
            >
              ← Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={importing || errors.length > 0}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {importing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Importando...
                </>
              ) : (
                <>
                  <span>📤</span>
                  Importar {parsedData.length} Productos
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
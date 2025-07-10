'use client'

import { useState, useEffect } from 'react'
import { Product } from '@/lib/supabase'

interface ProductFormData {
  categoria: string
  marca: string
  modelo: string
  colores: string
  tallas: string[] // Array of selected sizes
  costo: number | null
  imagenes: File[]
}

interface ProductCollectionWizardProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  allData: Product[]
}

const initialFormData: ProductFormData = {
  categoria: '',
  marca: '',
  modelo: '',
  colores: '',
  tallas: [],
  costo: null,
  imagenes: []
}

// Available sizes from 15 to 29
const AVAILABLE_SIZES = Array.from({ length: 15 }, (_, i) => (i + 15).toString())

const STEPS = [
  { id: 1, title: 'Categoría', icon: '📂' },
  { id: 2, title: 'Marca', icon: '🏷️' },
  { id: 3, title: 'Modelo', icon: '👟' },
  { id: 4, title: 'Colores', icon: '🎨' },
  { id: 5, title: 'Tallas', icon: '📏' },
  { id: 6, title: 'Costo', icon: '💰' },
  { id: 7, title: 'Imágenes', icon: '📸' }
]

export default function ProductCollectionWizard({ 
  isOpen, 
  onClose, 
  onSuccess, 
  allData 
}: ProductCollectionWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<ProductFormData>(initialFormData)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>('')

  if (!isOpen) return null

  // Get unique categories from existing data
  const existingCategories = Array.from(
    new Set(allData.map(p => p.categoria).filter(Boolean))
  ).sort()

  const updateFormData = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.categoria) {
          setError('Por favor selecciona una categoría')
          return false
        }
        break
      case 2:
        if (!formData.marca.trim()) {
          setError('Por favor ingresa la marca')
          return false
        }
        break
      case 3:
        if (!formData.modelo.trim()) {
          setError('Por favor ingresa el modelo')
          return false
        }
        break
      case 4:
        if (!formData.colores.trim()) {
          setError('Por favor ingresa los colores')
          return false
        }
        break
      case 5:
        if (formData.tallas.length === 0) {
          setError('Por favor selecciona al menos una talla')
          return false
        }
        break
      case 6:
        if (!formData.costo || formData.costo <= 0) {
          setError('Por favor ingresa un costo válido')
          return false
        }
        break
      case 7:
        if (formData.imagenes.length === 0) {
          setError('Por favor selecciona al menos una imagen')
          return false
        }
        break
    }
    setError('')
    return true
  }

  const nextStep = () => {
    if (validateCurrentStep()) {
      if (currentStep < STEPS.length) {
        setCurrentStep(prev => prev + 1)
      } else {
        handleSubmit()
      }
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
      setError('')
    }
  }

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return

    setSubmitting(true)
    try {
      // Prepare data for n8n
      const n8nData = {
        categoria: formData.categoria,
        marca: formData.marca,
        modelo: formData.modelo,
        colores: formData.colores,
        tallas: formData.tallas,
        costo: formData.costo,
        timestamp: new Date().toISOString(),
        // Note: For images, we'd need to upload them first or convert to base64
        imagenes_count: formData.imagenes.length
      }

      // TODO: Replace with your actual n8n webhook URL
      const n8nWebhookUrl = 'https://your-n8n-instance.com/webhook/product-collection'
      
      console.log('Sending to n8n:', n8nData)
      
      // For now, simulate the API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Uncomment when you have the actual n8n webhook URL:
      /*
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(n8nData)
      })

      if (!response.ok) {
        throw new Error(`Error sending to n8n: ${response.statusText}`)
      }
      */

      // Reset form and close
      setFormData(initialFormData)
      setCurrentStep(1)
      setError('')
      onSuccess()
      onClose()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar datos')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      setFormData(initialFormData)
      setCurrentStep(1)
      setError('')
      onClose()
    }
  }

  const handleImageUpload = (files: FileList | null) => {
    if (files) {
      const imageFiles = Array.from(files).filter(file => 
        file.type.startsWith('image/')
      )
      updateFormData('imagenes', imageFiles)
    }
  }

  const toggleSize = (size: string) => {
    const currentTallas = formData.tallas
    if (currentTallas.includes(size)) {
      updateFormData('tallas', currentTallas.filter(t => t !== size))
    } else {
      updateFormData('tallas', [...currentTallas, size])
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <span className="text-6xl">📂</span>
              <h3 className="text-xl font-bold text-gray-800 mt-4">Elige la Categoría</h3>
              <p className="text-gray-600 mt-2">Selecciona la categoría del producto</p>
            </div>
            <select
              value={formData.categoria}
              onChange={(e) => updateFormData('categoria', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none text-lg"
            >
              <option value="">Seleccionar categoría...</option>
              {existingCategories.map(categoria => categoria && (
                <option key={categoria} value={categoria}>{categoria}</option>
              ))}
            </select>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <span className="text-6xl">🏷️</span>
              <h3 className="text-xl font-bold text-gray-800 mt-4">Escribe la Marca</h3>
              <p className="text-gray-600 mt-2">Ingresa el nombre de la marca</p>
            </div>
            <input
              type="text"
              value={formData.marca}
              onChange={(e) => updateFormData('marca', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none text-lg"
              placeholder="Ej: Nike, Adidas, Puma..."
              autoFocus
            />
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <span className="text-6xl">👟</span>
              <h3 className="text-xl font-bold text-gray-800 mt-4">Escribe el Modelo</h3>
              <p className="text-gray-600 mt-2">Ingresa el modelo del producto</p>
            </div>
            <input
              type="text"
              value={formData.modelo}
              onChange={(e) => updateFormData('modelo', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none text-lg"
              placeholder="Ej: Air Max 90, Stan Smith..."
              autoFocus
            />
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <span className="text-6xl">🎨</span>
              <h3 className="text-xl font-bold text-gray-800 mt-4">Escribe los Colores</h3>
              <p className="text-gray-600 mt-2">Describe los colores disponibles</p>
            </div>
            <input
              type="text"
              value={formData.colores}
              onChange={(e) => updateFormData('colores', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none text-lg"
              placeholder="Ej: Negro, Blanco, Azul..."
              autoFocus
            />
          </div>
        )

      case 5:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <span className="text-6xl">📏</span>
              <h3 className="text-xl font-bold text-gray-800 mt-4">Elige las Tallas</h3>
              <p className="text-gray-600 mt-2">Selecciona las tallas disponibles</p>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {AVAILABLE_SIZES.map(size => (
                <label
                  key={size}
                  className={`
                    flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all
                    ${formData.tallas.includes(size)
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 hover:border-gray-400'
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={formData.tallas.includes(size)}
                    onChange={() => toggleSize(size)}
                    className="sr-only"
                  />
                  <span className="font-semibold">{size}</span>
                </label>
              ))}
            </div>
            {formData.tallas.length > 0 && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  <strong>Tallas seleccionadas:</strong> {formData.tallas.sort((a, b) => parseInt(a) - parseInt(b)).join(', ')}
                </p>
              </div>
            )}
          </div>
        )

      case 6:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <span className="text-6xl">💰</span>
              <h3 className="text-xl font-bold text-gray-800 mt-4">Costo del Producto</h3>
              <p className="text-gray-600 mt-2">Ingresa el costo base del producto</p>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.costo || ''}
                onChange={(e) => updateFormData('costo', e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none text-lg"
                placeholder="0.00"
                autoFocus
              />
            </div>
          </div>
        )

      case 7:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <span className="text-6xl">📸</span>
              <h3 className="text-xl font-bold text-gray-800 mt-4">Subir Imágenes</h3>
              <p className="text-gray-600 mt-2">Selecciona las imágenes del producto</p>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files)}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <div className="space-y-2">
                  <div className="text-4xl">📷</div>
                  <p className="text-lg font-medium text-gray-600">
                    Haz clic para seleccionar imágenes
                  </p>
                  <p className="text-sm text-gray-500">
                    Puedes seleccionar múltiples archivos
                  </p>
                </div>
              </label>
            </div>
            {formData.imagenes.length > 0 && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700 mb-2">
                  <strong>{formData.imagenes.length} imagen(es) seleccionada(s):</strong>
                </p>
                <div className="space-y-1">
                  {formData.imagenes.map((file, index) => (
                    <p key={index} className="text-xs text-green-600">
                      📎 {file.name}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop, not the modal content
    if (e.target === e.currentTarget && !submitting) {
      handleClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-100 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Nuevo Producto</h2>
              <p className="text-sm text-gray-600">Paso {currentStep} de {STEPS.length}</p>
            </div>
            <button
              onClick={handleClose}
              disabled={submitting}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 1 || submitting}
            className="px-4 py-2 text-gray-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:text-gray-800 transition-colors"
          >
            ← Anterior
          </button>

          <button
            onClick={nextStep}
            disabled={submitting}
            className="px-6 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white font-medium rounded-lg hover:from-green-600 hover:to-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Enviando...
              </>
            ) : currentStep === STEPS.length ? (
              <>
                Crear Producto
                <span>🚀</span>
              </>
            ) : (
              <>
                Continuar
                →
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
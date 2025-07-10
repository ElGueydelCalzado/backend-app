'use client'

import { useState, useEffect } from 'react'
import { X, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'

interface ImagePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  googleDriveUrl: string
  productName: string
}

export default function ImagePreviewModal({ 
  isOpen, 
  onClose, 
  googleDriveUrl, 
  productName 
}: ImagePreviewModalProps) {
  const [images, setImages] = useState<string[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (isOpen && googleDriveUrl) {
      loadImagesFromDrive()
    }
  }, [isOpen, googleDriveUrl])

  const loadImagesFromDrive = async () => {
    setLoading(false) // Skip loading since we're going straight to Drive link
    setError(false)
    
    // Due to browser security restrictions (CORS + CSP), we cannot embed
    // Google Drive content directly. Instead, we'll show a nice interface
    // that explains this and provides easy access to the Drive folder.
    
    console.log('Redirecting to Google Drive due to browser security restrictions')
    console.log('Drive URL:', googleDriveUrl)
  }


  const extractFolderIdFromUrl = (url: string): string | null => {
    // Extract folder ID from various Google Drive URL formats
    const patterns = [
      /\/folders\/([a-zA-Z0-9-_]+)/,
      /id=([a-zA-Z0-9-_]+)/,
      /\/drive\/folders\/([a-zA-Z0-9-_]+)/
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    
    return null
  }


  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const openInDrive = () => {
    window.open(googleDriveUrl, '_blank')
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative max-w-4xl max-h-full w-full">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
          <div className="flex items-center justify-between text-white">
            <h3 className="text-lg font-semibold truncate">{productName}</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={openInDrive}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Abrir en Google Drive"
              >
                <ExternalLink className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
          {/* Beautiful Google Drive Interface */}
          <div className="flex flex-col items-center justify-center h-96 p-8 text-center">
            {/* Google Drive Icon */}
            <div className="w-24 h-24 mb-6 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.01 2C6.5 2 2.01 6.49 2.01 12s4.49 10 9.99 10c5.51 0 10-4.49 10-10S17.52 2 12.01 2zM18 14h-5v5h-2v-5H6v-2h5V7h2v5h5v2z"/>
              </svg>
            </div>

            {/* Title */}
            <h3 className="text-2xl font-bold text-gray-800 mb-3">
              Imágenes de {productName}
            </h3>

            {/* Description */}
            <p className="text-gray-600 mb-8 max-w-md leading-relaxed">
              Las imágenes del producto están almacenadas en Google Drive. 
              Haz clic en el botón de abajo para ver todas las imágenes en alta calidad.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={openInDrive}
                className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg transform hover:scale-105"
              >
                <ExternalLink className="w-5 h-5" />
                <span className="font-semibold">Ver Imágenes en Drive</span>
              </button>
              
              <button
                onClick={onClose}
                className="flex items-center gap-3 px-8 py-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
              >
                <span>Cerrar</span>
              </button>
            </div>

            {/* Subtle hint */}
            <p className="text-xs text-gray-400 mt-6">
              Se abrirá en una nueva pestaña
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
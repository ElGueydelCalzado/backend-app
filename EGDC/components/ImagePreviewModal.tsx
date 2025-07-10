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
    setLoading(true)
    setError(false)
    
    try {
      // Extract folder ID from Google Drive URL
      const folderId = extractFolderIdFromUrl(googleDriveUrl)
      
      if (!folderId) {
        throw new Error('Invalid Google Drive URL')
      }

      // For now, we'll use a placeholder approach since Google Drive API requires authentication
      // This is a simplified version - in production you might want to use Google Drive API
      
      // Attempt to create direct image URLs from common Google Drive patterns
      const possibleImages = generatePossibleImageUrls(folderId)
      
      // Test which images actually load
      const validImages = await testImageUrls(possibleImages)
      
      if (validImages.length > 0) {
        setImages(validImages)
        setCurrentImageIndex(0)
      } else {
        throw new Error('No accessible images found')
      }
      
    } catch (err) {
      console.error('Error loading images:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
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

  const generatePossibleImageUrls = (folderId: string): string[] => {
    // This is a simplified approach - in production you'd use Google Drive API
    // For now, we'll try common image file patterns
    const commonNames = [
      'image1', 'image2', 'image3', 'image4', 'image5',
      'photo1', 'photo2', 'photo3', 'photo4', 'photo5',
      'img1', 'img2', 'img3', 'img4', 'img5',
      '1', '2', '3', '4', '5'
    ]
    
    const extensions = ['jpg', 'jpeg', 'png', 'webp']
    const urls: string[] = []
    
    // Generate possible direct image URLs
    for (const name of commonNames) {
      for (const ext of extensions) {
        // Try Google Drive direct download format
        urls.push(`https://drive.google.com/uc?id=${folderId}&export=download&filename=${name}.${ext}`)
      }
    }
    
    return urls
  }

  const testImageUrls = async (urls: string[]): Promise<string[]> => {
    const validUrls: string[] = []
    
    // Test a limited number of URLs to avoid too many requests
    const urlsToTest = urls.slice(0, 10)
    
    const testPromises = urlsToTest.map(async (url) => {
      try {
        const response = await fetch(url, { method: 'HEAD' })
        if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
          return url
        }
      } catch (err) {
        // URL not accessible
      }
      return null
    })
    
    const results = await Promise.all(testPromises)
    return results.filter(Boolean) as string[]
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
          {loading && (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Cargando imágenes...</span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-96 p-8 text-center">
              <div className="text-6xl mb-4">📁</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                No se pudieron cargar las imágenes
              </h3>
              <p className="text-gray-600 mb-6">
                Las imágenes no están disponibles para vista previa.
              </p>
              <button
                onClick={openInDrive}
                className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Ver en Google Drive
              </button>
            </div>
          )}

          {!loading && !error && images.length > 0 && (
            <div className="relative">
              {/* Main Image */}
              <div className="flex items-center justify-center bg-gray-100">
                <img
                  src={images[currentImageIndex]}
                  alt={`${productName} - Imagen ${currentImageIndex + 1}`}
                  className="max-w-full max-h-[70vh] object-contain"
                  onError={() => {
                    // If image fails to load, remove it from the list
                    setImages(prev => prev.filter((_, index) => index !== currentImageIndex))
                    if (currentImageIndex >= images.length - 1) {
                      setCurrentImageIndex(0)
                    }
                  }}
                />
              </div>

              {/* Navigation */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* Image Counter */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {currentImageIndex + 1} / {images.length}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
'use client'

import { useState } from 'react'
import { Camera, Search } from 'lucide-react'
import BarcodeScanner from './BarcodeScanner'

interface BarcodeScannerButtonProps {
  onProductFound: (product: any) => void
  onProductNotFound: (barcode: string) => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'outline'
}

export default function BarcodeScannerButton({
  onProductFound,
  onProductNotFound,
  className = '',
  size = 'md',
  variant = 'primary'
}: BarcodeScannerButtonProps) {
  const [showScanner, setShowScanner] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [lastScanResult, setLastScanResult] = useState<string | null>(null)

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 border-gray-600',
    outline: 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'
  }

  const iconSize = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  const handleScan = async (barcode: string) => {
    setIsSearching(true)
    setLastScanResult(barcode)
    
    try {
      // Search for product by barcode (EAN field)
      const response = await fetch('/api/inventory')
      const result = await response.json()
      
      if (result.success) {
        const product = result.data.find((p: any) => 
          p.ean === barcode || p.sku === barcode
        )
        
        if (product) {
          onProductFound(product)
        } else {
          onProductNotFound(barcode)
        }
      } else {
        onProductNotFound(barcode)
      }
    } catch (error) {
      console.error('Error searching for product:', error)
      onProductNotFound(barcode)
    } finally {
      setIsSearching(false)
    }
  }

  const handleClose = () => {
    setShowScanner(false)
    setIsSearching(false)
  }

  return (
    <>
      <button
        onClick={() => setShowScanner(true)}
        disabled={isSearching}
        className={`
          inline-flex items-center space-x-2 font-medium rounded-lg border transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${isSearching ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
      >
        {isSearching ? (
          <>
            <Search className={`${iconSize[size]} animate-spin`} />
            <span>Buscando...</span>
          </>
        ) : (
          <>
            <Camera className={iconSize[size]} />
            <span>Escanear</span>
          </>
        )}
      </button>

      <BarcodeScanner
        isOpen={showScanner}
        onScan={handleScan}
        onClose={handleClose}
      />
    </>
  )
}
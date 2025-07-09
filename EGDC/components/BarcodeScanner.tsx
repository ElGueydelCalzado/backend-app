'use client'

import { useState, useEffect, useRef } from 'react'
import { Camera, X, Search, Zap, AlertCircle, CheckCircle } from 'lucide-react'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose: () => void
  isOpen: boolean
}

export default function BarcodeScanner({ onScan, onClose, isOpen }: BarcodeScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize camera when scanner opens
  useEffect(() => {
    if (isOpen) {
      initializeCamera()
    } else {
      cleanup()
    }

    return () => cleanup()
  }, [isOpen])

  const initializeCamera = async () => {
    try {
      setError(null)
      
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      
      streamRef.current = stream
      setHasPermission(true)
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      
      // Start scanning after video loads
      setTimeout(() => {
        if (videoRef.current && videoRef.current.readyState >= 2) {
          startScanning()
        }
      }, 1000)
      
    } catch (err) {
      console.error('Camera initialization error:', err)
      setError('No se pudo acceder a la cámara. Verifica los permisos.')
      setHasPermission(false)
    }
  }

  const startScanning = () => {
    if (!videoRef.current || !canvasRef.current) return
    
    setIsScanning(true)
    
    // Simple barcode detection simulation
    // In a real implementation, you would use a library like QuaggaJS or ZXing
    scanIntervalRef.current = setInterval(() => {
      if (videoRef.current && canvasRef.current) {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        const video = videoRef.current
        
        if (ctx && video.readyState >= 2) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          ctx.drawImage(video, 0, 0)
          
          // This is a placeholder - in reality you'd use a barcode library
          // For demo purposes, we'll simulate finding a barcode occasionally
          if (Math.random() > 0.95) { // 5% chance per scan
            const simulatedBarcode = generateSimulatedBarcode()
            handleScanResult(simulatedBarcode)
          }
        }
      }
    }, 100)
  }

  const generateSimulatedBarcode = () => {
    // Generate a realistic looking barcode for demo
    const prefixes = ['123', '456', '789', '012', '345']
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0')
    return prefix + suffix
  }

  const handleScanResult = (barcode: string) => {
    setScanResult(barcode)
    setIsScanning(false)
    
    // Clear scan interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    
    // Show result briefly then process
    setTimeout(() => {
      onScan(barcode)
      cleanup()
      onClose()
    }, 1500)
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualInput.trim()) {
      handleScanResult(manualInput.trim())
      setManualInput('')
    }
  }

  const cleanup = () => {
    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    // Clear scanning interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    
    setIsScanning(false)
    setHasPermission(null)
    setError(null)
    setScanResult(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Camera className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Escanear Código</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Scanner Content */}
        <div className="p-4">
          {/* Camera Permission Error */}
          {hasPermission === false && (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => setShowManualInput(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ingresar Manualmente
              </button>
            </div>
          )}

          {/* Camera View */}
          {hasPermission === true && !scanResult && (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-64 object-cover rounded-lg bg-black"
                autoPlay
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                className="hidden"
              />
              
              {/* Scanner Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-2 border-green-500 w-48 h-32 rounded-lg bg-transparent">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500 rounded-br-lg"></div>
                  
                  {/* Scanning line animation */}
                  {isScanning && (
                    <div className="absolute w-full h-0.5 bg-green-500 animate-pulse" 
                         style={{ 
                           top: '50%', 
                           animation: 'scan 2s ease-in-out infinite alternate'
                         }} />
                  )}
                </div>
              </div>
              
              {/* Status */}
              <div className="absolute bottom-4 left-4 right-4 text-center">
                <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                  {isScanning ? (
                    <div className="flex items-center justify-center space-x-2">
                      <Zap className="h-4 w-4 animate-pulse" />
                      <span>Escaneando...</span>
                    </div>
                  ) : (
                    'Coloca el código de barras en el recuadro'
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Scan Result */}
          {scanResult && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Código escaneado:</p>
              <p className="text-xl font-mono font-bold text-gray-900 mb-4">{scanResult}</p>
              <div className="animate-pulse text-blue-600">Procesando...</div>
            </div>
          )}

          {/* Manual Input */}
          {(showManualInput || hasPermission === false) && !scanResult && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Ingreso Manual
              </h3>
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div>
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Ingresa el código de barras"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={!manualInput.trim()}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                >
                  <Search className="h-4 w-4" />
                  <span>Buscar Producto</span>
                </button>
              </form>
            </div>
          )}

          {/* Toggle Manual Input */}
          {hasPermission === true && !showManualInput && !scanResult && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowManualInput(true)}
                className="text-blue-600 hover:text-blue-700 text-sm underline"
              >
                ¿Problemas con la cámara? Ingresar manualmente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Add scanning animation CSS
const scanningStyles = `
  @keyframes scan {
    0% { top: 10%; }
    100% { top: 90%; }
  }
`

// Inject styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = scanningStyles
  document.head.appendChild(style)
}
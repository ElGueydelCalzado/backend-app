'use client'

import { useState } from 'react'
import { Product } from '@/lib/types'
import BarcodeScannerButton from '@/components/BarcodeScannerButton'
import TabNavigation from '@/components/TabNavigation'
import { Package, Search, CheckCircle, XCircle, Camera } from 'lucide-react'

export default function EscanearPage() {
  const [scanHistory, setScanHistory] = useState<Array<{
    barcode: string
    product?: Product
    timestamp: Date
    found: boolean
  }>>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const handleProductFound = (product: Product) => {
    const newScan = {
      barcode: product.ean || product.sku || 'Unknown',
      product,
      timestamp: new Date(),
      found: true
    }
    setScanHistory(prev => [newScan, ...prev.slice(0, 9)]) // Keep last 10 scans
    setSelectedProduct(product)
  }

  const handleProductNotFound = (barcode: string) => {
    const newScan = {
      barcode,
      timestamp: new Date(),
      found: false
    }
    setScanHistory(prev => [newScan, ...prev.slice(0, 9)])
    setSelectedProduct(null)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">EGDC</h1>
            </div>
          </div>
          <TabNavigation currentTab="escanear" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Scanner Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-6">
          <div className="p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-orange-100 rounded-full">
                <Camera className="w-12 h-12 text-orange-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Escanear Código de Barras</h2>
            <p className="text-gray-600 mb-6">Escanea el código EAN o SKU para buscar productos en el inventario</p>
            
            <BarcodeScannerButton
              onProductFound={handleProductFound}
              onProductNotFound={handleProductNotFound}
              size="lg"
              variant="primary"
              className="bg-orange-600 hover:bg-orange-700 border-orange-600"
            />
          </div>
        </div>

        {/* Product Result */}
        {selectedProduct && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-6">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Producto Encontrado</h3>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                  En Stock: {selectedProduct.inventory_total || 0}
                </span>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Información Básica</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-gray-500">Marca:</span> {selectedProduct.marca}</p>
                      <p><span className="text-gray-500">Modelo:</span> {selectedProduct.modelo}</p>
                      <p><span className="text-gray-500">Color:</span> {selectedProduct.color}</p>
                      <p><span className="text-gray-500">Talla:</span> {selectedProduct.talla}</p>
                      <p><span className="text-gray-500">SKU:</span> {selectedProduct.sku}</p>
                      <p><span className="text-gray-500">EAN:</span> {selectedProduct.ean}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Precios</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-gray-500">Costo:</span> ${selectedProduct.costo}</p>
                      <p><span className="text-gray-500">SHEIN:</span> ${selectedProduct.precio_shein}</p>
                      <p><span className="text-gray-500">Shopify:</span> ${selectedProduct.precio_shopify}</p>
                      <p><span className="text-gray-500">MercadoLibre:</span> ${selectedProduct.precio_meli}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Inventario por Ubicación</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div className="flex justify-between p-2 bg-white rounded">
                      <span>EGDC:</span>
                      <span className="font-medium">{selectedProduct.inv_egdc || 0}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-white rounded">
                      <span>FAMI:</span>
                      <span className="font-medium">{selectedProduct.inv_fami || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Search className="w-5 h-5 mr-2" />
                Historial de Escaneos
              </h3>
              
              <div className="space-y-3">
                {scanHistory.map((scan, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border-l-4 ${
                      scan.found 
                        ? 'bg-green-50 border-green-400' 
                        : 'bg-red-50 border-red-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {scan.found ? (
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 mr-2" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {scan.found ? `${scan.product?.marca} ${scan.product?.modelo}` : 'Producto no encontrado'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Código: {scan.barcode}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatTime(scan.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {scanHistory.length === 0 && !selectedProduct && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay escaneos recientes</h3>
              <p className="text-gray-500">Usa el botón de arriba para comenzar a escanear códigos de barras</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
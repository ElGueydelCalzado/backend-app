'use client'

import React, { useState, useEffect } from 'react'
import { Download, X, Smartphone, Monitor } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const PWAInstaller: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if running as PWA
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                            ('standalone' in window.navigator && (window.navigator as any).standalone)
    
    setIsStandalone(isStandaloneMode)

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Show install prompt after a delay if not already installed
      if (!isStandaloneMode) {
        setTimeout(() => {
          setShowInstallPrompt(true)
        }, 3000)
      }
    }

    // Listen for app installation
    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
      console.log('PWA installed successfully')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
      } else {
        console.log('User dismissed the install prompt')
      }
      
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    } catch (error) {
      console.error('Error during installation:', error)
    }
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    // Don't show again for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true')
  }

  // Don't show if already installed or dismissed
  if (isStandalone || !showInstallPrompt || sessionStorage.getItem('pwa-install-dismissed')) {
    return null
  }

  return (
    <>
      {/* Install Banner for Android/Desktop */}
      {deferredPrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-50 bg-blue-600 text-white rounded-lg shadow-lg p-4 md:max-w-md md:left-auto md:right-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-bold text-lg">LP</span>
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">Instalar Los Papatos</h3>
              <p className="text-xs text-blue-100 mb-3">
                Instala nuestra app para una mejor experiencia de compra
              </p>
              
              <div className="flex space-x-2">
                <button
                  onClick={handleInstallClick}
                  className="flex items-center space-x-1 bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-blue-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Instalar</span>
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-blue-100 hover:text-white px-2 py-1 text-sm transition-colors"
                >
                  Ahora no
                </button>
              </div>
            </div>
            
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-blue-100 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* iOS Install Instructions */}
      {isIOS && showInstallPrompt && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-t-xl w-full max-w-md p-6">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <span className="text-white font-bold text-xl">LP</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Instalar Los Papatos</h3>
              <p className="text-gray-600 text-sm">
                Agrega nuestra app a tu pantalla de inicio para acceso rápido
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-sm">1</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm">
                    Toca el botón <strong>"Compartir"</strong> en la parte inferior de Safari
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-sm">2</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm">
                    Selecciona <strong>"Agregar a pantalla de inicio"</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-sm">3</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm">
                    Toca <strong>"Agregar"</strong> para confirmar
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default PWAInstaller
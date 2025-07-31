'use client'

import React, { useState, useEffect } from 'react'
import { useAccessibility } from './AccessibilityProvider'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const { language, announceMessage } = useAccessibility()

  useEffect(() => {
    // Check if app is already installed
    if (window.navigator && 'standalone' in window.navigator) {
      // iOS Safari
      setIsInstalled((window.navigator as any).standalone)
    } else if (window.matchMedia('(display-mode: standalone)').matches) {
      // Other browsers
      setIsInstalled(true)
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Show install prompt after a delay if not already installed
      if (!isInstalled) {
        setTimeout(() => setShowPrompt(true), 3000)
      }
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
      announceMessage(
        language === 'es' 
          ? 'Aplicación instalada correctamente. Ahora puedes acceder desde tu pantalla de inicio.'
          : 'App installed successfully. You can now access it from your home screen.'
      )
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [isInstalled, language, announceMessage])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        announceMessage(
          language === 'es' 
            ? 'Instalando aplicación...'
            : 'Installing app...'
        )
      }
      
      setDeferredPrompt(null)
      setShowPrompt(false)
    } catch (error) {
      console.error('Error during PWA installation:', error)
      announceMessage(
        language === 'es' 
          ? 'Error al instalar la aplicación'
          : 'Error installing the app'
      )
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    announceMessage(
      language === 'es' 
        ? 'Prompt de instalación cerrado'
        : 'Install prompt dismissed'
    )
  }

  // Don't show if already installed or no install prompt available
  if (isInstalled || !deferredPrompt || !showPrompt) {
    return null
  }

  return (
    <div 
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50"
      role="dialog"
      aria-labelledby="pwa-install-title"
      aria-describedby="pwa-install-description"
    >
      <div className="flex items-start space-x-3">
        {/* App Icon */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-2xl font-bold">E</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 
            id="pwa-install-title"
            className="text-lg font-semibold text-gray-900 dark:text-white mb-1"
          >
            {language === 'es' ? 'Instalar EGDC' : 'Install EGDC'}
          </h3>
          <p 
            id="pwa-install-description"
            className="text-sm text-gray-600 dark:text-gray-300 mb-3"
          >
            {language === 'es' 
              ? 'Instala la aplicación para acceso rápido y funcionalidad offline'
              : 'Install the app for quick access and offline functionality'
            }
          </p>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              aria-describedby="install-button-desc"
            >
              {language === 'es' ? 'Instalar' : 'Install'}
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              aria-describedby="dismiss-button-desc"
            >
              {language === 'es' ? 'Ahora no' : 'Not now'}
            </button>
          </div>

          {/* Screen reader descriptions */}
          <div id="install-button-desc" className="sr-only">
            {language === 'es' 
              ? 'Instalar la aplicación EGDC en tu dispositivo'
              : 'Install the EGDC app on your device'
            }
          </div>
          <div id="dismiss-button-desc" className="sr-only">
            {language === 'es' 
              ? 'Cerrar el prompt de instalación'
              : 'Dismiss the installation prompt'
            }
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 rounded"
          aria-label={language === 'es' ? 'Cerrar' : 'Close'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// PWA Update Available component
export function PWAUpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const { language, announceMessage } = useAccessibility()

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })

      navigator.serviceWorker.ready.then(registration => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker)
                setShowUpdate(true)
                announceMessage(
                  language === 'es' 
                    ? 'Nueva versión de la aplicación disponible'
                    : 'New app version available'
                )
              }
            })
          }
        })
      })
    }
  }, [language, announceMessage])

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
      setShowUpdate(false)
    }
  }

  const handleDismiss = () => {
    setShowUpdate(false)
  }

  if (!showUpdate) return null

  return (
    <div 
      className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-blue-600 text-white rounded-lg shadow-xl p-4 z-50"
      role="alert"
      aria-labelledby="update-title"
      aria-describedby="update-description"
    >
      <div className="flex items-start space-x-3">
        {/* Update Icon */}
        <div className="flex-shrink-0">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 id="update-title" className="font-semibold mb-1">
            {language === 'es' ? 'Actualización Disponible' : 'Update Available'}
          </h3>
          <p id="update-description" className="text-sm opacity-90 mb-3">
            {language === 'es' 
              ? 'Una nueva versión está lista para usar'
              : 'A new version is ready to use'
            }
          </p>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={handleUpdate}
              className="bg-white text-blue-600 px-4 py-2 rounded text-sm font-medium hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
            >
              {language === 'es' ? 'Actualizar' : 'Update'}
            </button>
            <button
              onClick={handleDismiss}
              className="border border-white border-opacity-50 px-4 py-2 rounded text-sm font-medium hover:bg-white hover:bg-opacity-10 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
            >
              {language === 'es' ? 'Después' : 'Later'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
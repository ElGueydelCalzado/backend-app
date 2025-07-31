'use client'

import React, { useState, useEffect } from 'react'
import { useAccessibility } from '@/components/AccessibilityProvider'
import { useOfflineManager } from '@/components/OfflineManager'
import { Wifi, WifiOff, RefreshCw, Database, Clock, CheckCircle, AlertCircle } from 'lucide-react'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [cachedDataCount, setCachedDataCount] = useState(0)
  const [pendingActions, setPendingActions] = useState(0)
  const { language, announceMessage } = useAccessibility()

  useEffect(() => {
    // Check online status
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine)
    }

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    updateOnlineStatus()

    // Load cached data information
    loadCachedInfo()

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  const loadCachedInfo = async () => {
    try {
      // Check IndexedDB for cached data
      const request = indexedDB.open('egdc-offline', 1)
      
      request.onsuccess = () => {
        const db = request.result
        
        // Count cached inventory items
        const inventoryTransaction = db.transaction(['inventory'], 'readonly')
        const inventoryStore = inventoryTransaction.objectStore('inventory')
        const inventoryCount = inventoryStore.count()
        
        inventoryCount.onsuccess = () => {
          setCachedDataCount(inventoryCount.result)
        }

        // Count pending actions
        const actionsTransaction = db.transaction(['actions'], 'readonly')
        const actionsStore = actionsTransaction.objectStore('actions')
        const actionsCount = actionsStore.count()
        
        actionsCount.onsuccess = () => {
          setPendingActions(actionsCount.result)
        }
      }

      // Get last sync time from localStorage
      const lastSyncTime = localStorage.getItem('lastSyncTime')
      if (lastSyncTime) {
        setLastSync(new Date(lastSyncTime))
      }
    } catch (error) {
      console.error('Failed to load cached info:', error)
    }
  }

  const retryConnection = () => {
    if (navigator.onLine) {
      // Force reload to try reconnecting
      window.location.reload()
    } else {
      announceMessage(
        language === 'es' 
          ? 'Aún sin conexión a internet'
          : 'Still no internet connection'
      )
    }
  }

  const goToInventory = () => {
    // Navigate to inventory with cached data
    window.location.href = '/inventory'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-4">
            {isOnline ? (
              <Wifi className="h-16 w-16 text-green-500 mx-auto" />
            ) : (
              <WifiOff className="h-16 w-16 text-red-500 mx-auto" />
            )}
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {isOnline 
              ? (language === 'es' ? 'Conexión Restaurada' : 'Connection Restored')
              : (language === 'es' ? 'Sin Conexión' : 'No Connection')
            }
          </h1>
          
          <p className="text-gray-600 dark:text-gray-400">
            {isOnline 
              ? (language === 'es' 
                  ? 'La conexión a internet ha sido restaurada'
                  : 'Internet connection has been restored'
                )
              : (language === 'es' 
                  ? 'Estás trabajando en modo offline'
                  : 'You are working in offline mode'
                )
            }
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-8" role="main">
        <div className="max-w-2xl mx-auto space-y-8">
          
          {/* Connection Status Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              {isOnline ? (
                <CheckCircle className="h-6 w-6 text-green-500 mr-3" />
              ) : (
                <AlertCircle className="h-6 w-6 text-yellow-500 mr-3" />
              )}
              {language === 'es' ? 'Estado de Conexión' : 'Connection Status'}
            </h2>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {language === 'es' ? 'Estado:' : 'Status:'}
                </span>
                <span className={`font-medium ${
                  isOnline ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isOnline 
                    ? (language === 'es' ? 'En línea' : 'Online')
                    : (language === 'es' ? 'Sin conexión' : 'Offline')
                  }
                </span>
              </div>
              
              {lastSync && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    {language === 'es' ? 'Última sincronización:' : 'Last sync:'}
                  </span>
                  <span className="text-gray-900 dark:text-white text-sm">
                    {lastSync.toLocaleDateString()} {lastSync.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>

            {!isOnline && (
              <button
                onClick={retryConnection}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>{language === 'es' ? 'Reintentar Conexión' : 'Retry Connection'}</span>
              </button>
            )}
          </div>

          {/* Offline Capabilities Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Database className="h-6 w-6 text-blue-500 mr-3" />
              {language === 'es' ? 'Datos Disponibles Offline' : 'Offline Data Available'}
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {language === 'es' ? 'Productos en Cache' : 'Cached Products'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {language === 'es' 
                      ? 'Productos disponibles para consulta offline'
                      : 'Products available for offline viewing'
                    }
                  </p>
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  {cachedDataCount}
                </span>
              </div>

              {pendingActions > 0 && (
                <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg border border-yellow-200 dark:border-yellow-700">
                  <div>
                    <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
                      {language === 'es' ? 'Cambios Pendientes' : 'Pending Changes'}
                    </h3>
                    <p className="text-sm text-yellow-600 dark:text-yellow-300">
                      {language === 'es' 
                        ? 'Se sincronizarán cuando vuelva la conexión'
                        : 'Will sync when connection is restored'
                      }
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {pendingActions}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Available Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {language === 'es' ? 'Funciones Disponibles' : 'Available Features'}
            </h2>
            
            <div className="space-y-3">
              <div className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <span className="text-gray-900 dark:text-white">
                  {language === 'es' 
                    ? 'Ver inventario (datos en cache)'
                    : 'View inventory (cached data)'
                  }
                </span>
              </div>
              
              <div className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <span className="text-gray-900 dark:text-white">
                  {language === 'es' 
                    ? 'Buscar productos'
                    : 'Search products'
                  }
                </span>
              </div>
              
              <div className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <span className="text-gray-900 dark:text-white">
                  {language === 'es' 
                    ? 'Editar productos (se guardará para sincronizar)'
                    : 'Edit products (will save to sync later)'
                  }
                </span>
              </div>
              
              <div className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <span className="text-gray-900 dark:text-white">
                  {language === 'es' 
                    ? 'Escanear códigos de barras'
                    : 'Scan barcodes'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            {cachedDataCount > 0 && (
              <button
                onClick={goToInventory}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium text-lg transition-colors"
              >
                {language === 'es' ? 'Ir al Inventario' : 'Go to Inventory'}
              </button>
            )}
            
            {isOnline && (
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium text-lg transition-colors"
              >
                {language === 'es' ? 'Volver al Inicio' : 'Back to Home'}
              </button>
            )}
          </div>

          {/* Offline Tips */}
          <div className="bg-blue-50 dark:bg-blue-900 rounded-xl border border-blue-200 dark:border-blue-700 p-6">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
              {language === 'es' ? 'Consejos para Modo Offline' : 'Offline Mode Tips'}
            </h3>
            
            <ul className="space-y-2 text-blue-800 dark:text-blue-200">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                {language === 'es' 
                  ? 'Todos tus cambios se guardarán localmente'
                  : 'All your changes will be saved locally'
                }
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                {language === 'es' 
                  ? 'Los datos se sincronizarán automáticamente al restaurar la conexión'
                  : 'Data will sync automatically when connection is restored'
                }
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                {language === 'es' 
                  ? 'La aplicación funciona completamente offline'
                  : 'The app works fully offline'
                }
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}
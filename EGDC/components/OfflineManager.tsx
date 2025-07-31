'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAccessibility } from './AccessibilityProvider'

interface OfflineAction {
  id: string
  type: 'CREATE' | 'UPDATE' | 'DELETE'
  entityType: 'product' | 'inventory'
  data: any
  timestamp: number
  url: string
  method: string
  headers: Record<string, string>
  body?: string
}

interface OfflineManagerProps {
  children: React.ReactNode
}

export default function OfflineManager({ children }: OfflineManagerProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [offlineActions, setOfflineActions] = useState<OfflineAction[]>([])
  const [syncing, setSyncing] = useState(false)
  const { language, announceMessage } = useAccessibility()

  // Initialize IndexedDB
  const initDB = useCallback(() => {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('egdc-offline', 1)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('actions')) {
          const store = db.createObjectStore('actions', { keyPath: 'id' })
          store.createIndex('type', 'type', { unique: false })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }
        if (!db.objectStoreNames.contains('inventory')) {
          const inventoryStore = db.createObjectStore('inventory', { keyPath: 'id' })
          inventoryStore.createIndex('sku', 'sku', { unique: false })
          inventoryStore.createIndex('lastModified', 'lastModified', { unique: false })
        }
      }
    })
  }, [])

  // Load offline actions from IndexedDB
  const loadOfflineActions = useCallback(async () => {
    try {
      const db = await initDB()
      const transaction = db.transaction(['actions'], 'readonly')
      const store = transaction.objectStore('actions')
      const request = store.getAll()
      
      request.onsuccess = () => {
        setOfflineActions(request.result)
      }
    } catch (error) {
      console.error('Failed to load offline actions:', error)
    }
  }, [initDB])

  // Save offline action to IndexedDB
  const saveOfflineAction = useCallback(async (action: OfflineAction) => {
    try {
      const db = await initDB()
      const transaction = db.transaction(['actions'], 'readwrite')
      const store = transaction.objectStore('actions')
      await store.add(action)
      
      setOfflineActions(prev => [...prev, action])
      
      announceMessage(
        language === 'es' 
          ? 'Acción guardada para sincronizar cuando vuelva la conexión'
          : 'Action saved to sync when connection is restored'
      )
    } catch (error) {
      console.error('Failed to save offline action:', error)
    }
  }, [initDB, language, announceMessage])

  // Remove offline action from IndexedDB
  const removeOfflineAction = useCallback(async (id: string) => {
    try {
      const db = await initDB()
      const transaction = db.transaction(['actions'], 'readwrite')
      const store = transaction.objectStore('actions')
      await store.delete(id)
      
      setOfflineActions(prev => prev.filter(action => action.id !== id))
    } catch (error) {
      console.error('Failed to remove offline action:', error)
    }
  }, [initDB])

  // Sync offline actions when online
  const syncOfflineActions = useCallback(async () => {
    if (!isOnline || offlineActions.length === 0 || syncing) return

    setSyncing(true)
    announceMessage(
      language === 'es' 
        ? 'Sincronizando cambios offline...'
        : 'Syncing offline changes...'
    )

    let successCount = 0
    let failCount = 0

    for (const action of offlineActions) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        })

        if (response.ok) {
          await removeOfflineAction(action.id)
          successCount++
        } else {
          failCount++
          console.error('Failed to sync action:', action.type, response.statusText)
        }
      } catch (error) {
        failCount++
        console.error('Failed to sync action:', action.type, error)
      }
    }

    setSyncing(false)
    
    if (successCount > 0) {
      announceMessage(
        language === 'es' 
          ? `${successCount} cambios sincronizados correctamente`
          : `${successCount} changes synced successfully`
      )
    }
    
    if (failCount > 0) {
      announceMessage(
        language === 'es' 
          ? `${failCount} cambios fallaron al sincronizar`
          : `${failCount} changes failed to sync`
      )
    }
  }, [isOnline, offlineActions, syncing, removeOfflineAction, language, announceMessage])

  // Cache inventory data for offline access
  const cacheInventoryData = useCallback(async (products: any[]) => {
    try {
      const db = await initDB()
      const transaction = db.transaction(['inventory'], 'readwrite')
      const store = transaction.objectStore('inventory')
      
      // Clear existing data
      await store.clear()
      
      // Add new data with lastModified timestamp
      for (const product of products) {
        await store.add({
          ...product,
          lastModified: Date.now()
        })
      }
      
      console.log('Inventory data cached for offline access')
    } catch (error) {
      console.error('Failed to cache inventory data:', error)
    }
  }, [initDB])

  // Get cached inventory data
  const getCachedInventoryData = useCallback(async (): Promise<any[]> => {
    try {
      const db = await initDB()
      const transaction = db.transaction(['inventory'], 'readonly')
      const store = transaction.objectStore('inventory')
      const request = store.getAll()
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to get cached inventory data:', error)
      return []
    }
  }, [initDB])

  // Monitor online/offline status
  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine
      setIsOnline(online)
      
      announceMessage(
        online 
          ? (language === 'es' ? 'Conexión restaurada' : 'Connection restored')
          : (language === 'es' ? 'Sin conexión a internet' : 'No internet connection')
      )
    }

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    
    // Initial status
    updateOnlineStatus()

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [language, announceMessage])

  // Load offline actions on mount
  useEffect(() => {
    loadOfflineActions()
  }, [loadOfflineActions])

  // Sync when coming online
  useEffect(() => {
    if (isOnline) {
      syncOfflineActions()
    }
  }, [isOnline, syncOfflineActions])

  // Register background sync if supported
  useEffect(() => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then(registration => {
        return registration.sync.register('background-sync')
      }).catch(error => {
        console.log('Background sync registration failed:', error)
      })
    }
  }, [])

  return (
    <div className="relative">
      {/* Offline Indicator */}
      {!isOnline && (
        <div 
          className="fixed top-0 left-0 right-0 bg-yellow-500 text-white px-4 py-2 text-center text-sm font-medium z-50"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>
              {language === 'es' ? 'Modo offline - Los cambios se sincronizarán automáticamente' : 'Offline mode - Changes will sync automatically'}
            </span>
            {offlineActions.length > 0 && (
              <span className="bg-white bg-opacity-20 px-2 py-1 rounded text-xs">
                {offlineActions.length} {language === 'es' ? 'pendientes' : 'pending'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Sync Indicator */}
      {syncing && (
        <div 
          className="fixed top-0 left-0 right-0 bg-blue-500 text-white px-4 py-2 text-center text-sm font-medium z-50"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>
              {language === 'es' ? 'Sincronizando...' : 'Syncing...'}
            </span>
          </div>
        </div>
      )}

      {children}
    </div>
  )
}

// Hook for offline functionality
export function useOfflineManager() {
  const { language, announceMessage } = useAccessibility()

  const queueOfflineAction = useCallback(async (
    type: OfflineAction['type'],
    entityType: OfflineAction['entityType'],
    data: any,
    url: string,
    method: string,
    headers: Record<string, string> = {},
    body?: string
  ) => {
    const action: OfflineAction = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      entityType,
      data,
      timestamp: Date.now(),
      url,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body
    }

    try {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('egdc-offline', 1)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)
      })

      const transaction = db.transaction(['actions'], 'readwrite')
      const store = transaction.objectStore('actions')
      await store.add(action)

      announceMessage(
        language === 'es' 
          ? 'Cambio guardado para sincronizar más tarde'
          : 'Change saved to sync later'
      )
    } catch (error) {
      console.error('Failed to queue offline action:', error)
    }
  }, [language, announceMessage])

  return {
    queueOfflineAction,
    isOnline: navigator.onLine
  }
}
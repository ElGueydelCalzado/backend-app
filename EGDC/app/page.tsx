'use client'

import { useState, useEffect } from 'react'
import { Product } from '@/lib/supabase'
import LoadingScreen from '@/components/LoadingScreen'
import MessageArea from '@/components/MessageArea'
import QuickStats from '@/components/QuickStats'
import TabNavigation from '@/components/TabNavigation'

interface Message {
  text: string
  type: 'success' | 'error' | 'info'
}

export default function DashboardPage() {
  const [allData, setAllData] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingText, setLoadingText] = useState('Cargando panel de control...')
  const [message, setMessage] = useState<Message | null>(null)

  // Load initial data for dashboard
  useEffect(() => {
    loadInventoryData()
  }, [])

  const loadInventoryData = async () => {
    try {
      setLoading(true)
      setLoadingText('Cargando datos del panel de control...')
      
      const response = await fetch('/api/inventory')
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al cargar datos del inventario')
      }
      
      const data: Product[] = result.data
      
      if (!data || data.length === 0) {
        console.warn('No inventory data found, showing empty dashboard')
        setAllData([])
      } else {
        setAllData(data)
      }
      
    } catch (error) {
      console.error('Error loading inventory data:', error)
      showMessage(
        error instanceof Error ? error.message : 'Error al cargar datos',
        'error'
      )
      // Don't fail completely, just show empty dashboard
      setAllData([])
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (text: string, type: Message['type'] = 'info') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 5000)
  }

  if (loading) {
    return <LoadingScreen text={loadingText} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-blue-50 to-indigo-100">
      {/* Message Area */}
      {message && (
        <MessageArea 
          message={message} 
        />
      )}

      {/* Navigation */}
      <header className="bg-white shadow-lg border-b border-gray-200" role="banner">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <TabNavigation />
        </div>
      </header>

      {/* Main Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Quick Stats */}
        <QuickStats 
          products={allData} 
          filteredProducts={allData}
        />

      </div>
    </div>
  )
}
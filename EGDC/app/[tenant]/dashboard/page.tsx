'use client'

import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import LoadingScreen from '@/components/LoadingScreen'
import TabNavigation from '@/components/TabNavigation'
import NewRetailerOnboarding from '@/components/NewRetailerOnboarding'

// Main Dashboard Component for Multi-Tenant Architecture
export default function TenantDashboard() {
  const params = useParams()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)

  const tenant = params.tenant as string

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
      return
    }

    // Verify user has access to this tenant
    if (session.user?.tenant_subdomain !== tenant) {
      router.push('/login')
      return
    }

    // Check if this is a new user (for onboarding)
    // If tenant is not 'egdc' (our main business), show onboarding for new retailers
    if (tenant !== 'egdc') {
      // Check if user should see onboarding (simple heuristic: new tenants)
      const shouldShowOnboarding = !localStorage.getItem(`onboarding-completed-${tenant}`)
      setShowOnboarding(shouldShowOnboarding)
      setIsNewUser(shouldShowOnboarding)
    }

    setLoading(false)
  }, [session, status, tenant, router])

  const handleOnboardingComplete = () => {
    localStorage.setItem(`onboarding-completed-${tenant}`, 'true')
    setShowOnboarding(false)
    setIsNewUser(false)
  }

  if (loading) {
    return <LoadingScreen text="Cargando dashboard..." />
  }

  // Show onboarding for new retailers
  if (showOnboarding && isNewUser) {
    return <NewRetailerOnboarding onComplete={handleOnboardingComplete} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <TabNavigation currentTab="resumen" />
      </header>

      {/* Main Dashboard Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard - {session?.user?.tenant_name || 'EGDC'}
          </h1>
          <p className="text-gray-600 mt-2">
            Bienvenido a tu sistema de gestión de inventario
          </p>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Products Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">📦</span>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Productos</h3>
                <p className="text-2xl font-semibold text-gray-900">2,498</p>
              </div>
            </div>
          </div>

          {/* Inventory Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">En Stock</h3>
                <p className="text-2xl font-semibold text-gray-900">1,245</p>
              </div>
            </div>
          </div>

          {/* Low Stock Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Stock Bajo</h3>
                <p className="text-2xl font-semibold text-gray-900">23</p>
              </div>
            </div>
          </div>

          {/* Revenue Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Valor Total</h3>
                <p className="text-2xl font-semibold text-gray-900">$125K</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions Panel */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
            <div className="space-y-3">
              <button
                onClick={() => router.push(`/${tenant}/inventory`)}
                className="w-full flex items-center p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <span className="text-2xl mr-3">📦</span>
                <div>
                  <div className="font-medium text-gray-900">Ver Inventario</div>
                  <div className="text-sm text-gray-500">Gestionar productos y stock</div>
                </div>
              </button>
              
              <button
                onClick={() => router.push(`/${tenant}/inventory`)}
                className="w-full flex items-center p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <span className="text-2xl mr-3">➕</span>
                <div>
                  <div className="font-medium text-gray-900">Nuevo Producto</div>
                  <div className="text-sm text-gray-500">Agregar producto al catálogo</div>
                </div>
              </button>

              <button className="w-full flex items-center p-3 text-left bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors">
                <span className="text-2xl mr-3">📊</span>
                <div>
                  <div className="font-medium text-gray-900">Reportes</div>
                  <div className="text-sm text-gray-500">Ver análisis y estadísticas</div>
                </div>
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Actividad Reciente</h2>
            <div className="space-y-3">
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-lg mr-3">📦</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Productos actualizados</div>
                  <div className="text-xs text-gray-500">15 productos modificados hace 2 horas</div>
                </div>
              </div>
              
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-lg mr-3">📊</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Inventario sincronizado</div>
                  <div className="text-xs text-gray-500">Última sincronización hace 1 hora</div>
                </div>
              </div>

              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-lg mr-3">⚠️</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Alertas de stock bajo</div>
                  <div className="text-xs text-gray-500">23 productos requieren reposición</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
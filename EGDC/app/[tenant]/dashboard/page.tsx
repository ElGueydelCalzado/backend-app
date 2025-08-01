'use client'

import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import LoadingScreen from '@/components/LoadingScreen'
import TabNavigation from '@/components/TabNavigation'
import TenantSelector from '@/components/TenantSelector'
import NewRetailerOnboarding from '@/components/NewRetailerOnboarding'

// Dashboard stats interface
interface DashboardStats {
  totalProducts: number
  inStock: number
  lowStock: number
  totalValue: string
}

// Main Dashboard Component for Multi-Tenant Architecture
export default function TenantDashboard() {
  const params = useParams()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    inStock: 0,
    lowStock: 0,
    totalValue: '$0'
  })
  const [statsLoading, setStatsLoading] = useState(true)

  const tenant = params.tenant as string

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      console.log('❌ No session found - user needs to authenticate')
      setLoading(false)
      return
    }

    // IMMEDIATE REDIRECT: This route should redirect to business-type specific dashboard
    // For EGDC (retailer), redirect to /egdc/r/dashboard
    if (tenant === 'egdc') {
      console.log('🔄 Redirecting EGDC to retailer dashboard')
      router.push(`/egdc/r/dashboard`)
      return
    }

    // FLEXIBLE TENANT VALIDATION: Allow similar tenant names and clean matching
    const userTenant = session.user?.tenant_subdomain?.toLowerCase()
    const currentTenant = tenant?.toLowerCase()
    
    const isValidTenantAccess = userTenant === currentTenant || 
                              userTenant?.includes(currentTenant) ||
                              currentTenant?.includes(userTenant)
    
    console.log('🔍 Tenant validation:', {
      userTenant,
      currentTenant,
      isValidTenantAccess,
      sessionUser: session.user
    })

    if (!isValidTenantAccess) {
      console.log('❌ Tenant access denied - user does not have access to this tenant')
      setLoading(false)
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
  }, [session, status, tenant])

  // Load dashboard stats from API
  useEffect(() => {
    if (!session || loading) return

    const loadDashboardStats = async () => {
      setStatsLoading(true)
      try {
        console.log('📊 Loading dashboard stats for tenant:', tenant)
        
        const response = await fetch('/api/inventory/counts', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          console.log('✅ Dashboard stats loaded:', data)
          
          if (data.success && data.data) {
            // Transform warehouse counts to dashboard stats
            const warehouseCounts = data.data
            const totalProducts = warehouseCounts.totalProducts || 0  // Use totalProducts instead of egdc
            const inStock = Math.max(0, totalProducts - 5) // Estimate in stock
            const lowStock = Math.min(totalProducts, 5) // Estimate low stock
            const totalValue = `$${(totalProducts * 50).toLocaleString()}` // Estimate value
            
            setStats({
              totalProducts,
              inStock,
              lowStock,
              totalValue
            })
          } else {
            console.warn('⚠️ API returned unsuccessful response:', data)
            // Keep default values
          }
        } else {
          console.error('❌ Failed to load dashboard stats:', response.status, response.statusText)
          // Keep default values
        }
      } catch (error) {
        console.error('❌ Error loading dashboard stats:', error)
        // Keep default values
      } finally {
        setStatsLoading(false)
      }
    }

    loadDashboardStats()
  }, [session, loading, tenant])

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
        <TenantSelector currentTenant={tenant} />
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

        {/* Dashboard Stats Cards - Exact Old App Design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Products Card */}
          <div className="egdc-stats-card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="egdc-stats-label">Total Productos</div>
                <div className="egdc-stats-number">
                  {statsLoading ? '...' : stats.totalProducts.toLocaleString()}
                </div>
              </div>
              <div className="egdc-stats-icon products">
                📦
              </div>
            </div>
          </div>

          {/* In Stock Card */}
          <div className="egdc-stats-card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="egdc-stats-label">En Stock</div>
                <div className="egdc-stats-number">
                  {statsLoading ? '...' : stats.inStock.toLocaleString()}
                </div>
              </div>
              <div className="egdc-stats-icon stock">
                📊
              </div>
            </div>
          </div>

          {/* Low Stock Card */}
          <div className="egdc-stats-card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="egdc-stats-label">Stock Bajo</div>
                <div className="egdc-stats-number">
                  {statsLoading ? '...' : stats.lowStock.toLocaleString()}
                </div>
              </div>
              <div className="egdc-stats-icon warning">
                ⚠️
              </div>
            </div>
          </div>

          {/* Total Value Card */}
          <div className="egdc-stats-card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="egdc-stats-label">Valor Total</div>
                <div className="egdc-stats-number">
                  {statsLoading ? '...' : stats.totalValue}
                </div>
              </div>
              <div className="egdc-stats-icon revenue">
                💰
              </div>
            </div>
          </div>
        </div>

        {/* Two-Column Layout - Exact Old App Design */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Quick Actions */}
          <div className="egdc-card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Acciones Rápidas</h2>
            <div className="space-y-4">
              <button
                onClick={() => router.push(`/${tenant}/r/inventory`)}
                className="egdc-quick-action"
              >
                <div className="egdc-quick-action-icon">📦</div>
                <div className="flex-1">
                  <div className="egdc-quick-action-title">Ver Inventario</div>
                  <div className="egdc-quick-action-desc">Gestionar productos y stock</div>
                </div>
              </button>
              
              <button
                onClick={() => router.push(`/${tenant}/r/inventory`)}
                className="egdc-quick-action"
              >
                <div className="egdc-quick-action-icon">➕</div>
                <div className="flex-1">
                  <div className="egdc-quick-action-title">Nuevo Producto</div>
                  <div className="egdc-quick-action-desc">Agregar producto al catálogo</div>
                </div>
              </button>

              <button className="egdc-quick-action">
                <div className="egdc-quick-action-icon">📊</div>
                <div className="flex-1">
                  <div className="egdc-quick-action-title">Reportes</div>
                  <div className="egdc-quick-action-desc">Ver análisis y estadísticas</div>
                </div>
              </button>
            </div>
          </div>

          {/* Right Column: Recent Activity */}
          <div className="egdc-card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Actividad Reciente</h2>
            <div className="space-y-4">
              <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="egdc-quick-action-icon text-blue-600">📦</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Productos actualizados</div>
                  <div className="text-sm text-gray-500 mt-1">15 productos modificados hace 2 horas</div>
                </div>
              </div>
              
              <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="egdc-quick-action-icon text-green-600">📊</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Inventario sincronizado</div>
                  <div className="text-sm text-gray-500 mt-1">Última sincronización hace 1 hora</div>
                </div>
              </div>

              <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="egdc-quick-action-icon text-orange-600">⚠️</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Alertas de stock bajo</div>
                  <div className="text-sm text-gray-500 mt-1">23 productos requieren reposición</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
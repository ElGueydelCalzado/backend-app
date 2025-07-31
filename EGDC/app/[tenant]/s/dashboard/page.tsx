'use client'

import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import LoadingScreen from '@/components/LoadingScreen'
import TabNavigation from '@/components/TabNavigation'
import TenantSelector from '@/components/TenantSelector'
import { 
  Package, Users, TrendingUp, ShoppingCart, 
  BarChart3, DollarSign, Truck, Building
} from 'lucide-react'

// Dashboard stats interface
interface SupplierStats {
  totalProducts: number
  activeOrders: number
  connectedRetailers: number
  monthlyRevenue: string
}

// Supplier Dashboard Component
export default function SupplierDashboard() {
  const params = useParams()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<SupplierStats>({
    totalProducts: 0,
    activeOrders: 0,
    connectedRetailers: 0,
    monthlyRevenue: '$0'
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

    // Validate tenant access and business type
    const userTenant = session.user?.tenant_subdomain?.toLowerCase()
    const currentTenant = tenant?.toLowerCase()
    const businessType = session.user?.business_type
    
    const isValidTenantAccess = userTenant === currentTenant || 
                              userTenant?.includes(currentTenant) ||
                              currentTenant?.includes(userTenant)
    
    console.log('🔍 Supplier Dashboard - Tenant validation:', {
      userTenant,
      currentTenant,
      businessType,
      isValidTenantAccess,
      sessionUser: session.user
    })

    if (!isValidTenantAccess) {
      console.log('❌ Tenant access denied - user does not have access to this tenant')
      setLoading(false)
      return
    }

    // Check if user has supplier access
    if (businessType !== 'supplier') {
      console.log('❌ Business type mismatch - redirecting to appropriate dashboard')
      const businessRoute = businessType === 'retailer' ? 'r' : 'r' // Default to retailer
      router.push(`/${tenant}/${businessRoute}/dashboard`)
      return
    }

    setLoading(false)
  }, [session, status, tenant, router])

  // Load supplier dashboard stats
  useEffect(() => {
    if (!session || loading) return

    const loadSupplierStats = async () => {
      setStatsLoading(true)
      try {
        console.log('📊 Loading supplier stats for tenant:', tenant)
        
        // For now, use mock data - this would be replaced with actual API calls
        const mockStats: SupplierStats = {
          totalProducts: 150,
          activeOrders: 23,
          connectedRetailers: 45,
          monthlyRevenue: '$12,500'
        }
        
        setStats(mockStats)
      } catch (error) {
        console.error('❌ Error loading supplier stats:', error)
      } finally {
        setStatsLoading(false)
      }
    }

    loadSupplierStats()
  }, [session, loading, tenant])

  if (loading) {
    return <LoadingScreen text="Loading supplier dashboard..." />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <TabNavigation currentTab="supplier-dashboard" />
        <TenantSelector currentTenant={tenant} businessType="supplier" />
      </header>

      {/* Main Dashboard Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Building className="w-8 h-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Supplier Dashboard - {session?.user?.tenant_name || 'EGDC'}
            </h1>
          </div>
          <p className="text-gray-600">
            Manage your product catalog and wholesale operations
          </p>
        </div>

        {/* Supplier Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Products Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Products</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {statsLoading ? '...' : stats.totalProducts.toLocaleString()}
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Active Orders Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Active Orders</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {statsLoading ? '...' : stats.activeOrders.toLocaleString()}
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Connected Retailers Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Connected Retailers</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {statsLoading ? '...' : stats.connectedRetailers.toLocaleString()}
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Monthly Revenue Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Monthly Revenue</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {statsLoading ? '...' : stats.monthlyRevenue}
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Package className="w-5 h-5 mr-2 text-green-600" />
              Supplier Actions
            </h2>
            <div className="space-y-4">
              <button
                onClick={() => router.push(`/${tenant}/inventory`)}
                className="w-full flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-100 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Manage Catalog</div>
                  <div className="text-sm text-gray-500">Add and update your products</div>
                </div>
              </button>
              
              <button className="w-full flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-100 transition-colors text-left">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <Truck className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Process Orders</div>
                  <div className="text-sm text-gray-500">View and fulfill retailer orders</div>
                </div>
              </button>

              <button className="w-full flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-100 transition-colors text-left">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Retailer Network</div>
                  <div className="text-sm text-gray-500">Connect with new retailers</div>
                </div>
              </button>

              <button className="w-full flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-100 transition-colors text-left">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Sales Analytics</div>
                  <div className="text-sm text-gray-500">View performance reports</div>
                </div>
              </button>
            </div>
          </div>

          {/* Right Column: Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
              Recent Activity
            </h2>
            <div className="space-y-4">
              <div className="flex items-center p-4 bg-green-50 rounded-lg border border-green-100">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <ShoppingCart className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">New order received</div>
                  <div className="text-sm text-gray-500 mt-1">Retailer "Fashion Store" placed order #1234</div>
                </div>
              </div>
              
              <div className="flex items-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Catalog updated</div>
                  <div className="text-sm text-gray-500 mt-1">25 products added to your catalog</div>
                </div>
              </div>

              <div className="flex items-center p-4 bg-purple-50 rounded-lg border border-purple-100">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">New retailer connection</div>
                  <div className="text-sm text-gray-500 mt-1">"Boutique ABC" connected to your network</div>
                </div>
              </div>

              <div className="flex items-center p-4 bg-orange-50 rounded-lg border border-orange-100">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Monthly report ready</div>
                  <div className="text-sm text-gray-500 mt-1">Sales analytics for October available</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
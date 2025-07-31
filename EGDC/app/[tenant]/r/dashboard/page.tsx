'use client'

import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import LoadingScreen from '@/components/LoadingScreen'
import TabNavigation from '@/components/TabNavigation'
import TenantSelector from '@/components/TenantSelector'
import { 
  Package, ShoppingCart, TrendingUp, DollarSign, 
  BarChart3, Building, AlertTriangle, Plus
} from 'lucide-react'

// Dashboard stats interface
interface RetailerStats {
  totalProducts: number
  inStock: number
  lowStock: number
  totalValue: string
}

// Retailer Dashboard Component
export default function RetailerDashboard() {
  const params = useParams()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<RetailerStats>({
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

    // Validate tenant access and business type
    const userTenant = session.user?.tenant_subdomain?.toLowerCase()
    const currentTenant = tenant?.toLowerCase()
    const businessType = session.user?.business_type
    
    const isValidTenantAccess = userTenant === currentTenant || 
                              userTenant?.includes(currentTenant) ||
                              currentTenant?.includes(userTenant)
    
    console.log('🔍 Retailer Dashboard - Tenant validation:', {
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

    // Check if user has retailer access
    if (businessType !== 'retailer') {
      console.log('❌ Business type mismatch - redirecting to appropriate dashboard')
      const businessRoute = businessType === 'supplier' ? 's' : 's' // Default to supplier if not retailer
      router.push(`/${tenant}/${businessRoute}/dashboard`)
      return
    }

    setLoading(false)
  }, [session, status, tenant, router])

  // Load retailer dashboard stats
  useEffect(() => {
    if (!session || loading) return

    const loadRetailerStats = async () => {
      setStatsLoading(true)
      try {
        console.log('📊 Loading retailer stats for tenant:', tenant)
        
        const response = await fetch('/api/inventory/counts', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          console.log('✅ Retailer stats loaded:', data)
          
          if (data.success && data.data) {
            const warehouseCounts = data.data
            const totalProducts = warehouseCounts.totalProducts || 0
            const inStock = Math.max(0, totalProducts - 5)
            const lowStock = Math.min(totalProducts, 5)
            const totalValue = `$${(totalProducts * 50).toLocaleString()}`
            
            setStats({
              totalProducts,
              inStock,
              lowStock,
              totalValue
            })
          }
        } else {
          // Use mock data as fallback
          setStats({
            totalProducts: 127,
            inStock: 102,
            lowStock: 25,
            totalValue: '$8,450'
          })
        }
      } catch (error) {
        console.error('❌ Error loading retailer stats:', error)
        // Use mock data as fallback
        setStats({
          totalProducts: 127,
          inStock: 102,
          lowStock: 25,
          totalValue: '$8,450'
        })
      } finally {
        setStatsLoading(false)
      }
    }

    loadRetailerStats()
  }, [session, loading, tenant])

  if (loading) {
    return <LoadingScreen text="Loading retailer dashboard..." />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <TabNavigation currentTab="retailer-dashboard" />
        <TenantSelector currentTenant={tenant} businessType="retailer" />
      </header>

      {/* Main Dashboard Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <ShoppingCart className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Retailer Dashboard - {session?.user?.tenant_name || 'EGDC'}
            </h1>
          </div>
          <p className="text-gray-600">
            Manage your inventory and wholesale purchases
          </p>
        </div>

        {/* Retailer Stats Cards */}
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

          {/* In Stock Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">In Stock</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {statsLoading ? '...' : stats.inStock.toLocaleString()}
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Low Stock Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Low Stock</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {statsLoading ? '...' : stats.lowStock.toLocaleString()}
                </div>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Total Value Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Value</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {statsLoading ? '...' : stats.totalValue}
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
              <ShoppingCart className="w-5 h-5 mr-2 text-blue-600" />
              Retailer Actions
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
                  <div className="font-medium text-gray-900">View Inventory</div>
                  <div className="text-sm text-gray-500">Manage products and stock</div>
                </div>
              </button>
              
              <button
                onClick={() => router.push(`/${tenant}/inventory`)}
                className="w-full flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-100 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <Plus className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Add Product</div>
                  <div className="text-sm text-gray-500">Add new product to catalog</div>
                </div>
              </button>

              <button className="w-full flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-100 transition-colors text-left">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                  <Building className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Browse Suppliers</div>
                  <div className="text-sm text-gray-500">Find new wholesale suppliers</div>
                </div>
              </button>

              <button className="w-full flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-100 transition-colors text-left">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Reports</div>
                  <div className="text-sm text-gray-500">View analytics and statistics</div>
                </div>
              </button>
            </div>
          </div>

          {/* Right Column: Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
              Recent Activity
            </h2>
            <div className="space-y-4">
              <div className="flex items-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Products updated</div>
                  <div className="text-sm text-gray-500 mt-1">15 products modified 2 hours ago</div>
                </div>
              </div>
              
              <div className="flex items-center p-4 bg-green-50 rounded-lg border border-green-100">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Inventory synchronized</div>
                  <div className="text-sm text-gray-500 mt-1">Last sync 1 hour ago</div>
                </div>
              </div>

              <div className="flex items-center p-4 bg-orange-50 rounded-lg border border-orange-100">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Low stock alerts</div>
                  <div className="text-sm text-gray-500 mt-1">23 products need restocking</div>
                </div>
              </div>

              <div className="flex items-center p-4 bg-purple-50 rounded-lg border border-purple-100">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                  <Building className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">New supplier available</div>
                  <div className="text-sm text-gray-500 mt-1">"Premium Footwear Co." joined the platform</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
  Package, Users, ShoppingCart, TrendingUp, 
  Plus, Settings, Bell, Search, Filter,
  BarChart3, DollarSign, Clock, CheckCircle2
} from 'lucide-react'

interface DashboardStats {
  total_products: number
  active_products: number
  pending_orders: number
  completed_orders: number
  monthly_revenue: number
  active_customers: number
}

interface RecentOrder {
  id: string
  order_number: string
  customer_name: string
  total_amount: number
  status: string
  created_at: string
  items_count: number
}

interface TopProduct {
  id: string
  name: string
  category: string
  orders_count: number
  revenue: number
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [showWelcome, setShowWelcome] = useState(false)
  const [subdomain, setSubdomain] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    total_products: 0,
    active_products: 0,
    pending_orders: 0,
    completed_orders: 0,
    monthly_revenue: 0,
    active_customers: 0
  })

  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])

  useEffect(() => {
    // Check if this is a welcome redirect from onboarding
    const welcome = searchParams.get('welcome')
    const subdomainParam = searchParams.get('subdomain')
    
    if (welcome === 'true') {
      setShowWelcome(true)
    }
    
    if (subdomainParam) {
      setSubdomain(subdomainParam)
    }

    // Load dashboard data
    loadDashboardData()
  }, [searchParams])

  const loadDashboardData = async () => {
    setIsLoading(true)
    
    try {
      // Simulate loading dashboard data
      // In a real app, this would fetch from APIs
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Mock data for demo
      setStats({
        total_products: 127,
        active_products: 98,
        pending_orders: 7,
        completed_orders: 156,
        monthly_revenue: 23450,
        active_customers: 34
      })

      setRecentOrders([
        {
          id: '1',
          order_number: 'PO-2025-000123',
          customer_name: 'EGDC Retailer',
          total_amount: 2850.00,
          status: 'pending',
          created_at: '2025-07-21T10:30:00Z',
          items_count: 15
        },
        {
          id: '2',
          order_number: 'PO-2025-000122',
          customer_name: 'Fashion Forward Inc',
          total_amount: 1240.50,
          status: 'confirmed',
          created_at: '2025-07-20T16:45:00Z',
          items_count: 8
        },
        {
          id: '3',
          order_number: 'PO-2025-000121',
          customer_name: 'Urban Style Co',
          total_amount: 950.00,
          status: 'shipped',
          created_at: '2025-07-19T14:20:00Z',
          items_count: 6
        }
      ])

      setTopProducts([
        {
          id: '1',
          name: 'Training Pro - Black',
          category: 'Deportivos',
          orders_count: 23,
          revenue: 5750.00
        },
        {
          id: '2',
          name: 'Comfort Walk - Brown',
          category: 'Casuales',
          orders_count: 18,
          revenue: 4320.00
        },
        {
          id: '3',
          name: 'Business Classic - Navy',
          category: 'Formales',
          orders_count: 15,
          revenue: 3900.00
        }
      ])

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'shipped': return 'bg-green-100 text-green-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Welcome Banner */}
      {showWelcome && (
        <div className="bg-green-500 text-white px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-6 h-6" />
              <div>
                <p className="font-medium">Welcome to your supplier dashboard!</p>
                <p className="text-sm opacity-90">Your workspace is ready and you can start managing your inventory.</p>
              </div>
            </div>
            <button 
              onClick={() => setShowWelcome(false)}
              className="text-white/80 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Supplier Dashboard</h1>
              {subdomain && (
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {subdomain}.inv.lospapatos.com
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products, orders..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <button className="relative p-2 text-gray-600 hover:text-gray-900">
                <Bell className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>
              
              <button className="p-2 text-gray-600 hover:text-gray-900">
                <Settings className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_products}</p>
                <p className="text-sm text-gray-500">{stats.active_products} active</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                <p className="text-3xl font-bold text-gray-900">{stats.pending_orders}</p>
                <p className="text-sm text-gray-500">{stats.completed_orders} completed</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-3xl font-bold text-gray-900">${stats.monthly_revenue.toLocaleString()}</p>
                <p className="text-sm text-green-600 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  +12.5%
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Customers</p>
                <p className="text-3xl font-bold text-gray-900">{stats.active_customers}</p>
                <p className="text-sm text-gray-500">This month</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
                <div className="flex items-center space-x-3">
                  <button className="text-gray-600 hover:text-gray-900">
                    <Filter className="w-5 h-5" />
                  </button>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                    View All
                  </button>
                </div>
              </div>
            </div>
            
            <div className="divide-y divide-gray-200">
              {recentOrders.map((order) => (
                <div key={order.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="font-medium text-gray-900">{order.order_number}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{order.customer_name}</p>
                      <p className="text-sm text-gray-500">
                        {order.items_count} items • {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">${order.total_amount.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">Total</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Top Products</h2>
              <p className="text-sm text-gray-600">Best performing this month</p>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-700' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">${product.revenue.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{product.orders_count} orders</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <button className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow text-left group">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg group-hover:bg-blue-200">
                <Plus className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Add Product</p>
                <p className="text-sm text-gray-500">Create new inventory item</p>
              </div>
            </div>
          </button>

          <button className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow text-left group">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-lg group-hover:bg-green-200">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">View Analytics</p>
                <p className="text-sm text-gray-500">Sales & performance data</p>
              </div>
            </div>
          </button>

          <button className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow text-left group">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 p-2 rounded-lg group-hover:bg-purple-200">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Manage Customers</p>
                <p className="text-sm text-gray-500">View retailer accounts</p>
              </div>
            </div>
          </button>

          <button className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow text-left group">
            <div className="flex items-center space-x-3">
              <div className="bg-gray-100 p-2 rounded-lg group-hover:bg-gray-200">
                <Settings className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Settings</p>
                <p className="text-sm text-gray-500">Configure workspace</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SupplierDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
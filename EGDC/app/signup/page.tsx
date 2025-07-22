'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ShoppingCart, Package, Users, TrendingUp, 
  ArrowRight, CheckCircle2, Building, 
  Truck, BarChart3, Zap
} from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<'retailer' | 'supplier' | null>(null)

  const handleTypeSelection = (type: 'retailer' | 'supplier') => {
    setSelectedType(type)
    // Add a small delay for visual feedback
    setTimeout(() => {
      router.push(`/signup/${type}`)
    }, 300)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-lg font-bold">EG</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">El Guey del Calzado</h1>
                <p className="text-sm text-gray-600">B2B Marketplace Platform</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Already have an account?</span>
              <a 
                href="/login" 
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign In
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Join the Future of <span className="text-blue-600">B2B Commerce</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Whether you're buying or selling wholesale, our platform connects businesses 
            and streamlines operations for maximum efficiency and growth.
          </p>
        </div>

        {/* Account Type Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Retailer Card */}
          <div 
            className={`relative bg-white rounded-2xl shadow-xl p-8 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 ${
              selectedType === 'retailer' ? 'ring-4 ring-blue-500 transform -translate-y-2' : ''
            }`}
            onClick={() => handleTypeSelection('retailer')}
          >
            <div className="absolute top-6 right-6">
              {selectedType === 'retailer' ? (
                <CheckCircle2 className="w-8 h-8 text-blue-600" />
              ) : (
                <ArrowRight className="w-8 h-8 text-gray-400" />
              )}
            </div>

            <div className="mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4">
                <ShoppingCart className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">I'm a Retailer</h2>
              <p className="text-gray-600">
                Buy wholesale products directly from suppliers and manufacturers
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Package className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-gray-700">Browse supplier catalogs</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-gray-700">Compare prices and terms</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Zap className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-gray-700">Place orders instantly</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-gray-700">Track inventory and sales</span>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-2">Perfect for:</h3>
              <div className="flex flex-wrap gap-2">
                {['Shoe Stores', 'Fashion Retailers', 'Online Merchants', 'Distributors'].map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Supplier Card */}
          <div 
            className={`relative bg-white rounded-2xl shadow-xl p-8 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 ${
              selectedType === 'supplier' ? 'ring-4 ring-green-500 transform -translate-y-2' : ''
            }`}
            onClick={() => handleTypeSelection('supplier')}
          >
            <div className="absolute top-6 right-6">
              {selectedType === 'supplier' ? (
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              ) : (
                <ArrowRight className="w-8 h-8 text-gray-400" />
              )}
            </div>

            <div className="mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-4">
                <Building className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">I'm a Supplier</h2>
              <p className="text-gray-600">
                Sell wholesale products to retailers and expand your market reach
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Package className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-700">Manage product catalogs</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-700">Connect with retailers</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Truck className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-700">Process orders efficiently</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-700">Grow your business</span>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-2">Perfect for:</h3>
              <div className="flex flex-wrap gap-2">
                {['Manufacturers', 'Wholesalers', 'Distributors', 'Brands'].map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Why Choose Our Platform?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Lightning Fast</h3>
              <p className="text-gray-600 text-sm">
                Process orders and manage inventory in real-time with our optimized platform
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Data-Driven</h3>
              <p className="text-gray-600 text-sm">
                Make informed decisions with comprehensive analytics and reporting tools
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Connected</h3>
              <p className="text-gray-600 text-sm">
                Build stronger relationships with integrated communication and collaboration tools
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Not sure which option is right for you?
          </p>
          <a 
            href="mailto:support@lospapatos.com" 
            className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <span>Contact our team for guidance</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  )
}
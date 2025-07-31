'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { 
  ShoppingCart, Package, Users, TrendingUp, 
  ArrowRight, CheckCircle2, Building, 
  Truck, BarChart3, Zap, Chrome, Mail, AlertCircle,
  Loader2
} from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [accountType, setAccountType] = useState<'retailer' | 'supplier'>('retailer')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleSignup = async () => {
    setIsLoading(true)
    setError('')

    try {
      // Store the account type selection in localStorage for after OAuth
      localStorage.setItem('signup_account_type', accountType)
      localStorage.setItem('signup_username', username)
      
      await signIn('google', {
        callbackUrl: '/api/auth/complete-registration'
      })
    } catch (error) {
      setError('Google signup failed. Please try again.')
      setIsLoading(false)
    }
  }

  const handleDirectSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!username || !email) {
      setError('Username and email are required')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Create account via API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          email,
          business_type: accountType
        })
      })

      const data = await response.json()

      if (data.success) {
        // Redirect to appropriate dashboard
        const businessRoute = accountType === 'supplier' ? 's' : 'r'
        router.push(`/${username}/${businessRoute}/dashboard`)
      } else {
        setError(data.error || 'Registration failed')
      }
    } catch (error) {
      setError('Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
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
                className="text-orange-600 hover:text-orange-700 font-medium"
              >
                Sign In
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Create Your <span className="text-orange-600">Business Account</span>
          </h1>
          <p className="text-lg text-gray-600">
            Get started with our B2B platform in just a few steps
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center" role="alert">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Signup Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleDirectSignup} className="space-y-6">
            {/* Account Type Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Account Type
              </label>
              <div className="flex rounded-lg bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setAccountType('retailer')}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${
                    accountType === 'retailer'
                      ? 'bg-white text-orange-600 shadow-sm ring-1 ring-orange-200'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Retailer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('supplier')}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${
                    accountType === 'supplier'
                      ? 'bg-white text-orange-600 shadow-sm ring-1 ring-orange-200'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Building className="w-4 h-4" />
                  <span>Supplier</span>
                </button>
              </div>
            </div>

            {/* Username Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Username (Subdomain)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                  placeholder="your-business-name"
                  required
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                  .lospapatos.com
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This will be your business URL: app.lospapatos.com/{username}
              </p>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Email
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                  placeholder="contact@yourbusiness.com"
                  required
                />
              </div>
            </div>

            {/* Account Type Description */}
            <div className="bg-gray-50 rounded-lg p-4">
              {accountType === 'retailer' ? (
                <div className="flex items-start space-x-3">
                  <ShoppingCart className="w-5 h-5 text-orange-600 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900">Retailer Account</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Perfect for buying wholesale products from suppliers. Access product catalogs, 
                      place orders, and manage your inventory.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start space-x-3">
                  <Building className="w-5 h-5 text-orange-600 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900">Supplier Account</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Perfect for selling wholesale products to retailers. Manage your catalog, 
                      process orders, and connect with buyers.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !username || !email}
              className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 text-gray-500 bg-white">Or continue with</span>
              </div>
            </div>
          </div>

          {/* Google OAuth Button */}
          <button
            onClick={handleGoogleSignup}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-3 py-3 px-4 border border-gray-300 bg-white rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Chrome className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900">Continue with Google</span>
          </button>
        </div>
      </div>
    </div>
  )
}
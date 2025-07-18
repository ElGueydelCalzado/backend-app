'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Building2, User, Mail, Globe, CreditCard, ArrowRight, Check } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    business_name: '',
    subdomain: '',
    plan: 'starter'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null)
  const [checkingSubdomain, setCheckingSubdomain] = useState(false)

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: '$29/month',
      description: 'Perfect for small businesses',
      features: ['Up to 1,000 products', 'Basic reporting', 'Email support']
    },
    {
      id: 'professional',
      name: 'Professional',
      price: '$99/month',
      description: 'For growing businesses',
      features: ['Up to 10,000 products', 'Advanced reporting', 'Priority support', 'API access']
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      description: 'For large organizations',
      features: ['Unlimited products', 'Custom integrations', 'Dedicated support', 'SLA']
    }
  ]

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Auto-generate subdomain from business name
    if (name === 'business_name') {
      const subdomain = value.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 20)
      
      setFormData(prev => ({
        ...prev,
        subdomain
      }))
    }
  }

  const checkSubdomainAvailability = async (subdomain: string) => {
    if (!subdomain || subdomain.length < 3) {
      setSubdomainAvailable(null)
      return
    }
    
    setCheckingSubdomain(true)
    
    try {
      const response = await fetch(`/api/auth/register?subdomain=${subdomain}`)
      const data = await response.json()
      
      if (data.success) {
        setSubdomainAvailable(data.available)
      }
    } catch (error) {
      console.error('Error checking subdomain:', error)
    } finally {
      setCheckingSubdomain(false)
    }
  }

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target
    const cleanValue = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    
    setFormData(prev => ({
      ...prev,
      subdomain: cleanValue
    }))
    
    // Check availability after user stops typing
    const timeoutId = setTimeout(() => {
      checkSubdomainAvailability(cleanValue)
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      // First create the account
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Registration failed')
      }
      
      // Then sign in with Google
      await signIn('google', {
        callbackUrl: '/inventario'
      })
      
    } catch (error) {
      console.error('Registration error:', error)
      setError(error instanceof Error ? error.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    signIn('google', {
      callbackUrl: '/inventario'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Join EGDC SaaS Platform
            </h1>
            <p className="text-xl text-gray-600">
              Manage your inventory with our powerful multi-tenant platform
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Registration Form */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Create Your Account
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="inline w-4 h-4 mr-2" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="inline w-4 h-4 mr-2" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                {/* Business Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Building2 className="inline w-4 h-4 mr-2" />
                    Business Name
                  </label>
                  <input
                    type="text"
                    name="business_name"
                    value={formData.business_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your business name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Globe className="inline w-4 h-4 mr-2" />
                    Subdomain
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      name="subdomain"
                      value={formData.subdomain}
                      onChange={handleSubdomainChange}
                      className={`flex-1 px-4 py-3 border rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        subdomainAvailable === false ? 'border-red-300' : 
                        subdomainAvailable === true ? 'border-green-300' : 'border-gray-300'
                      }`}
                      placeholder="your-business"
                      required
                    />
                    <span className="px-4 py-3 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-600">
                      .egdc.app
                    </span>
                  </div>
                  {checkingSubdomain && (
                    <p className="text-sm text-gray-500 mt-1">Checking availability...</p>
                  )}
                  {subdomainAvailable === false && (
                    <p className="text-sm text-red-600 mt-1">Subdomain already taken</p>
                  )}
                  {subdomainAvailable === true && (
                    <p className="text-sm text-green-600 mt-1">✓ Subdomain available</p>
                  )}
                </div>

                {/* Plan Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    <CreditCard className="inline w-4 h-4 mr-2" />
                    Choose Your Plan
                  </label>
                  <div className="grid grid-cols-1 gap-4">
                    {plans.map(plan => (
                      <div
                        key={plan.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          formData.plan === plan.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setFormData(prev => ({ ...prev, plan: plan.id }))}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                            <p className="text-sm text-gray-600">{plan.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-blue-600">{plan.price}</p>
                            {formData.plan === plan.id && (
                              <Check className="w-5 h-5 text-blue-600 ml-auto" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !subdomainAvailable}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {loading ? (
                    'Creating Account...'
                  ) : (
                    <>
                      Create Account & Sign In
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <button
                    onClick={handleGoogleSignIn}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Sign in with Google
                  </button>
                </p>
              </div>
            </div>

            {/* Features & Benefits */}
            <div className="space-y-8">
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  Why Choose EGDC SaaS?
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <Check className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-900">Multi-Tenant Architecture</h4>
                      <p className="text-sm text-gray-600">Complete data isolation for your business</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Check className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-900">Real-Time Inventory</h4>
                      <p className="text-sm text-gray-600">Track products across multiple locations</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Check className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-900">Automated Pricing</h4>
                      <p className="text-sm text-gray-600">Smart pricing across all platforms</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Check className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-900">Team Collaboration</h4>
                      <p className="text-sm text-gray-600">Invite team members with role-based access</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-8 text-white">
                <h3 className="text-xl font-semibold mb-4">
                  Start Your Free Trial
                </h3>
                <p className="text-blue-100 mb-6">
                  Get 14 days free on any plan. No credit card required.
                </p>
                <ul className="space-y-2 text-sm text-blue-100">
                  <li>✓ Full access to all features</li>
                  <li>✓ Import your existing data</li>
                  <li>✓ Setup assistance included</li>
                  <li>✓ Cancel anytime</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
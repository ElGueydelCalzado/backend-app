'use client'

// Force rebuild - registration UX improvements
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn, useSession, getSession } from 'next-auth/react'
import { Building2, User, Mail, Globe, CreditCard, ArrowRight, Check, AlertCircle } from 'lucide-react'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  
  // Check if this is a pending registration from OAuth
  const emailFromQuery = searchParams.get('email')
  const isPendingRegistration = !!emailFromQuery || session?.registration_required
  
  const [formData, setFormData] = useState({
    name: session?.user?.name || '',
    email: emailFromQuery || session?.user?.email || '',
    business_name: '',
    subdomain: '',
    plan: 'starter'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null)
  const [checkingSubdomain, setCheckingSubdomain] = useState(false)

  // Update form data when session loads (for pending registrations)
  useEffect(() => {
    if (session?.user && isPendingRegistration) {
      setFormData(prev => ({
        ...prev,
        name: session.user.name || prev.name,
        email: session.user.email || prev.email
      }))
    }
  }, [session, isPendingRegistration])

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
      if (isPendingRegistration) {
        // Complete registration for already authenticated user
        const response = await fetch('/api/auth/complete-registration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            business_name: formData.business_name,
            subdomain: formData.subdomain,
            plan: formData.plan
          })
        })
        
        const data = await response.json()
        
        if (!data.success) {
          throw new Error(data.error || 'Registration completion failed')
        }
        
        // Force a full page reload to ensure fresh token
        window.location.href = `/${formData.subdomain}/dashboard`
        
      } else {
        // Standard registration flow
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
          callbackUrl: '/dashboard'
        })
      }
      
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
            {isPendingRegistration ? (
              <>
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-blue-600 mr-2" />
                    <p className="text-blue-800 font-medium">
                      Complete Your Registration
                    </p>
                  </div>
                  <p className="text-blue-600 text-sm mt-2">
                    You're logged in with {formData.email}. Please complete your business setup below.
                  </p>
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Complete Your EGDC Setup
                </h1>
                <p className="text-xl text-gray-600">
                  Just a few more details to get your business dashboard ready
                </p>
              </>
            ) : (
              <>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Join EGDC SaaS Platform
                </h1>
                <p className="text-xl text-gray-600">
                  Manage your inventory with our powerful multi-tenant platform
                </p>
              </>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Registration Form */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                {isPendingRegistration ? 'Complete Your Setup' : 'Create Your Account'}
              </h2>
              
              {/* Primary Google Sign Up Button - Only show for new registrations */}
              {!isPendingRegistration && (
                <div className="mb-8">
                  <button
                    onClick={handleGoogleSignIn}
                    className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center text-lg"
                  >
                    <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                      <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign Up with Google - Get Started Now!
                  </button>
                  <p className="mt-2 text-center text-sm text-gray-500">
                    ✨ One-click registration • Business details optional
                  </p>
                  
                  <div className="relative mt-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Or fill out details manually</span>
                    </div>
                  </div>
                </div>
              )}
              
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
                    disabled={isPendingRegistration}
                    className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isPendingRegistration ? 'bg-gray-50 text-gray-500' : ''
                    }`}
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
                    disabled={isPendingRegistration}
                    className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isPendingRegistration ? 'bg-gray-50 text-gray-500' : ''
                    }`}
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
                    isPendingRegistration ? 'Completing Setup...' : 'Creating Account...'
                  ) : (
                    <>
                      {isPendingRegistration ? 'Complete Setup & Continue' : 'Create Account & Sign In'}
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              {/* Primary Google Sign Up - Only show for new registrations */}
              {!isPendingRegistration && (
                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Or sign up instantly</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleGoogleSignIn}
                    className="mt-4 w-full bg-white border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign Up with Google
                  </button>
                  
                  <p className="mt-3 text-center text-xs text-gray-500">
                    Business details can be added after sign-up
                  </p>
                </div>
              )}
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

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading registration...</p>
        </div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
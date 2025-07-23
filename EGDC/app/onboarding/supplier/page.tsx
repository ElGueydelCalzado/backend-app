'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, ChevronRight, ArrowLeft, Building, Package, CreditCard, Users, Settings, Rocket } from 'lucide-react'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  component: React.ReactNode
}

interface CompanySetup {
  company_logo?: string
  business_hours: string
  timezone: string
  currency: string
  language: string
}

interface ProductCatalog {
  catalog_name: string
  import_method: 'manual' | 'csv' | 'api'
  sample_products: boolean
  product_categories: string[]
}

interface BillingSetup {
  plan_selected: string
  billing_cycle: 'monthly' | 'annual'
  payment_method: string
  billing_address: {
    street: string
    city: string
    state: string
    postal_code: string
    country: string
  }
}

interface UserManagement {
  admin_users: Array<{
    name: string
    email: string
    role: string
  }>
  team_size: string
  permissions_setup: boolean
}

interface IntegrationSettings {
  connect_shopify: boolean
  connect_marketplace: boolean
  webhook_setup: boolean
  api_access: boolean
}

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const [supplierData, setSupplierData] = useState<any>(null)

  // Form data for each step
  const [companySetup, setCompanySetup] = useState<CompanySetup>({
    business_hours: '9:00 AM - 6:00 PM',
    timezone: 'America/Chicago',
    currency: 'USD',
    language: 'en'
  })

  const [productCatalog, setProductCatalog] = useState<ProductCatalog>({
    catalog_name: '',
    import_method: 'manual',
    sample_products: false,
    product_categories: []
  })

  const [billingSetup, setBillingSetup] = useState<BillingSetup>({
    plan_selected: 'supplier_professional',
    billing_cycle: 'monthly',
    payment_method: '',
    billing_address: {
      street: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'USA'
    }
  })

  const [userManagement, setUserManagement] = useState<UserManagement>({
    admin_users: [],
    team_size: '1-5',
    permissions_setup: false
  })

  const [integrationSettings, setIntegrationSettings] = useState<IntegrationSettings>({
    connect_shopify: false,
    connect_marketplace: true,
    webhook_setup: false,
    api_access: false
  })

  useEffect(() => {
    // Get application ID from URL params
    const appId = searchParams.get('application_id')
    if (appId) {
      setApplicationId(appId)
      // In a real app, fetch application details
      setSupplierData({
        business_name: 'Demo Footwear Solutions',
        subdomain: 'demofootwear123'
      })
    }
  }, [searchParams])

  // Company Setup Step
  const CompanySetupStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Building className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Company Setup</h2>
        <p className="text-gray-600">Configure your business settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Hours
          </label>
          <select
            value={companySetup.business_hours}
            onChange={(e) => setCompanySetup({...companySetup, business_hours: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="9:00 AM - 6:00 PM">9:00 AM - 6:00 PM</option>
            <option value="8:00 AM - 5:00 PM">8:00 AM - 5:00 PM</option>
            <option value="10:00 AM - 7:00 PM">10:00 AM - 7:00 PM</option>
            <option value="24/7">24/7</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timezone
          </label>
          <select
            value={companySetup.timezone}
            onChange={(e) => setCompanySetup({...companySetup, timezone: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Currency
          </label>
          <select
            value={companySetup.currency}
            onChange={(e) => setCompanySetup({...companySetup, currency: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="USD">USD - US Dollar</option>
            <option value="MXN">MXN - Mexican Peso</option>
            <option value="EUR">EUR - Euro</option>
            <option value="CAD">CAD - Canadian Dollar</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Primary Language
          </label>
          <select
            value={companySetup.language}
            onChange={(e) => setCompanySetup({...companySetup, language: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Your Workspace</h3>
        <p className="text-blue-700 text-sm">
          Your supplier workspace will be available at: 
          <span className="font-mono bg-blue-100 px-2 py-1 rounded ml-2">
            {supplierData?.subdomain}.inv.lospapatos.com
          </span>
        </p>
      </div>
    </div>
  )

  // Product Catalog Step
  const ProductCatalogStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Package className="w-12 h-12 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Catalog</h2>
        <p className="text-gray-600">Set up your product inventory and catalog</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Catalog Name
        </label>
        <input
          type="text"
          value={productCatalog.catalog_name}
          onChange={(e) => setProductCatalog({...productCatalog, catalog_name: e.target.value})}
          placeholder="e.g., Spring 2025 Collection"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          How would you like to add your products?
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { value: 'manual', label: 'Manual Entry', desc: 'Add products one by one' },
            { value: 'csv', label: 'CSV Import', desc: 'Upload a CSV file' },
            { value: 'api', label: 'API Integration', desc: 'Connect existing system' }
          ].map((method) => (
            <label key={method.value} className="cursor-pointer">
              <input
                type="radio"
                name="import_method"
                value={method.value}
                checked={productCatalog.import_method === method.value}
                onChange={(e) => setProductCatalog({...productCatalog, import_method: e.target.value as any})}
                className="sr-only"
              />
              <div className={`p-4 border-2 rounded-lg text-center transition-all ${
                productCatalog.import_method === method.value
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                <div className="font-medium text-gray-900">{method.label}</div>
                <div className="text-sm text-gray-600 mt-1">{method.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="sample_products"
          checked={productCatalog.sample_products}
          onChange={(e) => setProductCatalog({...productCatalog, sample_products: e.target.checked})}
          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
        />
        <label htmlFor="sample_products" className="ml-3 text-sm text-gray-700">
          Add sample products to get started quickly
        </label>
      </div>
    </div>
  )

  // Billing Setup Step
  const BillingSetupStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CreditCard className="w-12 h-12 text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Billing Setup</h2>
        <p className="text-gray-600">Choose your plan and configure billing</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border-2 border-purple-500 rounded-lg p-6 bg-purple-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-purple-900">Supplier Professional</h3>
            <div className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">Recommended</div>
          </div>
          <div className="text-3xl font-bold text-purple-900 mb-2">
            $99<span className="text-lg font-normal">/month</span>
          </div>
          <ul className="space-y-2 text-sm text-purple-700">
            <li>✓ Unlimited products</li>
            <li>✓ Multi-warehouse management</li>
            <li>✓ API access</li>
            <li>✓ Priority support</li>
            <li>✓ Custom integrations</li>
          </ul>
        </div>

        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Supplier Starter</h3>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            $49<span className="text-lg font-normal">/month</span>
          </div>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>✓ Up to 1,000 products</li>
            <li>✓ Basic inventory tracking</li>
            <li>✓ Standard support</li>
            <li>✗ API access</li>
            <li>✗ Custom integrations</li>
          </ul>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Billing Cycle
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="cursor-pointer">
            <input
              type="radio"
              name="billing_cycle"
              value="monthly"
              checked={billingSetup.billing_cycle === 'monthly'}
              onChange={(e) => setBillingSetup({...billingSetup, billing_cycle: e.target.value as any})}
              className="sr-only"
            />
            <div className={`p-3 border rounded-lg text-center ${
              billingSetup.billing_cycle === 'monthly'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-300'
            }`}>
              <div className="font-medium">Monthly</div>
              <div className="text-sm text-gray-600">Pay monthly</div>
            </div>
          </label>
          <label className="cursor-pointer">
            <input
              type="radio"
              name="billing_cycle"
              value="annual"
              checked={billingSetup.billing_cycle === 'annual'}
              onChange={(e) => setBillingSetup({...billingSetup, billing_cycle: e.target.value as any})}
              className="sr-only"
            />
            <div className={`p-3 border rounded-lg text-center ${
              billingSetup.billing_cycle === 'annual'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-300'
            }`}>
              <div className="font-medium">Annual</div>
              <div className="text-sm text-gray-600">Save 20%</div>
            </div>
          </label>
        </div>
      </div>

      <div className="bg-yellow-50 p-4 rounded-lg">
        <h3 className="font-medium text-yellow-900 mb-2">7-Day Free Trial</h3>
        <p className="text-yellow-700 text-sm">
          Start with a 7-day free trial. No credit card required. You can cancel anytime.
        </p>
      </div>
    </div>
  )

  // User Management Step
  const UserManagementStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Users className="w-12 h-12 text-orange-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Setup</h2>
        <p className="text-gray-600">Add team members and configure permissions</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Team Size
        </label>
        <select
          value={userManagement.team_size}
          onChange={(e) => setUserManagement({...userManagement, team_size: e.target.value})}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
        >
          <option value="1-5">1-5 users</option>
          <option value="6-20">6-20 users</option>
          <option value="21-50">21-50 users</option>
          <option value="50+">50+ users</option>
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Additional Admin Users
          </label>
          <button
            type="button"
            onClick={() => setUserManagement({
              ...userManagement,
              admin_users: [...userManagement.admin_users, { name: '', email: '', role: 'admin' }]
            })}
            className="text-orange-600 hover:text-orange-700 text-sm font-medium"
          >
            + Add User
          </button>
        </div>

        {userManagement.admin_users.map((user, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg mb-3">
            <input
              type="text"
              placeholder="Full Name"
              value={user.name}
              onChange={(e) => {
                const updated = [...userManagement.admin_users]
                updated[index].name = e.target.value
                setUserManagement({...userManagement, admin_users: updated})
              }}
              className="px-3 py-2 border border-gray-300 rounded focus:ring-orange-500 focus:border-orange-500"
            />
            <input
              type="email"
              placeholder="Email Address"
              value={user.email}
              onChange={(e) => {
                const updated = [...userManagement.admin_users]
                updated[index].email = e.target.value
                setUserManagement({...userManagement, admin_users: updated})
              }}
              className="px-3 py-2 border border-gray-300 rounded focus:ring-orange-500 focus:border-orange-500"
            />
            <select
              value={user.role}
              onChange={(e) => {
                const updated = [...userManagement.admin_users]
                updated[index].role = e.target.value
                setUserManagement({...userManagement, admin_users: updated})
              }}
              className="px-3 py-2 border border-gray-300 rounded focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="user">User</option>
            </select>
          </div>
        ))}

        {userManagement.admin_users.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No additional users added yet.</p>
            <p className="text-sm">You can always add team members later from your dashboard.</p>
          </div>
        )}
      </div>
    </div>
  )

  // Integration Settings Step
  const IntegrationSettingsStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Settings className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Integrations</h2>
        <p className="text-gray-600">Connect with your existing systems and platforms</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium text-gray-900">B2B Marketplace</h3>
              <p className="text-sm text-gray-600">Connect with retailer customers</p>
            </div>
            <input
              type="checkbox"
              checked={integrationSettings.connect_marketplace}
              onChange={(e) => setIntegrationSettings({
                ...integrationSettings,
                connect_marketplace: e.target.checked
              })}
              className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
          </div>
          <div className="text-sm text-gray-600">
            Allow retailers to browse your catalog and place orders directly.
          </div>
        </div>

        <div className="border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium text-gray-900">Shopify Integration</h3>
              <p className="text-sm text-gray-600">Sync with your Shopify store</p>
            </div>
            <input
              type="checkbox"
              checked={integrationSettings.connect_shopify}
              onChange={(e) => setIntegrationSettings({
                ...integrationSettings,
                connect_shopify: e.target.checked
              })}
              className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
          </div>
          <div className="text-sm text-gray-600">
            Automatically sync inventory between your warehouse and Shopify store.
          </div>
        </div>

        <div className="border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium text-gray-900">API Access</h3>
              <p className="text-sm text-gray-600">Developer API for custom integrations</p>
            </div>
            <input
              type="checkbox"
              checked={integrationSettings.api_access}
              onChange={(e) => setIntegrationSettings({
                ...integrationSettings,
                api_access: e.target.checked
              })}
              className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
          </div>
          <div className="text-sm text-gray-600">
            Generate API keys for custom integrations and third-party tools.
          </div>
        </div>

        <div className="border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium text-gray-900">Webhooks</h3>
              <p className="text-sm text-gray-600">Real-time event notifications</p>
            </div>
            <input
              type="checkbox"
              checked={integrationSettings.webhook_setup}
              onChange={(e) => setIntegrationSettings({
                ...integrationSettings,
                webhook_setup: e.target.checked
              })}
              className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
          </div>
          <div className="text-sm text-gray-600">
            Receive real-time notifications when orders, inventory, or customers change.
          </div>
        </div>
      </div>
    </div>
  )

  // Launch Step
  const LaunchStep = () => (
    <div className="space-y-6 text-center">
      <div>
        <Rocket className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Ready to Launch!</h2>
        <p className="text-gray-600 text-lg">Your supplier workspace is configured and ready to use</p>
      </div>

      <div className="bg-green-50 p-6 rounded-lg">
        <h3 className="font-bold text-green-900 mb-4">What's Next?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-green-800 font-bold text-sm">1</span>
            </div>
            <div>
              <h4 className="font-medium text-green-900">Access Your Dashboard</h4>
              <p className="text-sm text-green-700">Log in to your new supplier workspace</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-green-800 font-bold text-sm">2</span>
            </div>
            <div>
              <h4 className="font-medium text-green-900">Add Your Products</h4>
              <p className="text-sm text-green-700">Start building your product catalog</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex-shrink-0 flex items-center justify-center">
              <span className="text-green-800 font-bold text-sm">3</span>
            </div>
            <div>
              <h4 className="font-medium text-green-900">Connect with Retailers</h4>
              <p className="text-sm text-green-700">Start receiving wholesale orders</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-blue-900 font-medium">
          Your workspace URL: 
          <span className="font-mono bg-blue-100 px-2 py-1 rounded ml-2">
            {supplierData?.subdomain}.inv.lospapatos.com
          </span>
        </p>
        <p className="text-blue-700 text-sm mt-2">
          Bookmark this URL for quick access to your supplier dashboard
        </p>
      </div>
    </div>
  )

  const steps: OnboardingStep[] = [
    {
      id: 'company',
      title: 'Company Setup',
      description: 'Configure business settings',
      icon: <Building className="w-5 h-5" />,
      component: <CompanySetupStep />
    },
    {
      id: 'catalog',
      title: 'Product Catalog',
      description: 'Set up your inventory',
      icon: <Package className="w-5 h-5" />,
      component: <ProductCatalogStep />
    },
    {
      id: 'billing',
      title: 'Billing Setup',
      description: 'Choose your plan',
      icon: <CreditCard className="w-5 h-5" />,
      component: <BillingSetupStep />
    },
    {
      id: 'team',
      title: 'Team Setup',
      description: 'Add team members',
      icon: <Users className="w-5 h-5" />,
      component: <UserManagementStep />
    },
    {
      id: 'integrations',
      title: 'Integrations',
      description: 'Connect your systems',
      icon: <Settings className="w-5 h-5" />,
      component: <IntegrationSettingsStep />
    },
    {
      id: 'launch',
      title: 'Launch',
      description: 'You\'re ready to go!',
      icon: <Rocket className="w-5 h-5" />,
      component: <LaunchStep />
    }
  ]

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Final step - complete onboarding
      await completeOnboarding()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const completeOnboarding = async () => {
    setIsLoading(true)
    
    try {
      // In a real app, save all onboarding data
      const onboardingData = {
        application_id: applicationId,
        company_setup: companySetup,
        product_catalog: productCatalog,
        billing_setup: billingSetup,
        user_management: userManagement,
        integration_settings: integrationSettings
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Redirect to supplier dashboard
      router.push(`/dashboard?subdomain=${supplierData?.subdomain}&welcome=true`)
      
    } catch (error) {
      console.error('Onboarding completion error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const isStepComplete = (stepIndex: number) => {
    return stepIndex < currentStep
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Company setup
        return companySetup.business_hours && companySetup.timezone
      case 1: // Product catalog
        return productCatalog.catalog_name.length > 0
      case 2: // Billing
        return billingSetup.plan_selected && billingSetup.billing_cycle
      case 3: // Team
        return true // Optional step
      case 4: // Integrations
        return true // Optional step
      case 5: // Launch
        return true
      default:
        return false
    }
  }

  if (!applicationId || !supplierData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your onboarding...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Supplier Onboarding</h1>
              <p className="text-gray-600">Welcome {supplierData.business_name}!</p>
            </div>
            <div className="text-sm text-gray-500">
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4 space-x-4 overflow-x-auto">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center space-x-2 flex-shrink-0">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  index === currentStep
                    ? 'border-blue-600 bg-blue-100 text-blue-600'
                    : isStepComplete(index)
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-gray-300 bg-white text-gray-400'
                }`}>
                  {isStepComplete(index) ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.icon
                  )}
                </div>
                <div className={`${index === currentStep ? 'text-blue-600' : isStepComplete(index) ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className="font-medium text-sm">{step.title}</div>
                  <div className="text-xs">{step.description}</div>
                </div>
                {index < steps.length - 1 && (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm p-8">
          {steps[currentStep].component}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-medium ${
                currentStep === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={handleNext}
              disabled={!canProceed() || isLoading}
              className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-medium ${
                !canProceed() || isLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : currentStep === steps.length - 1
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Setting up...</span>
                </>
              ) : currentStep === steps.length - 1 ? (
                <>
                  <span>Complete Setup</span>
                  <Rocket className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SupplierOnboardingWizard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading onboarding wizard...</p>
        </div>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
}
// SUPPLIER REGISTRATION PORTAL
// Self-service signup for new wholesale suppliers

'use client'

import React, { useState } from 'react'
import { Building2, CheckCircle, AlertCircle, ArrowRight, Users, Package, CreditCard, Shield } from 'lucide-react'

interface SupplierRegistrationForm {
  // Business Information
  business_name: string
  business_type: string
  industry: string
  website: string
  description: string
  
  // Contact Information
  contact_name: string
  contact_email: string
  contact_phone: string
  business_address: {
    street: string
    city: string
    state: string
    postal_code: string
    country: string
  }
  
  // Business Details
  years_in_business: string
  employee_count: string
  annual_revenue: string
  primary_markets: string[]
  
  // Platform Preferences
  product_categories: string[]
  estimated_products: string
  minimum_order_amount: number
  payment_terms: string
  shipping_methods: string[]
  
  // Legal & Compliance
  tax_id: string
  business_license: string
  certifications: string[]
  agrees_to_terms: boolean
  agrees_to_privacy: boolean
}

const initialFormData: SupplierRegistrationForm = {
  business_name: '',
  business_type: '',
  industry: '',
  website: '',
  description: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  business_address: {
    street: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Mexico'
  },
  years_in_business: '',
  employee_count: '',
  annual_revenue: '',
  primary_markets: [],
  product_categories: [],
  estimated_products: '',
  minimum_order_amount: 1000,
  payment_terms: 'Net 30',
  shipping_methods: [],
  tax_id: '',
  business_license: '',
  certifications: [],
  agrees_to_terms: false,
  agrees_to_privacy: false
}

export default function SupplierRegistrationPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<SupplierRegistrationForm>(initialFormData)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const totalSteps = 5

  const steps = [
    { id: 1, title: 'Business Info', icon: <Building2 className="w-5 h-5" /> },
    { id: 2, title: 'Contact Details', icon: <Users className="w-5 h-5" /> },
    { id: 3, title: 'Products & Catalog', icon: <Package className="w-5 h-5" /> },
    { id: 4, title: 'Terms & Pricing', icon: <CreditCard className="w-5 h-5" /> },
    { id: 5, title: 'Legal & Compliance', icon: <Shield className="w-5 h-5" /> }
  ]

  // Form validation
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    switch (step) {
      case 1:
        if (!formData.business_name) newErrors.business_name = 'Business name is required'
        if (!formData.business_type) newErrors.business_type = 'Business type is required'
        if (!formData.industry) newErrors.industry = 'Industry is required'
        if (!formData.description) newErrors.description = 'Business description is required'
        break
      
      case 2:
        if (!formData.contact_name) newErrors.contact_name = 'Contact name is required'
        if (!formData.contact_email) newErrors.contact_email = 'Email is required'
        if (!formData.contact_phone) newErrors.contact_phone = 'Phone is required'
        if (!formData.business_address.street) newErrors.address_street = 'Street address is required'
        if (!formData.business_address.city) newErrors.address_city = 'City is required'
        break
      
      case 3:
        if (formData.product_categories.length === 0) newErrors.product_categories = 'Select at least one category'
        if (!formData.estimated_products) newErrors.estimated_products = 'Estimated product count is required'
        break
      
      case 4:
        if (formData.minimum_order_amount <= 0) newErrors.minimum_order_amount = 'Minimum order amount must be greater than 0'
        if (formData.shipping_methods.length === 0) newErrors.shipping_methods = 'Select at least one shipping method'
        break
      
      case 5:
        if (!formData.agrees_to_terms) newErrors.agrees_to_terms = 'You must agree to the terms of service'
        if (!formData.agrees_to_privacy) newErrors.agrees_to_privacy = 'You must agree to the privacy policy'
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateStep(5)) return

    setLoading(true)
    try {
      const response = await fetch('/api/suppliers/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (result.success) {
        setSubmitStatus('success')
      } else {
        setSubmitStatus('error')
        setErrors({ submit: result.error || 'Registration failed' })
      }
    } catch (error) {
      setSubmitStatus('error')
      setErrors({ submit: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  // Handle next step
  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === totalSteps) {
        handleSubmit()
      } else {
        setCurrentStep(currentStep + 1)
      }
    }
  }

  // Handle previous step
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Update form data
  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // Update nested form data (like address)
  const updateNestedFormData = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof SupplierRegistrationForm] as any,
        [field]: value
      }
    }))
  }

  // Success screen
  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Application Submitted!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for your interest in joining the EGDC B2B Marketplace. We've received your application and will review it within 24-48 hours.
          </p>
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-2">What's Next?</h3>
            <ul className="text-sm text-blue-700 space-y-1 text-left">
              <li>• We'll verify your business information</li>
              <li>• Check your references and credentials</li>
              <li>• Set up your supplier workspace</li>
              <li>• Send you login credentials via email</li>
            </ul>
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Join EGDC Marketplace</h1>
                <p className="text-sm text-gray-600">Become a wholesale supplier partner</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              Step {currentStep} of {totalSteps}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    step.id <= currentStep
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {step.icon}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-4 ${
                      step.id < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            {steps.map((step) => (
              <span key={step.id} className="text-center">{step.title}</span>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Step 1: Business Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Information</h2>
                <p className="text-gray-600">Tell us about your wholesale business</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={formData.business_name}
                    onChange={(e) => updateFormData('business_name', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.business_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="e.g., ABC Wholesale Company"
                  />
                  {errors.business_name && (
                    <p className="text-red-600 text-sm mt-1">{errors.business_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Type *
                  </label>
                  <select
                    value={formData.business_type}
                    onChange={(e) => updateFormData('business_type', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.business_type ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select business type</option>
                    <option value="manufacturer">Manufacturer</option>
                    <option value="distributor">Distributor</option>
                    <option value="wholesaler">Wholesaler</option>
                    <option value="importer">Importer</option>
                    <option value="retailer">Large Retailer</option>
                  </select>
                  {errors.business_type && (
                    <p className="text-red-600 text-sm mt-1">{errors.business_type}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industry *
                  </label>
                  <select
                    value={formData.industry}
                    onChange={(e) => updateFormData('industry', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.industry ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select industry</option>
                    <option value="footwear">Footwear & Shoes</option>
                    <option value="fashion">Fashion & Apparel</option>
                    <option value="accessories">Accessories</option>
                    <option value="sports">Sports & Athletic</option>
                    <option value="children">Children's Products</option>
                    <option value="luxury">Luxury Goods</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.industry && (
                    <p className="text-red-600 text-sm mt-1">{errors.industry}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => updateFormData('website', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://your-website.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Describe your business, what you manufacture or distribute, your target markets, and what makes you unique..."
                />
                {errors.description && (
                  <p className="text-red-600 text-sm mt-1">{errors.description}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Contact Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Contact Information</h2>
                <p className="text-gray-600">Primary contact details for your account</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => updateFormData('contact_name', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.contact_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Full name"
                  />
                  {errors.contact_name && (
                    <p className="text-red-600 text-sm mt-1">{errors.contact_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => updateFormData('contact_email', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.contact_email ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="email@company.com"
                  />
                  {errors.contact_email && (
                    <p className="text-red-600 text-sm mt-1">{errors.contact_email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => updateFormData('contact_phone', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.contact_phone ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="+52 55 1234 5678"
                  />
                  {errors.contact_phone && (
                    <p className="text-red-600 text-sm mt-1">{errors.contact_phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Years in Business
                  </label>
                  <select
                    value={formData.years_in_business}
                    onChange={(e) => updateFormData('years_in_business', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select range</option>
                    <option value="0-1">Less than 1 year</option>
                    <option value="1-3">1-3 years</option>
                    <option value="3-5">3-5 years</option>
                    <option value="5-10">5-10 years</option>
                    <option value="10+">10+ years</option>
                  </select>
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Business Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      value={formData.business_address.street}
                      onChange={(e) => updateNestedFormData('business_address', 'street', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.address_street ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Street address"
                    />
                    {errors.address_street && (
                      <p className="text-red-600 text-sm mt-1">{errors.address_street}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.business_address.city}
                      onChange={(e) => updateNestedFormData('business_address', 'city', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.address_city ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="City"
                    />
                    {errors.address_city && (
                      <p className="text-red-600 text-sm mt-1">{errors.address_city}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State/Province
                    </label>
                    <input
                      type="text"
                      value={formData.business_address.state}
                      onChange={(e) => updateNestedFormData('business_address', 'state', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="State/Province"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={formData.business_address.postal_code}
                      onChange={(e) => updateNestedFormData('business_address', 'postal_code', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Postal Code"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <select
                      value={formData.business_address.country}
                      onChange={(e) => updateNestedFormData('business_address', 'country', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Mexico">Mexico</option>
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="Guatemala">Guatemala</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Products & Catalog */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Products & Catalog</h2>
                <p className="text-gray-600">Tell us about the products you offer</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Product Categories * (Select all that apply)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    'Zapatos de Vestir', 'Zapatos Casuales', 'Deportivos', 'Botas', 'Sandalias',
                    'Tacones', 'Flats', 'Zapatillas', 'Zapatos de Niños', 'Zapatos de Seguridad',
                    'Zapatos Ortopédicos', 'Accesorios'
                  ].map((category) => (
                    <label key={category} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.product_categories.includes(category)}
                        onChange={(e) => {
                          const categories = e.target.checked
                            ? [...formData.product_categories, category]
                            : formData.product_categories.filter(c => c !== category)
                          updateFormData('product_categories', categories)
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{category}</span>
                    </label>
                  ))}
                </div>
                {errors.product_categories && (
                  <p className="text-red-600 text-sm mt-2">{errors.product_categories}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Product Count *
                  </label>
                  <select
                    value={formData.estimated_products}
                    onChange={(e) => updateFormData('estimated_products', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.estimated_products ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select range</option>
                    <option value="1-50">1-50 products</option>
                    <option value="51-200">51-200 products</option>
                    <option value="201-500">201-500 products</option>
                    <option value="501-1000">501-1,000 products</option>
                    <option value="1000+">1,000+ products</option>
                  </select>
                  {errors.estimated_products && (
                    <p className="text-red-600 text-sm mt-1">{errors.estimated_products}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Markets
                  </label>
                  <div className="space-y-2">
                    {['Mayoristas', 'Minoristas', 'Distribuidores', 'Tiendas Online', 'Exportación'].map((market) => (
                      <label key={market} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.primary_markets.includes(market)}
                          onChange={(e) => {
                            const markets = e.target.checked
                              ? [...formData.primary_markets, market]
                              : formData.primary_markets.filter(m => m !== market)
                            updateFormData('primary_markets', markets)
                          }}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{market}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employee Count
                  </label>
                  <select
                    value={formData.employee_count}
                    onChange={(e) => updateFormData('employee_count', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select range</option>
                    <option value="1-5">1-5 employees</option>
                    <option value="6-20">6-20 employees</option>
                    <option value="21-50">21-50 employees</option>
                    <option value="51-100">51-100 employees</option>
                    <option value="100+">100+ employees</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Annual Revenue (Optional)
                  </label>
                  <select
                    value={formData.annual_revenue}
                    onChange={(e) => updateFormData('annual_revenue', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select range</option>
                    <option value="< $100K">Less than $100K USD</option>
                    <option value="$100K - $500K">$100K - $500K USD</option>
                    <option value="$500K - $1M">$500K - $1M USD</option>
                    <option value="$1M - $5M">$1M - $5M USD</option>
                    <option value="$5M+">$5M+ USD</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Terms & Pricing */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Terms & Pricing</h2>
                <p className="text-gray-600">Configure your business terms and preferences</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Order Amount (MXN) *
                  </label>
                  <input
                    type="number"
                    value={formData.minimum_order_amount}
                    onChange={(e) => updateFormData('minimum_order_amount', parseInt(e.target.value) || 0)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.minimum_order_amount ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="1000"
                    min="0"
                  />
                  {errors.minimum_order_amount && (
                    <p className="text-red-600 text-sm mt-1">{errors.minimum_order_amount}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum order value required from retailers
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Terms
                  </label>
                  <select
                    value={formData.payment_terms}
                    onChange={(e) => updateFormData('payment_terms', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="COD">Cash on Delivery (COD)</option>
                    <option value="Net 15">Net 15 days</option>
                    <option value="Net 30">Net 30 days</option>
                    <option value="Net 45">Net 45 days</option>
                    <option value="Net 60">Net 60 days</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Shipping Methods * (Select all available)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    'Local Delivery', 'Standard Shipping', 'Express Shipping', 
                    'Overnight Delivery', 'Freight/LTL', 'International Shipping'
                  ].map((method) => (
                    <label key={method} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.shipping_methods.includes(method)}
                        onChange={(e) => {
                          const methods = e.target.checked
                            ? [...formData.shipping_methods, method]
                            : formData.shipping_methods.filter(m => m !== method)
                          updateFormData('shipping_methods', methods)
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{method}</span>
                    </label>
                  ))}
                </div>
                {errors.shipping_methods && (
                  <p className="text-red-600 text-sm mt-2">{errors.shipping_methods}</p>
                )}
              </div>

              {/* Pricing Preferences */}
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-blue-900 mb-4">EGDC SaaS Pricing</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <h4 className="font-medium text-gray-900">Starter</h4>
                    <p className="text-2xl font-bold text-blue-600">$49/month</p>
                    <ul className="text-sm text-gray-600 mt-2 space-y-1">
                      <li>• Up to 100 products</li>
                      <li>• Basic analytics</li>
                      <li>• Email support</li>
                    </ul>
                  </div>
                  <div className="bg-blue-600 text-white rounded-lg p-4 border border-blue-200">
                    <h4 className="font-medium">Professional</h4>
                    <p className="text-2xl font-bold">$99/month</p>
                    <ul className="text-sm mt-2 space-y-1">
                      <li>• Up to 1,000 products</li>
                      <li>• Advanced analytics</li>
                      <li>• Priority support</li>
                      <li>• Custom integrations</li>
                    </ul>
                    <div className="mt-2 text-xs bg-blue-500 rounded px-2 py-1">
                      RECOMMENDED
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <h4 className="font-medium text-gray-900">Enterprise</h4>
                    <p className="text-2xl font-bold text-blue-600">$199/month</p>
                    <ul className="text-sm text-gray-600 mt-2 space-y-1">
                      <li>• Unlimited products</li>
                      <li>• White-label option</li>
                      <li>• Dedicated support</li>
                      <li>• Custom features</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Legal & Compliance */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Legal & Compliance</h2>
                <p className="text-gray-600">Final step - legal information and agreements</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax ID / RFC (Mexico)
                  </label>
                  <input
                    type="text"
                    value={formData.tax_id}
                    onChange={(e) => updateFormData('tax_id', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="RFC or Tax ID"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business License Number
                  </label>
                  <input
                    type="text"
                    value={formData.business_license}
                    onChange={(e) => updateFormData('business_license', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="License number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Certifications (Optional)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    'ISO 9001', 'ISO 14001', 'OEKO-TEX', 'Fair Trade', 
                    'Organic Certification', 'GOTS', 'Other'
                  ].map((cert) => (
                    <label key={cert} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.certifications.includes(cert)}
                        onChange={(e) => {
                          const certs = e.target.checked
                            ? [...formData.certifications, cert]
                            : formData.certifications.filter(c => c !== cert)
                          updateFormData('certifications', certs)
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{cert}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Legal Agreements */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Legal Agreements</h3>
                
                <div className="space-y-4">
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={formData.agrees_to_terms}
                      onChange={(e) => updateFormData('agrees_to_terms', e.target.checked)}
                      className={`h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1 ${
                        errors.agrees_to_terms ? 'border-red-300' : ''
                      }`}
                    />
                    <div className="ml-3">
                      <span className="text-sm text-gray-700">
                        I agree to the{' '}
                        <a href="/terms" target="_blank" className="text-blue-600 hover:underline">
                          Terms of Service
                        </a>{' '}
                        and{' '}
                        <a href="/supplier-agreement" target="_blank" className="text-blue-600 hover:underline">
                          Supplier Agreement
                        </a>
                        *
                      </span>
                      {errors.agrees_to_terms && (
                        <p className="text-red-600 text-xs mt-1">{errors.agrees_to_terms}</p>
                      )}
                    </div>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={formData.agrees_to_privacy}
                      onChange={(e) => updateFormData('agrees_to_privacy', e.target.checked)}
                      className={`h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1 ${
                        errors.agrees_to_privacy ? 'border-red-300' : ''
                      }`}
                    />
                    <div className="ml-3">
                      <span className="text-sm text-gray-700">
                        I agree to the{' '}
                        <a href="/privacy" target="_blank" className="text-blue-600 hover:underline">
                          Privacy Policy
                        </a>{' '}
                        and consent to data processing *
                      </span>
                      {errors.agrees_to_privacy && (
                        <p className="text-red-600 text-xs mt-1">{errors.agrees_to_privacy}</p>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Application Review Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-2">📋 Application Review Process</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Your application will be reviewed within 24-48 hours</li>
                  <li>• We may contact you for additional information</li>
                  <li>• Upon approval, you'll receive login credentials</li>
                  <li>• A 7-day free trial will be activated automatically</li>
                  <li>• You can cancel anytime during the trial period</li>
                </ul>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className={`px-6 py-3 rounded-lg font-medium ${
                currentStep === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Previous
            </button>

            <button
              onClick={handleNext}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                'Submitting...'
              ) : currentStep === totalSteps ? (
                'Submit Application'
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Global Error Message */}
          {errors.submit && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-700">{errors.submit}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
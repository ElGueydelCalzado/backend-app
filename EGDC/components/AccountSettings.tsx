'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Settings, Check, X, AlertCircle, Clock, Globe, History } from 'lucide-react'

interface TenantInfo {
  id: string
  name: string
  display_name: string
  original_subdomain: string
  custom_subdomain: string | null
  current_subdomain: string
  email: string
  business_type: string
  plan: string
  status: string
  subdomain_change_count: number
  subdomain_history: Array<{
    old_subdomain: string
    new_subdomain: string
    changed_at: string
    changed_by: string | null
  }>
  created_at: string
}

interface PendingRequest {
  id: string
  requested_subdomain: string
  status: string
  admin_notes: string | null
  created_at: string
}

interface AccountSettingsData {
  tenant: TenantInfo
  pending_requests: PendingRequest[]
  can_change_subdomain: boolean
  max_changes_per_month: number
  changes_this_month: number
}

interface SubdomainCheck {
  subdomain: string
  available: boolean
  valid_format: boolean
  validation_errors: string[]
  suggestions: string[]
}

export default function AccountSettings() {
  const { data: session } = useSession()
  const [accountData, setAccountData] = useState<AccountSettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form states
  const [displayName, setDisplayName] = useState('')
  const [requestedSubdomain, setRequestedSubdomain] = useState('')
  const [subdomainCheck, setSubdomainCheck] = useState<SubdomainCheck | null>(null)
  const [checkingSubdomain, setCheckingSubdomain] = useState(false)

  // Load account settings
  const loadAccountSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/account/settings')
      if (!response.ok) {
        throw new Error('Failed to load account settings')
      }
      
      const data = await response.json()
      setAccountData(data)
      setDisplayName(data.tenant.display_name || data.tenant.name)
      setRequestedSubdomain(data.tenant.current_subdomain)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session?.user) {
      loadAccountSettings()
    }
  }, [session, loadAccountSettings])

  // Check subdomain availability with debouncing
  const checkSubdomainAvailability = useCallback(async (subdomain: string) => {
    if (!subdomain || subdomain === accountData?.tenant.current_subdomain) {
      setSubdomainCheck(null)
      return
    }

    setCheckingSubdomain(true)
    
    try {
      const response = await fetch(`/api/account/check-subdomain?subdomain=${encodeURIComponent(subdomain)}`)
      const data = await response.json()
      
      if (response.ok) {
        setSubdomainCheck(data)
      } else {
        setError(data.error || 'Failed to check subdomain')
      }
    } catch (err) {
      setError('Failed to check subdomain availability')
    } finally {
      setCheckingSubdomain(false)
    }
  }, [accountData?.tenant.current_subdomain])

  // Debounced subdomain check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (requestedSubdomain.trim() && requestedSubdomain !== accountData?.tenant.current_subdomain) {
        checkSubdomainAvailability(requestedSubdomain.trim())
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [requestedSubdomain, accountData?.tenant.current_subdomain, checkSubdomainAvailability])

  // Update display name only
  const handleUpdateDisplayName = async () => {
    if (!displayName.trim()) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/account/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName.trim() })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Display name updated successfully')
        await loadAccountSettings() // Reload data
      } else {
        setError(data.error || 'Failed to update display name')
      }
    } catch (err) {
      setError('Failed to update display name')
    } finally {
      setSaving(false)
    }
  }

  // Request account name change
  const handleRequestAccountNameChange = async () => {
    if (!requestedSubdomain.trim() || !subdomainCheck?.available) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/account/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          requested_subdomain: requestedSubdomain.trim(),
          display_name: displayName.trim()
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(`Account name changed successfully! Your new URL is: app.lospapatos.com/${data.new_subdomain}`)
        await loadAccountSettings() // Reload data
        setSubdomainCheck(null)
        
        // Redirect to new URL after 3 seconds
        setTimeout(() => {
          window.location.href = `${window.location.protocol}//${window.location.host}/${data.new_subdomain}/dashboard`
        }, 3000)
      } else {
        setError(data.error || 'Failed to change account name')
      }
    } catch (err) {
      setError('Failed to change account name')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span>Loading account settings...</span>
        </div>
      </div>
    )
  }

  if (!accountData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Settings</h2>
          <p className="text-gray-600 mb-4">Unable to load your account settings.</p>
          <button 
            onClick={loadAccountSettings}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const { tenant, pending_requests, can_change_subdomain, max_changes_per_month, changes_this_month } = accountData

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Settings className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          </div>
          <p className="text-gray-600">Manage your account name and display settings</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
              <div className="text-red-800">{error}</div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <Check className="h-5 w-5 text-green-400 mt-0.5 mr-3" />
              <div className="text-green-800">{success}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Account Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Account</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account URL</label>
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      app.lospapatos.com/<strong>{tenant.current_subdomain}</strong>
                    </code>
                    {tenant.custom_subdomain && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Custom</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Email</label>
                  <p className="text-sm text-gray-600">{tenant.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                  <p className="text-sm text-gray-600 capitalize">{tenant.business_type}</p>
                </div>
              </div>
            </div>

            {/* Display Name Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Display Name</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your business display name"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This name appears in your dashboard and communications
                  </p>
                </div>

                <button
                  onClick={handleUpdateDisplayName}
                  disabled={saving || displayName.trim() === (tenant.display_name || tenant.name)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Update Display Name</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Account Name Change */}
            {can_change_subdomain && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Change Account Name</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Account Name
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">app.lospapatos.com/</span>
                      <input
                        type="text"
                        value={requestedSubdomain}
                        onChange={(e) => setRequestedSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="your-account-name"
                      />
                    </div>
                    
                    {checkingSubdomain && (
                      <div className="flex items-center space-x-2 mt-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm text-gray-600">Checking availability...</span>
                      </div>
                    )}

                    {subdomainCheck && (
                      <div className="mt-2">
                        {subdomainCheck.available ? (
                          <div className="flex items-center space-x-2 text-green-600">
                            <Check className="h-4 w-4" />
                            <span className="text-sm">Available!</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-red-600">
                              <X className="h-4 w-4" />
                              <span className="text-sm">Not available</span>
                            </div>
                            {subdomainCheck.validation_errors.length > 0 && (
                              <ul className="text-xs text-red-600 list-disc list-inside">
                                {subdomainCheck.validation_errors.map((error, index) => (
                                  <li key={index}>{error}</li>
                                ))}
                              </ul>
                            )}
                            {subdomainCheck.suggestions.length > 0 && (
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Suggestions:</p>
                                <div className="flex flex-wrap gap-2">
                                  {subdomainCheck.suggestions.map((suggestion) => (
                                    <button
                                      key={suggestion}
                                      onClick={() => setRequestedSubdomain(suggestion)}
                                      className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                                    >
                                      {suggestion}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3" />
                      <div className="text-yellow-800 text-sm">
                        <p className="font-medium mb-1">Important Notes:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Changing your account name will update your URL immediately</li>
                          <li>You have used {changes_this_month} of {max_changes_per_month} changes this month</li>
                          <li>All existing links will need to be updated</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleRequestAccountNameChange}
                    disabled={saving || !subdomainCheck?.available || requestedSubdomain === tenant.current_subdomain}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Changing...</span>
                      </>
                    ) : (
                      <>
                        <Globe className="h-4 w-4" />
                        <span>Change Account Name</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Usage Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Name Changes</span>
                    <span className="text-sm font-medium">{changes_this_month}/{max_changes_per_month}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(changes_this_month / max_changes_per_month) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <span className="text-sm text-gray-600">Account Age</span>
                  <p className="text-sm font-medium">
                    {new Date(tenant.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Pending Requests */}
            {pending_requests.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Requests</h3>
                
                <div className="space-y-3">
                  {pending_requests.map((request) => (
                    <div key={request.id} className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{request.requested_subdomain}</p>
                        <p className="text-xs text-gray-600">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Change History */}
            {tenant.subdomain_history && tenant.subdomain_history.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <History className="h-5 w-5" />
                  <span>Change History</span>
                </h3>
                
                <div className="space-y-3">
                  {tenant.subdomain_history.slice(-5).map((change, index) => (
                    <div key={index} className="text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600">{change.old_subdomain}</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium">{change.new_subdomain}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(change.changed_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
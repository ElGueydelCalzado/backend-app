'use client'

import { useState, useEffect } from 'react'
import { 
  Globe, Plus, Trash2, CheckCircle2, AlertCircle,
  Clock, Loader2, ExternalLink, Settings
} from 'lucide-react'

interface DomainStatus {
  subdomain: string
  domain: string
  exists: boolean
  verified: boolean
  ssl: boolean
  tenant_name?: string
  business_type?: string
  status?: string
  created_at?: string
}

export default function DomainManagementPage() {
  const [domains, setDomains] = useState<DomainStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newSubdomain, setNewSubdomain] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadDomains()
  }, [])

  const loadDomains = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/domains')
      const data = await response.json()
      
      if (data.success) {
        setDomains(data.domains)
      } else {
        setError(data.error || 'Failed to load domains')
      }
    } catch (error) {
      setError('Failed to load domains')
      console.error('Error loading domains:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newSubdomain.trim()) {
      setError('Subdomain is required')
      return
    }

    setIsAdding(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: newSubdomain.trim() })
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccess(`Domain ${newSubdomain}.lospapatos.com added successfully`)
        setNewSubdomain('')
        await loadDomains()
      } else {
        setError(data.error || 'Failed to add domain')
      }
    } catch (error) {
      setError('Failed to add domain')
      console.error('Error adding domain:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const removeDomain = async (subdomain: string) => {
    if (!confirm(`Are you sure you want to remove ${subdomain}.lospapatos.com?`)) {
      return
    }

    try {
      const response = await fetch('/api/admin/domains', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain })
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccess(`Domain ${subdomain}.lospapatos.com removed successfully`)
        await loadDomains()
      } else {
        setError(data.error || 'Failed to remove domain')
      }
    } catch (error) {
      setError('Failed to remove domain')
      console.error('Error removing domain:', error)
    }
  }

  const getStatusIcon = (domain: DomainStatus) => {
    if (!domain.exists) {
      return <AlertCircle className="w-5 h-5 text-red-500" />
    } else if (!domain.verified) {
      return <Clock className="w-5 h-5 text-yellow-500" />
    } else {
      return <CheckCircle2 className="w-5 h-5 text-green-500" />
    }
  }

  const getStatusText = (domain: DomainStatus) => {
    if (!domain.exists) {
      return 'Not in Vercel'
    } else if (!domain.verified) {
      return 'Pending SSL'
    } else {
      return 'Active'
    }
  }

  const getStatusColor = (domain: DomainStatus) => {
    if (!domain.exists) {
      return 'text-red-600 bg-red-50'
    } else if (!domain.verified) {
      return 'text-yellow-600 bg-yellow-50'
    } else {
      return 'text-green-600 bg-green-50'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Domain Management</h1>
                <p className="text-gray-600">Manage Vercel domains for tenant subdomains</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={loadDomains}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Settings className="w-4 h-4" />
                )}
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add Domain Form */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Domain</h2>
          
          <form onSubmit={addDomain} className="flex items-end space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subdomain
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={newSubdomain}
                  onChange={(e) => setNewSubdomain(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="example"
                  pattern="[a-z0-9-]+"
                  title="Only lowercase letters, numbers, and hyphens allowed"
                />
                <span className="px-3 py-2 bg-gray-50 border border-l-0 border-gray-300 rounded-r-lg text-gray-500 text-sm">
                  .lospapatos.com
                </span>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isAdding}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add Domain</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
            <span className="text-red-700">{error}</span>
            <button 
              onClick={() => setError('')}
              className="ml-auto text-red-600 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckCircle2 className="w-5 h-5 text-green-600 mr-3" />
            <span className="text-green-700">{success}</span>
            <button 
              onClick={() => setSuccess('')}
              className="ml-auto text-green-600 hover:text-green-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Domains Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Current Domains ({domains.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Loading domains...</p>
            </div>
          ) : domains.length === 0 ? (
            <div className="p-8 text-center">
              <Globe className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No domains configured yet</p>
              <p className="text-sm text-gray-500">Add a domain above to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Domain
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tenant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SSL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {domains.map((domain) => (
                    <tr key={domain.subdomain} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(domain)}
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {domain.domain}
                            </div>
                            <div className="text-sm text-gray-500">
                              {domain.subdomain}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        {domain.tenant_name ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {domain.tenant_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {domain.business_type}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">No tenant</span>
                        )}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(domain)}`}>
                          {getStatusText(domain)}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        {domain.ssl ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <Clock className="w-5 h-5 text-yellow-500" />
                        )}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                        <a
                          href={`https://${domain.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 inline-flex items-center"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        
                        <button
                          onClick={() => removeDomain(domain.subdomain)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Information */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">About Domain Management</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Domains are automatically added when suppliers register</li>
            <li>• SSL certificates are provisioned automatically by Vercel</li>
            <li>• DNS wildcard record (*.lospapatos.com) handles routing</li>
            <li>• You can manually add domains for existing tenants here</li>
            <li>• Vercel Pro plan supports up to 100 domains</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
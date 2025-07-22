// ADVANCED SETTINGS PAGE
// Admin tools and configuration for EGDC B2B Marketplace

'use client'

import React, { useState, useEffect } from 'react'
import { Settings, Database, Users, Package, CreditCard, Shield, Bell, Download, Upload } from 'lucide-react'
import ColumnManager from '@/components/ColumnManager'

interface SettingsSection {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  component: React.ReactNode
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('columns')
  const [userInfo, setUserInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Load user information
  useEffect(() => {
    // Mock user info - in real app this would come from session
    setUserInfo({
      name: 'EGDC Admin',
      email: 'admin@lospapatos.com',
      role: 'admin',
      tenant: 'EGDC Retailer',
      plan: 'Business Pro'
    })
    setLoading(false)
  }, [])

  // Settings sections configuration
  const sections: SettingsSection[] = [
    {
      id: 'columns',
      title: 'Custom Columns',
      description: 'Add or remove custom fields for your products',
      icon: <Database className="w-5 h-5" />,
      component: <ColumnManager tableName="products" />
    },
    {
      id: 'users',
      title: 'User Management',
      description: 'Manage team members and permissions',
      icon: <Users className="w-5 h-5" />,
      component: <UserManagementSection />
    },
    {
      id: 'inventory',
      title: 'Inventory Settings',
      description: 'Configure inventory tracking and alerts',
      icon: <Package className="w-5 h-5" />,
      component: <InventorySettingsSection />
    },
    {
      id: 'billing',
      title: 'Billing & Plan',
      description: 'Manage your subscription and billing information',
      icon: <CreditCard className="w-5 h-5" />,
      component: <BillingSection />
    },
    {
      id: 'security',
      title: 'Security',
      description: 'Security settings and access controls',
      icon: <Shield className="w-5 h-5" />,
      component: <SecuritySection />
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Configure email and system notifications',
      icon: <Bell className="w-5 h-5" />,
      component: <NotificationsSection />
    },
    {
      id: 'import-export',
      title: 'Import/Export',
      description: 'Bulk data import and export tools',
      icon: <Upload className="w-5 h-5" />,
      component: <ImportExportSection />
    }
  ]

  const activeComponent = sections.find(section => section.id === activeSection)?.component

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-gray-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
                <p className="text-sm text-gray-500">Manage your EGDC marketplace configuration</p>
              </div>
            </div>
            
            {userInfo && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{userInfo.name}</p>
                  <p className="text-xs text-gray-500">{userInfo.tenant}</p>
                </div>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {userInfo.name.charAt(0)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {section.icon}
                    <div>
                      <p className="font-medium">{section.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{section.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeComponent}
          </div>
        </div>
      </div>
    </div>
  )
}

// User Management Section
function UserManagementSection() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">User Management</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-900">EGDC Admin</h4>
            <p className="text-sm text-gray-600">admin@lospapatos.com</p>
            <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
              Administrator
            </span>
          </div>
          <button className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg">
            Edit
          </button>
        </div>
        
        <button className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600">
          + Add New User
        </button>
      </div>
    </div>
  )
}

// Inventory Settings Section
function InventorySettingsSection() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Settings</h3>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Low Stock Alert Threshold
          </label>
          <input
            type="number"
            defaultValue={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            Get notified when inventory falls below this number
          </p>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="auto-reorder"
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="auto-reorder" className="ml-2 text-sm text-gray-700">
            Enable automatic reorder suggestions
          </label>
        </div>
      </div>
    </div>
  )
}

// Billing Section
function BillingSection() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing & Plan</h3>
      <div className="space-y-6">
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-green-900">Business Pro Plan</h4>
              <p className="text-sm text-green-700">$99/month • Active until Dec 31, 2025</p>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded">
              Active
            </span>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Plan Features</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Unlimited products</li>
            <li>• Multi-tenant B2B marketplace</li>
            <li>• Advanced analytics</li>
            <li>• Priority support</li>
            <li>• Custom integrations</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// Security Section
function SecuritySection() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h3>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Two-Factor Authentication</h4>
            <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Enable 2FA
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Session Timeout</h4>
            <p className="text-sm text-gray-600">Automatically log out after inactivity</p>
          </div>
          <select className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>30 minutes</option>
            <option>1 hour</option>
            <option>4 hours</option>
            <option>Never</option>
          </select>
        </div>
      </div>
    </div>
  )
}

// Notifications Section
function NotificationsSection() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
      <div className="space-y-4">
        {[
          { id: 'low-stock', label: 'Low stock alerts', description: 'When inventory falls below threshold' },
          { id: 'new-orders', label: 'New purchase orders', description: 'When suppliers receive orders' },
          { id: 'order-updates', label: 'Order status updates', description: 'When order status changes' },
          { id: 'system-updates', label: 'System updates', description: 'Platform maintenance and new features' }
        ].map((notification) => (
          <div key={notification.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">{notification.label}</h4>
              <p className="text-sm text-gray-600">{notification.description}</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm text-gray-600">Email</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm text-gray-600">In-app</span>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Import/Export Section
function ImportExportSection() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Import/Export Tools</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <Upload className="w-5 h-5 text-blue-600" />
            <h4 className="font-medium text-gray-900">Import Data</h4>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Upload CSV files to bulk import products, update inventory, or add suppliers
          </p>
          <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Choose File
          </button>
        </div>
        
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <Download className="w-5 h-5 text-green-600" />
            <h4 className="font-medium text-gray-900">Export Data</h4>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Download your data in CSV format for backup or analysis
          </p>
          <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            Export CSV
          </button>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-medium text-yellow-900 mb-2">📋 CSV Template</h4>
        <p className="text-sm text-yellow-700 mb-2">
          Download our CSV template to ensure your data imports correctly
        </p>
        <button className="text-sm text-yellow-600 hover:text-yellow-700 underline">
          Download Template
        </button>
      </div>
    </div>
  )
}
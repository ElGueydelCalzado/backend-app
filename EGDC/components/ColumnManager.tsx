// DYNAMIC COLUMN MANAGER COMPONENT
// Allows users to add/remove columns through UI

'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Settings, AlertCircle, CheckCircle } from 'lucide-react'

interface CustomColumn {
  id: string
  column_name: string
  column_type: string
  display_name: string
  description: string
  is_required: boolean
  default_value: string
  is_searchable: boolean
  is_filterable: boolean
  display_order: number
  status: string
  created_at: string
}

interface ColumnManagerProps {
  tableName?: string
  onColumnsChange?: () => void
}

export default function ColumnManager({ tableName = 'products', onColumnsChange }: ColumnManagerProps) {
  const [columns, setColumns] = useState<CustomColumn[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // New column form state
  const [newColumn, setNewColumn] = useState({
    column_name: '',
    column_type: 'VARCHAR(255)',
    display_name: '',
    description: '',
    default_value: ''
  })

  const columnTypes = [
    { value: 'VARCHAR(255)', label: 'Text (Short)' },
    { value: 'TEXT', label: 'Text (Long)' },
    { value: 'INTEGER', label: 'Number (Integer)' },
    { value: 'DECIMAL(10,2)', label: 'Number (Decimal)' },
    { value: 'BOOLEAN', label: 'True/False' },
    { value: 'DATE', label: 'Date' },
    { value: 'TIMESTAMP', label: 'Date & Time' }
  ]

  // Load custom columns
  const loadColumns = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/columns?table=${tableName}`)
      const data = await response.json()

      if (data.success) {
        setColumns(data.data || [])
      } else {
        setError(data.error || 'Failed to load columns')
      }
    } catch (err) {
      setError('Failed to connect to server')
      console.error('Error loading columns:', err)
    } finally {
      setLoading(false)
    }
  }

  // Add new column
  const addColumn = async () => {
    if (!newColumn.column_name || !newColumn.display_name) {
      setError('Column name and display name are required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/columns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          table_name: tableName,
          ...newColumn
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(`Column '${newColumn.display_name}' added successfully!`)
        setShowAddForm(false)
        setNewColumn({
          column_name: '',
          column_type: 'VARCHAR(255)',
          display_name: '',
          description: '',
          default_value: ''
        })
        loadColumns()
        onColumnsChange?.()
      } else {
        setError(data.error || 'Failed to add column')
      }
    } catch (err) {
      setError('Failed to add column')
      console.error('Error adding column:', err)
    } finally {
      setLoading(false)
    }
  }

  // Remove column
  const removeColumn = async (columnId: string, displayName: string) => {
    if (!confirm(`Are you sure you want to remove the column '${displayName}'? This action cannot be undone.`)) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/columns?id=${columnId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(`Column '${displayName}' removed successfully!`)
        loadColumns()
        onColumnsChange?.()
      } else {
        setError(data.error || 'Failed to remove column')
      }
    } catch (err) {
      setError('Failed to remove column')
      console.error('Error removing column:', err)
    } finally {
      setLoading(false)
    }
  }

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccess(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  // Load columns on mount
  useEffect(() => {
    loadColumns()
  }, [tableName])

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Custom Columns for {tableName}
          </h3>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Add Column
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}

      {/* Add Column Form */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="text-md font-medium text-gray-900 mb-4">Add New Column</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Column Name (Internal)
              </label>
              <input
                type="text"
                value={newColumn.column_name}
                onChange={(e) => setNewColumn({ ...newColumn, column_name: e.target.value })}
                placeholder="e.g., supplier_code"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={newColumn.display_name}
                onChange={(e) => setNewColumn({ ...newColumn, display_name: e.target.value })}
                placeholder="e.g., Supplier Product Code"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Type
              </label>
              <select
                value={newColumn.column_type}
                onChange={(e) => setNewColumn({ ...newColumn, column_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {columnTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Value (Optional)
              </label>
              <input
                type="text"
                value={newColumn.default_value}
                onChange={(e) => setNewColumn({ ...newColumn, default_value: e.target.value })}
                placeholder="e.g., N/A"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={newColumn.description}
                onChange={(e) => setNewColumn({ ...newColumn, description: e.target.value })}
                placeholder="e.g., Internal product code from supplier system"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={addColumn}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Column'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Columns List */}
      <div className="space-y-3">
        {loading && columns.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Loading columns...
          </div>
        ) : columns.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No custom columns yet. Click "Add Column" to create your first custom field.
          </div>
        ) : (
          columns.map((column) => (
            <div key={column.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="font-medium text-gray-900">{column.display_name}</h4>
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                    {column.column_type}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Column: {column.column_name}
                  {column.description && ` • ${column.description}`}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Created: {new Date(column.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => removeColumn(column.id, column.display_name)}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      {/* Info Note */}
      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Note:</strong> Custom columns are safely managed through the application. 
          All changes are logged and can be reviewed. Only columns prefixed with "custom_" can be removed for safety.
        </p>
      </div>
    </div>
  )
}
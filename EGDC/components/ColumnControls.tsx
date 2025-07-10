'use client'

import { useState, useEffect, useRef } from 'react'

export interface ColumnConfig {
  key: string
  label: string
  visible: boolean
  category: 'basic' | 'pricing' | 'inventory' | 'platforms'
}

interface ColumnControlsProps {
  columns: ColumnConfig[]
  onColumnToggle: (key: string, visible: boolean) => void
  onPresetSelect: (preset: string) => void
  compact?: boolean
}

// Default presets for backward compatibility
const DEFAULT_PRESETS = {
  basic: ['categoria', 'marca', 'modelo', 'color', 'talla', 'sku'],
  financial: ['categoria', 'marca', 'modelo', 'costo', 'precio_shein', 'precio_shopify', 'precio_meli'],
  stock: ['categoria', 'marca', 'modelo', 'inv_egdc', 'inv_fami', 'inventory_total'],
  complete: 'all'
}

// localStorage utilities
const PRESETS_STORAGE_KEY = 'egdc-column-presets'

const getCustomPresets = () => {
  if (typeof window === 'undefined') return DEFAULT_PRESETS
  try {
    const stored = localStorage.getItem(PRESETS_STORAGE_KEY)
    return stored ? { ...DEFAULT_PRESETS, ...JSON.parse(stored) } : DEFAULT_PRESETS
  } catch {
    return DEFAULT_PRESETS
  }
}

const saveCustomPresets = (presets: any) => {
  if (typeof window === 'undefined') return
  try {
    // Only save the custom presets, not the defaults
    const customOnly = Object.keys(presets).reduce((acc, key) => {
      if (JSON.stringify(presets[key]) !== JSON.stringify(DEFAULT_PRESETS[key as keyof typeof DEFAULT_PRESETS])) {
        acc[key] = presets[key]
      }
      return acc
    }, {} as any)
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(customOnly))
  } catch (error) {
    console.error('Failed to save presets:', error)
  }
}

export default function ColumnControls({ 
  columns, 
  onColumnToggle, 
  onPresetSelect, 
  compact = false 
}: ColumnControlsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [editingPreset, setEditingPreset] = useState<string | null>(null)
  const [customPresets, setCustomPresets] = useState(getCustomPresets())
  const [tempPresetColumns, setTempPresetColumns] = useState<string[]>([])
  const [showNewPresetForm, setShowNewPresetForm] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const visibleCount = columns.filter(col => col.visible).length

  // Load custom presets on mount
  useEffect(() => {
    setCustomPresets(getCustomPresets())
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const toggleAll = () => {
    const allVisible = visibleCount === columns.length
    columns.forEach(col => {
      onColumnToggle(col.key, !allVisible)
    })
  }

  const handlePresetSelect = (presetKey: string) => {
    if (presetKey === 'complete') {
      onPresetSelect('complete')
    } else {
      const preset = customPresets[presetKey as keyof typeof customPresets]
      if (preset && Array.isArray(preset)) {
        // Hide all columns first
        columns.forEach(col => onColumnToggle(col.key, false))
        // Then show selected columns
        preset.forEach(key => onColumnToggle(key, true))
      }
    }
  }

  const handleEditPreset = (presetKey: string, event: React.MouseEvent) => {
    event.stopPropagation()
    const preset = customPresets[presetKey as keyof typeof customPresets]
    if (preset && Array.isArray(preset)) {
      setTempPresetColumns([...preset])
      setEditingPreset(presetKey)
    }
  }

  const handleSavePreset = () => {
    if (editingPreset) {
      const newPresets = {
        ...customPresets,
        [editingPreset]: [...tempPresetColumns]
      }
      setCustomPresets(newPresets)
      saveCustomPresets(newPresets)
      setEditingPreset(null)
      setTempPresetColumns([])
    }
  }

  const handleCancelEdit = () => {
    setEditingPreset(null)
    setTempPresetColumns([])
  }

  const togglePresetColumn = (columnKey: string) => {
    setTempPresetColumns(prev => 
      prev.includes(columnKey)
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    )
  }

  const handleCreateNewPreset = () => {
    if (!newPresetName.trim()) return
    
    // Get currently visible columns
    const visibleColumns = columns.filter(col => col.visible).map(col => col.key)
    
    const newPresets = {
      ...customPresets,
      [newPresetName.trim()]: visibleColumns
    }
    
    setCustomPresets(newPresets)
    saveCustomPresets(newPresets)
    setNewPresetName('')
    setShowNewPresetForm(false)
  }

  const handleDeletePreset = (presetKey: string) => {
    // Prevent deletion of default presets
    if (Object.keys(DEFAULT_PRESETS).includes(presetKey)) {
      return
    }
    
    const newPresets = { ...customPresets }
    delete newPresets[presetKey]
    
    setCustomPresets(newPresets)
    saveCustomPresets(newPresets)
  }

  const isDefaultPreset = (key: string) => {
    return Object.keys(DEFAULT_PRESETS).includes(key)
  }

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-800 flex items-center">
            <span className="mr-2">👁</span>
            Columnas
          </h4>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {visibleCount}/{columns.length}
          </span>
        </div>

        {/* Quick Presets */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(customPresets).map(([key, preset]) => (
              <div key={key} className="relative group">
                <button
                  onClick={() => handlePresetSelect(key)}
                  className="w-full text-xs px-2 py-1 bg-gray-100 hover:bg-orange-100 hover:text-orange-700 rounded transition-colors"
                >
                  {key === 'basic' ? 'Básico' : 
                   key === 'financial' ? 'Precios' : 
                   key === 'stock' ? 'Stock' : 
                   key === 'complete' ? 'Todo' : key}
                </button>
                {key !== 'complete' && (
                  <>
                    <button
                      onClick={(e) => handleEditPreset(key, e)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                      title="Editar preset"
                    >
                      ✏️
                    </button>
                    {!isDefaultPreset(key) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeletePreset(key)
                        }}
                        className="absolute -top-1 -left-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                        title="Eliminar preset"
                      >
                        ✕
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          
          {/* Add New Preset Button */}
          {!showNewPresetForm ? (
            <button
              onClick={() => setShowNewPresetForm(true)}
              className="w-full text-xs px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors border border-green-300 border-dashed"
            >
              + Nuevo Preset
            </button>
          ) : (
            <div className="space-y-1">
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="Nombre del preset"
                className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateNewPreset()}
              />
              <div className="flex gap-1">
                <button
                  onClick={handleCreateNewPreset}
                  className="flex-1 text-xs px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                >
                  ✓
                </button>
                <button
                  onClick={() => {
                    setShowNewPresetForm(false)
                    setNewPresetName('')
                  }}
                  className="flex-1 text-xs px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 flex items-center">
          <span className="text-base mr-2 drop-shadow-sm">👁</span>
          Columnas
        </h3>
        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full font-medium">
          {visibleCount}/{columns.length}
        </span>
      </div>

      {/* Single Dropdown for All Columns */}
      <div className="space-y-2">
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors hover:border-gray-400"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm truncate text-gray-700">
                {visibleCount > 0 
                  ? `${visibleCount} columna${visibleCount > 1 ? 's' : ''} visible${visibleCount > 1 ? 's' : ''}`
                  : 'Ninguna columna visible'
                }
              </span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* Dropdown Content */}
          {isOpen && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {/* Toggle All Option */}
              <div className="border-b border-gray-100 p-1">
                <button
                  onClick={toggleAll}
                  className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-orange-50 rounded cursor-pointer transition-colors text-sm font-medium"
                >
                  <span className="text-orange-700">
                    {visibleCount === columns.length ? 'Ocultar todas' : 'Mostrar todas'}
                  </span>
                  <span className="text-orange-600">
                    {visibleCount === columns.length ? '👁‍🗨' : '👁'}
                  </span>
                </button>
              </div>
              
              {/* All Columns List */}
              <div className="p-1">
                {columns.map(column => (
                  <label key={column.key} className="flex items-center justify-between px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors">
                    <span className="text-sm text-gray-900 truncate flex-1 mr-2" title={column.label}>
                      {column.label}
                    </span>
                    <input
                      type="checkbox"
                      checked={column.visible}
                      onChange={(e) => onColumnToggle(column.key, e.target.checked)}
                      className="h-3 w-4 text-orange-600 focus:ring-1 focus:ring-orange-500 border-gray-300 rounded-sm"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Preset Buttons */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(customPresets).map(([key, preset]) => (
            <div key={key} className="relative group">
              <button
                onClick={() => handlePresetSelect(key)}
                className="w-full text-sm px-3 py-2 bg-gray-100 hover:bg-orange-100 hover:text-orange-700 rounded-lg transition-colors font-medium"
              >
                {key === 'basic' ? '📝 Básico' : 
                 key === 'financial' ? '💰 Precios' : 
                 key === 'stock' ? '📦 Stock' : 
                 key === 'complete' ? '🔍 Todo' : `✨ ${key}`}
              </button>
              {key !== 'complete' && (
                <>
                  <button
                    onClick={(e) => handleEditPreset(key, e)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 hover:bg-blue-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                    title="Editar preset"
                  >
                    ✏️
                  </button>
                  {!isDefaultPreset(key) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeletePreset(key)
                      }}
                      className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                      title="Eliminar preset"
                    >
                      ✕
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
        
        {/* Add New Preset Button */}
        {!showNewPresetForm ? (
          <button
            onClick={() => setShowNewPresetForm(true)}
            className="w-full text-sm px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors border border-green-300 border-dashed font-medium"
          >
            + Crear Nuevo Preset
          </button>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Nombre del preset personalizado"
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateNewPreset()}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateNewPreset}
                className="flex-1 text-sm px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
              >
                ✓ Crear
              </button>
              <button
                onClick={() => {
                  setShowNewPresetForm(false)
                  setNewPresetName('')
                }}
                className="flex-1 text-sm px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                ✕ Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Preset Modal */}
      {editingPreset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-100/60 via-white to-blue-100/60 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                Editar Preset: {editingPreset === 'basic' ? 'Básico' : 
                                editingPreset === 'financial' ? 'Precios' : 
                                editingPreset === 'stock' ? 'Stock' : editingPreset}
              </h3>
              <button
                onClick={handleCancelEdit}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Selecciona las columnas que se mostrarán cuando uses este preset:
              </p>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {columns.map(column => (
                  <label key={column.key} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors">
                    <span className="text-sm text-gray-900 flex-1 mr-2">
                      {column.label}
                    </span>
                    <input
                      type="checkbox"
                      checked={tempPresetColumns.includes(column.key)}
                      onChange={() => togglePresetColumn(column.key)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </label>
                ))}
              </div>
              
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSavePreset}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
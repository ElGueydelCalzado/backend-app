import { useState } from 'react'
import { Product } from '@/lib/supabase'
import LoadingButton from './LoadingButton'
import { ColumnConfig } from './ColumnControls'
import DeleteConfirmModal from './DeleteConfirmModal'

interface InventoryTableProps {
  editedView: Product[]
  onCellEdit: (index: number, field: keyof Product, value: string | number | boolean | null) => void
  onSave: () => void
  onCancel: () => void
  saving?: boolean
  columnConfig?: ColumnConfig[]
  onAddRow?: (afterIndex: number) => void
  onRemoveRow?: (index: number) => void
  selectedProducts?: Set<number>
  onProductSelect?: (productId: number, selected: boolean) => void
  onSelectAll?: (selected: boolean) => void
}

// Field display configuration
const FIELD_CONFIG: Record<string, { label: string, icon: string, type: string, category: string }> = {
  categoria: { label: 'Categoría', icon: '📂', type: 'text', category: 'basic' },
  marca: { label: 'Marca', icon: '🏷️', type: 'text', category: 'basic' },
  modelo: { label: 'Modelo', icon: '👟', type: 'text', category: 'basic' },
  color: { label: 'Color', icon: '🎨', type: 'text', category: 'basic' },
  talla: { label: 'Talla', icon: '📏', type: 'text', category: 'basic' },
  sku: { label: 'SKU', icon: '🆔', type: 'text', category: 'basic' },
  ean: { label: 'EAN', icon: '📱', type: 'text', category: 'basic' },
  costo: { label: 'Costo', icon: '💰', type: 'number', category: 'pricing' },
  shein_modifier: { label: 'Mod. SHEIN', icon: '⚙️', type: 'number', category: 'pricing' },
  shopify_modifier: { label: 'Mod. Shopify', icon: '⚙️', type: 'number', category: 'pricing' },
  meli_modifier: { label: 'Mod. MercadoLibre', icon: '⚙️', type: 'number', category: 'pricing' },
  precio_shein: { label: 'Precio SHEIN', icon: '💲', type: 'readonly', category: 'pricing' },
  precio_egdc: { label: 'Precio Shopify', icon: '💲', type: 'readonly', category: 'pricing' },
  precio_meli: { label: 'Precio MercadoLibre', icon: '💲', type: 'readonly', category: 'pricing' },
  inv_egdc: { label: 'EGDC', icon: '🏢', type: 'number', category: 'inventory' },
  inv_fami: { label: 'FAMI', icon: '🏭', type: 'number', category: 'inventory' },
  inventory_total: { label: 'Total', icon: '📊', type: 'readonly', category: 'inventory' },
  shein: { label: 'SHEIN', icon: '✅', type: 'checkbox', category: 'platforms' },
  shopify: { label: 'Shopify', icon: '✅', type: 'checkbox', category: 'platforms' },
  meli: { label: 'MercadoLibre', icon: '✅', type: 'checkbox', category: 'platforms' },
  tiktok: { label: 'TikTok', icon: '✅', type: 'checkbox', category: 'platforms' },
  upseller: { label: 'Upseller', icon: '✅', type: 'checkbox', category: 'platforms' },
  go_trendier: { label: 'Go Trendier', icon: '✅', type: 'checkbox', category: 'platforms' },
  google_drive: { label: 'Google Drive', icon: '📁', type: 'text', category: 'basic' }
}

export default function InventoryTable({ 
  editedView, 
  onCellEdit, 
  onSave, 
  onCancel,
  saving = false,
  columnConfig,
  onAddRow,
  onRemoveRow,
  selectedProducts = new Set(),
  onProductSelect,
  onSelectAll
}: InventoryTableProps) {
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [productToDelete, setProductToDelete] = useState<{ product: Product; index: number } | null>(null)
  
  // Get visible columns based on configuration
  const visibleColumns = columnConfig ? 
    columnConfig.filter(col => col.visible).map(col => col.key) :
    Object.keys(FIELD_CONFIG) // Default to all columns if no config
  
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'basic': return 'bg-blue-50 border-blue-200'
      case 'pricing': return 'bg-orange-50 border-orange-200'
      case 'inventory': return 'bg-purple-50 border-purple-200'
      case 'platforms': return 'bg-green-50 border-green-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  const handleInputChange = (
    index: number, 
    field: keyof Product, 
    value: string,
    inputType: string = 'text'
  ) => {
    let processedValue: string | number | boolean | null = value

    if (inputType === 'number') {
      processedValue = value === '' ? null : parseFloat(value)
    } else if (inputType === 'checkbox') {
      processedValue = value === 'true'
    } else if (value === '') {
      processedValue = null
    }

    onCellEdit(index, field, processedValue)
  }

  const getCellId = (index: number, fieldKey: string) => `${index}-${fieldKey}`
  
  const startEditing = (index: number, fieldKey: string) => {
    setEditingCell(getCellId(index, fieldKey))
  }
  
  const stopEditing = () => {
    setEditingCell(null)
  }
  
  const isEditing = (index: number, fieldKey: string) => {
    return editingCell === getCellId(index, fieldKey)
  }

  const handleDeleteClick = (product: Product, index: number) => {
    if (product.id < 0) {
      // For new products, delete immediately without confirmation
      onRemoveRow?.(index)
    } else {
      // For existing products, show confirmation modal
      setProductToDelete({ product, index })
    }
  }

  const handleDeleteConfirm = () => {
    if (productToDelete && onRemoveRow) {
      onRemoveRow(productToDelete.index)
      setProductToDelete(null)
    }
  }

  const handleDeleteCancel = () => {
    setProductToDelete(null)
  }

  // Real-time price calculation functions
  const calculatePriceShein = (costo: number | null, modifier: number | null): number | null => {
    if (!costo || !modifier) return null
    return Math.ceil((costo * modifier * 1.2) / 5) * 5
  }

  const calculatePriceShopify = (costo: number | null, modifier: number | null): number | null => {
    if (!costo || !modifier) return null
    return Math.ceil(((costo * modifier + 100) * 1.25) / 5) * 5
  }

  const calculatePriceMeli = (costo: number | null, modifier: number | null): number | null => {
    if (!costo || !modifier) return null
    return Math.ceil(((costo * modifier + 100) * 1.395) / 5) * 5
  }

  // Get real-time calculated price based on current values
  const getRealTimePrice = (product: Product, priceField: string): number | null => {
    const costo = product.costo
    
    switch (priceField) {
      case 'precio_shein':
        return calculatePriceShein(costo, product.shein_modifier)
      case 'precio_egdc':
        return calculatePriceShopify(costo, product.shopify_modifier)
      case 'precio_meli':
        return calculatePriceMeli(costo, product.meli_modifier)
      default:
        return product[priceField as keyof Product] as number | null
    }
  }

  if (editedView.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 h-full flex flex-col justify-center">
        <div className="px-6 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <span className="text-2xl mr-3">📦</span>
            Inventario EGDC
          </h2>
        </div>
        <div className="p-12 text-center flex-1 flex flex-col justify-center">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-lg text-gray-500 font-medium">No hay productos que coincidan con los filtros</p>
          <p className="text-sm text-gray-400 mt-2">Intenta ajustar los filtros para ver más productos</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200/50 backdrop-blur-sm h-full flex flex-col">
      {/* Enhanced Header */}
      <div className="px-6 py-2 border-b border-gray-200 bg-gradient-to-r from-orange-100/60 via-white to-orange-100/60 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <span className="text-2xl mr-3 drop-shadow-sm">📦</span>
              Inventario EGDC
              <span className="ml-3 px-3 py-1 bg-orange-100 text-orange-800 text-xs font-bold rounded-full shadow-sm">
                {editedView.length} productos
              </span>
            </h2>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <LoadingButton
              loading={false}
              onClick={onCancel}
              variant="secondary"
              disabled={saving}
              size="sm"
            >
              ↺ Cancelar
            </LoadingButton>
            <LoadingButton
              loading={saving}
              onClick={onSave}
              variant="primary"
              size="sm"
            >
              💾 Guardar Cambios
            </LoadingButton>
          </div>
        </div>
      </div>

      {/* Enhanced Table with Sticky Header */}
      <div className="flex-1 overflow-auto" role="region" aria-label="Tabla de inventario">
        <table className="min-w-full divide-y divide-gray-200" role="table" aria-label="Productos de inventario">
          <thead className="bg-gradient-to-r from-slate-100 via-orange-50 to-orange-100 sticky top-0 z-10 shadow-sm">
            <tr>
              {/* Selection Column Header */}
              {onProductSelect && (
                <th className="w-12 px-1 py-0.5 text-center text-xs font-bold text-gray-800 uppercase tracking-wider border-r border-gray-300 bg-blue-50">
                  <input
                    type="checkbox"
                    checked={editedView.every(product => selectedProducts.has(product.id))}
                    onChange={(e) => onSelectAll?.(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    title="Seleccionar todo"
                  />
                </th>
              )}
              {visibleColumns.map((fieldKey) => {
                const field = FIELD_CONFIG[fieldKey]
                if (!field) return null
                
                return (
                  <th 
                    key={fieldKey}
                    className={`group px-1 py-0.5 text-left text-xs font-bold text-gray-800 uppercase tracking-wider border-r border-gray-300 ${
                      getCategoryColor(field.category)
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="mr-1">{field.icon}</span>
                      {field.label}
                    </div>
                  </th>
                )
              })}
              {/* Actions Column Header */}
              <th className="w-16 px-1 py-0.5 text-center text-xs font-bold text-gray-800 uppercase tracking-wider border-r border-gray-300 bg-gray-50">
                <span title="Acciones">⚡</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {editedView.map((product, index) => (
              <tr key={product.id} className="group hover:bg-orange-50/30 transition-colors duration-150">
                {/* Selection Column */}
                {onProductSelect && (
                  <td className="w-12 px-1 py-0.5 text-center border-r border-gray-200">
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(product.id)}
                      onChange={(e) => onProductSelect(product.id, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={saving}
                    />
                  </td>
                )}
                {visibleColumns.map((fieldKey) => {
                  const field = FIELD_CONFIG[fieldKey]
                  if (!field) return null
                  
                  const value = product[fieldKey as keyof Product]
                  
                  return (
                    <td key={fieldKey} className="px-1 py-0.5 whitespace-nowrap border-r border-gray-200 text-sm">
                      {field.type === 'readonly' ? (
                        <div className="text-green-700 font-semibold bg-green-50 px-2 py-1 rounded text-center">
                          {(() => {
                            const realTimePrice = getRealTimePrice(product, fieldKey)
                            return realTimePrice ? `$${realTimePrice.toLocaleString()}` : '-'
                          })()}
                        </div>
                      ) : field.type === 'checkbox' ? (
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={!!value}
                            onChange={(e) => handleInputChange(index, fieldKey as keyof Product, e.target.checked.toString(), 'checkbox')}
                            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                            disabled={saving}
                          />
                        </div>
                      ) : isEditing(index, fieldKey) ? (
                        <div className="flex items-center gap-2">
                          {fieldKey === 'google_drive' && value ? (
                            <>
                              <a
                                href={value.toString()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-xs font-medium flex items-center gap-1 flex-shrink-0"
                                title="Abrir en nueva pestaña"
                              >
                                <span>🔗</span>
                                Ver
                              </a>
                              <input
                                type="text"
                                value={value?.toString() || ''}
                                onChange={(e) => handleInputChange(index, fieldKey as keyof Product, e.target.value, field.type)}
                                onBlur={stopEditing}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === 'Escape') {
                                    stopEditing()
                                  }
                                }}
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
                                disabled={saving}
                                placeholder="URL de Google Drive..."
                                autoFocus
                              />
                            </>
                          ) : (
                            <input
                              type={field.type}
                              value={value?.toString() || ''}
                              onChange={(e) => handleInputChange(index, fieldKey as keyof Product, e.target.value, field.type)}
                              onBlur={stopEditing}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Escape') {
                                  stopEditing()
                                }
                              }}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
                              disabled={saving}
                              placeholder={field.type === 'number' ? '0' : 'Valor...'}
                              step={field.type === 'number' ? '0.01' : undefined}
                              autoFocus
                            />
                          )}
                        </div>
                      ) : (
                        <div className="group relative flex items-center">
                          <div className="flex-1 px-2 py-1 text-sm">
                            {fieldKey === 'google_drive' && value ? (
                              <div className="flex items-center gap-2">
                                <a
                                  href={value.toString()}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-xs font-medium flex items-center gap-1 flex-shrink-0"
                                  title="Abrir en nueva pestaña"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span>🔗</span>
                                  Ver
                                </a>
                                <span className="flex-1 truncate">{value.toString()}</span>
                              </div>
                            ) : (
                              <span className="truncate">{value?.toString() || '-'}</span>
                            )}
                          </div>
                          <button
                            onClick={() => startEditing(index, fieldKey)}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 hover:bg-orange-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                            title="Editar celda"
                            disabled={saving}
                          >
                            ✏️
                          </button>
                        </div>
                      )}
                    </td>
                  )
                })}
                {/* Actions Column */}
                <td className="w-16 px-1 py-0.5 text-center border-r border-gray-200 relative">
                  <div className="flex items-center justify-center gap-1">
                    {/* Add Row Button */}
                    {onAddRow && (
                      <button
                        onClick={() => onAddRow(index)}
                        className="w-5 h-5 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold"
                        title="Agregar producto después de esta fila"
                        disabled={saving}
                      >
                        +
                      </button>
                    )}
                    {/* Remove Row Button (for all rows) */}
                    {onRemoveRow && (
                      <button
                        onClick={() => handleDeleteClick(product, index)}
                        className="w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold"
                        title="Eliminar esta fila"
                        disabled={saving}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!productToDelete}
        product={productToDelete?.product || null}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  )
}
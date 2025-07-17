import { useState } from 'react'
import { Product } from '@/lib/types'
import LoadingButton from './LoadingButton'
import { ColumnConfig } from './ColumnControls'
import DeleteConfirmModal from './DeleteConfirmModal'
import ImagePreviewModal from './ImagePreviewModal'

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
  autoSave?: boolean // New prop to enable auto-save mode
  onAutoSave?: (productId: number, field: keyof Product, value: string | number | boolean | null) => void // New prop for auto-save callback
  isSupplierView?: boolean // New prop to indicate supplier products (read-only + BUY)
  supplierName?: string // Name of the supplier business
  onBuyProduct?: (product: Product, quantity: number) => void // Callback for buying from supplier
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
  // Physical dimensions and weight
  height_cm: { label: 'Alto (cm)', icon: '📐', type: 'number', category: 'dimensions' },
  length_cm: { label: 'Largo (cm)', icon: '📐', type: 'number', category: 'dimensions' },
  thickness_cm: { label: 'Grosor (cm)', icon: '📐', type: 'number', category: 'dimensions' },
  weight_grams: { label: 'Peso (g)', icon: '⚖️', type: 'number', category: 'dimensions' },
  costo: { label: 'Costo', icon: '💰', type: 'number', category: 'pricing' },
  shein_modifier: { label: 'Mod. SHEIN', icon: '⚙️', type: 'number', category: 'pricing' },
  shopify_modifier: { label: 'Mod. Shopify', icon: '⚙️', type: 'number', category: 'pricing' },
  meli_modifier: { label: 'Mod. MercadoLibre', icon: '⚙️', type: 'number', category: 'pricing' },
  precio_shein: { label: 'Precio SHEIN', icon: '💲', type: 'readonly', category: 'pricing' },
  precio_shopify: { label: 'Precio Shopify', icon: '💲', type: 'readonly', category: 'pricing' },
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
  onSelectAll,
  autoSave = false,
  onAutoSave,
  isSupplierView = false,
  supplierName,
  onBuyProduct
}: InventoryTableProps) {
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [productToDelete, setProductToDelete] = useState<{ product: Product; index: number } | null>(null)
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [imagePreviewProduct, setImagePreviewProduct] = useState<Product | null>(null)
  
  // Get visible columns based on configuration
  const visibleColumns = columnConfig ? 
    columnConfig.filter(col => col.visible).map(col => col.key) :
    Object.keys(FIELD_CONFIG) // Default to all columns if no config
  
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'basic': return 'bg-blue-50 border-blue-200'
      case 'dimensions': return 'bg-indigo-50 border-indigo-200'
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

  const handleCellComplete = (index: number, field: keyof Product, productId: number) => {
    // Get the current value from the edited view
    const currentValue = editedView[index][field]
    
    console.log('🎯 Cell complete:', { index, field, productId, currentValue, autoSave })
    
    // If auto-save is enabled and we have a valid product ID (not a new product)
    if (autoSave && productId > 0 && onAutoSave) {
      console.log('💾 Triggering auto-save...')
      // Auto-save the individual cell change
      onAutoSave(productId, field, currentValue)
    } else {
      console.log('⏭️ Skipping auto-save:', { autoSave, productId, hasOnAutoSave: !!onAutoSave })
    }
    stopEditing()
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
      case 'precio_shopify':
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
              <span className="text-2xl mr-3 drop-shadow-sm">
                {isSupplierView ? '🏭' : '📦'}
              </span>
              {isSupplierView ? `${supplierName} Catalog` : 'Inventario EGDC'}
              <span className="ml-3 px-3 py-1 bg-orange-100 text-orange-800 text-xs font-bold rounded-full shadow-sm">
                {editedView.length} productos
              </span>
              {isSupplierView && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full shadow-sm">
                  SUPPLIER VIEW
                </span>
              )}
            </h2>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            {/* Auto-save indicator removed per user request */}
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
              <th className="w-20 px-1 py-0.5 text-center text-xs font-bold text-gray-800 uppercase tracking-wider border-r border-gray-300 bg-gray-50">
                <span title={isSupplierView ? "Comprar" : "Acciones"}>
                  {isSupplierView ? "🛒" : "⚡"}
                </span>
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
                            onChange={(e) => {
                              const newValue = e.target.checked
                              handleInputChange(index, fieldKey as keyof Product, newValue.toString(), 'checkbox')
                              // Auto-save checkbox changes immediately
                              if (autoSave && product.id > 0 && onAutoSave) {
                                onAutoSave(product.id, fieldKey as keyof Product, newValue)
                              }
                            }}
                            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                            disabled={saving}
                          />
                        </div>
                      ) : !isSupplierView && isEditing(index, fieldKey) ? (
                        <div className="flex items-center gap-2 p-1 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border-2 border-orange-200 shadow-md">
                          {fieldKey === 'google_drive' && value ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setImagePreviewProduct(product)
                                  setShowImagePreview(true)
                                }}
                                className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs font-medium flex items-center gap-1 flex-shrink-0 shadow-sm"
                                title="Ver imágenes del producto"
                              >
                                <span>🔗</span>
                                Ver
                              </button>
                              <input
                                type="text"
                                value={value?.toString() || ''}
                                onChange={(e) => handleInputChange(index, fieldKey as keyof Product, e.target.value, field.type)}
                                onBlur={() => {
                                  handleCellComplete(index, fieldKey as keyof Product, product.id)
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleCellComplete(index, fieldKey as keyof Product, product.id)
                                  } else if (e.key === 'Escape') {
                                    stopEditing()
                                  }
                                }}
                                className="flex-1 px-3 py-1 text-sm border-2 border-orange-300 rounded-lg focus:ring-4 focus:ring-orange-200 focus:border-orange-400 focus:outline-none transition-all duration-200 bg-white shadow-inner"
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
                              onBlur={() => {
                                handleCellComplete(index, fieldKey as keyof Product, product.id)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleCellComplete(index, fieldKey as keyof Product, product.id)
                                } else if (e.key === 'Escape') {
                                  stopEditing()
                                }
                              }}
                              className="w-full px-3 py-1 text-sm border-2 border-orange-300 rounded-lg focus:ring-4 focus:ring-orange-200 focus:border-orange-400 focus:outline-none transition-all duration-200 bg-white shadow-inner font-medium"
                              disabled={saving}
                              placeholder={field.type === 'number' ? '0.00' : 'Ingresa valor...'}
                              step={field.type === 'number' ? '0.01' : undefined}
                              autoFocus
                            />
                          )}
                          {/* Edit mode indicators */}
                          <div className="flex items-center gap-1 text-xs text-orange-600">
                            <span title="Presiona Enter para guardar">⏎</span>
                            <span title="Presiona Escape para cancelar">⎋</span>
                          </div>
                        </div>
                      ) : (
                        <div className="group relative flex items-center hover:bg-gradient-to-r hover:from-orange-25 hover:to-orange-50 rounded-lg transition-all duration-200 min-h-[1.67rem]">
                          <div className="flex-1 px-3 py-1 text-sm">
                            {fieldKey === 'google_drive' && value ? (
                              <div className="flex items-center justify-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setImagePreviewProduct(product)
                                    setShowImagePreview(true)
                                  }}
                                  className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs font-medium flex items-center gap-1 flex-shrink-0 shadow-sm"
                                  title="Ver imágenes del producto"
                                >
                                  <span>🔗</span>
                                  Ver
                                </button>
                              </div>
                            ) : (
                              <span className="truncate font-medium text-gray-800">
                                {value?.toString() || <span className="text-gray-400 italic">Sin valor</span>}
                              </span>
                            )}
                          </div>
                          {!isSupplierView && (
                            <button
                              onClick={() => startEditing(index, fieldKey)}
                              className="absolute -top-1 -right-1 w-7 h-7 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center text-sm shadow-lg hover:shadow-xl transform hover:scale-110 active:scale-95"
                              title="Hacer clic para editar"
                              disabled={saving}
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  )
                })}
                {/* Actions Column */}
                <td className="w-20 px-1 py-0.5 text-center border-r border-gray-200 relative">
                  <div className="flex items-center justify-center gap-1">
                    {isSupplierView ? (
                      /* BUY Button for Supplier Products */
                      <button
                        onClick={() => {
                          const quantity = prompt(`¿Cuántas unidades de ${product.modelo} deseas comprar?`)
                          if (quantity && onBuyProduct) {
                            const qty = parseInt(quantity, 10)
                            if (qty > 0) {
                              onBuyProduct(product, qty)
                            }
                          }
                        }}
                        className="px-3 py-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                        title={`Comprar ${product.modelo} de ${supplierName}`}
                        disabled={saving}
                      >
                        🛒 BUY
                      </button>
                    ) : (
                      /* EGDC Products - Add/Remove buttons */
                      <>
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
                      </>
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

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={showImagePreview}
        onClose={() => {
          setShowImagePreview(false)
          setImagePreviewProduct(null)
        }}
        googleDriveUrl={imagePreviewProduct?.google_drive || ''}
        productName={imagePreviewProduct ? `${imagePreviewProduct.marca} ${imagePreviewProduct.modelo}` : ''}
      />
    </div>
  )
}
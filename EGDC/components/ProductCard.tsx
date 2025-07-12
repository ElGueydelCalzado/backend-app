import { useState } from 'react'
import { Product } from '@/lib/types'

interface ProductCardProps {
  product: Product
  isExpanded: boolean
  onToggleExpand: () => void
  onEdit: (field: keyof Product, value: string | number | null) => void
}

export default function ProductCard({ 
  product, 
  isExpanded, 
  onToggleExpand, 
  onEdit 
}: ProductCardProps) {
  const [editingField, setEditingField] = useState<string | null>(null)

  const handleEdit = (field: keyof Product, value: string) => {
    const processedValue = ['costo', 'shein_modifier', 'shopify_modifier', 'meli_modifier', 'inv_egdc', 'inv_fami'].includes(field)
      ? (value === '' ? null : parseFloat(value))
      : (value === '' ? null : value)
    
    onEdit(field, processedValue)
    setEditingField(null)
  }

  const getStockStatus = () => {
    const total = product.inventory_total || 0
    if (total === 0) return { status: 'out', color: 'text-red-600 bg-red-50', icon: '❌' }
    if (total <= 10) return { status: 'low', color: 'text-yellow-600 bg-yellow-50', icon: '⚠️' }
    return { status: 'good', color: 'text-green-600 bg-green-50', icon: '✅' }
  }

  const stockStatus = getStockStatus()

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-200 mb-4 overflow-hidden hover:shadow-xl transition-all">
      {/* Compact Header - Always Visible */}
      <div 
        className="p-4 sm:p-5 cursor-pointer hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all"
        onClick={onToggleExpand}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Brand & Model with Stock Status */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {product.marca} {product.modelo}
              </h3>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm ${stockStatus.color} border-2 ${stockStatus.status === 'out' ? 'border-red-200' : stockStatus.status === 'low' ? 'border-yellow-200' : 'border-green-200'}`}>
                {stockStatus.icon} {product.inventory_total || 0} units
              </span>
            </div>
            
            {/* Product Details - Mobile Optimized */}
            <div className="text-sm text-gray-600 mb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-lg font-medium text-xs">
                  📂 {product.categoria}
                </span>
                <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 rounded-lg font-medium text-xs">
                  🎨 {product.color}
                </span>
                <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-lg font-medium text-xs">
                  📏 Talla {product.talla}
                </span>
                {product.sku && (
                  <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded-lg font-medium text-xs">
                    🏷️ {product.sku}
                  </span>
                )}
              </div>
            </div>

            {/* Price Summary - Mobile Optimized */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
              <div className="flex items-center justify-between sm:justify-start p-2 bg-gray-100 rounded-lg">
                <span className="font-semibold text-gray-600 text-xs">💰 Cost</span>
                <span className="font-bold text-gray-900">
                  ${product.costo?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex items-center justify-between sm:justify-start p-2 bg-blue-100 rounded-lg">
                <span className="font-semibold text-blue-600 text-xs">🛒 SHEIN</span>
                <span className="font-bold text-blue-800">
                  ${product.precio_shein?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex items-center justify-between sm:justify-start p-2 bg-green-100 rounded-lg">
                <span className="font-semibold text-green-600 text-xs">🏪 Shopify</span>
                <span className="font-bold text-green-800">
                  ${product.precio_shopify?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>
          </div>

          {/* Expand/Collapse Icon */}
          <div className="flex justify-center sm:ml-4 sm:flex-shrink-0">
            <div className={`transform transition-all duration-200 p-2 rounded-full hover:bg-blue-100 ${isExpanded ? 'rotate-180 bg-blue-50' : 'bg-gray-100'}`}>
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            
            {/* Pricing Details */}
            <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-md border border-blue-100 p-4 sm:p-5">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center text-lg">
                <span className="text-xl mr-2">💰</span>
                Pricing Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Cost</label>
                  {editingField === 'costo' ? (
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={product.costo || ''}
                      onBlur={(e) => handleEdit('costo', e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleEdit('costo', e.currentTarget.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                    />
                  ) : (
                    <div 
                      onClick={() => setEditingField('costo')}
                      className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50 font-medium transition-all"
                    >
                      ${product.costo?.toFixed(2) || '0.00'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">SHEIN Modifier</label>
                  {editingField === 'shein_modifier' ? (
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={product.shein_modifier || ''}
                      onBlur={(e) => handleEdit('shein_modifier', e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleEdit('shein_modifier', e.currentTarget.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                    />
                  ) : (
                    <div 
                      onClick={() => setEditingField('shein_modifier')}
                      className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50 font-medium transition-all"
                    >
                      {product.shein_modifier?.toFixed(2) || '1.00'}x
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Shopify Modifier</label>
                  {editingField === 'shopify_modifier' ? (
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={product.shopify_modifier || ''}
                      onBlur={(e) => handleEdit('shopify_modifier', e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleEdit('shopify_modifier', e.currentTarget.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                    />
                  ) : (
                    <div 
                      onClick={() => setEditingField('shopify_modifier')}
                      className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50 font-medium transition-all"
                    >
                      {product.shopify_modifier?.toFixed(2) || '1.00'}x
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">MeLi Modifier</label>
                  {editingField === 'meli_modifier' ? (
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={product.meli_modifier || ''}
                      onBlur={(e) => handleEdit('meli_modifier', e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleEdit('meli_modifier', e.currentTarget.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                    />
                  ) : (
                    <div 
                      onClick={() => setEditingField('meli_modifier')}
                      className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50 font-medium transition-all"
                    >
                      {product.meli_modifier?.toFixed(2) || '1.00'}x
                    </div>
                  )}
                </div>
              </div>

              {/* Calculated Prices */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Calculated Prices</h5>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="font-medium text-blue-800">SHEIN</div>
                    <div className="text-blue-600">${product.precio_shein?.toFixed(2) || '0.00'}</div>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <div className="font-medium text-green-800">Shopify</div>
                    <div className="text-green-600">${product.precio_shopify?.toFixed(2) || '0.00'}</div>
                  </div>
                  <div className="bg-purple-50 p-2 rounded">
                    <div className="font-medium text-purple-800">MeLi</div>
                    <div className="text-purple-600">${product.precio_meli?.toFixed(2) || '0.00'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory by Location */}
            <div className="bg-gradient-to-br from-white to-green-50 rounded-xl shadow-md border border-green-100 p-4 sm:p-5">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center text-lg">
                <span className="text-xl mr-2">📍</span>
                Inventory by Location
                <span className="ml-2 text-sm font-normal bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Total: {product.inventory_total || 0}
                </span>
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'EGDC', field: 'inv_egdc', value: product.inv_egdc },
                  { label: 'FAMI', field: 'inv_fami', value: product.inv_fami }
                ].map(({ label, field, value }) => (
                  <div key={field} className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600">{label}</label>
                    {editingField === field ? (
                      <input
                        type="number"
                        defaultValue={value || ''}
                        onBlur={(e) => handleEdit(field as keyof Product, e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleEdit(field as keyof Product, e.currentTarget.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        autoFocus
                      />
                    ) : (
                      <div 
                        onClick={() => setEditingField(field)}
                        className="w-full px-2 py-1 text-sm bg-white border-2 border-gray-200 rounded-lg cursor-pointer hover:border-green-300 hover:bg-green-50 text-center font-medium transition-all"
                      >
                        {value || 0}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Product Information */}
            <div className="bg-gradient-to-br from-white to-purple-50 rounded-xl shadow-md border border-purple-100 p-4 sm:p-5">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center text-lg">
                <span className="text-xl mr-2">📦</span>
                Product Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Category', field: 'categoria', value: product.categoria },
                  { label: 'Brand', field: 'marca', value: product.marca },
                  { label: 'Model', field: 'modelo', value: product.modelo },
                  { label: 'Color', field: 'color', value: product.color },
                  { label: 'Size', field: 'talla', value: product.talla },
                  { label: 'SKU', field: 'sku', value: product.sku },
                  { label: 'EAN', field: 'ean', value: product.ean }
                ].map(({ label, field, value }) => (
                  <div key={field} className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">{label}</label>
                    {editingField === field ? (
                      <input
                        type="text"
                        defaultValue={value || ''}
                        onBlur={(e) => handleEdit(field as keyof Product, e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleEdit(field as keyof Product, e.currentTarget.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        autoFocus
                      />
                    ) : (
                      <div 
                        onClick={() => setEditingField(field)}
                        className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg cursor-pointer hover:border-purple-300 hover:bg-purple-50 font-medium transition-all"
                      >
                        {value || 'Not set'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
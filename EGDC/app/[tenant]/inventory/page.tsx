'use client'

import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Product } from '@/lib/types'
import FilterSection from '@/components/FilterSection'
import InventoryTable from '@/components/InventoryTable'
import LoadingScreen from '@/components/LoadingScreen'
import ToastNotification, { useToast } from '@/components/ToastNotification'
import ErrorBoundary from '@/components/ErrorBoundary'
import TabNavigation from '@/components/TabNavigation'
import TenantSelector from '@/components/TenantSelector'
import UnifiedSearchAndFilters from '@/components/UnifiedSearchAndFilters'
import BulkUpdateModal from '@/components/BulkUpdateModal'
import BulkDeleteConfirmModal from '@/components/BulkDeleteConfirmModal'
import ImportExportModal from '@/components/ImportExportModal'
import { ColumnConfig } from '@/components/ColumnControls'
import WarehouseTabs, { WarehouseFilter } from '@/components/WarehouseTabs'
import { getWarehouseData } from '@/lib/dummy-warehouse-data'
import Pagination from '@/components/Pagination'

interface Filters {
  categories: Set<string>
  brands: Set<string>
  models: Set<string>
  colors: Set<string>
  sizes: Set<string>
  priceRange: { min: number; max: number }
}

interface SortConfig {
  field: 'alphabetical' | 'price' | 'stock' | 'date'
  direction: 'asc' | 'desc'
  priceFields?: ('precio_shein' | 'precio_shopify' | 'precio_meli' | 'costo')[]
}

interface UniqueValues {
  categories: Set<string>
  brands: Set<string>
  models: Set<string>
  colors: Set<string>
  sizes: Set<string>
}

// Default column configuration for tenant inventory
const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'categoria', label: 'Categoría', visible: true, category: 'basic' },
  { key: 'marca', label: 'Marca', visible: true, category: 'basic' },
  { key: 'modelo', label: 'Modelo', visible: true, category: 'basic' },
  { key: 'color', label: 'Color', visible: true, category: 'basic' },
  { key: 'talla', label: 'Talla', visible: true, category: 'basic' },
  { key: 'sku', label: 'SKU', visible: true, category: 'basic' },
  { key: 'ean', label: 'EAN', visible: false, category: 'basic' },
  { key: 'costo', label: 'Costo', visible: false, category: 'pricing' },
  { key: 'google_drive', label: 'Google Drive', visible: false, category: 'basic' },
  { key: 'precio_shein', label: 'Precio SHEIN', visible: false, category: 'pricing' },
  { key: 'precio_shopify', label: 'Precio Shopify', visible: false, category: 'pricing' },
  { key: 'precio_meli', label: 'Precio MercadoLibre', visible: false, category: 'pricing' },
  { key: 'shein_modifier', label: 'Mod. SHEIN', visible: false, category: 'pricing' },
  { key: 'shopify_modifier', label: 'Mod. Shopify', visible: false, category: 'pricing' },
  { key: 'meli_modifier', label: 'Mod. MercadoLibre', visible: false, category: 'pricing' },
  { key: 'inv_egdc', label: 'EGDC', visible: false, category: 'inventory' },
  { key: 'inv_fami', label: 'FAMI', visible: false, category: 'inventory' },
  { key: 'inv_osiel', label: 'Osiel', visible: false, category: 'inventory' },
  { key: 'inv_molly', label: 'Molly', visible: false, category: 'inventory' },
  { key: 'inventory_total', label: 'Total', visible: false, category: 'inventory' },
  { key: 'shein', label: 'SHEIN', visible: false, category: 'platforms' },
  { key: 'meli', label: 'MercadoLibre', visible: false, category: 'platforms' },
  { key: 'shopify', label: 'Shopify', visible: false, category: 'platforms' },
  { key: 'tiktok', label: 'TikTok', visible: false, category: 'platforms' },
  { key: 'upseller', label: 'Upseller', visible: false, category: 'platforms' },
  { key: 'go_trendier', label: 'Go Trendier', visible: false, category: 'platforms' }
]

export default function TenantInventoryPage() {
  const params = useParams()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [loadingText, setLoadingText] = useState('Cargando inventario...')

  const tenant = params.tenant as string

  // Inventory state
  const [allData, setAllData] = useState<Product[]>([])
  const [originalView, setOriginalView] = useState<Product[]>([])
  const [editedView, setEditedView] = useState<Product[]>([])
  const [saving, setSaving] = useState(false)
  const { toasts, showToast, removeToast } = useToast()
  
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(DEFAULT_COLUMNS)
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set())
  
  // Modals
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [showImportExportModal, setShowImportExportModal] = useState(false)

  const [filters, setFilters] = useState<Filters>({
    categories: new Set(),
    brands: new Set(),
    models: new Set(),
    colors: new Set(),
    sizes: new Set(),
    priceRange: { min: 0, max: 10000 }
  })
  
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'alphabetical',
    direction: 'asc',
    priceFields: ['precio_shopify']
  })
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('')
  
  // Warehouse filtering state
  const [activeWarehouse, setActiveWarehouse] = useState<WarehouseFilter>('egdc')
  const [productCounts, setProductCounts] = useState<Record<string, number>>({
    egdc: 0,
    fami: 0,
    osiel: 0,
    molly: 0
  })
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(100)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  
  const [uniqueValues, setUniqueValues] = useState<UniqueValues>({
    categories: new Set(),
    brands: new Set(),
    models: new Set(),
    colors: new Set(),
    sizes: new Set()
  })

  // Authentication check
  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
      return
    }

    // Verify user has access to this tenant
    if (session.user?.tenant_subdomain !== tenant) {
      router.push('/login')
      return
    }

    // Load inventory data for authenticated user
    loadInventoryData(1)
    loadProductCounts()
  }, [session, status, tenant, router])

  // Load initial data
  const loadInventoryData = async (page: number = currentPage, search: string = '') => {
    try {
      setLoading(true)
      setLoadingText('Cargando datos del inventario...')
      
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        ...(search.trim() && { search: search.trim() }),
      })
      
      // Add filter parameters
      const selectedCategories = Array.from(filters.categories)
      const selectedBrands = Array.from(filters.brands)
      const selectedModels = Array.from(filters.models)
      
      if (selectedCategories.length > 0) {
        params.append('categoria', selectedCategories[0])
      }
      if (selectedBrands.length > 0) {
        params.append('marca', selectedBrands[0])
      }
      if (selectedModels.length > 0) {
        params.append('modelo', selectedModels[0])
      }
      
      const response = await fetch(`/api/inventory?${params}`)
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al cargar datos del inventario')
      }
      
      const data: Product[] = result.data
      const pagination = result.pagination
      
      setAllData(data)
      setCurrentPage(pagination.page)
      setTotalPages(pagination.totalPages)
      setTotalItems(pagination.totalItems)
      
      // For pagination, we need to fetch all data once to get filter options
      if (page === 1) {
        const allDataResponse = await fetch('/api/inventory?limit=10000')
        const allDataResult = await allDataResponse.json()
        
        if (allDataResult.success) {
          const allData = allDataResult.data
          // Extract unique values for filters
          const categories = new Set(allData.map((item: Product) => item.categoria).filter(Boolean) as string[])
          const brands = new Set(allData.map((item: Product) => item.marca).filter(Boolean) as string[])
          const models = new Set(allData.map((item: Product) => item.modelo).filter(Boolean) as string[])
          const colors = new Set(allData.map((item: Product) => item.color).filter(Boolean) as string[])
          const sizes = new Set(allData.map((item: Product) => item.talla).filter(Boolean) as string[])
          
          setUniqueValues({ categories, brands, models, colors, sizes })
        }
      }
      
      // Apply initial filters
      applyFilters(data, filters)
      
    } catch (error) {
      console.error('Error loading inventory data:', error)
      showToast(
        error instanceof Error ? error.message : 'Error al cargar datos',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = (data: Product[] = allData, currentFilters: Filters = filters) => {
    let filtered = data

    // Apply search filtering first
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(item => {
        const searchableFields = [
          item.categoria || '',
          item.marca || '',
          item.modelo || '',
          item.color || '',
          item.talla || '',
          item.sku || '',
          item.ean || ''
        ]
        
        return searchableFields.some(field => 
          field.toLowerCase().includes(searchLower)
        )
      })
    }

    // Apply category/brand/model/color/size filters
    filtered = filtered.filter(item => {
      const catMatch = currentFilters.categories.size === 0 || (item.categoria && currentFilters.categories.has(item.categoria))
      const brandMatch = currentFilters.brands.size === 0 || (item.marca && currentFilters.brands.has(item.marca))
      const modelMatch = currentFilters.models.size === 0 || (item.modelo && currentFilters.models.has(item.modelo))
      const colorMatch = currentFilters.colors.size === 0 || (item.color && currentFilters.colors.has(item.color))
      const sizeMatch = currentFilters.sizes.size === 0 || (item.talla && currentFilters.sizes.has(item.talla))
      return catMatch && brandMatch && modelMatch && colorMatch && sizeMatch
    })

    // Apply sorting before setting state
    const sorted = applySorting(filtered)
    setOriginalView([...sorted])
    setEditedView([...sorted])
  }

  const applySorting = (products: Product[]): Product[] => {
    const sorted = [...products]
    
    switch (sortConfig.field) {
      case 'alphabetical':
        sorted.sort((a, b) => {
          const aName = `${a.marca} ${a.modelo}`.toLowerCase()
          const bName = `${b.marca} ${b.modelo}`.toLowerCase()
          return sortConfig.direction === 'asc' 
            ? aName.localeCompare(bName)
            : bName.localeCompare(aName)
        })
        break
      
      case 'price':
        sorted.sort((a, b) => {
          const priceFields = sortConfig.priceFields || ['precio_shopify']
          const getAveragePrice = (product: any) => {
            const prices = priceFields.map(field => product[field] || product.costo || 0)
            return prices.reduce((sum, price) => sum + price, 0) / prices.length
          }
          
          const aPrice = getAveragePrice(a)
          const bPrice = getAveragePrice(b)
          return sortConfig.direction === 'asc' 
            ? aPrice - bPrice
            : bPrice - aPrice
        })
        break
      
      case 'stock':
        sorted.sort((a, b) => {
          const aStock = a.inventory_total || 0
          const bStock = b.inventory_total || 0
          return sortConfig.direction === 'asc' 
            ? aStock - bStock
            : bStock - aStock
        })
        break
      
      case 'date':
        sorted.sort((a, b) => {
          const aDate = new Date(a.created_at || 0).getTime()
          const bDate = new Date(b.created_at || 0).getTime()
          return sortConfig.direction === 'asc' 
            ? aDate - bDate
            : bDate - aDate
        })
        break
    }
    
    return sorted
  }

  // Load product counts for warehouse tabs
  const loadProductCounts = async () => {
    try {
      const response = await fetch('/api/inventory/counts')
      const result = await response.json()
      
      if (response.ok && result.success) {
        setProductCounts(result.data)
      } else {
        // Fallback counts
        setProductCounts({
          egdc: 2498,
          fami: 0,
          osiel: 0,
          molly: 0
        })
      }
    } catch (error) {
      console.error('Error loading product counts:', error)
      setProductCounts({
        egdc: 2498,
        fami: 0,
        osiel: 0,
        molly: 0
      })
    }
  }

  // Apply filters whenever they change
  useEffect(() => {
    if (allData.length > 0) {
      applyFilters()
    }
  }, [filters, allData, activeWarehouse, sortConfig, searchTerm])

  // Auto-save function for individual cell changes
  const handleAutoSave = async (productId: number, field: keyof Product, value: string | number | boolean | null) => {
    try {
      setSaving(true)
      
      const change = {
        id: productId,
        [field]: value
      }

      const response = await fetch('/api/inventory/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ changes: [change] })
      })

      if (!response.ok) {
        throw new Error('Error al guardar cambio')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al guardar')
      }

      showToast(`${field} actualizado`, 'success', 2000)
      
      // Update the original view to reflect the saved change
      setOriginalView(prev => prev.map(product => 
        product.id === productId ? { ...product, [field]: value } : product
      ))
      
    } catch (error) {
      console.error('Error auto-saving:', error)
      showToast(
        error instanceof Error ? error.message : 'Error al guardar automáticamente',
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleCellEdit = (index: number, field: keyof Product, value: string | number | boolean | null) => {
    const newEditedView = [...editedView]
    newEditedView[index] = { ...newEditedView[index], [field]: value }
    setEditedView(newEditedView)
  }

  const handleFilterChange = (filterType: keyof Filters, value: string, checked: boolean) => {
    const newFilters = { ...filters }
    
    if (filterType === 'categories') {
      if (checked) {
        newFilters.categories.add(value)
      } else {
        newFilters.categories.delete(value)
      }
      newFilters.brands.clear()
      newFilters.models.clear()
    } else if (filterType === 'brands') {
      if (checked) {
        newFilters.brands.add(value)
      } else {
        newFilters.brands.delete(value)
      }
      newFilters.models.clear()
    } else if (filterType === 'models') {
      if (checked) {
        newFilters.models.add(value)
      } else {
        newFilters.models.delete(value)
      }
    } else if (filterType === 'colors') {
      if (checked) {
        newFilters.colors.add(value)
      } else {
        newFilters.colors.delete(value)
      }
    } else if (filterType === 'sizes') {
      if (checked) {
        newFilters.sizes.add(value)
      } else {
        newFilters.sizes.delete(value)
      }
    }
    
    setFilters(newFilters)
  }

  const handleClearFilters = () => {
    setFilters({
      categories: new Set(),
      brands: new Set(),
      models: new Set(),
      colors: new Set(),
      sizes: new Set(),
      priceRange: { min: 0, max: 10000 }
    })
  }

  // Product selection handlers
  const handleProductSelect = (productId: number, selected: boolean) => {
    const newSelected = new Set(selectedProducts)
    if (selected) {
      newSelected.add(productId)
    } else {
      newSelected.delete(productId)
    }
    setSelectedProducts(newSelected)
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const allIds = new Set(editedView.map(product => product.id))
      setSelectedProducts(allIds)
    } else {
      setSelectedProducts(new Set())
    }
  }

  // Get selected products for bulk operations
  const getSelectedProducts = () => {
    return editedView.filter(product => selectedProducts.has(product.id))
  }

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    loadInventoryData(page, searchTerm)
  }

  const handleItemsPerPageChange = (limit: number) => {
    setItemsPerPage(limit)
    setCurrentPage(1)
    loadInventoryData(1, searchTerm)
  }

  // Column control handlers
  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnConfig(prev => 
      prev.map(col => col.key === key ? { ...col, visible } : col)
    )
  }
  
  const handlePresetSelect = (preset: string) => {
    const presets = {
      basic: ['categoria', 'marca', 'modelo', 'color', 'talla', 'sku'],
      financial: ['categoria', 'marca', 'modelo', 'costo', 'precio_shein', 'precio_shopify', 'precio_meli'],
      stock: ['categoria', 'marca', 'modelo', 'inv_egdc', 'inv_fami', 'inventory_total'],
      complete: 'all'
    }
    
    setColumnConfig(prev => 
      prev.map(col => ({
        ...col,
        visible: preset === 'complete' || presets[preset as keyof typeof presets]?.includes(col.key) || false
      }))
    )
  }

  if (loading) {
    return <LoadingScreen text={loadingText} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <TabNavigation currentTab="inventario" />
        <TenantSelector currentTenant={tenant} />
      </header>

      {/* Main Content */}
      <main className="flex flex-col h-[calc(100vh-160px)]">
        {/* Warehouse Tabs */}
        <WarehouseTabs
          activeWarehouse={activeWarehouse}
          onWarehouseChange={setActiveWarehouse}
          productCounts={productCounts}
          isDemoMode={false}
        />

        {/* Search and Actions Bar */}
        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-2xl">
              <UnifiedSearchAndFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                filters={filters}
                uniqueValues={uniqueValues}
                allData={allData}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                columnConfig={columnConfig}
                onColumnToggle={handleColumnToggle}
                onPresetSelect={handlePresetSelect}
                sortConfig={sortConfig}
                onSortChange={setSortConfig}
              />
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowImportExportModal(true)}
                className="egdc-btn egdc-btn-primary"
              >
                <span>🔄</span>
                Importar / Exportar
              </button>
              {selectedProducts.size > 0 && (
                <>
                  <button
                    onClick={() => setShowBulkUpdateModal(true)}
                    className="egdc-btn egdc-btn-secondary"
                  >
                    <span>📝</span>
                    Editar {selectedProducts.size}
                  </button>
                  <button
                    onClick={() => setShowBulkDeleteModal(true)}
                    className="egdc-btn egdc-btn-danger"
                    disabled={saving}
                  >
                    <span>🗑️</span>
                    Eliminar {selectedProducts.size}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Inventory Section Header */}
        <div className="px-6 py-3 bg-white border-b border-gray-200">
          <div className="egdc-section-header">
            <h2 className="egdc-table-title">
              📦 Inventario EGDC {totalItems} productos
            </h2>
          </div>
        </div>
        
        {/* Inventory Table */}
        <div className="flex-1 px-6 pb-1 overflow-hidden min-h-0">
          <ErrorBoundary
            level="section"
            onError={(error, errorInfo) => {
              console.error('Inventory table error:', error, errorInfo)
            }}
            resetKeys={[editedView.length]}
            fallback={
              <div className="egdc-card p-8 text-center h-full flex flex-col justify-center border-red-200">
                <div className="text-red-600 text-6xl mb-4">⚠️</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Error en la tabla</h3>
                <p className="text-gray-600 mb-4">
                  Hubo un problema mostrando la tabla de inventario. 
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="egdc-btn egdc-btn-danger mx-auto"
                >
                  Recargar página
                </button>
              </div>
            }
          >
            <div className="egdc-table">
              <InventoryTable
                editedView={editedView}
                onCellEdit={handleCellEdit}
                onSave={() => {}} // Auto-save handles individual changes
                onCancel={() => {}}
                saving={saving}
                columnConfig={columnConfig}
                onAddRow={() => {}}
                onRemoveRow={() => {}}
                selectedProducts={selectedProducts}
                onProductSelect={handleProductSelect}
                onSelectAll={handleSelectAll}
                autoSave={true}
                onAutoSave={handleAutoSave}
                isSupplierView={false}
                supplierName="EGDC"
                onBuyProduct={() => {}}
              />
            </div>
          </ErrorBoundary>
        </div>
        
        {/* Pagination */}
        <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-gray-200">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </div>
      </main>

      {/* Modals */}
      <ImportExportModal
        isOpen={showImportExportModal}
        onClose={() => setShowImportExportModal(false)}
        onImportSuccess={(message) => {
          showToast(message, message.includes('Error') ? 'error' : 'success')
          if (!message.includes('Error')) {
            loadInventoryData()
          }
        }}
        onExport={() => {}}
        selectedProductsCount={selectedProducts.size}
      />

      <BulkUpdateModal
        isOpen={showBulkUpdateModal}
        selectedProducts={getSelectedProducts()}
        onClose={() => setShowBulkUpdateModal(false)}
        onUpdate={() => {}}
      />

      <BulkDeleteConfirmModal
        isOpen={showBulkDeleteModal}
        products={getSelectedProducts()}
        onConfirm={() => {}}
        onCancel={() => setShowBulkDeleteModal(false)}
      />

      {/* Toast Notifications */}
      {toasts.map((toast) => (
        <ToastNotification
          key={toast.id}
          message={toast}
          onClose={removeToast}
        />
      ))}
    </div>
  )
}
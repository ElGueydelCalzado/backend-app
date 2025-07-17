'use client'

import { useState, useEffect } from 'react'
import { Product } from '@/lib/types'
import FilterSection from '@/components/FilterSection'
import InventoryTable from '@/components/InventoryTable'
import LoadingScreen from '@/components/LoadingScreen'
import ToastNotification, { useToast } from '@/components/ToastNotification'
import ErrorBoundary from '@/components/ErrorBoundary'
import TabNavigation from '@/components/TabNavigation'
import Sidebar, { SidebarState, SidebarTab } from '@/components/Sidebar'
import ExpandableSidebar from '@/components/ExpandableSidebar'
import WarehouseSettings from '@/components/WarehouseSettings'
import MarketplaceSettings from '@/components/MarketplaceSettings'
import SearchBar from '@/components/SearchBar'
import UnifiedSearchAndFilters from '@/components/UnifiedSearchAndFilters'
import ProductCollectionWizard from '@/components/ProductCollectionWizard'
import BulkUpdateModal from '@/components/BulkUpdateModal'
import BulkDeleteConfirmModal from '@/components/BulkDeleteConfirmModal'
import ImportExportModal from '@/components/ImportExportModal'
import { ColumnConfig } from '@/components/ColumnControls'
import MobileInventoryView from '@/components/MobileInventoryView'
import MobileProductCardList from '@/components/MobileProductCardList'
import MobileFilters from '@/components/MobileFilters'
import MobileProductEditor from '@/components/MobileProductEditor'
import MobileSort from '@/components/MobileSort'
import MobileImportExportModal from '@/components/MobileImportExportModal'
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

// Removed Message interface - now using toast notifications

// Column configuration for the inventory table (auto-generated from database schema)
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

export default function InventarioPage() {
  const [allData, setAllData] = useState<Product[]>([])
  const [originalView, setOriginalView] = useState<Product[]>([])
  const [editedView, setEditedView] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingText, setLoadingText] = useState('Cargando inventario...')
  const { toasts, showToast, removeToast } = useToast()
  
  // Sidebar and column state
  const [sidebarState, setSidebarState] = useState<SidebarState>('collapsed')
  const [activeTab, setActiveTab] = useState<SidebarTab>('productos')
  const [activeSubPage, setActiveSubPage] = useState<string>('catalogo')
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(DEFAULT_COLUMNS)
  const [isMobile, setIsMobile] = useState(false)
  const [isSearchActive, setIsSearchActive] = useState(false)
  const [showNewProductModal, setShowNewProductModal] = useState(false)
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [showImportExportModal, setShowImportExportModal] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set())
  
  // Mobile-specific state
  const [mobileSearchTerm, setMobileSearchTerm] = useState('')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showMobileEditor, setShowMobileEditor] = useState(false)

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
  
  const [showMobileSort, setShowMobileSort] = useState(false)
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('')
  
  // Warehouse filtering state
  const [activeWarehouse, setActiveWarehouse] = useState<WarehouseFilter>('egdc')
  const [useDummyData, setUseDummyData] = useState(false) // Switch between real and dummy data
  
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

  // Load initial data
  useEffect(() => {
    loadInventoryData(1)
  }, [])
  
  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024 // lg breakpoint
      console.log('🚨 MOBILE DETECTION - Width:', window.innerWidth, 'isMobile:', mobile)
      setIsMobile(mobile)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])


  // Apply filters whenever they change
  useEffect(() => {
    if (allData.length > 0) {
      applyFilters()
    }
  }, [filters, allData, activeWarehouse])

  // Apply sorting when sortConfig changes
  useEffect(() => {
    if (allData.length > 0) {
      applyFilters()
    }
  }, [sortConfig])

  // Apply search filtering when searchTerm changes
  useEffect(() => {
    if (allData.length > 0) {
      applyFilters()
    }
  }, [searchTerm])

  // Reload data when filters change (for server-side filtering)
  useEffect(() => {
    if (currentPage > 1) {
      setCurrentPage(1)
    }
    loadInventoryData(1)
  }, [filters, itemsPerPage])

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
        params.append('categoria', selectedCategories[0]) // API supports single filter for now
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
      // This is a temporary solution - ideally we'd have separate endpoints for this
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
      
      // Apply initial filters (show all data)
      applyFilters(data, filters)
      
    } catch (error) {
      console.error('Error loading inventory data:', error)
      showMessage(
        error instanceof Error ? error.message : 'Error al cargar datos',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = (data: Product[] = allData, currentFilters: Filters = filters) => {
    let filtered = data

    // No warehouse filtering needed - data is already separated by business
    // EGDC tab = real database data, Supplier tabs = pre-filtered dummy data

    // Apply search filtering first
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(item => {
        // Search across multiple fields: categoria, marca, modelo, color, talla, sku, ean
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

  const handleFilterChange = (filterType: keyof Filters, value: string, checked: boolean) => {
    const newFilters = { ...filters }
    
    if (filterType === 'categories') {
      if (checked) {
        newFilters.categories.add(value)
      } else {
        newFilters.categories.delete(value)
      }
      // Reset downstream filters
      newFilters.brands.clear()
      newFilters.models.clear()
    } else if (filterType === 'brands') {
      if (checked) {
        newFilters.brands.add(value)
      } else {
        newFilters.brands.delete(value)
      }
      // Reset downstream filter
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

  // Warehouse filtering functions
  const calculateProductCounts = () => {
    if (useDummyData) {
      // For dummy data, get counts from each business dataset
      return {
        egdc: getWarehouseData('egdc').length,
        fami: getWarehouseData('fami').length,
        osiel: getWarehouseData('osiel').length,
        molly: getWarehouseData('molly').length
      }
    } else {
      // For real EGDC data, only show EGDC count (others will use dummy data)
      return {
        egdc: allData.length, // All real data belongs to EGDC
        fami: getWarehouseData('fami').length,
        osiel: getWarehouseData('osiel').length,
        molly: getWarehouseData('molly').length
      }
    }
  }

  const handleWarehouseChange = (warehouse: WarehouseFilter) => {
    setActiveWarehouse(warehouse)
    
    // EGDC is our own business with real database, others are suppliers with dummy data
    if (warehouse === 'egdc') {
      setUseDummyData(false)
      // Reload real EGDC data from database
      loadInventoryData()
    } else {
      setUseDummyData(true)
      // Load dummy supplier data for the selected supplier business
      const warehouseData = getWarehouseData(warehouse)
      setAllData(warehouseData)
      
      // Extract unique values for filters from supplier data
      const categories = new Set(warehouseData.map(item => item.categoria).filter(Boolean) as string[])
      const brands = new Set(warehouseData.map(item => item.marca).filter(Boolean) as string[])
      const models = new Set(warehouseData.map(item => item.modelo).filter(Boolean) as string[])
      const colors = new Set(warehouseData.map(item => item.color).filter(Boolean) as string[])
      const sizes = new Set(warehouseData.map(item => item.talla).filter(Boolean) as string[])
      
      setUniqueValues({ categories, brands, models, colors, sizes })
      
      // Apply filters to the supplier data
      applyFilters(warehouseData, filters)
    }
  }

  // Handle buying products from suppliers
  const handleBuyProduct = async (product: Product, quantity: number) => {
    try {
      // Create a purchase order (dummy implementation for now)
      showToast(`Orden de compra creada: ${quantity}x ${product.modelo} de ${activeWarehouse.toUpperCase()}`, 'success', 4000)
      
      // In the future, this will:
      // 1. Send purchase order to supplier API
      // 2. Deduct quantity from supplier inventory
      // 3. Add product to EGDC inventory (or create if doesn't exist)
      
      console.log('Purchase Order Created:', {
        supplier: activeWarehouse,
        product: product,
        quantity: quantity,
        total_cost: (product.precio_shopify || 0) * quantity, // Using shopify price as EGDC wholesale price
        order_date: new Date().toISOString()
      })
      
    } catch (error) {
      console.error('Error creating purchase order:', error)
      showToast('Error al crear orden de compra', 'error')
    }
  }

  const handleCellEdit = (index: number, field: keyof Product, value: string | number | boolean | null) => {
    const newEditedView = [...editedView]
    newEditedView[index] = { ...newEditedView[index], [field]: value }
    setEditedView(newEditedView)
  }

  const saveChanges = async () => {
    try {
      setSaving(true)
      clearMessage()
      
      // Separate new products, updates, and deletions
      const newProducts: Array<Omit<Product, 'id' | 'created_at' | 'updated_at'>> = []
      const changes: Array<{
        id: number
        categoria: string | null
        marca: string | null
        modelo: string | null
        color: string | null
        talla: string | null
        sku: string | null
        ean: string | null
        costo: number | null
        google_drive: string | null
        shein_modifier: number | null
        shopify_modifier: number | null
        meli_modifier: number | null
        inv_egdc: number | null
        inv_fami: number | null
        shein: boolean | null
        meli: boolean | null
        shopify: boolean | null
        tiktok: boolean | null
        upseller: boolean | null
        go_trendier: boolean | null
      }> = []
      
      // Find deleted products (products that exist in original data but not in current edited view)
      const deletedProductIds: number[] = []
      allData.forEach(originalProduct => {
        if (originalProduct.id >= 0) { // Only check existing products
          const stillExists = editedView.some(editedProduct => editedProduct.id === originalProduct.id)
          if (!stillExists) {
            deletedProductIds.push(originalProduct.id)
          }
        }
      })
      
      editedView.forEach((editedItem, index) => {
        const originalItem = originalView[index]
        
        // Check if this is a new product (negative ID)
        if (editedItem.id < 0) {
          // Add to new products array
          newProducts.push({
            categoria: editedItem.categoria,
            marca: editedItem.marca,
            modelo: editedItem.modelo,
            color: editedItem.color,
            talla: editedItem.talla,
            sku: editedItem.sku,
            ean: editedItem.ean,
            // Physical dimensions and weight
            height_cm: editedItem.height_cm,
            length_cm: editedItem.length_cm,
            thickness_cm: editedItem.thickness_cm,
            weight_grams: editedItem.weight_grams,
            costo: editedItem.costo,
            google_drive: editedItem.google_drive,
            shein_modifier: editedItem.shein_modifier,
            shopify_modifier: editedItem.shopify_modifier,
            meli_modifier: editedItem.meli_modifier,
            precio_shein: editedItem.precio_shein,
            precio_shopify: editedItem.precio_shopify,
            precio_meli: editedItem.precio_meli,
            inv_egdc: editedItem.inv_egdc,
            inv_fami: editedItem.inv_fami,
            inv_osiel: editedItem.inv_osiel,
            inv_molly: editedItem.inv_molly,
            inventory_total: editedItem.inventory_total,
            shein: editedItem.shein,
            meli: editedItem.meli,
            shopify: editedItem.shopify,
            tiktok: editedItem.tiktok,
            upseller: editedItem.upseller,
            go_trendier: editedItem.go_trendier,
            fecha: editedItem.fecha
          })
        } else if (
          // Check for changes in existing products
          editedItem.categoria !== originalItem.categoria ||
          editedItem.marca !== originalItem.marca ||
          editedItem.modelo !== originalItem.modelo ||
          editedItem.color !== originalItem.color ||
          editedItem.talla !== originalItem.talla ||
          editedItem.sku !== originalItem.sku ||
          editedItem.ean !== originalItem.ean ||
          editedItem.costo !== originalItem.costo ||
          editedItem.google_drive !== originalItem.google_drive ||
          editedItem.shein_modifier !== originalItem.shein_modifier ||
          editedItem.shopify_modifier !== originalItem.shopify_modifier ||
          editedItem.meli_modifier !== originalItem.meli_modifier ||
          editedItem.inv_egdc !== originalItem.inv_egdc ||
          editedItem.inv_fami !== originalItem.inv_fami ||
          editedItem.inv_osiel !== originalItem.inv_osiel ||
          editedItem.inv_molly !== originalItem.inv_molly ||
          editedItem.shein !== originalItem.shein ||
          editedItem.meli !== originalItem.meli ||
          editedItem.shopify !== originalItem.shopify ||
          editedItem.tiktok !== originalItem.tiktok ||
          editedItem.upseller !== originalItem.upseller ||
          editedItem.go_trendier !== originalItem.go_trendier
        ) {
          changes.push({
            id: editedItem.id,
            categoria: editedItem.categoria,
            marca: editedItem.marca,
            modelo: editedItem.modelo,
            color: editedItem.color,
            talla: editedItem.talla,
            sku: editedItem.sku,
            ean: editedItem.ean,
            costo: editedItem.costo,
            google_drive: editedItem.google_drive,
            shein_modifier: editedItem.shein_modifier,
            shopify_modifier: editedItem.shopify_modifier,
            meli_modifier: editedItem.meli_modifier,
            inv_egdc: editedItem.inv_egdc,
            inv_fami: editedItem.inv_fami,
            inv_osiel: editedItem.inv_osiel,
            inv_molly: editedItem.inv_molly,
            shein: editedItem.shein,
            meli: editedItem.meli,
            shopify: editedItem.shopify,
            tiktok: editedItem.tiktok,
            upseller: editedItem.upseller,
            go_trendier: editedItem.go_trendier
          } as any)
        }
      })
      
      if (changes.length === 0 && newProducts.length === 0 && deletedProductIds.length === 0) {
        showMessage('No se detectaron cambios para guardar.', 'info')
        return
      }
      
      showMessage('Guardando cambios...', 'info')
      
      // Handle new products first
      if (newProducts.length > 0) {
        const createResponse = await fetch('/api/inventory/bulk-import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ products: newProducts })
        })
        
        if (!createResponse.ok) {
          const createResult = await createResponse.json()
          throw new Error(createResult.error || 'Error al crear nuevos productos')
        }
      }
      
      // Handle updates
      if (changes.length > 0) {
        const updateResponse = await fetch('/api/inventory/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ changes })
        })
        
        if (!updateResponse.ok) {
          throw new Error('Error al guardar cambios')
        }
        
        const updateResult = await updateResponse.json()
        
        if (!updateResult.success) {
          throw new Error(updateResult.error || 'Error al guardar')
        }
      }
      
      // Handle deletions
      if (deletedProductIds.length > 0) {
        const deleteResponse = await fetch('/api/inventory/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ids: deletedProductIds })
        })
        
        if (!deleteResponse.ok) {
          throw new Error('Error al eliminar productos')
        }
        
        const deleteResult = await deleteResponse.json()
        
        if (!deleteResult.success) {
          throw new Error(deleteResult.error || 'Error al eliminar productos')
        }
      }
      
      // Success message
      let message = '¡Cambios guardados exitosamente!'
      const operations = []
      if (newProducts.length > 0) operations.push(`${newProducts.length} creados`)
      if (changes.length > 0) operations.push(`${changes.length} actualizados`)
      if (deletedProductIds.length > 0) operations.push(`${deletedProductIds.length} eliminados`)
      
      if (operations.length > 0) {
        message = `¡${operations.join(', ')} exitosamente!`
      }
      
      showMessage(message, 'success')
      
      // Reload data to get fresh data from database
      showMessage('Actualizando datos...', 'info')
      await loadInventoryData()
      
    } catch (error) {
      console.error('Error saving changes:', error)
      showMessage(
        error instanceof Error ? error.message : 'Error al guardar cambios',
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  const cancelChanges = () => {
    setEditedView([...originalView])
    showMessage('Cambios cancelados.', 'info')
  }

  // Auto-save function for individual cell changes
  const handleAutoSave = async (productId: number, field: keyof Product, value: string | number | boolean | null) => {
    try {
      console.log('🔄 Auto-saving:', { productId, field, value })
      setSaving(true)
      
      // Prepare the change for the API
      const change = {
        id: productId,
        [field]: value
      }

      console.log('📤 Sending to API:', change)

      // Send the single field update to the API
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
      console.log('✅ API Response:', result)
      
      if (!result.success) {
        throw new Error(result.error || 'Error al guardar')
      }

      // Show success feedback (subtle)
      showToast(`${field} actualizado`, 'success', 2000)
      
      // Update the original view to reflect the saved change
      setOriginalView(prev => prev.map(product => 
        product.id === productId ? { ...product, [field]: value } : product
      ))
      
    } catch (error) {
      console.error('❌ Error auto-saving:', error)
      showToast(
        error instanceof Error ? error.message : 'Error al guardar automáticamente',
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  // Note: showMessage is now replaced by showToast from useToast hook
  // Usage: showToast(text, type, duration?)
  const showMessage = (text: string, type: 'success' | 'error' | 'info', duration?: number) => {
    return showToast(text, type, duration)
  }

  const clearMessage = () => {
    // Toast messages auto-dismiss, no manual clearing needed
  }

  // Row management functions
  const createEmptyProduct = (): Product => {
    const tempId = -Date.now() // Use negative ID for new products
    return {
      id: tempId,
      categoria: null,
      marca: null,
      modelo: null,
      color: null,
      talla: null,
      sku: null,
      ean: null,
      // Physical dimensions and weight
      height_cm: null,
      length_cm: null,
      thickness_cm: null,
      weight_grams: null,
      costo: null,
      google_drive: null,
      shein_modifier: 1.2,
      shopify_modifier: 2,
      meli_modifier: 2.5,
      precio_shein: null,
      precio_shopify: null,
      precio_meli: null,
      inv_egdc: 0,
      inv_fami: 0,
      inv_osiel: 0,
      inv_molly: 0,
      inventory_total: 0,
      shein: false,
      meli: false,
      shopify: false,
      tiktok: false,
      upseller: false,
      go_trendier: false,
      fecha: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  const handleAddRow = (afterIndex: number) => {
    const newProduct = createEmptyProduct()
    const newEditedView = [...editedView]
    newEditedView.splice(afterIndex + 1, 0, newProduct)
    
    // Also update originalView to maintain consistency
    const newOriginalView = [...originalView]
    newOriginalView.splice(afterIndex + 1, 0, newProduct)
    
    setEditedView(newEditedView)
    setOriginalView(newOriginalView)
    showToast('Nueva línea agregada', 'info')
  }

  const handleRemoveRow = async (index: number) => {
    const productToRemove = editedView[index]

    // For new products (negative ID), just remove from the view
    if (productToRemove.id < 0) {
      const newEditedView = editedView.filter((_, i) => i !== index)
      const newOriginalView = originalView.filter((_, i) => i !== index)
      
      setEditedView(newEditedView)
      setOriginalView(newOriginalView)
      showToast('Fila eliminada', 'info')
      return
    }

    // For existing products, delete immediately from database
    try {
      setSaving(true)
      setLoadingText('Eliminando producto...')

      console.log('🗑️ Deleting product:', productToRemove.id, productToRemove.marca, productToRemove.modelo)

      const response = await fetch('/api/inventory/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: [productToRemove.id] })
      })

      console.log('📡 Delete response status:', response.status, response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Delete response error:', errorText)
        throw new Error(`Error al eliminar producto: ${response.status}`)
      }

      const result = await response.json()
      console.log('📊 Delete result:', result)

      if (!result.success) {
        console.error('❌ Delete API returned error:', result.error)
        throw new Error(result.error || 'Error al eliminar producto')
      }

      console.log('✅ Product deleted successfully, reloading data...')
      
      // Reload data to get fresh inventory
      try {
        await loadInventoryData()
        showToast('Producto eliminado exitosamente', 'success')
      } catch (reloadError) {
        console.error('⚠️ Error reloading data after delete, but delete was successful:', reloadError)
        // Even if reload fails, the delete was successful
        showToast('Producto eliminado exitosamente', 'success')
      }

    } catch (error) {
      console.error('❌ Error in handleRemoveRow:', error)
      showToast(
        error instanceof Error ? error.message : 'Error al eliminar producto',
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  // Search functionality
  const handleSearchResults = (results: Product[]) => {
    setOriginalView(results)
    setEditedView(results)
    setIsSearchActive(true)
  }

  const handleClearSearch = () => {
    applyFilters() // Reset to filtered view
    setIsSearchActive(false)
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
    loadInventoryData(page, mobileSearchTerm)
  }

  const handleItemsPerPageChange = (limit: number) => {
    setItemsPerPage(limit)
    setCurrentPage(1) // Reset to first page when changing page size
    loadInventoryData(1, mobileSearchTerm)
  }

  // Bulk update handler
  const handleBulkUpdate = async (updates: Partial<Product>) => {
    try {
      const selectedProductsData = getSelectedProducts()
      
      console.log('Starting bulk update for products:', selectedProducts.size)
      console.log('Updates to apply:', updates)
      
      const requestBody = {
        productIds: Array.from(selectedProducts),
        updates
      }
      
      console.log('Bulk update request body:', requestBody)
      
      const response = await fetch('/api/inventory/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      console.log('Bulk update response status:', response.status, response.statusText)

      if (!response.ok) {
        let errorMessage = 'Error al actualizar productos'
        try {
          const errorResult = await response.json()
          errorMessage = errorResult.error || errorMessage
          console.error('Bulk update API error:', errorResult)
        } catch (e) {
          console.error('Could not parse error response:', e)
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('Bulk update result:', result)
      
      if (!result.success) {
        throw new Error(result.error || 'Error al actualizar productos')
      }

      showMessage(`¡${selectedProducts.size} productos actualizados exitosamente!`, 'success')
      setSelectedProducts(new Set())
      await loadInventoryData()
    } catch (error) {
      console.error('Error in bulk update:', error)
      showMessage(
        error instanceof Error ? error.message : 'Error al actualizar productos',
        'error'
      )
    }
  }

  const handleBulkDelete = () => {
    if (selectedProducts.size === 0) return
    setShowBulkDeleteModal(true)
  }

  const handleBulkDeleteConfirm = async () => {
    try {
      setSaving(true)
      setLoadingText(`Eliminando ${selectedProducts.size} productos...`)

      const response = await fetch('/api/inventory/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: Array.from(selectedProducts) })
      })

      if (!response.ok) {
        throw new Error('Error al eliminar productos')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error al eliminar productos')
      }

      showToast(`${selectedProducts.size} producto${selectedProducts.size > 1 ? 's' : ''} eliminado${selectedProducts.size > 1 ? 's' : ''}`, 'success')
      
      // Clear selection and reload data
      setSelectedProducts(new Set())
      await loadInventoryData()

    } catch (error) {
      console.error('Bulk delete error:', error)
      showToast(
        error instanceof Error ? error.message : 'Error al eliminar productos',
        'error'
      )
    } finally {
      setSaving(false)
      setShowBulkDeleteModal(false)
    }
  }

  // Export functionality
  const handleExport = async (format: 'csv' | 'xlsx' = 'csv') => {
    try {
      const productsToExport = selectedProducts.size > 0 ? getSelectedProducts() : editedView
      
      console.log('Starting export for products:', productsToExport.length, 'Format:', format)
      
      const requestBody = {
        products: productsToExport.map(p => p.id),
        format
      }
      
      console.log('Export request body:', requestBody)
      
      const response = await fetch('/api/inventory/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      console.log('Export response status:', response.status, response.statusText)

      if (!response.ok) {
        let errorMessage = 'Error al exportar datos'
        try {
          const errorResult = await response.json()
          errorMessage = errorResult.error || errorMessage
          console.error('Export API error:', errorResult)
        } catch (e) {
          console.error('Could not parse error response:', e)
        }
        throw new Error(errorMessage)
      }

      const blob = await response.blob()
      console.log('Export blob size:', blob.size)
      
      if (blob.size === 0) {
        throw new Error('El archivo exportado está vacío')
      }
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inventario-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      showMessage(`${productsToExport.length} productos exportados exitosamente`, 'success')
    } catch (error) {
      console.error('Error exporting data:', error)
      showMessage(
        error instanceof Error ? error.message : 'Error al exportar datos',
        'error'
      )
    }
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

  // Apply "Basico" preset on page load
  useEffect(() => {
    handlePresetSelect('basic')
  }, []) // Only run once on mount

  // Mobile handlers
  const handleMobileSearch = (term: string) => {
    setMobileSearchTerm(term)
    if (term.trim()) {
      const filtered = allData.filter(item => 
        item.marca?.toLowerCase().includes(term.toLowerCase()) ||
        item.modelo?.toLowerCase().includes(term.toLowerCase()) ||
        item.categoria?.toLowerCase().includes(term.toLowerCase()) ||
        item.sku?.toLowerCase().includes(term.toLowerCase()) ||
        item.color?.toLowerCase().includes(term.toLowerCase()) ||
        item.talla?.toLowerCase().includes(term.toLowerCase())
      )
      setOriginalView(filtered)
      setEditedView(filtered)
    } else {
      applyFilters()
    }
  }

  const handleMobileEdit = (product: Product) => {
    setEditingProduct(product)
    setShowMobileEditor(true)
  }

  const handleMobileDelete = async (product: Product) => {
    console.log('🚨 MOBILE DELETE START - Product:', product.marca, product.modelo, 'ID:', product.id)
    
    try {
      // Check if this is a new/temporary product (negative ID)
      if (product.id < 0) {
        console.log('🗑️ Deleting temporary product locally (not in database)')
        // Remove from local state only - it's not in the database yet
        setEditedView(prev => prev.filter(p => p.id !== product.id))
        showToast('Línea eliminada', 'success')
        return
      }

      // For existing products, delete from database
      console.log('🔄 Sending delete request to database...')
      const response = await fetch('/api/inventory/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ids: [product.id]
        })
      })
      
      console.log('📡 Delete response status:', response.status, response.ok)
      
      if (!response.ok) {
        throw new Error('Error al eliminar producto')
      }
      
      const result = await response.json()
      console.log('📊 Delete result:', result)
      
      if (!result.success) {
        throw new Error(result.error || 'Error al eliminar producto')
      }
      
      await loadInventoryData()
      showToast('Producto eliminado exitosamente', 'success')
    } catch (error) {
      console.error('❌ Mobile delete error:', error)
      showToast('Error al eliminar producto', 'error')
    }
  }

  // Mobile FAB menu state
  const [showMobileFabMenu, setShowMobileFabMenu] = useState(false)
  const [showMobileImportExport, setShowMobileImportExport] = useState(false)

  const handleMobileAdd = () => {
    // Use the same desktop modal for consistency
    setShowNewProductModal(true)
  }

  const handleNuevaLinea = () => {
    // Add a new empty product row at the top
    const newProduct: Product = {
      id: -Date.now(), // Temporary negative ID for new products
      categoria: '',
      marca: '',
      modelo: '',
      color: '',
      talla: '',
      sku: '',
      ean: '',
      // Physical dimensions and weight
      height_cm: null,
      length_cm: null,
      thickness_cm: null,
      weight_grams: null,
      costo: 0,
      shein_modifier: 1.5,
      shopify_modifier: 1.8,
      meli_modifier: 2.0,
      google_drive: '',
      shein: false,
      meli: false,
      shopify: false,
      tiktok: false,
      upseller: false,
      go_trendier: false,
      inv_egdc: 0,
      inv_fami: 0,
      inv_osiel: 0,
      inv_molly: 0,
      // Database will set these automatically
      precio_shein: null,
      precio_shopify: null,
      precio_meli: null,
      inventory_total: null,
      fecha: null,
      created_at: null,
      updated_at: null
    }

    // Add the new product to the top of the edited view
    setEditedView(prev => [newProduct, ...prev])
    
    setShowMobileFabMenu(false)
  }

  const handleMobileEditorSave = async (product: Product) => {
    const isNewProduct = product.id < 0 || !product.id // Negative IDs or undefined indicate new products
    
    console.log('🚨 MOBILE EDITOR SAVE START - isNewProduct:', isNewProduct, 'product ID:', product.id, 'product:', product)
    
    try {
      if (isNewProduct) {
        // Create new product - exclude calculated fields and ID
        const { 
          id, 
          precio_shein, 
          precio_shopify, 
          precio_meli, 
          inventory_total,
          fecha,
          created_at,
          updated_at,
          ...productData 
        } = product // Remove calculated fields and ID
        console.log('🔄 Creating new product with data:', productData)
        
        const response = await fetch('/api/inventory', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            product: productData
          })
        })
        
        console.log('📡 Create response status:', response.status, response.ok)
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error('❌ Create error response:', errorData)
          throw new Error(errorData.error || 'Error al crear producto')
        }
        
        const result = await response.json()
        console.log('✅ Create result:', result)
        
        if (!result.success) {
          throw new Error(result.error || 'Error al crear producto')
        }
        
        showMessage('Producto creado exitosamente', 'success')
      } else {
        // Update existing product
        console.log('🔄 Updating existing product with data:', product)
        
        // Filter out calculated fields and timestamps that the API doesn't accept
        const updateData = {
          id: product.id,
          categoria: product.categoria || null,
          marca: product.marca || null,
          modelo: product.modelo || null,
          color: product.color || null,
          talla: product.talla || null,
          sku: product.sku || null,
          ean: product.ean || null,
          google_drive: product.google_drive || null,
          costo: typeof product.costo === 'number' ? product.costo : (parseFloat(product.costo as any) || null),
          shein_modifier: typeof product.shein_modifier === 'number' ? product.shein_modifier : (parseFloat(product.shein_modifier as any) || 1.0),
          shopify_modifier: typeof product.shopify_modifier === 'number' ? product.shopify_modifier : (parseFloat(product.shopify_modifier as any) || 1.0),
          meli_modifier: typeof product.meli_modifier === 'number' ? product.meli_modifier : (parseFloat(product.meli_modifier as any) || 1.0),
          inv_egdc: typeof product.inv_egdc === 'number' ? product.inv_egdc : (parseInt(product.inv_egdc as any) || 0),
          inv_fami: typeof product.inv_fami === 'number' ? product.inv_fami : (parseInt(product.inv_fami as any) || 0),
          inv_osiel: typeof product.inv_osiel === 'number' ? product.inv_osiel : (parseInt(product.inv_osiel as any) || 0),
          inv_molly: typeof product.inv_molly === 'number' ? product.inv_molly : (parseInt(product.inv_molly as any) || 0),
          shein: Boolean(product.shein),
          meli: Boolean(product.meli),
          shopify: Boolean(product.shopify),
          tiktok: Boolean(product.tiktok),
          upseller: Boolean(product.upseller),
          go_trendier: Boolean(product.go_trendier)
          // Excluded: precio_*, inventory_total, created_at, updated_at, fecha
        }
        
        // Validate required fields
        if (!updateData.id || updateData.id <= 0) {
          throw new Error('Invalid product ID')
        }
        
        console.log('🔍 Data types validation:')
        console.log('- ID:', typeof updateData.id, updateData.id)
        console.log('- Cost:', typeof updateData.costo, updateData.costo)
        console.log('- Modifiers:', typeof updateData.shein_modifier, typeof updateData.shopify_modifier, typeof updateData.meli_modifier)
        
        console.log('📤 Sending filtered update request body:', JSON.stringify({ changes: [updateData] }, null, 2))
        
        const response = await fetch('/api/inventory/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            changes: [updateData]
          })
        })
        
        console.log('📡 Update response status:', response.status, response.ok)
        
        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json()
            console.error('❌ Update error response:', errorData)
            console.error('❌ Full error details:', JSON.stringify(errorData, null, 2))
          } catch (parseError) {
            console.error('❌ Could not parse error response:', parseError)
            console.error('❌ Raw response status:', response.status, response.statusText)
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
          }
          throw new Error(errorData.error || 'Error al actualizar producto')
        }
        
        const result = await response.json()
        console.log('✅ Update result:', result)
        
        if (!result.success) {
          throw new Error(result.error || 'Error al actualizar producto')
        }
        
        showMessage('Producto actualizado exitosamente', 'success')
      }
      
      // Reload data and sync all state properly
      await loadInventoryData()
      
      // Close editor after successful save
      setShowMobileEditor(false)
      setEditingProduct(null)
    } catch (error) {
      console.error('❌ Mobile editor save error:', error)
      showMessage(
        error instanceof Error ? error.message : (isNewProduct ? 'Error al crear producto' : 'Error al actualizar producto'), 
        'error'
      )
    }
  }

  const getFilteredProducts = (): Product[] => {
    let filtered = editedView || []
    
    if (mobileSearchTerm.trim()) {
      filtered = filtered.filter(item => 
        item.marca?.toLowerCase().includes(mobileSearchTerm.toLowerCase()) ||
        item.modelo?.toLowerCase().includes(mobileSearchTerm.toLowerCase()) ||
        item.categoria?.toLowerCase().includes(mobileSearchTerm.toLowerCase()) ||
        item.sku?.toLowerCase().includes(mobileSearchTerm.toLowerCase()) ||
        item.color?.toLowerCase().includes(mobileSearchTerm.toLowerCase()) ||
        item.talla?.toLowerCase().includes(mobileSearchTerm.toLowerCase())
      )
    }

    // Apply filters
    if (filters.categories.size > 0) {
      filtered = filtered.filter(product => 
        product.categoria && filters.categories.has(product.categoria)
      )
    }

    if (filters.brands.size > 0) {
      filtered = filtered.filter(product => 
        product.marca && filters.brands.has(product.marca)
      )
    }

    if (filters.models.size > 0) {
      filtered = filtered.filter(product => 
        product.modelo && filters.models.has(product.modelo)
      )
    }

    if (filters.colors.size > 0) {
      filtered = filtered.filter(product => 
        product.color && filters.colors.has(product.color)
      )
    }

    if (filters.sizes.size > 0) {
      filtered = filtered.filter(product => 
        product.talla && filters.sizes.has(product.talla)
      )
    }

    // Apply price range filter
    filtered = filtered.filter(product => {
      const price = product.precio_shopify || product.costo || 0
      return price >= filters.priceRange.min && price <= filters.priceRange.max
    })

    // Return filtered products
    return filtered
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
          // Calculate average price from selected fields
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

  // Check if there are any changes to cancel
  const hasChanges = () => {
    if (editedView.length !== originalView.length) return true
    
    return editedView.some((editedItem, index) => {
      const originalItem = originalView[index]
      if (!originalItem) return true
      
      return (
        editedItem.categoria !== originalItem.categoria ||
        editedItem.marca !== originalItem.marca ||
        editedItem.modelo !== originalItem.modelo ||
        editedItem.color !== originalItem.color ||
        editedItem.talla !== originalItem.talla ||
        editedItem.sku !== originalItem.sku ||
        editedItem.ean !== originalItem.ean ||
        editedItem.costo !== originalItem.costo ||
        editedItem.google_drive !== originalItem.google_drive ||
        editedItem.shein_modifier !== originalItem.shein_modifier ||
        editedItem.shopify_modifier !== originalItem.shopify_modifier ||
        editedItem.meli_modifier !== originalItem.meli_modifier ||
        editedItem.inv_egdc !== originalItem.inv_egdc ||
        editedItem.inv_fami !== originalItem.inv_fami ||
        editedItem.shein !== originalItem.shein ||
        editedItem.meli !== originalItem.meli ||
        editedItem.shopify !== originalItem.shopify ||
        editedItem.tiktok !== originalItem.tiktok ||
        editedItem.upseller !== originalItem.upseller ||
        editedItem.go_trendier !== originalItem.go_trendier
      )
    })
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault()
        if (!saving && hasChanges()) {
          saveChanges()
        }
      }
      
      // Escape to cancel - only if there are actual changes
      if (event.key === 'Escape') {
        event.preventDefault()
        if (!saving && hasChanges()) {
          cancelChanges()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [saving, editedView, originalView])

  // Render content based on active tab and sub-page
  const renderTabContent = () => {
    switch (activeTab) {
      case 'productos':
        if (activeSubPage === 'catalogo') {
          return (
            <>
              {/* Warehouse Tabs - positioned above search bar */}
              <WarehouseTabs
                activeWarehouse={activeWarehouse}
                onWarehouseChange={handleWarehouseChange}
                productCounts={calculateProductCounts()}
                isDemoMode={useDummyData}
              />

              {/* Unified Search Bar and Actions */}
              <div className="px-6 py-3 bg-white border-b border-gray-200">
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
                      onClick={() => setShowNewProductModal(true)}
                      className="px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
                    >
                      <span>➕</span>
                      Nuevo Producto
                    </button>
                    <button
                      onClick={() => setShowImportExportModal(true)}
                      className="px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
                    >
                      <span>🔄</span>
                      Importar / Exportar
                    </button>
                    {selectedProducts.size > 0 && (
                      <>
                        <button
                          onClick={() => setShowBulkUpdateModal(true)}
                          className="px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
                        >
                          <span>📝</span>
                          Editar {selectedProducts.size}
                        </button>
                        <button
                          onClick={handleBulkDelete}
                          className="px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
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
              
              {/* Table Section - Adjusted to leave space for pagination */}
              <div className="flex-1 px-6 pb-1 overflow-hidden min-h-0">
                <ErrorBoundary
                  level="section"
                  onError={(error, errorInfo) => {
                    console.error('Inventory table error:', error, errorInfo)
                  }}
                  resetKeys={[editedView.length]}
                  fallback={
                    <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8 text-center h-full flex flex-col justify-center">
                      <div className="text-red-600 text-6xl mb-4">⚠️</div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Error en la tabla</h3>
                      <p className="text-gray-600 mb-4">
                        Hubo un problema mostrando la tabla de inventario. 
                      </p>
                      <button
                        onClick={() => window.location.reload()}
                        className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors inline-block mx-auto"
                      >
                        Recargar página
                      </button>
                    </div>
                  }
                >
                  <InventoryTable
                    editedView={editedView}
                    onCellEdit={handleCellEdit}
                    onSave={saveChanges}
                    onCancel={cancelChanges}
                    saving={saving}
                    columnConfig={columnConfig}
                    onAddRow={handleAddRow}
                    onRemoveRow={handleRemoveRow}
                    selectedProducts={selectedProducts}
                    onProductSelect={handleProductSelect}
                    onSelectAll={handleSelectAll}
                    autoSave={true}
                    onAutoSave={handleAutoSave}
                    isSupplierView={useDummyData}
                    supplierName={activeWarehouse === 'fami' ? 'FAMI' : 
                                 activeWarehouse === 'osiel' ? 'Osiel' : 
                                 activeWarehouse === 'molly' ? 'Molly' : 'EGDC'}
                    onBuyProduct={handleBuyProduct}
                  />
                </ErrorBoundary>
              </div>
              
              {/* Pagination Controls - Fixed at bottom */}
              <div className="flex-shrink-0 px-6 py-4 bg-white border-t shadow-sm">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={handleItemsPerPageChange}
                />
              </div>
            </>
          )
        } else {
          return (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="text-6xl mb-4">📦</div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Productos - {activeSubPage}</h2>
                <p className="text-gray-600">Funcionalidad en desarrollo</p>
              </div>
            </div>
          )
        }
      
      case 'inventario':
        return (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="text-6xl mb-4">📊</div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Inventario</h2>
              <p className="text-gray-600">Gestión de stock y movimientos de inventario</p>
              <p className="text-sm text-gray-500 mt-4">Próximamente disponible</p>
            </div>
          </div>
        )
      
      case 'bodegas':
        return (
          <div className="flex-1 p-6 overflow-y-auto">
            <WarehouseSettings 
              warehouseSlug={activeSubPage}
              onSave={(data) => {
                console.log('Warehouse settings saved:', data)
                showToast('Configuración de almacén guardada', 'success')
              }}
            />
          </div>
        )
      
      case 'tiendas':
        return (
          <div className="flex-1 p-6 overflow-y-auto">
            <MarketplaceSettings 
              marketplaceSlug={activeSubPage}
              onSave={(data) => {
                console.log('Marketplace settings saved:', data)
                showToast('Configuración de marketplace guardada', 'success')
              }}
            />
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <>
      {loading && <LoadingScreen text={loadingText} />}
      
      <div className={`min-h-screen bg-gray-50 ${loading ? 'hidden' : ''}`} role="main" aria-label="EGDC Inventory Management System">
        {/* Header with Tab Navigation */}
        <header className="bg-white shadow-sm" role="banner">
          <TabNavigation currentTab="inventario" />
          
          {/* Search Results Info */}
          {isSearchActive && (
            <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-800">
                  🔍 Mostrando resultados de búsqueda ({originalView.length} productos)
                </span>
                <button
                  onClick={handleClearSearch}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  ✕ Limpiar búsqueda
                </button>
              </div>
            </div>
          )}
        </header>

        {/* Main Content - Desktop Layout with Sidebar */}
        {!isMobile ? (
          <div className="flex h-[calc(100vh-60px)]">
            {/* Expandable Sidebar */}
            <ExpandableSidebar 
              activeTab={activeTab}
              onTabChange={setActiveTab}
              activeSubPage={activeSubPage}
              onSubPageChange={setActiveSubPage}
              className="flex-shrink-0"
            />
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {renderTabContent()}
            </div>
          </div>
        ) : (
          /* Mobile Layout - Optimized */
          <div className="h-[calc(100vh-120px)] flex flex-col">
            {/* Message area removed - now using toast notifications */}

            {/* Mobile Warehouse Tabs */}
            <WarehouseTabs
              activeWarehouse={activeWarehouse}
              onWarehouseChange={handleWarehouseChange}
              productCounts={calculateProductCounts()}
              isDemoMode={useDummyData}
            />

            {/* Mobile Search Bar */}
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={mobileSearchTerm}
                  onChange={(e) => handleMobileSearch(e.target.value)}
                  className="w-full pl-10 pr-20 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 gap-1">
                  <button
                    onClick={() => setShowMobileSort(!showMobileSort)}
                    className="flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    title="Ordenar"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                    className="flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    title="Filtros"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Product Card View */}
            <div 
              className="flex-1 overflow-y-auto"
              style={{ 
                overscrollBehaviorX: 'contain',
                overscrollBehaviorY: 'auto'
              }}
            >
              <MobileProductCardList
                products={getFilteredProducts()}
                onEdit={handleMobileEdit}
                onSelect={handleProductSelect}
                onDelete={handleMobileDelete}
                selectedProducts={selectedProducts}
                loading={loading}
              />
              
              {/* Mobile Pagination Controls */}
              <div className="mt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={handleItemsPerPageChange}
                />
              </div>
            </div>

            {/* Floating Action Button Menu */}
            <div className="fixed bottom-6 right-6 z-40">
              {/* Backdrop */}
              {showMobileFabMenu && (
                <div 
                  className="fixed inset-0 bg-black bg-opacity-20 z-[-1]"
                  onClick={() => setShowMobileFabMenu(false)}
                />
              )}
              
              {/* Menu Options */}
              {showMobileFabMenu && (
                <div className="absolute bottom-16 right-0 flex flex-col gap-3 mb-2">
                  {/* Nueva Linea */}
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={handleNuevaLinea}
                      className="bg-black bg-opacity-70 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-opacity-80 transition-all duration-200 active:scale-95 whitespace-nowrap"
                    >
                      Línea
                    </button>
                    <button
                      onClick={handleNuevaLinea}
                      className="w-12 h-12 bg-purple-500 hover:bg-purple-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 active:scale-95"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Nuevo Producto */}
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => {
                        handleMobileAdd()
                        setShowMobileFabMenu(false)
                      }}
                      className="bg-black bg-opacity-70 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-opacity-80 transition-all duration-200 active:scale-95 whitespace-nowrap"
                    >
                      Producto
                    </button>
                    <button
                      onClick={() => {
                        handleMobileAdd()
                        setShowMobileFabMenu(false)
                      }}
                      className="w-12 h-12 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 active:scale-95"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Import/Export */}
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowMobileImportExport(true)
                        setShowMobileFabMenu(false)
                      }}
                      className="bg-black bg-opacity-70 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-opacity-80 transition-all duration-200 active:scale-95 whitespace-nowrap"
                    >
                      Import / Export
                    </button>
                    <button
                      onClick={() => {
                        setShowMobileImportExport(true)
                        setShowMobileFabMenu(false)
                      }}
                      className="w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 active:scale-95"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              
              {/* Main FAB */}
              <button
                onClick={() => setShowMobileFabMenu(!showMobileFabMenu)}
                className={`w-14 h-14 ${showMobileFabMenu ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'} text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-200 active:scale-95`}
                title={showMobileFabMenu ? "Cerrar menú" : "Abrir menú"}
              >
                <svg className={`w-6 h-6 transition-transform duration-200 ${showMobileFabMenu ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Mobile Filters Modal */}
            {showMobileFilters && (
              <MobileFilters
                filters={filters}
                onFiltersChange={(newFilters) => setFilters(newFilters)}
                uniqueValues={uniqueValues}
                onClose={() => setShowMobileFilters(false)}
              />
            )}

            {/* Mobile Product Editor */}
            {showMobileEditor && (
              <MobileProductEditor
                product={editingProduct}
                onSave={handleMobileEditorSave}
                onClose={() => {
                  setShowMobileEditor(false)
                  setEditingProduct(null)
                }}
                isNew={!editingProduct || editingProduct.id < 0}
                availableCategories={Array.from(uniqueValues.categories).sort()}
              />
            )}

            {/* Mobile Sort Modal */}
            {showMobileSort && (
              <MobileSort
                sortConfig={sortConfig}
                onSortChange={setSortConfig}
                filters={filters}
                onFiltersChange={setFilters}
                onClose={() => setShowMobileSort(false)}
                priceRange={{
                  min: Math.min(...allData.map(p => p.precio_shopify || p.costo || 0)),
                  max: Math.max(...allData.map(p => p.precio_shopify || p.costo || 0))
                }}
              />
            )}
            
            {/* Mobile Import/Export Modal */}
            {showMobileImportExport && (
              <MobileImportExportModal
                isOpen={showMobileImportExport}
                onClose={() => setShowMobileImportExport(false)}
                onImport={() => setShowImportExportModal(true)}
                onExport={handleExport}
              />
            )}
          </div>
        )}
        
        {/* New Product Collection Wizard */}
        <ProductCollectionWizard
          isOpen={showNewProductModal}
          onClose={() => setShowNewProductModal(false)}
          onSuccess={() => {
            showMessage('¡Producto creado exitosamente!', 'success')
            // Note: We don't reload inventory data since this goes to n8n workflow
          }}
          allData={allData}
        />


        {/* Import/Export Modal */}
        <ImportExportModal
          isOpen={showImportExportModal}
          onClose={() => setShowImportExportModal(false)}
          onImportSuccess={(message) => {
            showMessage(message, message.includes('Error') ? 'error' : 'success')
            if (!message.includes('Error')) {
              loadInventoryData() // Reload data to show new products
            }
          }}
          onExport={handleExport}
          selectedProductsCount={selectedProducts.size}
        />

        {/* Bulk Update Modal */}
        <BulkUpdateModal
          isOpen={showBulkUpdateModal}
          selectedProducts={getSelectedProducts()}
          onClose={() => setShowBulkUpdateModal(false)}
          onUpdate={handleBulkUpdate}
        />

        <BulkDeleteConfirmModal
          isOpen={showBulkDeleteModal}
          products={getSelectedProducts()}
          onConfirm={handleBulkDeleteConfirm}
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
    </>
  )
}
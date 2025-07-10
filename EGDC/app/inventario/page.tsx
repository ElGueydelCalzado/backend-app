'use client'

import { useState, useEffect } from 'react'
import { Product } from '@/lib/supabase'
import FilterSection from '@/components/FilterSection'
import InventoryTable from '@/components/InventoryTable'
import LoadingScreen from '@/components/LoadingScreen'
import MessageArea from '@/components/MessageArea'
import ErrorBoundary from '@/components/ErrorBoundary'
import TabNavigation from '@/components/TabNavigation'
import Sidebar, { SidebarState } from '@/components/Sidebar'
import SidebarTabs from '@/components/SidebarTabs'
import SearchBar from '@/components/SearchBar'
import ProductCollectionWizard from '@/components/ProductCollectionWizard'
import BulkImportModal from '@/components/BulkImportModal'
import BulkUpdateModal from '@/components/BulkUpdateModal'
import { ColumnConfig } from '@/components/ColumnControls'
import MobileInventoryView from '@/components/MobileInventoryView'
import MobileProductCardList from '@/components/MobileProductCardList'
import MobileFilters from '@/components/MobileFilters'
import MobileProductEditor from '@/components/MobileProductEditor'
import BarcodeScannerButton from '@/components/BarcodeScannerButton'

interface Filters {
  categories: Set<string>
  brands: Set<string>
  models: Set<string>
  colors: Set<string>
  sizes: Set<string>
}

interface UniqueValues {
  categories: Set<string>
  brands: Set<string>
  models: Set<string>
  colors: Set<string>
  sizes: Set<string>
}

interface Message {
  text: string
  type: 'success' | 'error' | 'info'
}

// Column configuration for the inventory table (auto-generated from database schema)
const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'categoria', label: 'Categoría', visible: true, category: 'basic' },
  { key: 'marca', label: 'Marca', visible: true, category: 'basic' },
  { key: 'modelo', label: 'Modelo', visible: true, category: 'basic' },
  { key: 'color', label: 'Color', visible: true, category: 'basic' },
  { key: 'talla', label: 'Talla', visible: true, category: 'basic' },
  { key: 'sku', label: 'SKU', visible: true, category: 'basic' },
  { key: 'ean', label: 'EAN', visible: false, category: 'basic' },
  { key: 'costo', label: 'Costo', visible: true, category: 'pricing' },
  { key: 'google_drive', label: 'Google Drive', visible: false, category: 'basic' },
  { key: 'precio_shein', label: 'Precio SHEIN', visible: true, category: 'pricing' },
  { key: 'precio_egdc', label: 'Precio Shopify', visible: true, category: 'pricing' },
  { key: 'precio_meli', label: 'Precio MercadoLibre', visible: true, category: 'pricing' },
  { key: 'shein_modifier', label: 'Mod. SHEIN', visible: false, category: 'pricing' },
  { key: 'shopify_modifier', label: 'Mod. Shopify', visible: false, category: 'pricing' },
  { key: 'meli_modifier', label: 'Mod. MercadoLibre', visible: false, category: 'pricing' },
  { key: 'inv_egdc', label: 'EGDC', visible: true, category: 'inventory' },
  { key: 'inv_fami', label: 'FAMI', visible: true, category: 'inventory' },
  { key: 'inventory_total', label: 'Total', visible: true, category: 'inventory' },
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
  const [message, setMessage] = useState<Message | null>(null)
  
  // Sidebar and column state
  const [sidebarState, setSidebarState] = useState<SidebarState>('open')
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(DEFAULT_COLUMNS)
  const [isMobile, setIsMobile] = useState(false)
  const [isSearchActive, setIsSearchActive] = useState(false)
  const [showNewProductModal, setShowNewProductModal] = useState(false)
  const [showBulkImportModal, setShowBulkImportModal] = useState(false)
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set())
  const [showExportMenu, setShowExportMenu] = useState(false)
  
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
    sizes: new Set()
  })
  
  const [uniqueValues, setUniqueValues] = useState<UniqueValues>({
    categories: new Set(),
    brands: new Set(),
    models: new Set(),
    colors: new Set(),
    sizes: new Set()
  })

  // Load initial data
  useEffect(() => {
    loadInventoryData()
  }, [])
  
  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
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
  }, [filters, allData])

  const loadInventoryData = async () => {
    try {
      setLoading(true)
      setLoadingText('Cargando datos del inventario...')
      
      const response = await fetch('/api/inventory')
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al cargar datos del inventario')
      }
      
      const data: Product[] = result.data
      
      if (!data || data.length === 0) {
        throw new Error('No se encontraron datos de inventario')
      }

      setAllData(data)
      
      // Extract unique values for filters
      const categories = new Set(data.map(item => item.categoria).filter(Boolean) as string[])
      const brands = new Set(data.map(item => item.marca).filter(Boolean) as string[])
      const models = new Set(data.map(item => item.modelo).filter(Boolean) as string[])
      const colors = new Set(data.map(item => item.color).filter(Boolean) as string[])
      const sizes = new Set(data.map(item => item.talla).filter(Boolean) as string[])
      
      setUniqueValues({ categories, brands, models, colors, sizes })
      
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

    // Apply all filters
    filtered = filtered.filter(item => {
      const catMatch = currentFilters.categories.size === 0 || (item.categoria && currentFilters.categories.has(item.categoria))
      const brandMatch = currentFilters.brands.size === 0 || (item.marca && currentFilters.brands.has(item.marca))
      const modelMatch = currentFilters.models.size === 0 || (item.modelo && currentFilters.models.has(item.modelo))
      const colorMatch = currentFilters.colors.size === 0 || (item.color && currentFilters.colors.has(item.color))
      const sizeMatch = currentFilters.sizes.size === 0 || (item.talla && currentFilters.sizes.has(item.talla))
      return catMatch && brandMatch && modelMatch && colorMatch && sizeMatch
    })

    setOriginalView([...filtered])
    setEditedView([...filtered])
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
            costo: editedItem.costo,
            google_drive: editedItem.google_drive,
            shein_modifier: editedItem.shein_modifier,
            shopify_modifier: editedItem.shopify_modifier,
            meli_modifier: editedItem.meli_modifier,
            precio_shein: editedItem.precio_shein,
            precio_egdc: editedItem.precio_egdc,
            precio_meli: editedItem.precio_meli,
            inv_egdc: editedItem.inv_egdc,
            inv_fami: editedItem.inv_fami,
            inv_bodega_principal: editedItem.inv_bodega_principal,
            inv_tienda_centro: editedItem.inv_tienda_centro,
            inv_tienda_norte: editedItem.inv_tienda_norte,
            inv_tienda_sur: editedItem.inv_tienda_sur,
            inv_online: editedItem.inv_online,
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
            shein: editedItem.shein,
            meli: editedItem.meli,
            shopify: editedItem.shopify,
            tiktok: editedItem.tiktok,
            upseller: editedItem.upseller,
            go_trendier: editedItem.go_trendier
          })
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

  const showMessage = (text: string, type: 'success' | 'error' | 'info') => {
    setMessage({ text, type })
    if (type !== 'error') {
      setTimeout(() => setMessage(null), 5000)
    }
  }

  const clearMessage = () => {
    setMessage(null)
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
      costo: null,
      google_drive: null,
      shein_modifier: 1.2,
      shopify_modifier: 2,
      meli_modifier: 2.5,
      precio_shein: null,
      precio_egdc: null,
      precio_meli: null,
      inv_egdc: 0,
      inv_fami: 0,
      inv_bodega_principal: 0,
      inv_tienda_centro: 0,
      inv_tienda_norte: 0,
      inv_tienda_sur: 0,
      inv_online: 0,
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
    showMessage('Nueva fila agregada. No olvides guardar los cambios.', 'info')
  }

  const handleRemoveRow = (index: number) => {
    const productToRemove = editedView[index]

    const newEditedView = editedView.filter((_, i) => i !== index)
    const newOriginalView = originalView.filter((_, i) => i !== index)
    
    setEditedView(newEditedView)
    setOriginalView(newOriginalView)
    
    if (productToRemove.id >= 0) {
      showMessage('Producto marcado para eliminación. Guarda cambios para confirmar.', 'info')
    } else {
      showMessage('Fila eliminada.', 'info')
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
      financial: ['categoria', 'marca', 'modelo', 'costo', 'precio_shein', 'precio_egdc', 'precio_meli'],
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

  const handleMobileDelete = async (id: number) => {
    if (confirm('¿Está seguro de que desea eliminar este producto?')) {
      try {
        const response = await fetch(`/api/inventory/${id}`, {
          method: 'DELETE'
        })
        
        if (!response.ok) {
          throw new Error('Error al eliminar producto')
        }
        
        await loadInventoryData()
        showMessage('Producto eliminado exitosamente', 'success')
      } catch (error) {
        showMessage('Error al eliminar producto', 'error')
      }
    }
  }

  const handleMobileAdd = () => {
    setEditingProduct(null)
    setShowMobileEditor(true)
  }

  // Barcode scanner handlers
  const handleBarcodeProductFound = (product: Product) => {
    // Focus on the found product by filtering
    setMobileSearchTerm(`${product.marca} ${product.modelo}`)
    showMessage(
      `Producto encontrado: ${product.marca} ${product.modelo}`,
      'success'
    )
  }

  const handleBarcodeProductNotFound = (barcode: string) => {
    showMessage(
      `No se encontró producto con código: ${barcode}`,
      'error'
    )
  }

  const handleMobileEditorSave = async (product: Product) => {
    try {
      const response = await fetch('/api/inventory/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          products: [product]
        })
      })
      
      if (!response.ok) {
        throw new Error('Error al guardar producto')
      }
      
      await loadInventoryData()
      setShowMobileEditor(false)
      setEditingProduct(null)
      showMessage('Producto guardado exitosamente', 'success')
    } catch (error) {
      showMessage('Error al guardar producto', 'error')
    }
  }

  const getFilteredProducts = () => {
    let filtered = editedView
    
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
    
    return filtered
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

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showExportMenu) {
        setShowExportMenu(false)
      }
    }

    if (showExportMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showExportMenu])

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

  return (
    <>
      {loading && <LoadingScreen text={loadingText} />}
      
      <div className={`min-h-screen bg-gray-50 ${loading ? 'hidden' : ''}`} role="main" aria-label="EGDC Inventory Management System">
        {/* Header with Tab Navigation */}
        <header className="bg-white shadow-lg border-b border-gray-200" role="banner">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1"></div>
            </div>
            
            {/* Tab Navigation */}
            <TabNavigation currentTab="inventario" />
            
            {/* Search Results Info */}
            {isSearchActive && (
              <div className="mt-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
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
          </div>
        </header>

        {/* Main Content - Desktop Layout with Sidebar */}
        {!isMobile ? (
          <div className="flex h-[calc(100vh-120px)]">
            {/* Sidebar */}
            <Sidebar 
              state={sidebarState} 
              onStateChange={setSidebarState}
              className="flex-shrink-0"
            >
              <SidebarTabs
                filters={filters}
                uniqueValues={uniqueValues}
                allData={allData}
                onFilterChange={handleFilterChange}
                columnConfig={columnConfig}
                onColumnToggle={handleColumnToggle}
                onPresetSelect={handlePresetSelect}
                compact={false}
              />
            </Sidebar>
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Search Bar and Actions */}
              <div className="px-6 py-2 bg-white border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <SearchBar
                    allData={allData}
                    onSearchResults={handleSearchResults}
                    onClearSearch={handleClearSearch}
                    className="flex-1 max-w-lg"
                  />
                  
                  <BarcodeScannerButton
                    onProductFound={handleBarcodeProductFound}
                    onProductNotFound={handleBarcodeProductNotFound}
                    size="md"
                    variant="outline"
                  />
                  
                  <button
                    onClick={() => setShowNewProductModal(true)}
                    className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
                  >
                    <span>➕</span>
                    Nuevo Producto
                  </button>
                  <button
                    onClick={() => setShowBulkImportModal(true)}
                    className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
                  >
                    <span>📤</span>
                    Importar CSV
                  </button>
                  {selectedProducts.size > 0 && (
                    <button
                      onClick={() => setShowBulkUpdateModal(true)}
                      className="px-2 py-1.5 md:px-3 md:py-2 lg:px-4 lg:py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-colors font-medium flex items-center gap-1 md:gap-2 whitespace-nowrap text-xs md:text-sm lg:text-base"
                    >
                      <span className="text-sm md:text-base">📝</span>
                      <span className="hidden sm:inline">Editar {selectedProducts.size}</span>
                      <span className="sm:hidden">Editar</span>
                    </button>
                  )}
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
                    >
                      <span>📥</span>
                      Exportar {selectedProducts.size > 0 ? `(${selectedProducts.size})` : 'Todo'}
                      <span className="text-xs">▼</span>
                    </button>
                    
                    {showExportMenu && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[120px]">
                        <button
                          onClick={() => {
                            handleExport('csv')
                            setShowExportMenu(false)
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg flex items-center gap-2"
                        >
                          <span>📄</span>
                          CSV
                        </button>
                        <button
                          onClick={() => {
                            handleExport('xlsx')
                            setShowExportMenu(false)
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg flex items-center gap-2"
                        >
                          <span>📊</span>
                          Excel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Message Area */}
              <div className="px-6 py-1">
                <MessageArea message={message} />
              </div>
              
              {/* Table Section */}
              <div className="flex-1 px-6 pb-1 overflow-hidden">
                <ErrorBoundary
                  level="section"
                  onError={(error, errorInfo) => {
                    console.error('Inventory table error:', error, errorInfo)
                  }}
                  resetKeys={[editedView.length]}
                  fallback={
                    <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8 text-center h-full flex flex-col justify-center">
                      <div className="text-4xl mb-4">📊</div>
                      <h3 className="text-xl font-semibold text-red-800 mb-4">
                        Error en la tabla de inventario
                      </h3>
                      <p className="text-red-700 mb-6">
                        La tabla de inventario encontró un error. Los datos están seguros, 
                        pero la tabla no puede mostrarse correctamente en este momento.
                      </p>
                      <div className="space-y-3">
                        <button
                          onClick={() => window.location.reload()}
                          className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                        >
                          🔄 Recargar Página
                        </button>
                      </div>
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
                  />
                </ErrorBoundary>
              </div>
            </div>
          </div>
        ) : (
          /* Mobile Layout - Optimized */
          <div className="h-[calc(100vh-120px)] flex flex-col">
            {/* Message Area */}
            <MessageArea message={message} />

            {/* Mobile Search Bar */}
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={mobileSearchTerm}
                  onChange={(e) => handleMobileSearch(e.target.value)}
                  className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Mobile Product Card View */}
            <div className="flex-1 overflow-y-auto">
              <MobileProductCardList
                products={getFilteredProducts()}
                onEdit={handleMobileEdit}
                onSelect={handleProductSelect}
                selectedProducts={selectedProducts}
                loading={loading}
              />
            </div>

            {/* Mobile Filters Modal */}
            {showMobileFilters && (
              <MobileFilters
                filters={filters}
                onFiltersChange={setFilters}
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
                isNew={!editingProduct}
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

        {/* Bulk Import Modal */}
        <BulkImportModal
          isOpen={showBulkImportModal}
          onClose={() => setShowBulkImportModal(false)}
          onSuccess={(importedCount) => {
            showMessage(`¡${importedCount} productos importados exitosamente!`, 'success')
            loadInventoryData() // Reload data to show new products
          }}
          existingProducts={allData}
        />

        {/* Bulk Update Modal */}
        <BulkUpdateModal
          isOpen={showBulkUpdateModal}
          selectedProducts={getSelectedProducts()}
          onClose={() => setShowBulkUpdateModal(false)}
          onUpdate={handleBulkUpdate}
        />
      </div>
    </>
  )
}
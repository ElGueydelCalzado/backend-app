// Database types for PostgreSQL client - NEW SIMPLIFIED SCHEMA

export interface Product {
  id: number
  tenant_id: string  // 🔒 Multi-tenant isolation - REQUIRED for all products
  fecha?: string | null
  categoria: string | null
  marca: string | null
  modelo: string | null
  color: string | null
  talla: string | null
  sku: string | null
  ean: string | null
  google_drive: string | null
  
  // Physical dimensions and weight
  height_cm: number | null
  length_cm: number | null
  thickness_cm: number | null
  weight_grams: number | null
  
  costo: number | null
  
  // Pricing modifiers (editable by user)
  shein_modifier: number | null
  shopify_modifier: number | null
  meli_modifier: number | null
  
  // Auto-calculated prices (generated columns)
  precio_shein: number | null
  precio_shopify: number | null
  precio_meli: number | null
  
  // Simplified inventory (4 locations)
  inv_egdc: number | null
  inv_fami: number | null
  inv_osiel: number | null
  inv_molly: number | null
  inventory_total: number | null
  
  // Platform availability flags
  shein: boolean | null
  meli: boolean | null
  shopify: boolean | null
  tiktok: boolean | null
  upseller: boolean | null
  go_trendier: boolean | null
  
  // Timestamps
  created_at: string | null
  updated_at: string | null
}

export interface ChangeLog {
  id: number
  tenant_id: string  // 🔒 Multi-tenant isolation - REQUIRED for all change logs
  product_id: number
  user_id?: string | null  // Track which user made the change
  field_name: string
  old_value: string | null
  new_value: string | null
  change_type: string
  created_at: string
}

export interface InventorySummary {
  total_products: number
  total_inventory: number
  by_location: {
    location: string
    total: number
  }[]
}

export interface UniqueValues {
  categories: string[]
  brands: string[]
  models: string[]
  colors: string[]
  sizes: string[]
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface BulkUpdateRequest {
  updates: Array<{
    id: number
    updates: Partial<Product>
  }>
}

export interface BulkUpdateResponse {
  success: boolean
  updated_count: number
  products?: Product[]
  errors?: string[]
}

// New interfaces for expandable navigation

export interface Warehouse {
  id: number
  name: string
  slug: string
  type: 'own' | 'external' | 'supplier'
  status: 'active' | 'pending' | 'error' | 'disabled'
  
  // Display Information
  icon: string
  description?: string
  
  // API Connection Settings
  api_url?: string
  api_key?: string
  api_secret?: string
  webhook_url?: string
  
  // Sync Configuration
  sync_enabled: boolean
  sync_frequency: number // minutes
  sync_bidirectional: boolean
  notify_low_stock: boolean
  last_sync_at?: string
  
  // Business Rules
  min_stock_threshold: number
  auto_reorder: boolean
  default_markup_percentage: number
  
  // Stats
  product_count: number
  
  created_at: string
  updated_at: string
}

export interface Marketplace {
  id: number
  name: string
  slug: string
  platform: 'mercadolibre' | 'shopify' | 'shein' | 'tiktok' | 'amazon' | 'walmart'
  status: 'active' | 'pending' | 'error' | 'disabled'
  
  // Display Information
  icon: string
  description?: string
  
  // API Credentials
  app_id?: string
  client_id?: string
  client_secret?: string
  access_token?: string
  refresh_token?: string
  
  // Sync Settings
  sync_products: boolean
  sync_prices: boolean
  sync_inventory: boolean
  auto_publish: boolean
  import_orders: boolean
  last_sync_at?: string
  
  // Platform-specific Settings
  store_url?: string
  seller_id?: string
  store_name?: string
  
  // Stats
  published_products_count: number
  
  created_at: string
  updated_at: string
}

export interface WarehouseSyncLog {
  id: number
  warehouse_id: number
  sync_type: 'full' | 'incremental' | 'manual'
  status: 'success' | 'error' | 'partial'
  products_synced: number
  errors_count: number
  error_message?: string
  duration_seconds: number
  created_at: string
}

export interface MarketplaceSyncLog {
  id: number
  marketplace_id: number
  sync_type: 'products' | 'prices' | 'inventory' | 'orders'
  status: 'success' | 'error' | 'partial'
  items_synced: number
  errors_count: number
  error_message?: string
  duration_seconds: number
  created_at: string
}

// Form interfaces for settings
export interface WarehouseFormData {
  name: string
  description?: string
  api_url?: string
  api_key?: string
  api_secret?: string
  webhook_url?: string
  sync_enabled: boolean
  sync_frequency: number
  sync_bidirectional: boolean
  notify_low_stock: boolean
  min_stock_threshold: number
  auto_reorder: boolean
  default_markup_percentage: number
}

export interface MarketplaceFormData {
  name: string
  description?: string
  app_id?: string
  client_id?: string
  client_secret?: string
  access_token?: string
  refresh_token?: string
  sync_products: boolean
  sync_prices: boolean
  sync_inventory: boolean
  auto_publish: boolean
  import_orders: boolean
  store_url?: string
  seller_id?: string
  store_name?: string
}

// Sidebar navigation types
export type MainTab = 'productos' | 'inventario' | 'bodegas' | 'tiendas'
export type SubPageType = 'warehouse' | 'marketplace' | 'add-new'

export interface SubPageItem {
  id: string
  name: string
  type: SubPageType
  status: 'active' | 'pending' | 'error' | 'disabled'
  icon: string
  description?: string
  productCount?: number
  lastSync?: string
}
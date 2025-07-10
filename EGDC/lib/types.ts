// Database types for PostgreSQL client

export interface Product {
  id: number
  fecha?: string | null
  categoria: string | null
  marca: string | null
  modelo: string | null
  color: string | null
  talla: string | null
  sku: string | null
  ean: string | null
  costo: number | null
  
  // Pricing modifiers (editable by user)
  shein_modifier: number | null
  shopify_modifier: number | null
  meli_modifier: number | null
  
  // Auto-calculated prices (generated columns)
  precio_shein: number | null
  precio_egdc: number | null
  precio_meli: number | null
  
  // Multi-location inventory
  inv_egdc: number | null
  inv_fami: number | null
  inv_bodega_principal: number | null
  inv_tienda_centro: number | null
  inv_tienda_norte: number | null
  inv_tienda_sur: number | null
  inv_online: number | null
  inventory_total: number | null
  
  // Platform availability flags
  shein: boolean | null
  meli: boolean | null
  shopify: boolean | null
  tiktok: boolean | null
  upseller: boolean | null
  go_trendier: boolean | null
  google_drive: string | null
  
  // Timestamps
  created_at: string | null
  updated_at: string | null
}

export interface ChangeLog {
  id: number
  product_id: number
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
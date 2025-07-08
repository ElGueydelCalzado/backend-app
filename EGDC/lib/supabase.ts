import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables missing:', {
    url: !!supabaseUrl,
    key: !!supabaseAnonKey
  })
  throw new Error('Missing required Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types (auto-generated from database schema)
export interface Product {
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
  precio_shein: number | null
  precio_shopify: number | null
  precio_meli: number | null
  inv_egdc: number | null
  inv_fami: number | null
  inventory_total: number | null
  shein: boolean | null
  meli: boolean | null
  shopify: boolean | null
  tiktok: boolean | null
  upseller: boolean | null
  go_trendier: boolean | null
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
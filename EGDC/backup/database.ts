import { createClient } from '@supabase/supabase-js'
import { Product, ChangeLog } from './supabase'

// Create a Supabase client with service role key for full database access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Database utilities for direct access
export class DatabaseManager {
  
  /**
   * Get all products from the database
   */
  async getAllProducts(): Promise<Product[]> {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .order('categoria', { ascending: true })
      .order('marca', { ascending: true })
      .order('modelo', { ascending: true })

    if (error) {
      throw new Error(`Error fetching products: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get a single product by ID
   */
  async getProductById(id: number): Promise<Product | null> {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Product not found
      }
      throw new Error(`Error fetching product: ${error.message}`)
    }

    return data
  }

  /**
   * Create a new product
   */
  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'precio_shein' | 'precio_egdc' | 'precio_meli' | 'inventory_total'>): Promise<Product> {
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert([product])
      .select()
      .single()

    if (error) {
      throw new Error(`Error creating product: ${error.message}`)
    }

    return data
  }

  /**
   * Update an existing product
   */
  async updateProduct(id: number, updates: Partial<Product>): Promise<Product> {
    const { data, error } = await supabaseAdmin
      .from('products')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Error updating product: ${error.message}`)
    }

    return data
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: number): Promise<void> {
    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Error deleting product: ${error.message}`)
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(category: string): Promise<Product[]> {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('categoria', category)
      .order('marca', { ascending: true })
      .order('modelo', { ascending: true })

    if (error) {
      throw new Error(`Error fetching products by category: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get products by brand
   */
  async getProductsByBrand(brand: string): Promise<Product[]> {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('marca', brand)
      .order('categoria', { ascending: true })
      .order('modelo', { ascending: true })

    if (error) {
      throw new Error(`Error fetching products by brand: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get low stock products (total inventory <= threshold)
   */
  async getLowStockProducts(threshold: number = 10): Promise<Product[]> {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .lte('inventory_total', threshold)
      .order('inventory_total', { ascending: true })

    if (error) {
      throw new Error(`Error fetching low stock products: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get all change logs
   */
  async getAllChangeLogs(): Promise<ChangeLog[]> {
    const { data, error } = await supabaseAdmin
      .from('change_logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Error fetching change logs: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get change logs for a specific product
   */
  async getChangeLogsForProduct(productId: number): Promise<ChangeLog[]> {
    const { data, error } = await supabaseAdmin
      .from('change_logs')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Error fetching change logs for product: ${error.message}`)
    }

    return data || []
  }

  /**
   * Create a change log entry
   */
  async createChangeLog(changeLog: Omit<ChangeLog, 'id' | 'created_at'>): Promise<ChangeLog> {
    const { data, error } = await supabaseAdmin
      .from('change_logs')
      .insert([changeLog])
      .select()
      .single()

    if (error) {
      throw new Error(`Error creating change log: ${error.message}`)
    }

    return data
  }

  /**
   * Get inventory summary by location
   */
  async getInventorySummary(): Promise<{
    total_products: number
    total_inventory: number
    by_location: {
      location: string
      total: number
    }[]
  }> {
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('inv_egdc, inv_fami, inventory_total')

    if (error) {
      throw new Error(`Error fetching inventory summary: ${error.message}`)
    }

    const summary = products.reduce((acc, product) => {
      acc.total_products += 1
      acc.total_inventory += product.inventory_total || 0
      acc.by_location.egdc += product.inv_egdc || 0
      acc.by_location.fami += product.inv_fami || 0
      return acc
    }, {
      total_products: 0,
      total_inventory: 0,
      by_location: {
        egdc: 0,
        fami: 0
      }
    })

    return {
      total_products: summary.total_products,
      total_inventory: summary.total_inventory,
      by_location: [
        { location: 'EGDC', total: summary.by_location.egdc },
        { location: 'FAMI', total: summary.by_location.fami }
      ]
    }
  }

  /**
   * Execute raw SQL query (use with caution)
   */
  async executeRawQuery(query: string): Promise<any> {
    const { data, error } = await supabaseAdmin.rpc('execute_sql', { query })

    if (error) {
      throw new Error(`Error executing raw query: ${error.message}`)
    }

    return data
  }

  /**
   * Bulk update products
   */
  async bulkUpdateProducts(updates: Array<{ id: number; updates: Partial<Product> }>): Promise<Product[]> {
    const results: Product[] = []

    for (const { id, updates: productUpdates } of updates) {
      try {
        const updated = await this.updateProduct(id, productUpdates)
        results.push(updated)
      } catch (error) {
        console.error(`Error updating product ${id}:`, error)
        throw error
      }
    }

    return results
  }

  /**
   * Get unique values for filters
   */
  async getUniqueValues(): Promise<{
    categories: string[]
    brands: string[]
    models: string[]
    colors: string[]
    sizes: string[]
  }> {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('categoria, marca, modelo, color, talla')

    if (error) {
      throw new Error(`Error fetching unique values: ${error.message}`)
    }

    const categories = Array.from(new Set(data.map(p => p.categoria).filter(Boolean))).sort()
    const brands = Array.from(new Set(data.map(p => p.marca).filter(Boolean))).sort()
    const models = Array.from(new Set(data.map(p => p.modelo).filter(Boolean))).sort()
    const colors = Array.from(new Set(data.map(p => p.color).filter(Boolean))).sort()
    const sizes = Array.from(new Set(data.map(p => p.talla).filter(Boolean))).sort()

    return {
      categories,
      brands,
      models,
      colors,
      sizes
    }
  }
}

// Export a singleton instance
export const db = new DatabaseManager()
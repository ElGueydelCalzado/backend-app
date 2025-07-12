import { Pool, PoolClient } from 'pg'
import { Product, ChangeLog } from './types'

// Parse the connection string to remove SSL requirement for local development
const connectionString = process.env.DATABASE_URL?.replace('?sslmode=require', '')

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: connectionString,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Database utilities for PostgreSQL
export class DatabaseManager {
  
  /**
   * Get all products from the database
   */
  async getAllProducts(): Promise<Product[]> {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT * FROM products 
        ORDER BY categoria ASC, marca ASC, modelo ASC
      `)
      return result.rows
    } catch (error) {
      throw new Error(`Error fetching products: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      client.release()
    }
  }

  /**
   * Get a single product by ID
   */
  async getProductById(id: number): Promise<Product | null> {
    const client = await pool.connect()
    try {
      const result = await client.query('SELECT * FROM products WHERE id = $1', [id])
      return result.rows[0] || null
    } catch (error) {
      throw new Error(`Error fetching product: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      client.release()
    }
  }

  /**
   * Create a new product
   */
  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'precio_shein' | 'precio_shopify' | 'precio_meli' | 'inventory_total'>): Promise<Product> {
    const client = await pool.connect()
    try {
      const fields = Object.keys(product).join(', ')
      const values = Object.values(product)
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')
      
      const result = await client.query(`
        INSERT INTO products (${fields}) 
        VALUES (${placeholders}) 
        RETURNING *
      `, values)
      
      return result.rows[0]
    } catch (error) {
      throw new Error(`Error creating product: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      client.release()
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(id: number, updates: Partial<Product>): Promise<Product> {
    const client = await pool.connect()
    try {
      const fields = Object.keys(updates)
      const values = Object.values(updates)
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ')
      
      const result = await client.query(`
        UPDATE products 
        SET ${setClause}, updated_at = NOW() 
        WHERE id = $1 
        RETURNING *
      `, [id, ...values])
      
      if (result.rows.length === 0) {
        throw new Error('Product not found')
      }
      
      return result.rows[0]
    } catch (error) {
      throw new Error(`Error updating product: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      client.release()
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: number): Promise<void> {
    const client = await pool.connect()
    try {
      const result = await client.query('DELETE FROM products WHERE id = $1', [id])
      if (result.rowCount === 0) {
        throw new Error('Product not found')
      }
    } catch (error) {
      throw new Error(`Error deleting product: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      client.release()
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(category: string): Promise<Product[]> {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT * FROM products 
        WHERE categoria = $1 
        ORDER BY marca ASC, modelo ASC
      `, [category])
      return result.rows
    } catch (error) {
      throw new Error(`Error fetching products by category: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      client.release()
    }
  }

  /**
   * Get products by brand
   */
  async getProductsByBrand(brand: string): Promise<Product[]> {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT * FROM products 
        WHERE marca = $1 
        ORDER BY categoria ASC, modelo ASC
      `, [brand])
      return result.rows
    } catch (error) {
      throw new Error(`Error fetching products by brand: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      client.release()
    }
  }

  /**
   * Get low stock products (total inventory <= threshold)
   */
  async getLowStockProducts(threshold: number = 10): Promise<Product[]> {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT * FROM products 
        WHERE inventory_total <= $1 
        ORDER BY inventory_total ASC
      `, [threshold])
      return result.rows
    } catch (error) {
      throw new Error(`Error fetching low stock products: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      client.release()
    }
  }

  /**
   * Get all change logs
   */
  async getAllChangeLogs(): Promise<ChangeLog[]> {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT * FROM change_logs 
        ORDER BY created_at DESC
      `)
      return result.rows
    } catch (error) {
      throw new Error(`Error fetching change logs: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      client.release()
    }
  }

  /**
   * Get change logs for a specific product
   */
  async getChangeLogsForProduct(productId: number): Promise<ChangeLog[]> {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT * FROM change_logs 
        WHERE product_id = $1 
        ORDER BY created_at DESC
      `, [productId])
      return result.rows
    } catch (error) {
      throw new Error(`Error fetching change logs for product: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      client.release()
    }
  }

  /**
   * Create a change log entry
   */
  async createChangeLog(changeLog: Omit<ChangeLog, 'id' | 'created_at'>): Promise<ChangeLog> {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        INSERT INTO change_logs (product_id, field_name, old_value, new_value, change_type) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *
      `, [changeLog.product_id, changeLog.field_name, changeLog.old_value, changeLog.new_value, changeLog.change_type])
      
      return result.rows[0]
    } catch (error) {
      throw new Error(`Error creating change log: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      client.release()
    }
  }

  /**
   * Get inventory summary with statistics
   */
  async getInventorySummary(): Promise<{
    total_products: number
    total_inventory: number
    by_location: {
      location: string
      total: number
    }[]
  }> {
    const client = await pool.connect()
    try {
      // Get total products and inventory
      const totalsResult = await client.query(`
        SELECT 
          COUNT(*) as total_products,
          COALESCE(SUM(inventory_total), 0) as total_inventory
        FROM products
      `)

      // Get inventory by location (4 locations)
      const locationResult = await client.query(`
        SELECT 
          'EGDC' as location, COALESCE(SUM(inv_egdc), 0) as total FROM products
        UNION ALL
        SELECT 
          'FAMI' as location, COALESCE(SUM(inv_fami), 0) as total FROM products
        UNION ALL
        SELECT 
          'Osiel' as location, COALESCE(SUM(inv_osiel), 0) as total FROM products
        UNION ALL
        SELECT 
          'Molly' as location, COALESCE(SUM(inv_molly), 0) as total FROM products
        ORDER BY total DESC
      `)

      return {
        total_products: parseInt(totalsResult.rows[0].total_products),
        total_inventory: parseInt(totalsResult.rows[0].total_inventory),
        by_location: locationResult.rows.map(row => ({
          location: row.location,
          total: parseInt(row.total)
        }))
      }
    } catch (error) {
      throw new Error(`Error fetching inventory summary: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      client.release()
    }
  }

  /**
   * Execute raw SQL query (use with caution)
   */
  async executeRawQuery(query: string, params: any[] = []): Promise<any> {
    const client = await pool.connect()
    try {
      const result = await client.query(query, params)
      return result.rows
    } catch (error) {
      throw new Error(`Error executing query: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      client.release()
    }
  }

  /**
   * Bulk update products with change logging
   */
  async bulkUpdateProducts(updates: Array<{ id: number; updates: Partial<Product> }>): Promise<Product[]> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      
      const updatedProducts: Product[] = []
      
      for (const { id, updates: productUpdates } of updates) {
        // Get current product for change logging
        const currentResult = await client.query('SELECT * FROM products WHERE id = $1', [id])
        const currentProduct = currentResult.rows[0]
        
        if (!currentProduct) {
          throw new Error(`Product with id ${id} not found`)
        }
        
        // Update the product
        const fields = Object.keys(productUpdates)
        const values = Object.values(productUpdates)
        const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ')
        
        const updateResult = await client.query(`
          UPDATE products 
          SET ${setClause}, updated_at = NOW() 
          WHERE id = $1 
          RETURNING *
        `, [id, ...values])
        
        const updatedProduct = updateResult.rows[0]
        updatedProducts.push(updatedProduct)
        
        // Create change logs
        for (const [field, newValue] of Object.entries(productUpdates)) {
          if (currentProduct[field] !== newValue) {
            await client.query(`
              INSERT INTO change_logs (product_id, field_name, old_value, new_value, change_type) 
              VALUES ($1, $2, $3, $4, $5)
            `, [id, field, String(currentProduct[field] || ''), String(newValue || ''), 'update'])
          }
        }
      }
      
      await client.query('COMMIT')
      return updatedProducts
    } catch (error) {
      await client.query('ROLLBACK')
      throw new Error(`Error bulk updating products: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      client.release()
    }
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
    const client = await pool.connect()
    try {
      const [categoriesResult, brandsResult, modelsResult, colorsResult, sizesResult] = await Promise.all([
        client.query('SELECT DISTINCT categoria FROM products WHERE categoria IS NOT NULL ORDER BY categoria'),
        client.query('SELECT DISTINCT marca FROM products WHERE marca IS NOT NULL ORDER BY marca'),
        client.query('SELECT DISTINCT modelo FROM products WHERE modelo IS NOT NULL ORDER BY modelo'),
        client.query('SELECT DISTINCT color FROM products WHERE color IS NOT NULL ORDER BY color'),
        client.query('SELECT DISTINCT talla FROM products WHERE talla IS NOT NULL ORDER BY talla')
      ])

      return {
        categories: categoriesResult.rows.map(row => row.categoria),
        brands: brandsResult.rows.map(row => row.marca),
        models: modelsResult.rows.map(row => row.modelo),
        colors: colorsResult.rows.map(row => row.color),
        sizes: sizesResult.rows.map(row => row.talla)
      }
    } catch (error) {
      throw new Error(`Error fetching unique values: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      client.release()
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    const client = await pool.connect()
    try {
      await client.query('SELECT 1')
      return true
    } catch (error) {
      console.error('Database connection test failed:', error)
      return false
    } finally {
      client.release()
    }
  }

  /**
   * Close all database connections
   */
  async close(): Promise<void> {
    await pool.end()
  }
}

// Create a singleton instance
export const db = new DatabaseManager()

// Export pool for direct access if needed
export { pool } 
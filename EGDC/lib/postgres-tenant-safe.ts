// TENANT-SAFE PostgreSQL Database Manager for Multi-Tenant SaaS
// ALL queries include tenant_id filtering for complete data isolation

import { Pool } from 'pg'

// SECURITY: Secure database connection configuration for tenant-safe operations
import { createSecureDatabaseConfig, validateDatabaseConfig } from './database-config'

// Validate configuration on startup
validateDatabaseConfig()

// Create a secure connection pool with proper SSL configuration
const pool = new Pool(createSecureDatabaseConfig())

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
})

export { pool }

// Connection function for API routes
export async function connectToDatabase() {
  return pool
}

// TENANT-SAFE Database Manager
// 🔒 ALL methods require tenant_id for complete data isolation
export class TenantSafePostgresManager {
  // Base query method with tenant context
  static async query(text: string, params?: any[]) {
    const client = await pool.connect()
    try {
      const result = await client.query(text, params)
      return result
    } finally {
      client.release()
    }
  }

  // 🔒 Get all products for a specific tenant
  static async getProducts(tenantId: string) {
    if (!tenantId) {
      throw new Error('tenant_id is required for getProducts')
    }
    
    const query = `
      SELECT * FROM products 
      WHERE tenant_id = $1
      ORDER BY categoria, marca, modelo
    `
    const result = await this.query(query, [tenantId])
    return result.rows
  }

  // 🔒 Get paginated products for a specific tenant
  static async getProductsPaginated(tenantId: string, options: {
    page?: number
    limit?: number
    search?: string
    filters?: {
      categoria?: string
      marca?: string
      modelo?: string
    }
  } = {}) {
    if (!tenantId) {
      throw new Error('tenant_id is required for getProductsPaginated')
    }

    const {
      page = 1,
      limit = 100,
      search = '',
      filters = {}
    } = options

    const offset = (page - 1) * limit
    const whereConditions = ['tenant_id = $1'] // 🔒 ALWAYS filter by tenant
    const params = [tenantId]
    let paramIndex = 2

    // Add search condition
    if (search.trim()) {
      whereConditions.push(`(
        LOWER(categoria) LIKE $${paramIndex} OR
        LOWER(marca) LIKE $${paramIndex} OR
        LOWER(modelo) LIKE $${paramIndex} OR
        LOWER(color) LIKE $${paramIndex} OR
        LOWER(sku) LIKE $${paramIndex}
      )`)
      params.push(`%${search.toLowerCase()}%`)
      paramIndex++
    }

    // Add filter conditions
    if (filters.categoria) {
      whereConditions.push(`categoria = $${paramIndex}`)
      params.push(filters.categoria)
      paramIndex++
    }

    if (filters.marca) {
      whereConditions.push(`marca = $${paramIndex}`)
      params.push(filters.marca)
      paramIndex++
    }

    if (filters.modelo) {
      whereConditions.push(`modelo = $${paramIndex}`)
      params.push(filters.modelo)
      paramIndex++
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM products ${whereClause}`
    const countResult = await this.query(countQuery, params)
    const totalItems = parseInt(countResult.rows[0].count)

    // Get paginated data
    const dataQuery = `
      SELECT * FROM products 
      ${whereClause}
      ORDER BY categoria, marca, modelo
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    const dataResult = await this.query(dataQuery, [...params, limit, offset])

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        hasNextPage: page < Math.ceil(totalItems / limit),
        hasPreviousPage: page > 1
      }
    }
  }

  // 🔒 Get product by ID with tenant validation
  static async getProductById(id: number, tenantId: string) {
    if (!tenantId) {
      throw new Error('tenant_id is required for getProductById')
    }
    
    const query = 'SELECT * FROM products WHERE id = $1 AND tenant_id = $2'
    const result = await this.query(query, [id, tenantId])
    return result.rows[0]
  }

  // 🔒 Check duplicates within tenant scope only
  static async checkDuplicates(
    tenantId: string,
    sku?: string | null,
    ean?: string | null,
    excludeId?: number
  ) {
    if (!tenantId) {
      throw new Error('tenant_id is required for checkDuplicates')
    }
    
    if (!sku && !ean) return { duplicates: [], isValid: true }
    
    const conditions = ['tenant_id = $1'] // 🔒 ALWAYS filter by tenant
    const params = [tenantId]
    let paramIndex = 2
    
    if (sku && sku.trim() !== '') {
      conditions.push(`sku = $${paramIndex}`)
      params.push(sku.trim())
      paramIndex++
    }
    
    if (ean && ean.trim() !== '') {
      conditions.push(`ean = $${paramIndex}`)
      params.push(ean.trim())
      paramIndex++
    }
    
    if (excludeId) {
      conditions.push(`id != $${paramIndex}`)
      params.push(excludeId.toString())
      paramIndex++
    }
    
    const query = `
      SELECT id, sku, ean, marca, modelo 
      FROM products 
      WHERE ${conditions.join(' AND ')}
    `
    
    const result = await this.query(query, params)
    return {
      duplicates: result.rows,
      isValid: result.rows.length === 0
    }
  }

  // 🔒 Create product with tenant assignment
  static async createProduct(tenantId: string, product: any) {
    if (!tenantId) {
      throw new Error('tenant_id is required for createProduct')
    }
    
    // Check for duplicates within tenant scope
    const duplicateCheck = await this.checkDuplicates(tenantId, product.sku, product.ean)
    if (!duplicateCheck.isValid) {
      const duplicateDetails = duplicateCheck.duplicates.map(d => 
        `ID: ${d.id}, SKU: ${d.sku || 'N/A'}, EAN: ${d.ean || 'N/A'} (${d.marca} ${d.modelo})`
      ).join('; ')
      throw new Error(`Duplicate SKU/EAN found. Existing products: ${duplicateDetails}`)
    }
    
    // Add tenant_id to product data
    const productWithTenant = {
      ...product,
      tenant_id: tenantId
    }
    
    const fields = Object.keys(productWithTenant).filter(key => key !== 'id')
    const values = fields.map(field => productWithTenant[field])
    const placeholders = fields.map((_, index) => `$${index + 1}`)
    
    const query = `
      INSERT INTO products (${fields.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `
    
    const result = await this.query(query, values)
    return result.rows[0]
  }

  // 🔒 Update product with tenant validation
  static async updateProduct(id: number, tenantId: string, updates: any) {
    if (!tenantId) {
      throw new Error('tenant_id is required for updateProduct')
    }
    
    // First, verify the product belongs to this tenant
    const existingProduct = await this.getProductById(id, tenantId)
    if (!existingProduct) {
      throw new Error('Product not found or access denied')
    }
    
    // Check for duplicates if SKU or EAN are being updated
    if (updates.sku !== undefined || updates.ean !== undefined) {
      const duplicateCheck = await this.checkDuplicates(tenantId, updates.sku, updates.ean, id)
      if (!duplicateCheck.isValid) {
        const duplicateDetails = duplicateCheck.duplicates.map(d => 
          `ID: ${d.id}, SKU: ${d.sku || 'N/A'}, EAN: ${d.ean || 'N/A'} (${d.marca} ${d.modelo})`
        ).join('; ')
        throw new Error(`Duplicate SKU/EAN found. Existing products: ${duplicateDetails}`)
      }
    }
    
    const fields = Object.keys(updates)
    const values = fields.map(field => updates[field])
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ')
    
    const query = `
      UPDATE products 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${fields.length + 1} AND tenant_id = $${fields.length + 2}
      RETURNING *
    `
    
    const result = await this.query(query, [...values, id, tenantId])
    return result.rows[0]
  }

  // 🔒 Delete product with tenant validation
  static async deleteProduct(id: number, tenantId: string) {
    if (!tenantId) {
      throw new Error('tenant_id is required for deleteProduct')
    }
    
    const query = 'DELETE FROM products WHERE id = $1 AND tenant_id = $2 RETURNING *'
    const result = await this.query(query, [id, tenantId])
    return result.rows[0]
  }

  // 🔒 Batch operations with tenant isolation
  static async batchUpsertProducts(tenantId: string, products: any[]) {
    if (!tenantId) {
      throw new Error('tenant_id is required for batchUpsertProducts')
    }
    
    if (products.length === 0) return { results: [], errors: [] }
    
    // Add tenant_id to all products
    const processedProducts = products.map(product => ({
      ...product,
      tenant_id: tenantId,
      categoria: product.categoria || null,
      marca: product.marca || null,
      modelo: product.modelo || null,
      color: product.color || null,
      talla: product.talla || null,
      sku: product.sku,
      ean: product.ean || null,
      costo: product.costo || null,
      google_drive: product.google_drive || null,
      shein_modifier: product.shein_modifier || 1.5,
      shopify_modifier: product.shopify_modifier || 2.0,
      meli_modifier: product.meli_modifier || 2.5,
      inv_egdc: product.inv_egdc || 0,
      inv_fami: product.inv_fami || 0,
      inv_osiel: product.inv_osiel || 0,
      inv_molly: product.inv_molly || 0,
      shein: product.shein || false,
      meli: product.meli || false,
      shopify: product.shopify || false,
      tiktok: product.tiktok || false,
      upseller: product.upseller || false,
      go_trendier: product.go_trendier || false
    }))
    
    const fields = Object.keys(processedProducts[0])
    const valueRows = []
    const allValues = []
    
    for (let i = 0; i < processedProducts.length; i++) {
      const product = processedProducts[i]
      const productValues = fields.map(field => product[field])
      const placeholders = fields.map((_, fieldIndex) => `$${allValues.length + fieldIndex + 1}`)
      
      valueRows.push(`(${placeholders.join(', ')})`)
      allValues.push(...productValues)
    }
    
    const updateFields = fields.filter(field => field !== 'sku' && field !== 'tenant_id')
    const setClause = updateFields.map(field => `${field} = EXCLUDED.${field}`).join(', ')
    
    const query = `
      INSERT INTO products (${fields.join(', ')})
      VALUES ${valueRows.join(', ')}
      ON CONFLICT (sku, tenant_id) 
      DO UPDATE SET 
        ${setClause},
        updated_at = NOW()
      RETURNING *
    `
    
    try {
      const result = await this.query(query, allValues)
      return { results: result.rows, errors: [] }
    } catch (error) {
      console.error('Batch upsert failed, falling back to individual processing:', error)
      
      // Fallback to individual processing
      const results = []
      const errors = []
      
      for (let i = 0; i < products.length; i++) {
        try {
          const result = await this.upsertProduct(tenantId, products[i])
          results.push(result)
        } catch (individualError) {
          errors.push({
            index: i + 1,
            product: products[i],
            error: individualError instanceof Error ? individualError.message : 'Unknown error'
          })
        }
      }
      
      return { results, errors }
    }
  }

  // 🔒 Upsert single product with tenant isolation
  static async upsertProduct(tenantId: string, product: any) {
    if (!tenantId) {
      throw new Error('tenant_id is required for upsertProduct')
    }
    
    if (!product.sku) {
      throw new Error('SKU is required for upsert operation')
    }
    
    const productData = {
      ...product,
      tenant_id: tenantId,
      categoria: product.categoria || null,
      marca: product.marca || null,
      modelo: product.modelo || null,
      color: product.color || null,
      talla: product.talla || null,
      sku: product.sku,
      ean: product.ean || null,
      costo: product.costo || null,
      google_drive: product.google_drive || null,
      shein_modifier: product.shein_modifier || 1.5,
      shopify_modifier: product.shopify_modifier || 2.0,
      meli_modifier: product.meli_modifier || 2.5,
      inv_egdc: product.inv_egdc || 0,
      inv_fami: product.inv_fami || 0,
      inv_osiel: product.inv_osiel || 0,
      inv_molly: product.inv_molly || 0,
      shein: product.shein || false,
      meli: product.meli || false,
      shopify: product.shopify || false,
      tiktok: product.tiktok || false,
      upseller: product.upseller || false,
      go_trendier: product.go_trendier || false
    }
    
    const fields = Object.keys(productData)
    const values = fields.map(field => productData[field])
    
    const updateClauses = []
    Object.keys(product).forEach(key => {
      if (key !== 'id' && key !== 'sku' && key !== 'tenant_id' && 
          product[key] !== undefined && product[key] !== null && product[key] !== '') {
        updateClauses.push(`${key} = EXCLUDED.${key}`)
      }
    })
    
    const setClause = updateClauses.length > 0 
      ? updateClauses.join(', ') + ', updated_at = NOW()'
      : 'updated_at = NOW()'
    
    const query = `
      INSERT INTO products (${fields.join(', ')})
      VALUES (${fields.map((_, index) => `$${index + 1}`).join(', ')})
      ON CONFLICT (sku, tenant_id) 
      DO UPDATE SET ${setClause}
      RETURNING *
    `
    
    const result = await this.query(query, values)
    return result.rows[0]
  }

  // 🔒 Get filter options for tenant only
  static async getFilterOptions(tenantId: string) {
    if (!tenantId) {
      throw new Error('tenant_id is required for getFilterOptions')
    }
    
    const [categorias, marcas, modelos] = await Promise.all([
      this.query('SELECT DISTINCT categoria FROM products WHERE tenant_id = $1 AND categoria IS NOT NULL ORDER BY categoria', [tenantId]),
      this.query('SELECT DISTINCT marca FROM products WHERE tenant_id = $1 AND marca IS NOT NULL ORDER BY marca', [tenantId]),
      this.query('SELECT DISTINCT modelo FROM products WHERE tenant_id = $1 AND modelo IS NOT NULL ORDER BY modelo', [tenantId])
    ])

    return {
      categorias: categorias.rows.map(row => row.categoria),
      marcas: marcas.rows.map(row => row.marca),
      modelos: modelos.rows.map(row => row.modelo)
    }
  }

  // 🔒 Get tenant statistics
  static async getTenantStats(tenantId: string) {
    if (!tenantId) {
      throw new Error('tenant_id is required for getTenantStats')
    }
    
    const query = `
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN inventory_total > 0 THEN 1 END) as in_stock,
        COUNT(CASE WHEN inventory_total = 0 THEN 1 END) as out_of_stock,
        SUM(inventory_total) as total_inventory,
        COUNT(DISTINCT categoria) as categories,
        COUNT(DISTINCT marca) as brands
      FROM products 
      WHERE tenant_id = $1
    `
    
    const result = await this.query(query, [tenantId])
    return result.rows[0]
  }
}

// Export the tenant-safe manager
export default TenantSafePostgresManager
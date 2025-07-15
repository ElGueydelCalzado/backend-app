import { Pool } from 'pg'

// Database connection configuration - disable SSL for GCP Cloud SQL compatibility
const config = {
  connectionString: process.env.DATABASE_URL?.replace('?sslmode=require', ''),
  ssl: false,
  max: 20, // Maximum number of connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}

// Create a connection pool
const pool = new Pool(config)

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
})

export { pool }

// Database utilities for direct access
export class PostgresManager {
  static async query(text: string, params?: any[]) {
    const client = await pool.connect()
    try {
      const result = await client.query(text, params)
      return result
    } finally {
      client.release()
    }
  }

  static async getProducts() {
    const query = `
      SELECT * FROM products 
      ORDER BY categoria, marca, modelo
    `
    const result = await this.query(query)
    return result.rows
  }

  static async getProductsPaginated(options: {
    page?: number
    limit?: number
    search?: string
    filters?: {
      categoria?: string
      marca?: string
      modelo?: string
    }
  } = {}) {
    const {
      page = 1,
      limit = 100,
      search = '',
      filters = {}
    } = options

    const offset = (page - 1) * limit
    const whereConditions = []
    const params = []
    let paramIndex = 1

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

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

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

  static async getProductById(id: number) {
    const query = 'SELECT * FROM products WHERE id = $1'
    const result = await this.query(query, [id])
    return result.rows[0]
  }

  static async checkDuplicates(sku?: string | null, ean?: string | null, excludeId?: number) {
    if (!sku && !ean) return { duplicates: [], isValid: true }
    
    const conditions = []
    const params = []
    let paramIndex = 1
    
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
      params.push(excludeId)
      paramIndex++
    }
    
    const query = `
      SELECT id, sku, ean, marca, modelo 
      FROM products 
      WHERE ${conditions.join(' OR ')}
    `
    
    const result = await this.query(query, params)
    return {
      duplicates: result.rows,
      isValid: result.rows.length === 0
    }
  }

  static async createProduct(product: any) {
    // Check for duplicates before creating
    const duplicateCheck = await this.checkDuplicates(product.sku, product.ean)
    if (!duplicateCheck.isValid) {
      const duplicateDetails = duplicateCheck.duplicates.map(d => 
        `ID: ${d.id}, SKU: ${d.sku || 'N/A'}, EAN: ${d.ean || 'N/A'} (${d.marca} ${d.modelo})`
      ).join('; ')
      throw new Error(`Duplicate SKU/EAN found. Existing products: ${duplicateDetails}`)
    }
    
    const fields = Object.keys(product).filter(key => key !== 'id')
    const values = fields.map(field => product[field])
    const placeholders = fields.map((_, index) => `$${index + 1}`)
    
    const query = `
      INSERT INTO products (${fields.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `
    
    const result = await this.query(query, values)
    return result.rows[0]
  }

  static async batchCreateProducts(products: any[]) {
    if (products.length === 0) return []
    
    // Get field names from the first product
    const fields = Object.keys(products[0]).filter(key => key !== 'id')
    
    // Build batch insert query
    const valueRows = []
    const allValues = []
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      const productValues = fields.map(field => product[field])
      const placeholders = fields.map((_, fieldIndex) => `$${allValues.length + fieldIndex + 1}`)
      
      valueRows.push(`(${placeholders.join(', ')})`)
      allValues.push(...productValues)
    }
    
    const query = `
      INSERT INTO products (${fields.join(', ')})
      VALUES ${valueRows.join(', ')}
      RETURNING *
    `
    
    const result = await this.query(query, allValues)
    return result.rows
  }

  static async updateProduct(id: number, updates: any) {
    // Check for duplicates if SKU or EAN are being updated
    if (updates.sku !== undefined || updates.ean !== undefined) {
      const duplicateCheck = await this.checkDuplicates(updates.sku, updates.ean, id)
      if (!duplicateCheck.isValid) {
        const duplicateDetails = duplicateCheck.duplicates.map(d => 
          `ID: ${d.id}, SKU: ${d.sku || 'N/A'}, EAN: ${d.ean || 'N/A'} (${d.marca} ${d.modelo})`
        ).join('; ')
        throw new Error(`Duplicate SKU/EAN found. Existing products: ${duplicateDetails}`)
      }
    }
    
    const fields = Object.keys(updates)
    const values = fields.map(field => updates[field])
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`)
    
    const query = `
      UPDATE products 
      SET ${setClause.join(', ')}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `
    
    const result = await this.query(query, [id, ...values])
    return result.rows[0]
  }

  static async deleteProduct(id: number) {
    const query = 'DELETE FROM products WHERE id = $1 RETURNING *'
    const result = await this.query(query, [id])
    return result.rows[0]
  }

  static async bulkUpdate(productIds: number[], updates: any) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      
      const results = []
      for (const id of productIds) {
        const result = await this.updateProduct(id, updates)
        results.push(result)
      }
      
      await client.query('COMMIT')
      return results
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  static async bulkInsert(products: any[]) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      
      const results = []
      for (const product of products) {
        const result = await this.createProduct(product)
        results.push(result)
      }
      
      await client.query('COMMIT')
      return results
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  static async getChangeLogs(productId?: number, limit = 100) {
    let query = 'SELECT * FROM change_logs'
    const params = []
    
    if (productId) {
      query += ' WHERE product_id = $1'
      params.push(productId)
    }
    
    query += ' ORDER BY created_at DESC'
    
    if (limit) {
      query += ` LIMIT ${limit}`
    }
    
    const result = await this.query(query, params)
    return result.rows
  }

  static async logChange(productId: number, fieldName: string, oldValue: any, newValue: any, changeType = 'update') {
    const query = `
      INSERT INTO change_logs (product_id, field_name, old_value, new_value, change_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `
    
    const result = await this.query(query, [
      productId,
      fieldName,
      oldValue?.toString() || null,
      newValue?.toString() || null,
      changeType
    ])
    
    return result.rows[0]
  }
}

export default PostgresManager
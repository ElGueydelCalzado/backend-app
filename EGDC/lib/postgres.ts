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

  static async getProductById(id: number) {
    const query = 'SELECT * FROM products WHERE id = $1'
    const result = await this.query(query, [id])
    return result.rows[0]
  }

  static async createProduct(product: any) {
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

  static async updateProduct(id: number, updates: any) {
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
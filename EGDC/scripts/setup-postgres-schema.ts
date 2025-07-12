/**
 * Setup PostgreSQL database schema
 */

import { Pool } from 'pg'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

async function setupSchema() {
  const client = await pool.connect()
  
  try {
    console.log('🔧 Setting up PostgreSQL database schema...')
    
    // Read the schema SQL file
    const schemaSQL = readFileSync(resolve(__dirname, '../database-schema.sql'), 'utf8')
    
    // Execute the schema
    console.log('📝 Creating tables and schema...')
    await client.query(schemaSQL)
    
    console.log('✅ Database schema created successfully!')
    
    // Test the schema by checking if products table exists
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products'
      ORDER BY ordinal_position
    `)
    
    if (result.rows.length > 0) {
      console.log('✅ Products table structure:')
      result.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`)
      })
    }
    
    return true
  } catch (error) {
    console.error('❌ Error setting up schema:', error)
    return false
  } finally {
    client.release()
    await pool.end()
  }
}

// Run the setup
setupSchema().then(success => {
  process.exit(success ? 0 : 1)
})
/**
 * Debug database connection and check what actually exists
 */

import { Pool } from 'pg'
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

// Parse the connection string to remove SSL requirement for local development
const connectionString = process.env.DATABASE_URL?.replace('?sslmode=require', '')

const pool = new Pool({
  connectionString: connectionString,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

async function debugConnection() {
  const client = await pool.connect()
  
  try {
    console.log('🔍 Debugging database connection...')
    console.log('Connection string:', connectionString?.replace(/:[^:@]*@/, ':***@'))
    
    // Check current database
    const dbResult = await client.query('SELECT current_database()')
    console.log('Current database:', dbResult.rows[0].current_database)
    
    // Check current user
    const userResult = await client.query('SELECT current_user')
    console.log('Current user:', userResult.rows[0].current_user)
    
    // List all tables
    const tablesResult = await client.query(`
      SELECT table_name, table_schema 
      FROM information_schema.tables 
      WHERE table_type = 'BASE TABLE' 
      AND table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY table_schema, table_name
    `)
    
    console.log('\n📋 Available tables:')
    if (tablesResult.rows.length === 0) {
      console.log('  No tables found!')
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`  ${row.table_schema}.${row.table_name}`)
      })
    }
    
    // Check if products table exists specifically
    const productsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'products'
      )
    `)
    console.log(`\n🔍 Products table exists: ${productsCheck.rows[0].exists}`)
    
    return true
  } catch (error) {
    console.error('❌ Debug failed:', error)
    return false
  } finally {
    client.release()
    await pool.end()
  }
}

// Run the debug
debugConnection().then(success => {
  process.exit(success ? 0 : 1)
})
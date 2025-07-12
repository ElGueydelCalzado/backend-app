/**
 * Test PostgreSQL connection using the direct approach that worked
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

async function testPostgresDirect() {
  const client = await pool.connect()
  
  try {
    console.log('🔌 Testing PostgreSQL connection (direct)...')
    
    // Test basic connection by counting products
    const countResult = await client.query('SELECT COUNT(*) as count FROM products')
    const productCount = parseInt(countResult.rows[0].count)
    console.log(`✅ Connection successful! Found ${productCount} products`)
    
    // Get sample products
    const sampleResult = await client.query('SELECT * FROM products LIMIT 3')
    console.log('\n📦 Sample products:')
    sampleResult.rows.forEach(product => {
      console.log(`  ${product.categoria} - ${product.marca} ${product.modelo}`)
      console.log(`    Inventory: EGDC:${product.inv_egdc}, FAMI:${product.inv_fami}, Osiel:${product.inv_osiel}, Molly:${product.inv_molly}`)
      console.log(`    Total: ${product.inventory_total}`)
    })
    
    // Test inventory summary
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
    
    console.log('\n📊 Inventory by location:')
    locationResult.rows.forEach(row => {
      console.log(`  ${row.location}: ${row.total}`)
    })
    
    return true
  } catch (error) {
    console.error('❌ Direct connection failed:', error)
    return false
  } finally {
    client.release()
    await pool.end()
  }
}

// Run the test
testPostgresDirect().then(success => {
  process.exit(success ? 0 : 1)
})
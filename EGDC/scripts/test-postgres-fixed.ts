/**
 * Test the fixed postgres.ts connection
 */

import dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') })

import { PostgresManager } from '../lib/postgres'

async function testPostgresFixed() {
  try {
    console.log('🔌 Testing fixed PostgreSQL connection...')
    console.log('Environment:', process.env.NODE_ENV || 'development')
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)
    
    // Test basic connection
    const products = await PostgresManager.getProducts()
    console.log(`✅ Connection successful! Found ${products.length} products`)
    
    // Show sample products
    console.log('\n📦 Sample products:')
    products.slice(0, 3).forEach(product => {
      console.log(`  ${product.categoria} - ${product.marca} ${product.modelo}`)
      console.log(`    Total inventory: ${product.inventory_total}`)
    })
    
    return true
  } catch (error) {
    console.error('❌ Connection failed:', error)
    return false
  }
}

testPostgresFixed()
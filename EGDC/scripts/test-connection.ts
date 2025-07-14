/**
 * Test database connection and analyze current state
 */

import dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') })

import { db } from '../lib/database-postgres'

async function testConnection() {
  try {
    console.log('🔌 Testing PostgreSQL connection...')
    
    // Test basic connection
    const products = await db.getAllProducts()
    console.log(`✅ Connection successful! Found ${products.length} products`)
    
    // Get inventory summary
    const summary = await db.getInventorySummary()
    console.log('\n📊 Current Inventory Summary:')
    console.log(`Total Products: ${summary.total_products}`)
    console.log(`Total Inventory: ${summary.total_inventory}`)
    
    console.log('\nInventory by Location:')
    summary.by_location.forEach(loc => {
      console.log(`  ${loc.location}: ${loc.total}`)
    })
    
    // Get unique values
    const uniqueValues = await db.getUniqueValues()
    console.log('\n🏷️ Current Data Structure:')
    console.log(`Categories: ${uniqueValues.categories.join(', ')}`)
    console.log(`Brands: ${uniqueValues.brands.join(', ')}`)
    console.log(`Models (first 10): ${uniqueValues.models.slice(0, 10).join(', ')}`)
    
    // Sample a few products to check structure
    console.log('\n📦 Sample Products:')
    products.slice(0, 3).forEach(product => {
      console.log(`  ${product.categoria} - ${product.marca} ${product.modelo} (${product.color}, ${product.talla})`)
      console.log(`    Cost: $${product.costo}, SHEIN: $${product.precio_shein}, Shopify: $${product.precio_shopify}, MeLi: $${product.precio_meli}`)
      console.log(`    Total Inventory: ${product.inventory_total}`)
    })
    
    return true
  } catch (error) {
    console.error('❌ Connection failed:', error)
    return false
  }
}

testConnection()
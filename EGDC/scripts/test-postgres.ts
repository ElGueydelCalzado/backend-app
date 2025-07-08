#!/usr/bin/env tsx

/**
 * Test PostgreSQL connection and functionality
 */

import { config } from 'dotenv'
import { PostgresManager } from '../lib/postgres'

// Load environment variables
config({ path: '.env.cloud' })

async function testConnection() {
  try {
    console.log('🔗 Testing PostgreSQL connection...')
    
    // Test basic connection
    const result = await PostgresManager.query('SELECT NOW() as current_time, version() as version')
    console.log('✅ Database connection successful!')
    console.log(`📅 Current time: ${result.rows[0].current_time}`)
    console.log(`📊 Version: ${result.rows[0].version.substring(0, 50)}...`)
    
    // Test products table
    console.log('\n📦 Testing products table...')
    const products = await PostgresManager.getProducts()
    console.log(`✅ Products count: ${products.length}`)
    
    if (products.length > 0) {
      const sample = products[0]
      console.log('📋 Sample product:')
      console.log(`   ID: ${sample.id}`)
      console.log(`   Category: ${sample.categoria}`)
      console.log(`   Brand: ${sample.marca}`)
      console.log(`   Model: ${sample.modelo}`)
      console.log(`   Cost: $${sample.costo}`)
      console.log(`   SHEIN Price: $${sample.precio_shein}`)
      console.log(`   Shopify Price: $${sample.precio_shopify}`)
      console.log(`   MercadoLibre Price: $${sample.precio_meli}`)
      console.log(`   Total Stock: ${sample.inventory_total}`)
    }
    
    // Test change logs
    console.log('\n📋 Testing change logs...')
    const changeLogs = await PostgresManager.getChangeLogs(null, 5)
    console.log(`📊 Change logs count: ${changeLogs.length}`)
    
    // Test a simple update
    console.log('\n🔄 Testing update functionality...')
    if (products.length > 0) {
      const productId = products[0].id
      const originalCost = products[0].costo
      const newCost = originalCost + 1
      
      console.log(`   Updating product ${productId} cost from $${originalCost} to $${newCost}`)
      
      const updated = await PostgresManager.updateProduct(productId, { costo: newCost })
      console.log(`✅ Updated! New SHEIN price: $${updated.precio_shein}`)
      
      // Revert the change
      await PostgresManager.updateProduct(productId, { costo: originalCost })
      console.log(`✅ Reverted cost back to $${originalCost}`)
    }
    
    console.log('\n🎉 All tests passed! Your PostgreSQL database is working correctly.')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
testConnection()
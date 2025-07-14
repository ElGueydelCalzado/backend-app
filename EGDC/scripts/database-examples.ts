/**
 * Database Management Examples
 * 
 * This file contains examples of how to use the DatabaseManager class
 * to interact with the EGDC inventory database.
 * 
 * Run with: npx tsx scripts/database-examples.ts
 * (You'll need to install tsx: npm install -D tsx)
 */

import { db } from '../lib/database'

async function main() {
  try {
    console.log('🚀 EGDC Database Management Examples\n')

    // Example 1: Get all products
    console.log('📦 Getting all products...')
    const allProducts = await db.getAllProducts()
    console.log(`Found ${allProducts.length} products`)
    console.log('First product:', allProducts[0])
    console.log()

    // Example 2: Get inventory summary
    console.log('📊 Getting inventory summary...')
    const summary = await db.getInventorySummary()
    console.log('Inventory Summary:')
    console.log(`Total Products: ${summary.total_products}`)
    console.log(`Total Inventory: ${summary.total_inventory}`)
    console.log('By Location:')
    summary.by_location.forEach(loc => {
      console.log(`  ${loc.location}: ${loc.total}`)
    })
    console.log()

    // Example 3: Get low stock products
    console.log('⚠️  Getting low stock products (≤ 20 items)...')
    const lowStock = await db.getLowStockProducts(20)
    console.log(`Found ${lowStock.length} low stock products`)
    lowStock.slice(0, 3).forEach(product => {
      console.log(`  ${product.marca} ${product.modelo} - Total: ${product.inventory_total}`)
    })
    console.log()

    // Example 4: Get unique values for filters
    console.log('🏷️  Getting unique values for filters...')
    const uniqueValues = await db.getUniqueValues()
    console.log(`Categories (${uniqueValues.categories.length}):`, uniqueValues.categories.slice(0, 5))
    console.log(`Brands (${uniqueValues.brands.length}):`, uniqueValues.brands.slice(0, 5))
    console.log(`Models (${uniqueValues.models.length}):`, uniqueValues.models.slice(0, 5))
    console.log()

    // Example 5: Get products by category
    if (uniqueValues.categories.length > 0) {
      const firstCategory = uniqueValues.categories[0]
      console.log(`👟 Getting products in category "${firstCategory}"...`)
      const categoryProducts = await db.getProductsByCategory(firstCategory)
      console.log(`Found ${categoryProducts.length} products in this category`)
      console.log()
    }

    // Example 6: Get change logs (last 10)
    console.log('📝 Getting recent change logs...')
    const changeLogs = await db.getAllChangeLogs()
    console.log(`Found ${changeLogs.length} total change logs`)
    changeLogs.slice(0, 5).forEach(log => {
      console.log(`  ${log.created_at}: Product ${log.product_id} - ${log.field_name}: ${log.old_value} → ${log.new_value}`)
    })
    console.log()

    // Example 7: Create a new product (commented out to avoid creating test data)
    /*
    console.log('➕ Creating a new product...')
    const newProduct = await db.createProduct({
      fecha: new Date().toISOString().split('T')[0],
      categoria: 'Test Category',
      marca: 'Test Brand',
      modelo: 'Test Model',
      color: 'Test Color',
      talla: '10',
      sku: 'TEST-001',
      ean: '1234567890123',
      costo: 50.00,
      shein_modifier: 1.10,
      shopify_modifier: 1.05,
      meli_modifier: 1.15,
      inv_egdc: 5,
      inv_fami: 3,
      inv_osiel: 10,
      inv_osiel: 2,
      inv_molly: 1,
      inv_molly: 1,
      inv_molly: 5,
      shein: true,
      meli: true,
      shopify: false,
      tiktok: false,
      upseller: false,
      go_trendier: false,
      google_drive: false
    })
    console.log('Created product:', newProduct)
    console.log()
    */

    console.log('✅ All examples completed successfully!')

  } catch (error) {
    console.error('❌ Error running examples:', error)
  }
}

// Run the examples
if (require.main === module) {
  main()
}
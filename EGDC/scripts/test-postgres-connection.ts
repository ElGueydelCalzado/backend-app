import * as dotenv from 'dotenv'
import { db } from '../lib/database-postgres'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function testConnection() {
  console.log('🔧 Testing PostgreSQL Database Connection...\n')

  try {
    // Test basic connection
    console.log('1. Testing basic connection...')
    const connected = await db.testConnection()
    if (!connected) {
      throw new Error('Failed to connect to database')
    }
    console.log('✅ Database connection successful\n')

    // Test fetching products
    console.log('2. Testing product fetch...')
    const products = await db.getAllProducts()
    console.log(`✅ Found ${products.length} products\n`)

    if (products.length > 0) {
      // Display first product as sample
      console.log('3. Sample product:')
      const sample = products[0]
      console.log({
        id: sample.id,
        categoria: sample.categoria,
        marca: sample.marca,
        modelo: sample.modelo,
        precio_shein: sample.precio_shein,
        precio_egdc: sample.precio_egdc,
        precio_meli: sample.precio_meli,
        inventory_total: sample.inventory_total
      })
      console.log('')
    }

    // Test inventory summary
    console.log('4. Testing inventory summary...')
    const summary = await db.getInventorySummary()
    console.log('✅ Inventory Summary:')
    console.log(`   Total Products: ${summary.total_products}`)
    console.log(`   Total Inventory: ${summary.total_inventory}`)
    console.log('   By Location:')
    summary.by_location.forEach(location => {
      console.log(`     ${location.location}: ${location.total}`)
    })
    console.log('')

    // Test unique values
    console.log('5. Testing unique values...')
    const uniqueValues = await db.getUniqueValues()
    console.log('✅ Unique Values:')
    console.log(`   Categories: ${uniqueValues.categories.length}`)
    console.log(`   Brands: ${uniqueValues.brands.length}`)
    console.log(`   Models: ${uniqueValues.models.length}`)
    console.log('')

    console.log('🎉 All tests passed! PostgreSQL database is working correctly.')

  } catch (error) {
    console.error('❌ Database test failed:')
    console.error(error instanceof Error ? error.message : 'Unknown error')
    console.error('\nPlease check:')
    console.error('1. DATABASE_URL is set correctly in .env.local')
    console.error('2. Database is accessible and running')
    console.error('3. Database schema is properly set up')
    console.error('4. Network connectivity to database')
    
    process.exit(1)
  } finally {
    // Close database connections
    await db.close()
  }
}

// Run the test
testConnection().catch(console.error) 
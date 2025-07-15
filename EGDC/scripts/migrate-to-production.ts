import { Pool } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

// Database connection configurations
const currentDbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: false
}

const productionDbConfig = {
  connectionString: process.env.PRODUCTION_DATABASE_URL,
  ssl: false
}

async function migrateDatabase() {
  let currentDb: Pool | null = null
  let productionDb: Pool | null = null

  try {
    console.log('🔄 Starting database migration...')
    
    // Connect to current database
    currentDb = new Pool(currentDbConfig)
    await currentDb.connect()
    console.log('✅ Connected to current database')
    
    // Connect to production database
    productionDb = new Pool(productionDbConfig)
    await productionDb.connect()
    console.log('✅ Connected to production database')
    
    // Step 1: Create schema in production database
    console.log('📋 Creating schema in production database...')
    const schemaScript = fs.readFileSync(path.join(__dirname, '../sql/setup/database-complete-setup.sql'), 'utf8')
    await productionDb.query(schemaScript)
    console.log('✅ Schema created successfully')
    
    // Step 2: Export data from current database
    console.log('📤 Exporting data from current database...')
    const productsResult = await currentDb.query('SELECT * FROM products ORDER BY id')
    const changeLogsResult = await currentDb.query('SELECT * FROM change_logs ORDER BY id')
    
    console.log(`📊 Found ${productsResult.rows.length} products`)
    console.log(`📊 Found ${changeLogsResult.rows.length} change logs`)
    
    // Step 3: Import data to production database
    console.log('📥 Importing data to production database...')
    
    // Import products
    if (productsResult.rows.length > 0) {
      const productColumns = Object.keys(productsResult.rows[0])
      const excludedColumns = ['precio_shein', 'precio_egdc', 'precio_meli', 'inventory_total', 'created_at', 'updated_at']
      const importColumns = productColumns.filter(col => !excludedColumns.includes(col))
      
      const placeholders = importColumns.map((_, index) => `$${index + 1}`).join(', ')
      const insertQuery = `
        INSERT INTO products (${importColumns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (id) DO UPDATE SET
        ${importColumns.map(col => `${col} = EXCLUDED.${col}`).join(', ')}
      `
      
      for (const row of productsResult.rows) {
        const values = importColumns.map(col => row[col])
        await productionDb.query(insertQuery, values)
      }
      console.log('✅ Products imported successfully')
    }
    
    // Import change logs
    if (changeLogsResult.rows.length > 0) {
      const changeLogColumns = Object.keys(changeLogsResult.rows[0])
      const placeholders = changeLogColumns.map((_, index) => `$${index + 1}`).join(', ')
      const insertQuery = `
        INSERT INTO change_logs (${changeLogColumns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (id) DO NOTHING
      `
      
      for (const row of changeLogsResult.rows) {
        const values = changeLogColumns.map(col => row[col])
        await productionDb.query(insertQuery, values)
      }
      console.log('✅ Change logs imported successfully')
    }
    
    // Step 4: Update sequences
    console.log('🔄 Updating sequences...')
    await productionDb.query("SELECT setval('products_id_seq', (SELECT MAX(id) FROM products))")
    await productionDb.query("SELECT setval('change_logs_id_seq', (SELECT MAX(id) FROM change_logs))")
    console.log('✅ Sequences updated')
    
    // Step 5: Verify migration
    console.log('🔍 Verifying migration...')
    const verifyProducts = await productionDb.query('SELECT COUNT(*) FROM products')
    const verifyLogs = await productionDb.query('SELECT COUNT(*) FROM change_logs')
    
    console.log(`✅ Production database now has:`)
    console.log(`   - ${verifyProducts.rows[0].count} products`)
    console.log(`   - ${verifyLogs.rows[0].count} change logs`)
    
    console.log('🎉 Migration completed successfully!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    if (currentDb) {
      await currentDb.end()
      console.log('🔌 Disconnected from current database')
    }
    if (productionDb) {
      await productionDb.end()
      console.log('🔌 Disconnected from production database')
    }
  }
}

// Run migration
if (require.main === module) {
  migrateDatabase()
    .then(() => {
      console.log('✅ Migration script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error)
      process.exit(1)
    })
}

export default migrateDatabase
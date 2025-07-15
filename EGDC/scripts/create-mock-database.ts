import { Pool } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

// Mock database configuration (will be used for preview environment)
const mockDbConfig = {
  connectionString: process.env.MOCK_DATABASE_URL,
  ssl: false
}

// Mock data for testing
const mockProducts = [
  {
    categoria: 'Deportivos',
    marca: 'Nike',
    modelo: 'Air Max 90',
    color: 'Blanco/Negro',
    talla: '42',
    sku: 'NIKE-AM90-WB-42',
    ean: '1234567890123',
    costo: 250.00,
    shein_modifier: 2.0,
    shopify_modifier: 1.8,
    meli_modifier: 1.6,
    inv_egdc: 5,
    inv_fami: 3,
    inv_bodega_principal: 10,
    inv_tienda_centro: 2,
    inv_tienda_norte: 1,
    inv_tienda_sur: 0,
    inv_online: 4,
    shein: true,
    meli: true,
    shopify: true,
    tiktok: false,
    upseller: false,
    go_trendier: false,
    google_drive: false
  },
  {
    categoria: 'Casual',
    marca: 'Adidas',
    modelo: 'Stan Smith',
    color: 'Blanco/Verde',
    talla: '41',
    sku: 'ADIDAS-SS-WG-41',
    ean: '1234567890124',
    costo: 200.00,
    shein_modifier: 2.2,
    shopify_modifier: 1.9,
    meli_modifier: 1.7,
    inv_egdc: 8,
    inv_fami: 2,
    inv_bodega_principal: 15,
    inv_tienda_centro: 3,
    inv_tienda_norte: 2,
    inv_tienda_sur: 1,
    inv_online: 6,
    shein: false,
    meli: true,
    shopify: true,
    tiktok: true,
    upseller: false,
    go_trendier: true,
    google_drive: true
  },
  {
    categoria: 'Botas',
    marca: 'Timberland',
    modelo: 'Classic 6-inch',
    color: 'Miel',
    talla: '43',
    sku: 'TIMB-C6-H-43',
    ean: '1234567890125',
    costo: 400.00,
    shein_modifier: 1.5,
    shopify_modifier: 1.4,
    meli_modifier: 1.3,
    inv_egdc: 2,
    inv_fami: 1,
    inv_bodega_principal: 5,
    inv_tienda_centro: 1,
    inv_tienda_norte: 0,
    inv_tienda_sur: 0,
    inv_online: 2,
    shein: false,
    meli: true,
    shopify: true,
    tiktok: false,
    upseller: true,
    go_trendier: false,
    google_drive: false
  },
  {
    categoria: 'Sandalias',
    marca: 'Birkenstock',
    modelo: 'Arizona',
    color: 'Negro',
    talla: '40',
    sku: 'BIRK-AZ-B-40',
    ean: '1234567890126',
    costo: 150.00,
    shein_modifier: 2.5,
    shopify_modifier: 2.0,
    meli_modifier: 1.8,
    inv_egdc: 12,
    inv_fami: 8,
    inv_bodega_principal: 20,
    inv_tienda_centro: 4,
    inv_tienda_norte: 3,
    inv_tienda_sur: 2,
    inv_online: 10,
    shein: true,
    meli: true,
    shopify: true,
    tiktok: true,
    upseller: false,
    go_trendier: true,
    google_drive: true
  },
  {
    categoria: 'Deportivos',
    marca: 'Puma',
    modelo: 'Suede Classic',
    color: 'Azul',
    talla: '42',
    sku: 'PUMA-SC-B-42',
    ean: '1234567890127',
    costo: 180.00,
    shein_modifier: 2.1,
    shopify_modifier: 1.7,
    meli_modifier: 1.5,
    inv_egdc: 7,
    inv_fami: 4,
    inv_bodega_principal: 12,
    inv_tienda_centro: 2,
    inv_tienda_norte: 1,
    inv_tienda_sur: 0,
    inv_online: 5,
    shein: true,
    meli: false,
    shopify: true,
    tiktok: false,
    upseller: false,
    go_trendier: false,
    google_drive: false
  }
]

async function createMockDatabase() {
  let mockDb: Pool | null = null

  try {
    console.log('🎭 Creating mock database for preview environment...')
    
    // Connect to mock database
    mockDb = new Pool(mockDbConfig)
    await mockDb.connect()
    console.log('✅ Connected to mock database')
    
    // Step 1: Create schema
    console.log('📋 Creating schema...')
    const schemaScript = fs.readFileSync(path.join(__dirname, '../sql/setup/database-complete-setup.sql'), 'utf8')
    await mockDb.query(schemaScript)
    console.log('✅ Schema created successfully')
    
    // Step 2: Insert mock data
    console.log('🎭 Inserting mock data...')
    
    const insertQuery = `
      INSERT INTO products (
        categoria, marca, modelo, color, talla, sku, ean, costo,
        shein_modifier, shopify_modifier, meli_modifier,
        inv_egdc, inv_fami, inv_bodega_principal, inv_tienda_centro,
        inv_tienda_norte, inv_tienda_sur, inv_online,
        shein, meli, shopify, tiktok, upseller, go_trendier, google_drive
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
      )
    `
    
    for (const product of mockProducts) {
      const values = [
        product.categoria, product.marca, product.modelo, product.color, product.talla,
        product.sku, product.ean, product.costo, product.shein_modifier,
        product.shopify_modifier, product.meli_modifier, product.inv_egdc,
        product.inv_fami, product.inv_bodega_principal, product.inv_tienda_centro,
        product.inv_tienda_norte, product.inv_tienda_sur, product.inv_online,
        product.shein, product.meli, product.shopify, product.tiktok,
        product.upseller, product.go_trendier, product.google_drive
      ]
      
      await mockDb.query(insertQuery, values)
    }
    
    console.log(`✅ Inserted ${mockProducts.length} mock products`)
    
    // Step 3: Add some mock change logs
    console.log('📝 Adding mock change logs...')
    const changeLogQuery = `
      INSERT INTO change_logs (product_id, field_name, old_value, new_value, change_type)
      VALUES ($1, $2, $3, $4, $5)
    `
    
    await mockDb.query(changeLogQuery, [1, 'inv_egdc', '3', '5', 'update'])
    await mockDb.query(changeLogQuery, [2, 'costo', '180.00', '200.00', 'update'])
    await mockDb.query(changeLogQuery, [3, 'inv_tienda_centro', '2', '1', 'update'])
    
    console.log('✅ Added mock change logs')
    
    // Step 4: Verify setup
    console.log('🔍 Verifying mock database...')
    const verifyProducts = await mockDb.query('SELECT COUNT(*) FROM products')
    const verifyLogs = await mockDb.query('SELECT COUNT(*) FROM change_logs')
    
    console.log(`✅ Mock database created with:`)
    console.log(`   - ${verifyProducts.rows[0].count} products`)
    console.log(`   - ${verifyLogs.rows[0].count} change logs`)
    
    console.log('\n🎉 Mock database setup completed successfully!')
    console.log('💡 This database is safe for testing - no real data will be affected')
    
  } catch (error) {
    console.error('❌ Mock database creation failed:', error)
    throw error
  } finally {
    if (mockDb) {
      await mockDb.end()
      console.log('🔌 Disconnected from mock database')
    }
  }
}

// Run mock database creation
if (require.main === module) {
  createMockDatabase()
    .then(() => {
      console.log('✅ Mock database script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Mock database script failed:', error)
      process.exit(1)
    })
}

export default createMockDatabase
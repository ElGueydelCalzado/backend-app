import { Pool } from 'pg'

// Mock database configuration
const mockDbConfig = {
  connectionString: process.env.MOCK_DATABASE_URL,
  ssl: false
}

// Simple schema creation (without complex triggers)
const createSchema = `
-- Drop existing tables if they exist
DROP TABLE IF EXISTS change_logs;
DROP TABLE IF EXISTS products;

-- Create products table
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  fecha DATE DEFAULT CURRENT_DATE,
  categoria VARCHAR(100),
  marca VARCHAR(100),
  modelo VARCHAR(200),
  color VARCHAR(100),
  talla VARCHAR(20),
  sku VARCHAR(100) UNIQUE,
  ean VARCHAR(50),
  costo DECIMAL(10,2),
  shein_modifier DECIMAL(4,2) DEFAULT 1.0,
  shopify_modifier DECIMAL(4,2) DEFAULT 1.0,
  meli_modifier DECIMAL(4,2) DEFAULT 1.0,
  precio_shein DECIMAL(10,2) GENERATED ALWAYS AS (CEILING((costo * shein_modifier * 1.2) / 5) * 5) STORED,
  precio_egdc DECIMAL(10,2) GENERATED ALWAYS AS (CEILING(((costo * shopify_modifier + 100) * 1.25) / 5) * 5) STORED,
  precio_meli DECIMAL(10,2) GENERATED ALWAYS AS (CEILING(((costo * meli_modifier + 100) * 1.395) / 5) * 5) STORED,
  inv_egdc INTEGER DEFAULT 0,
  inv_fami INTEGER DEFAULT 0,
  inv_bodega_principal INTEGER DEFAULT 0,
  inv_tienda_centro INTEGER DEFAULT 0,
  inv_tienda_norte INTEGER DEFAULT 0,
  inv_tienda_sur INTEGER DEFAULT 0,
  inv_online INTEGER DEFAULT 0,
  inventory_total INTEGER GENERATED ALWAYS AS (inv_egdc + inv_fami + inv_bodega_principal + inv_tienda_centro + inv_tienda_norte + inv_tienda_sur + inv_online) STORED,
  shein BOOLEAN DEFAULT false,
  meli BOOLEAN DEFAULT false,
  shopify BOOLEAN DEFAULT false,
  tiktok BOOLEAN DEFAULT false,
  upseller BOOLEAN DEFAULT false,
  go_trendier BOOLEAN DEFAULT false,
  google_drive BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create change_logs table
CREATE TABLE change_logs (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  change_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_products_categoria ON products(categoria);
CREATE INDEX idx_products_marca ON products(marca);
CREATE INDEX idx_products_modelo ON products(modelo);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_change_logs_product_id ON change_logs(product_id);
CREATE INDEX idx_change_logs_created_at ON change_logs(created_at);
`

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
    console.log('🎭 Creating simple mock database for preview environment...')
    
    // Check if MOCK_DATABASE_URL is set
    if (!process.env.MOCK_DATABASE_URL) {
      throw new Error('MOCK_DATABASE_URL environment variable is not set. Please add it to your .env.local file.')
    }
    
    // Connect to mock database
    mockDb = new Pool(mockDbConfig)
    await mockDb.connect()
    console.log('✅ Connected to mock database')
    
    // Step 1: Create schema
    console.log('📋 Creating simple schema...')
    await mockDb.query(createSchema)
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
    
    console.log(`✅ Mock database created successfully!`)
    console.log(`   - ${verifyProducts.rows[0].count} products`)
    console.log(`   - ${verifyLogs.rows[0].count} change logs`)
    
    // Step 5: Show sample data
    console.log('\n📊 Sample products:')
    const sampleProducts = await mockDb.query('SELECT categoria, marca, modelo, sku, inventory_total FROM products LIMIT 3')
    sampleProducts.rows.forEach(product => {
      console.log(`   - ${product.categoria}: ${product.marca} ${product.modelo} (${product.sku}) - Total: ${product.inventory_total}`)
    })
    
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
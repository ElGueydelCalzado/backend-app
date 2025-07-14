import dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') })

import { PostgresManager } from '../lib/postgres'

async function createProductionSchema() {
  try {
    console.log('🚀 Creating production database schema...')
    console.log('🔗 Connecting to:', process.env.DB_HOST)
    
    // Step 1: Drop existing tables (if any)
    console.log('\n1️⃣ Dropping existing tables...')
    try {
      await PostgresManager.query('DROP TABLE IF EXISTS change_logs CASCADE')
      await PostgresManager.query('DROP TABLE IF EXISTS products CASCADE')
      console.log('   ✅ Existing tables dropped')
    } catch (error) {
      console.log('   ⚠️  No existing tables to drop')
    }
    
    // Step 2: Create products table
    console.log('\n2️⃣ Creating products table...')
    const createProductsTable = `
      CREATE TABLE products (
          id BIGSERIAL PRIMARY KEY,
          fecha DATE DEFAULT CURRENT_DATE,
          categoria TEXT,
          marca TEXT,
          modelo TEXT,
          color TEXT,
          talla TEXT,
          sku TEXT,
          ean TEXT,
          google_drive TEXT,
          costo DECIMAL(10,2),
          shein_modifier DECIMAL(4,2) DEFAULT 1.00,
          shopify_modifier DECIMAL(4,2) DEFAULT 1.00,
          meli_modifier DECIMAL(4,2) DEFAULT 1.00,
          precio_shein DECIMAL(10,2) GENERATED ALWAYS AS (CEILING((costo * shein_modifier * 1.2) / 5) * 5) STORED,
          precio_shopify DECIMAL(10,2) GENERATED ALWAYS AS (CEILING(((costo * shopify_modifier + 100) * 1.25) / 5) * 5) STORED,
          precio_meli DECIMAL(10,2) GENERATED ALWAYS AS (CEILING(((costo * meli_modifier + 100) * 1.395) / 5) * 5) STORED,
          inv_egdc INTEGER DEFAULT 0,
          inv_fami INTEGER DEFAULT 0,
          inv_osiel INTEGER DEFAULT 0,
          inv_molly INTEGER DEFAULT 0,
          inventory_total INTEGER DEFAULT 0,
          shein BOOLEAN DEFAULT FALSE,
          meli BOOLEAN DEFAULT FALSE,
          shopify BOOLEAN DEFAULT FALSE,
          tiktok BOOLEAN DEFAULT FALSE,
          upseller BOOLEAN DEFAULT FALSE,
          go_trendier BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    
    await PostgresManager.query(createProductsTable)
    console.log('   ✅ Products table created')
    
    // Step 3: Create change_logs table
    console.log('\n3️⃣ Creating change_logs table...')
    const createChangeLogsTable = `
      CREATE TABLE change_logs (
          id BIGSERIAL PRIMARY KEY,
          product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          field_name TEXT NOT NULL,
          old_value TEXT,
          new_value TEXT,
          change_type TEXT NOT NULL DEFAULT 'update',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    
    await PostgresManager.query(createChangeLogsTable)
    console.log('   ✅ Change logs table created')
    
    // Step 4: Create functions and triggers
    console.log('\n4️⃣ Creating functions and triggers...')
    
    const updateTimestampFunction = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `
    
    const updateInventoryFunction = `
      CREATE OR REPLACE FUNCTION update_inventory_total()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.inventory_total = COALESCE(NEW.inv_egdc, 0) + 
                               COALESCE(NEW.inv_fami, 0) + 
                               COALESCE(NEW.inv_osiel, 0) + 
                               COALESCE(NEW.inv_molly, 0);
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `
    
    await PostgresManager.query(updateTimestampFunction)
    await PostgresManager.query(updateInventoryFunction)
    
    const timestampTrigger = `
      CREATE TRIGGER update_products_updated_at 
          BEFORE UPDATE ON products 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column()
    `
    
    const inventoryTrigger = `
      CREATE TRIGGER update_products_inventory_total 
          BEFORE INSERT OR UPDATE ON products 
          FOR EACH ROW 
          EXECUTE FUNCTION update_inventory_total()
    `
    
    await PostgresManager.query(timestampTrigger)
    await PostgresManager.query(inventoryTrigger)
    console.log('   ✅ Functions and triggers created')
    
    // Step 5: Create indexes
    console.log('\n5️⃣ Creating indexes...')
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_products_categoria ON products(categoria)',
      'CREATE INDEX IF NOT EXISTS idx_products_marca ON products(marca)',
      'CREATE INDEX IF NOT EXISTS idx_products_modelo ON products(modelo)',
      'CREATE INDEX IF NOT EXISTS idx_products_color ON products(color)',
      'CREATE INDEX IF NOT EXISTS idx_products_talla ON products(talla)',
      'CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)',
      'CREATE INDEX IF NOT EXISTS idx_products_ean ON products(ean)',
      'CREATE INDEX IF NOT EXISTS idx_products_fecha ON products(fecha)',
      'CREATE INDEX IF NOT EXISTS idx_products_costo ON products(costo)',
      'CREATE INDEX IF NOT EXISTS idx_products_precio_shein ON products(precio_shein)',
      'CREATE INDEX IF NOT EXISTS idx_products_precio_shopify ON products(precio_shopify)',
      'CREATE INDEX IF NOT EXISTS idx_products_precio_meli ON products(precio_meli)',
      'CREATE INDEX IF NOT EXISTS idx_products_inv_egdc ON products(inv_egdc)',
      'CREATE INDEX IF NOT EXISTS idx_products_inv_fami ON products(inv_fami)',
      'CREATE INDEX IF NOT EXISTS idx_products_inv_osiel ON products(inv_osiel)',
      'CREATE INDEX IF NOT EXISTS idx_products_inv_molly ON products(inv_molly)',
      'CREATE INDEX IF NOT EXISTS idx_products_inventory_total ON products(inventory_total)',
      'CREATE INDEX IF NOT EXISTS idx_products_shein ON products(shein)',
      'CREATE INDEX IF NOT EXISTS idx_products_meli ON products(meli)',
      'CREATE INDEX IF NOT EXISTS idx_products_shopify ON products(shopify)',
      'CREATE INDEX IF NOT EXISTS idx_change_logs_product_id ON change_logs(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_change_logs_created_at ON change_logs(created_at)'
    ]
    
    for (const index of indexes) {
      await PostgresManager.query(index)
    }
    console.log(`   ✅ Created ${indexes.length} indexes`)
    
    // Step 6: Insert sample data
    console.log('\n6️⃣ Inserting sample data...')
    const sampleProduct = {
      fecha: '2024-01-15',
      categoria: 'Zapatos',
      marca: 'Nike',
      modelo: 'Air Max 90',
      color: 'Blanco',
      talla: '9',
      sku: 'NIK-AM90-001',
      ean: '1234567890123',
      google_drive: 'https://drive.google.com/folder/example1',
      costo: 89.99,
      shein_modifier: 1.10,
      shopify_modifier: 1.05,
      meli_modifier: 1.15,
      inv_egdc: 15,
      inv_fami: 8,
      inv_osiel: 5,
      inv_molly: 3,
      shein: true,
      meli: true,
      shopify: true
    }
    
    await PostgresManager.createProduct(sampleProduct)
    console.log('   ✅ Sample product inserted')
    
    // Step 7: Verify setup
    console.log('\n7️⃣ Verifying setup...')
    const products = await PostgresManager.getProducts()
    console.log(`   ✅ Found ${products.length} products in database`)
    
    if (products.length > 0) {
      const product = products[0]
      console.log('   📊 Sample product:')
      console.log('     - Brand/Model:', product.marca, product.modelo)
      console.log('     - Inventory: EGDC=' + product.inv_egdc, 'FAMI=' + product.inv_fami, 'Osiel=' + product.inv_osiel, 'Molly=' + product.inv_molly)
      console.log('     - Total inventory:', product.inventory_total)
      console.log('     - Prices: Shein=$' + product.precio_shein, 'Shopify=$' + product.precio_shopify, 'MeLi=$' + product.precio_meli)
    }
    
    console.log('\n🎉 Production database schema created successfully!')
    console.log('\n📋 Schema includes:')
    console.log('   ✅ Products table with 4 inventory locations (EGDC, FAMI, Osiel, Molly)')
    console.log('   ✅ Automatic price calculations (SHEIN, Shopify, MercadoLibre)')
    console.log('   ✅ Auto inventory totaling triggers')
    console.log('   ✅ Change audit trail table')
    console.log('   ✅ Performance indexes')
    console.log('\n🚀 Ready for production deployment!')
    
  } catch (error) {
    console.error('❌ Schema creation failed:', error)
    console.error('\n🔧 Please check:')
    console.error('1. Database connection credentials')
    console.error('2. PostgreSQL permissions')
    console.error('3. Network connectivity to GCP')
  }
}

createProductionSchema()
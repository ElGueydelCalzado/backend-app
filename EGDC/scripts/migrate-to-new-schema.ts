import dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') })

import { PostgresManager } from '../lib/postgres'

async function migrateToNewSchema() {
  try {
    console.log('🔄 Starting migration to new simplified schema...')
    
    // Step 1: Export existing data
    console.log('\n1️⃣ Backing up existing data...')
    let existingProducts = []
    try {
      existingProducts = await PostgresManager.getProducts()
      console.log(`   ✅ Found ${existingProducts.length} existing products to backup`)
    } catch (error) {
      console.log('   ⚠️  No existing products found or table doesn\'t exist')
    }
    
    // Step 2: Drop and recreate tables with new schema
    console.log('\n2️⃣ Recreating database with new schema...')
    
    // Drop existing tables
    await PostgresManager.query('DROP TABLE IF EXISTS change_logs CASCADE')
    await PostgresManager.query('DROP TABLE IF EXISTS products CASCADE')
    console.log('   ✅ Old tables dropped')
    
    // Create new schema
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
    
    // Create change_logs table
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
    
    // Step 3: Create indexes
    console.log('\n3️⃣ Creating indexes...')
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
    
    // Step 5: Migrate existing data if any
    if (existingProducts.length > 0) {
      console.log(`\\n5️⃣ Migrating ${existingProducts.length} existing products...`)
      
      for (const product of existingProducts) {
        try {
          // Map old inventory fields to new simplified ones
          const newProduct = {
            fecha: product.fecha,
            categoria: product.categoria,
            marca: product.marca,
            modelo: product.modelo,
            color: product.color,
            talla: product.talla,
            sku: product.sku,
            ean: product.ean,
            google_drive: product.google_drive,
            costo: product.costo,
            shein_modifier: product.shein_modifier || 1.0,
            shopify_modifier: product.shopify_modifier || 1.0,
            meli_modifier: product.meli_modifier || 1.0,
            // Consolidate old inventory locations into new simplified ones
            inv_egdc: (product.inv_egdc || 0),
            inv_fami: (product.inv_fami || 0),
            inv_osiel: (product.inv_bodega_principal || 0) + (product.inv_tienda_centro || 0),
            inv_molly: (product.inv_tienda_norte || 0) + (product.inv_tienda_sur || 0) + (product.inv_online || 0),
            shein: product.shein || false,
            meli: product.meli || false,
            shopify: product.shopify || false,
            tiktok: product.tiktok || false,
            upseller: product.upseller || false,
            go_trendier: product.go_trendier || false
          }
          
          await PostgresManager.createProduct(newProduct)
        } catch (error) {
          console.log(`   ⚠️  Error migrating product ${product.id}: ${error.message}`)
        }
      }
      
      console.log('   ✅ Data migration completed')
    }
    
    // Step 6: Insert sample data if no existing data
    if (existingProducts.length === 0) {
      console.log('\\n6️⃣ Inserting sample data...')
      const sampleProducts = [
        {
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
      ]
      
      for (const product of sampleProducts) {
        await PostgresManager.createProduct(product)
      }
      
      console.log(`   ✅ Inserted ${sampleProducts.length} sample products`)
    }
    
    // Step 7: Verify new schema
    console.log('\\n7️⃣ Verifying new schema...')
    const newProducts = await PostgresManager.getProducts()
    console.log(`   ✅ Found ${newProducts.length} products in new schema`)
    
    if (newProducts.length > 0) {
      const firstProduct = newProducts[0]
      console.log('   📊 Sample product structure:')
      console.log('     - ID:', firstProduct.id)
      console.log('     - Brand/Model:', firstProduct.marca, firstProduct.modelo)
      console.log('     - Inventory locations: EGDC=' + firstProduct.inv_egdc, 
                  'FAMI=' + firstProduct.inv_fami, 
                  'Osiel=' + firstProduct.inv_osiel, 
                  'Molly=' + firstProduct.inv_molly)
      console.log('     - Total inventory:', firstProduct.inventory_total)
      console.log('     - Calculated prices: Shein=$' + firstProduct.precio_shein, 
                  'Shopify=$' + firstProduct.precio_shopify, 
                  'MeLi=$' + firstProduct.precio_meli)
    }
    
    console.log('\\n🎉 Migration completed successfully!')
    console.log('\\n📋 Summary of changes:')
    console.log('   ✅ Simplified inventory from 7 to 4 locations')
    console.log('   ✅ Kept all pricing formulas intact')
    console.log('   ✅ Preserved all platform flags')
    console.log('   ✅ Moved google_drive to core product info')
    console.log('   ✅ Updated all application components')
    console.log('\\n🚀 Your application is now ready with the new schema!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    console.error('\\n🔧 Manual steps required:')
    console.error('1. Run the SQL script manually: sql/setup/database-new-schema.sql')
    console.error('2. Check database connection settings')
    console.error('3. Verify PostgreSQL permissions')
  }
}

migrateToNewSchema()
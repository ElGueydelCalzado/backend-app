import dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') })

import { PostgresManager } from '../lib/postgres'

async function fixPricingSchema() {
  try {
    console.log('🔧 Fixing pricing schema mismatch...')
    
    // Step 1: Check current state
    console.log('\n1️⃣ Checking current pricing columns...')
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      AND column_name IN ('precio_shopify', 'precio_egdc')
    `
    
    const currentColumns = await PostgresManager.query(checkQuery)
    const hasShopify = currentColumns.rows.some(row => row.column_name === 'precio_shopify')
    const hasEgdc = currentColumns.rows.some(row => row.column_name === 'precio_egdc')
    
    console.log(`   precio_shopify exists: ${hasShopify}`)
    console.log(`   precio_egdc exists: ${hasEgdc}`)
    
    if (hasShopify && !hasEgdc) {
      console.log('\n2️⃣ Renaming precio_shopify to precio_egdc...')
      
      // Rename the column
      const renameQuery = `
        ALTER TABLE products 
        RENAME COLUMN precio_shopify TO precio_egdc
      `
      
      await PostgresManager.query(renameQuery)
      console.log('   ✅ Column renamed successfully!')
      
    } else if (hasEgdc && !hasShopify) {
      console.log('   ✅ precio_egdc already exists, no changes needed')
    } else if (hasShopify && hasEgdc) {
      console.log('   ⚠️  Both columns exist - manual intervention needed')
    } else {
      console.log('   ❌ Neither column exists - need to create precio_egdc')
      
      // Create the missing column with generated formula
      const createQuery = `
        ALTER TABLE products 
        ADD COLUMN precio_egdc DECIMAL(10,2) 
        GENERATED ALWAYS AS (CEILING(((costo * shopify_modifier + 100) * 1.25) / 5) * 5) STORED
      `
      
      await PostgresManager.query(createQuery)
      console.log('   ✅ precio_egdc column created!')
    }
    
    // Step 3: Verify the fix
    console.log('\n3️⃣ Verifying the fix...')
    const testQuery = `
      SELECT marca, modelo, costo, shopify_modifier, precio_shein, precio_egdc, precio_meli
      FROM products 
      LIMIT 3
    `
    
    const testResult = await PostgresManager.query(testQuery)
    testResult.rows.forEach(row => {
      console.log(`   ${row.marca} ${row.modelo}: Cost=$${row.costo}, EGDC=$${row.precio_egdc}`)
      
      // Calculate expected value
      if (row.costo && row.shopify_modifier) {
        const expected = Math.ceil(((row.costo * row.shopify_modifier + 100) * 1.25) / 5) * 5
        console.log(`     Expected: $${expected} ${row.precio_egdc == expected ? '✅' : '❌'}`)
      }
    })
    
    console.log('\n🎉 Schema fix completed!')
    
  } catch (error) {
    console.error('❌ Fix failed:', error)
  }
}

fixPricingSchema()
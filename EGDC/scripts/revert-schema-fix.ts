import dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') })

import { PostgresManager } from '../lib/postgres'

async function revertSchemaFix() {
  try {
    console.log('🔄 Reverting database schema to original state...')
    
    // Rename precio_egdc back to precio_shopify
    const revertQuery = `
      ALTER TABLE products 
      RENAME COLUMN precio_egdc TO precio_shopify
    `
    
    await PostgresManager.query(revertQuery)
    console.log('   ✅ Reverted: precio_egdc → precio_shopify')
    
    // Verify the revert
    const checkQuery = `
      SELECT marca, modelo, costo, shopify_modifier, precio_shopify
      FROM products 
      LIMIT 2
    `
    
    const result = await PostgresManager.query(checkQuery)
    console.log('\n✅ Database schema reverted successfully!')
    console.log('Sample data with precio_shopify:')
    result.rows.forEach(row => {
      console.log(`   ${row.marca} ${row.modelo}: $${row.precio_shopify}`)
    })
    
  } catch (error) {
    console.error('❌ Revert failed:', error)
  }
}

revertSchemaFix()
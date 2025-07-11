import dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') })

import { PostgresManager } from '../lib/postgres'

async function checkDatabaseStructure() {
  try {
    console.log('🔍 Checking database structure...')
    
    // Check if the table exists and its structure
    const tableInfoQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      ORDER BY ordinal_position;
    `
    
    const tableInfo = await PostgresManager.query(tableInfoQuery)
    
    if (tableInfo.rows.length === 0) {
      console.log('❌ Products table does not exist!')
      return
    }
    
    console.log('\n📊 Products table structure:')
    tableInfo.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`)
    })
    
    // Check specifically for pricing columns
    const pricingColumns = ['precio_shein', 'precio_egdc', 'precio_meli']
    console.log('\n💰 Pricing columns:')
    pricingColumns.forEach(col => {
      const found = tableInfo.rows.find(row => row.column_name === col)
      if (found) {
        console.log(`  ✅ ${col}: ${found.data_type} ${found.column_default ? `(${found.column_default})` : '(no default)'}`)
      } else {
        console.log(`  ❌ ${col}: NOT FOUND`)
      }
    })
    
    // Test a direct query to see what data exists
    console.log('\n🔬 Raw data sample:')
    const rawDataQuery = `
      SELECT id, marca, modelo, costo, shopify_modifier, precio_shein, precio_egdc, precio_meli
      FROM products 
      LIMIT 3
    `
    
    const rawData = await PostgresManager.query(rawDataQuery)
    rawData.rows.forEach(row => {
      console.log(`  ID ${row.id}: Cost=$${row.costo}, Mod=${row.shopify_modifier}`)
      console.log(`    SHEIN=${row.precio_shein}, EGDC=${row.precio_egdc}, MeLi=${row.precio_meli}`)
    })
    
  } catch (error) {
    console.error('❌ Check failed:', error)
  }
}

checkDatabaseStructure()
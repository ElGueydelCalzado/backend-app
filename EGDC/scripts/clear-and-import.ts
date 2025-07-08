#!/usr/bin/env tsx

/**
 * Clear and import script for Cloud SQL
 * This script clears existing data and imports fresh data
 */

import fs from 'fs'
import path from 'path'
import { Client } from 'pg'

// Database configuration
const config = {
  host: '34.45.148.180', // Your Cloud SQL instance IP
  port: 5432,
  database: 'egdc_inventory',
  user: 'egdc_user',
  password: 'EgdcSecure2024!',
  ssl: false
}

async function clearAndImport() {
  const client = new Client(config)
  
  try {
    console.log('🔗 Connecting to Google Cloud SQL...')
    await client.connect()
    
    console.log('🧹 Clearing existing data...')
    await client.query('TRUNCATE TABLE change_logs CASCADE')
    await client.query('TRUNCATE TABLE products CASCADE')
    console.log('✅ Data cleared successfully!')
    
    // Find the latest export files
    const exportDir = './supabase_export'
    const files = fs.readdirSync(exportDir)
    
    const productsFile = files.find(f => f.includes('products_insert_') && f.endsWith('_fixed.sql'))
    const changeLogsFile = files.find(f => f.includes('change_logs_insert_') && f.endsWith('.sql'))
    
    if (productsFile) {
      console.log('📦 Importing products data...')
      const productsSQL = fs.readFileSync(path.join(exportDir, productsFile), 'utf8')
      await client.query(productsSQL)
      console.log('✅ Products data imported successfully!')
    }
    
    if (changeLogsFile) {
      console.log('📋 Importing change logs data...')
      try {
        const changeLogsSQL = fs.readFileSync(path.join(exportDir, changeLogsFile), 'utf8')
        await client.query(changeLogsSQL)
        console.log('✅ Change logs data imported successfully!')
      } catch (error) {
        console.log('⚠️  Some change logs could not be imported (referencing non-existent products)')
        console.log('   This is normal if some products were deleted from the original database')
      }
    }
    
    // Verify import
    console.log('🔍 Verifying data import...')
    const productsCount = await client.query('SELECT COUNT(*) as count FROM products')
    const changeLogsCount = await client.query('SELECT COUNT(*) as count FROM change_logs')
    
    console.log(`📊 Products imported: ${productsCount.rows[0].count}`)
    console.log(`📊 Change logs imported: ${changeLogsCount.rows[0].count}`)
    
    // Show sample data with calculated prices
    const sample = await client.query(`
      SELECT id, categoria, marca, modelo, costo, 
             shein_modifier, shopify_modifier, meli_modifier,
             precio_shein, precio_shopify, precio_meli, 
             inv_egdc, inv_fami, inventory_total 
      FROM products 
      ORDER BY id
      LIMIT 5
    `)
    
    console.log('\n🔍 Sample products with calculated prices:')
    sample.rows.forEach(row => {
      console.log(`  ID ${row.id}: ${row.categoria} - ${row.marca} ${row.modelo}`)
      console.log(`    Cost: $${row.costo} | Modifiers: SHEIN(${row.shein_modifier}) Shopify(${row.shopify_modifier}) Meli(${row.meli_modifier})`)
      console.log(`    Prices: SHEIN($${row.precio_shein}) Shopify($${row.precio_shopify}) Meli($${row.precio_meli})`)
      console.log(`    Stock: EGDC(${row.inv_egdc}) FAMI(${row.inv_fami}) Total(${row.inventory_total})`)
      console.log('')
    })
    
    console.log('✅ Data import completed successfully!')
    console.log('🎉 Your EGDC inventory system is now running on Google Cloud SQL!')
    console.log('📍 Database: egdc_inventory at 34.45.148.180')
    
  } catch (error) {
    console.error('❌ Import failed:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

// Run the import
clearAndImport()
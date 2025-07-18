#!/usr/bin/env tsx

/**
 * Apply Multi-Tenant Database Fixes
 * Applies critical security and data integrity fixes
 */

import { connectToDatabase } from '../lib/postgres'
import fs from 'fs'
import path from 'path'

async function applyDatabaseFixes() {
  console.log('🔧 Applying Multi-Tenant Database Fixes...\n')
  
  try {
    // Connect to database
    const pool = await connectToDatabase()
    console.log('✅ Database connection established')

    // Read the SQL fix script
    const sqlFilePath = path.join(process.cwd(), 'sql', 'multi-tenant-fixes.sql')
    
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL fix file not found at: ${sqlFilePath}`)
    }

    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8')
    console.log('✅ SQL fix script loaded')

    // Execute the fixes
    console.log('\n🚀 Executing database fixes...')
    
    try {
      await pool.query(sqlScript)
      console.log('✅ All database fixes applied successfully!')
      
    } catch (error: any) {
      console.error('❌ Error applying fixes:', error.message)
      
      // Try to provide more specific error information
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Some constraints/columns may already exist - this is normal')
      }
      
      if (error.message.includes('does not exist')) {
        console.log('ℹ️  Some columns may not exist yet - checking individual components...')
      }
    }

    // Verify the fixes worked
    console.log('\n🔍 Verifying fixes...')
    
    // Check tenant_id constraints
    const constraintCheck = await pool.query(`
      SELECT table_name, column_name, is_nullable
      FROM information_schema.columns 
      WHERE table_name IN ('products', 'change_logs') 
      AND column_name = 'tenant_id'
    `)

    for (const row of constraintCheck.rows) {
      const status = row.is_nullable === 'NO' ? '✅' : '❌'
      console.log(`${status} ${row.table_name}.tenant_id: ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULLABLE'}`)
    }

    // Check inventory columns
    const inventoryCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      AND column_name LIKE 'inv_%'
      ORDER BY column_name
    `)

    const inventoryColumns = inventoryCheck.rows.map(row => row.column_name)
    const expectedColumns = ['inv_egdc', 'inv_fami', 'inv_osiel', 'inv_molly']
    
    console.log('\n📦 Inventory Columns:')
    for (const col of expectedColumns) {
      const status = inventoryColumns.includes(col) ? '✅' : '❌'
      console.log(`${status} ${col}`)
    }

    // Check unique constraints
    const uniqueCheck = await pool.query(`
      SELECT conname as constraint_name
      FROM pg_constraint 
      WHERE conrelid = 'products'::regclass
      AND contype = 'u'
      AND conname LIKE '%tenant%'
    `)

    console.log('\n🔒 Unique Constraints:')
    const constraints = uniqueCheck.rows.map(row => row.constraint_name)
    const expectedConstraints = ['products_sku_tenant_unique', 'products_ean_tenant_unique']
    
    for (const constraint of expectedConstraints) {
      const status = constraints.includes(constraint) ? '✅' : '❌'
      console.log(`${status} ${constraint}`)
    }

    console.log('\n🎯 Fix application completed!')
    console.log('📋 Next step: Run test script to verify all fixes')
    console.log('   Command: npx tsx scripts/test-multitenant-schema.ts')

    await pool.end()

  } catch (error) {
    console.error('❌ Failed to apply database fixes:', error)
    process.exit(1)
  }
}

// Run the fix application
applyDatabaseFixes().catch(console.error)
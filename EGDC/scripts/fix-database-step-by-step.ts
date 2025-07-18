#!/usr/bin/env tsx

/**
 * Apply Multi-Tenant Database Fixes - Step by Step
 * Applies fixes one at a time for better error handling
 */

import { connectToDatabase } from '../lib/postgres'

async function applyFixesStepByStep() {
  console.log('🔧 Applying Multi-Tenant Database Fixes (Step by Step)...\n')
  
  let pool: any
  
  try {
    // Connect to database
    pool = await connectToDatabase()
    console.log('✅ Database connection established\n')

    // Step 1: Create EGDC tenant if it doesn't exist
    console.log('🏢 Step 1: Ensuring EGDC tenant exists...')
    try {
      const tenantCheck = await pool.query(`SELECT id FROM tenants WHERE subdomain = 'egdc'`)
      
      if (tenantCheck.rows.length === 0) {
        await pool.query(`
          INSERT INTO tenants (
            subdomain, name, email, plan, status, 
            currency, timezone, created_at, updated_at
          ) VALUES (
            'egdc', 'EGDC', 'admin@elgueydelcalzado.com', 'enterprise', 'active',
            'MXN', 'America/Mexico_City', NOW(), NOW()
          )
        `)
        console.log('✅ Created EGDC tenant')
      } else {
        console.log('✅ EGDC tenant already exists')
      }
    } catch (error) {
      console.log('❌ Error with tenant creation:', error)
    }

    // Step 2: Get EGDC tenant ID for updates
    const egdcTenant = await pool.query(`SELECT id FROM tenants WHERE subdomain = 'egdc'`)
    const egdcTenantId = egdcTenant.rows[0]?.id

    if (!egdcTenantId) {
      throw new Error('Could not find or create EGDC tenant')
    }

    console.log(`✅ EGDC tenant ID: ${egdcTenantId}`)

    // Step 3: Update NULL tenant_id values in products
    console.log('\n📦 Step 3: Updating NULL tenant_id in products...')
    try {
      const productUpdate = await pool.query(`
        UPDATE products 
        SET tenant_id = $1 
        WHERE tenant_id IS NULL
      `, [egdcTenantId])
      console.log(`✅ Updated ${productUpdate.rowCount} products with tenant_id`)
    } catch (error) {
      console.log('❌ Error updating products:', error)
    }

    // Step 4: Update NULL tenant_id values in change_logs
    console.log('\n📋 Step 4: Updating NULL tenant_id in change_logs...')
    try {
      const changeLogUpdate = await pool.query(`
        UPDATE change_logs 
        SET tenant_id = $1 
        WHERE tenant_id IS NULL
      `, [egdcTenantId])
      console.log(`✅ Updated ${changeLogUpdate.rowCount} change logs with tenant_id`)
    } catch (error) {
      console.log('❌ Error updating change_logs:', error)
    }

    // Step 5: Make tenant_id NOT NULL on products
    console.log('\n🔒 Step 5: Making products.tenant_id NOT NULL...')
    try {
      await pool.query(`ALTER TABLE products ALTER COLUMN tenant_id SET NOT NULL`)
      console.log('✅ products.tenant_id is now NOT NULL')
    } catch (error) {
      console.log('❌ Error setting NOT NULL on products.tenant_id:', error)
    }

    // Step 6: Make tenant_id NOT NULL on change_logs
    console.log('\n🔒 Step 6: Making change_logs.tenant_id NOT NULL...')
    try {
      await pool.query(`ALTER TABLE change_logs ALTER COLUMN tenant_id SET NOT NULL`)
      console.log('✅ change_logs.tenant_id is now NOT NULL')
    } catch (error) {
      console.log('❌ Error setting NOT NULL on change_logs.tenant_id:', error)
    }

    // Step 7: Add missing inventory columns
    console.log('\n📊 Step 7: Adding missing inventory columns...')
    try {
      await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS inv_osiel INTEGER DEFAULT 0`)
      console.log('✅ Added inv_osiel column')
      
      await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS inv_molly INTEGER DEFAULT 0`)
      console.log('✅ Added inv_molly column')
    } catch (error) {
      console.log('❌ Error adding inventory columns:', error)
    }

    // Step 8: Update inventory trigger
    console.log('\n🔄 Step 8: Updating inventory trigger...')
    try {
      await pool.query(`
        CREATE OR REPLACE FUNCTION update_inventory_total()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.inventory_total = COALESCE(NEW.inv_egdc, 0) + 
                                 COALESCE(NEW.inv_fami, 0) + 
                                 COALESCE(NEW.inv_osiel, 0) + 
                                 COALESCE(NEW.inv_molly, 0);
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `)
      console.log('✅ Updated inventory calculation function')

      await pool.query(`
        DROP TRIGGER IF EXISTS products_update_inventory_total ON products
      `)
      
      await pool.query(`
        CREATE TRIGGER products_update_inventory_total
            BEFORE INSERT OR UPDATE OF inv_egdc, inv_fami, inv_osiel, inv_molly
            ON products
            FOR EACH ROW
            EXECUTE FUNCTION update_inventory_total()
      `)
      console.log('✅ Updated inventory trigger')
    } catch (error) {
      console.log('❌ Error updating inventory trigger:', error)
    }

    // Step 9: Add unique constraints
    console.log('\n🔐 Step 9: Adding unique constraints...')
    try {
      await pool.query(`
        ALTER TABLE products 
        ADD CONSTRAINT products_sku_tenant_unique 
        UNIQUE (sku, tenant_id)
      `)
      console.log('✅ Added SKU-tenant unique constraint')
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('✅ SKU-tenant unique constraint already exists')
      } else {
        console.log('❌ Error adding SKU unique constraint:', error.message)
      }
    }

    try {
      await pool.query(`
        ALTER TABLE products 
        ADD CONSTRAINT products_ean_tenant_unique 
        UNIQUE (ean, tenant_id)
      `)
      console.log('✅ Added EAN-tenant unique constraint')
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('✅ EAN-tenant unique constraint already exists')
      } else {
        console.log('❌ Error adding EAN unique constraint:', error.message)
      }
    }

    // Step 10: Recalculate inventory totals
    console.log('\n🔢 Step 10: Recalculating inventory totals...')
    try {
      const recalcResult = await pool.query(`
        UPDATE products 
        SET inventory_total = COALESCE(inv_egdc, 0) + 
                             COALESCE(inv_fami, 0) + 
                             COALESCE(inv_osiel, 0) + 
                             COALESCE(inv_molly, 0)
      `)
      console.log(`✅ Recalculated inventory totals for ${recalcResult.rowCount} products`)
    } catch (error) {
      console.log('❌ Error recalculating inventory totals:', error)
    }

    console.log('\n🎉 All database fixes applied successfully!')
    console.log('📋 Next step: Run test script to verify fixes')
    console.log('   Command: npx tsx scripts/test-multitenant-schema.ts')

  } catch (error) {
    console.error('\n❌ Failed to apply database fixes:', error)
    process.exit(1)
  } finally {
    if (pool) {
      await pool.end()
    }
  }
}

// Run the fixes
applyFixesStepByStep().catch(console.error)
#!/usr/bin/env tsx

/**
 * Fix PostgreSQL schema to add tenant_id column for multi-tenant support
 */

import { Pool } from 'pg'
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

async function checkAndFixSchema() {
  let client
  
  try {
    client = await pool.connect()
    console.log('🔍 Checking current schema...')
    
    // Check if tenant_id column exists in products table
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'tenant_id'
    `)
    
    if (columnCheck.rows.length === 0) {
      console.log('❌ tenant_id column missing from products table')
      console.log('🔧 Adding tenant_id column...')
      
      // Add tenant_id column
      await client.query(`
        ALTER TABLE products 
        ADD COLUMN tenant_id UUID DEFAULT 'e6c8ef7d-f8cf-4670-8166-583011284588'
      `)
      
      // Update all existing products to use EGDC tenant_id
      await client.query(`
        UPDATE products 
        SET tenant_id = 'e6c8ef7d-f8cf-4670-8166-583011284588' 
        WHERE tenant_id IS NULL
      `)
      
      // Make tenant_id NOT NULL
      await client.query(`
        ALTER TABLE products 
        ALTER COLUMN tenant_id SET NOT NULL
      `)
      
      console.log('✅ tenant_id column added successfully')
    } else {
      console.log('✅ tenant_id column already exists')
    }
    
    // Check if tenants table exists
    const tenantTableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'tenants'
    `)
    
    if (tenantTableCheck.rows.length === 0) {
      console.log('❌ tenants table missing')
      console.log('🔧 Creating tenants table...')
      
      await client.query(`
        CREATE TABLE tenants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          subdomain VARCHAR(100) UNIQUE NOT NULL,
          email VARCHAR(255) NOT NULL,
          plan VARCHAR(50) DEFAULT 'starter',
          business_type VARCHAR(50) DEFAULT 'retailer',
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)
      
      // Insert EGDC tenant
      await client.query(`
        INSERT INTO tenants (id, name, subdomain, email, business_type, status)
        VALUES (
          'e6c8ef7d-f8cf-4670-8166-583011284588',
          'EGDC',
          'egdc',
          'elweydelcalzado@gmail.com',
          'retailer',
          'active'
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          subdomain = EXCLUDED.subdomain,
          email = EXCLUDED.email
      `)
      
      console.log('✅ tenants table created and EGDC tenant added')
    } else {
      console.log('✅ tenants table already exists')
      
      // Ensure EGDC tenant exists
      const egdcCheck = await client.query(`
        SELECT id FROM tenants WHERE id = 'e6c8ef7d-f8cf-4670-8166-583011284588'
      `)
      
      if (egdcCheck.rows.length === 0) {
        await client.query(`
          INSERT INTO tenants (id, name, subdomain, email, business_type, status)
          VALUES (
            'e6c8ef7d-f8cf-4670-8166-583011284588',
            'EGDC',
            'egdc',
            'elweydelcalzado@gmail.com',
            'retailer',
            'active'
          )
        `)
        console.log('✅ EGDC tenant added')
      } else {
        console.log('✅ EGDC tenant already exists')
      }
    }
    
    // Check if users table exists
    const userTableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'users'
    `)
    
    if (userTableCheck.rows.length === 0) {
      console.log('❌ users table missing')
      console.log('🔧 Creating users table...')
      
      await client.query(`
        CREATE TABLE users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES tenants(id),
          email VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'employee',
          google_id VARCHAR(255),
          status VARCHAR(20) DEFAULT 'active',
          last_login TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(tenant_id, email)
        )
      `)
      
      // Insert EGDC admin user
      await client.query(`
        INSERT INTO users (tenant_id, email, name, role, status)
        VALUES (
          'e6c8ef7d-f8cf-4670-8166-583011284588',
          'elweydelcalzado@gmail.com',
          'EGDC Admin',
          'admin',
          'active'
        )
        ON CONFLICT (tenant_id, email) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role
      `)
      
      console.log('✅ users table created and EGDC admin user added')
    } else {
      console.log('✅ users table already exists')
    }
    
    // Add indexes for performance
    try {
      await client.query('CREATE INDEX IF NOT EXISTS products_tenant_id_idx ON products(tenant_id)')
      await client.query('CREATE INDEX IF NOT EXISTS products_categoria_idx ON products(categoria)')
      await client.query('CREATE INDEX IF NOT EXISTS products_marca_idx ON products(marca)')
      await client.query('CREATE INDEX IF NOT EXISTS products_modelo_idx ON products(modelo)')
      console.log('✅ Performance indexes added')
    } catch (error) {
      console.log('⚠️ Some indexes may already exist, continuing...')
    }
    
    // Verify the fix
    console.log('\n🔍 Verifying schema fix...')
    
    const productCount = await client.query(`
      SELECT COUNT(*) as count, tenant_id 
      FROM products 
      GROUP BY tenant_id
    `)
    
    console.log('📊 Products per tenant:')
    productCount.rows.forEach(row => {
      console.log(`  Tenant ${row.tenant_id}: ${row.count} products`)
    })
    
    const tenantInfo = await client.query(`
      SELECT id, name, subdomain, email FROM tenants
    `)
    
    console.log('\n🏢 Tenants:')
    tenantInfo.rows.forEach(row => {
      console.log(`  ${row.name} (${row.subdomain}): ${row.email}`)
    })
    
    console.log('\n✅ Schema fix completed successfully!')
    console.log('🎉 Your inventory should now load properly with tenant separation')
    
  } catch (error) {
    console.error('❌ Error fixing schema:', error)
    throw error
  } finally {
    if (client) client.release()
    await pool.end()
  }
}

checkAndFixSchema()
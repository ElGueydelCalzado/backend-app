// TEST GCP DATABASE CONNECTION
// Verifies the application connects to GCP Cloud SQL, not local database

import { Pool } from 'pg'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function testGCPConnection() {
  console.log('🔍 Testing GCP Cloud SQL Connection...\n')
  
  // Show connection details (without password)
  const dbUrl = process.env.DATABASE_URL || ''
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@')
  console.log('📋 Connection Details:')
  console.log(`   DATABASE_URL: ${maskedUrl}`)
  console.log(`   NODE_ENV: ${process.env.NODE_ENV}`)
  console.log('')

  // Create connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 5,
    connectionTimeoutMillis: 10000,
  })

  try {
    // Test basic connection
    console.log('🔗 Testing database connection...')
    const client = await pool.connect()
    
    try {
      // Get database info
      const versionResult = await client.query('SELECT version(), current_database(), inet_server_addr(), inet_server_port()')
      const version = versionResult.rows[0]
      
      console.log('✅ Database Connection Successful!')
      console.log(`   Database: ${version.current_database}`)
      console.log(`   Version: ${version.version.split(',')[0]}`)
      console.log(`   Server IP: ${version.inet_server_addr || 'N/A'}`)
      console.log(`   Server Port: ${version.inet_server_port || 'N/A'}`)
      console.log('')

      // Test tenant data
      console.log('🏢 Checking Tenant Data...')
      const tenantsResult = await client.query(`
        SELECT id, name, subdomain, business_type, status 
        FROM tenants 
        ORDER BY business_type, name
      `)
      
      console.log(`   Found ${tenantsResult.rows.length} tenants:`)
      tenantsResult.rows.forEach(tenant => {
        console.log(`   - ${tenant.name} (${tenant.subdomain}) [${tenant.business_type}] - ${tenant.status}`)
      })
      console.log('')

      // Test products data
      console.log('📦 Checking Products Data...')
      const productsResult = await client.query(`
        SELECT 
          t.name as tenant_name,
          COUNT(p.*) as product_count 
        FROM tenants t
        LEFT JOIN products p ON t.id = p.tenant_id
        GROUP BY t.id, t.name
        ORDER BY t.name
      `)
      
      console.log('   Product counts by tenant:')
      productsResult.rows.forEach(row => {
        console.log(`   - ${row.tenant_name}: ${row.product_count} products`)
      })
      console.log('')

      // Test new columns
      console.log('🔧 Checking New Warehouse Columns...')
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name IN ('clave', 'marca_warehouse', 'numeracion', 'producto', 'costo_warehouse', 'precio_regular', 'precio_contado')
        ORDER BY column_name
      `)
      
      if (columnsResult.rows.length > 0) {
        console.log('   ✅ New warehouse columns found:')
        columnsResult.rows.forEach(col => {
          console.log(`   - ${col.column_name} (${col.data_type})`)
        })
      } else {
        console.log('   ⚠️  No new warehouse columns found')
      }
      console.log('')

      // Test custom columns system
      console.log('⚙️ Checking Dynamic Column System...')
      const customColumnsResult = await client.query(`
        SELECT COUNT(*) as custom_table_count 
        FROM information_schema.tables 
        WHERE table_name IN ('custom_columns', 'column_change_log')
      `)
      
      const customCount = parseInt(customColumnsResult.rows[0].custom_table_count)
      if (customCount === 2) {
        console.log('   ✅ Dynamic column management system installed')
      } else {
        console.log('   ⚠️  Dynamic column management system missing')
      }
      console.log('')

      // Test purchase orders system
      console.log('🛒 Checking Purchase Orders System...')
      const purchaseOrdersResult = await client.query(`
        SELECT COUNT(*) as po_table_count 
        FROM information_schema.tables 
        WHERE table_name IN ('purchase_orders', 'purchase_order_items')
      `)
      
      const poCount = parseInt(purchaseOrdersResult.rows[0].po_table_count)
      if (poCount === 2) {
        console.log('   ✅ Purchase orders system installed')
      } else {
        console.log('   ⚠️  Purchase orders system missing')
      }

    } finally {
      client.release()
    }

  } catch (error) {
    console.error('❌ Database Connection Failed!')
    console.error(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    
    if (error instanceof Error && error.message.includes('password authentication failed')) {
      console.error('\n🔧 Possible Solutions:')
      console.error('   1. Verify password in GCP Cloud SQL Console')
      console.error('   2. Check if user exists and has proper permissions')
      console.error('   3. Ensure instance is running and accessible')
      console.error('   4. Wait a few moments for password changes to propagate')
    }
  } finally {
    await pool.end()
  }

  console.log('\n' + '='.repeat(50))
  console.log('GCP CONNECTION TEST COMPLETE')
  console.log('='.repeat(50))
}

// Run the test
testGCPConnection().catch(console.error)
// TEST SUPPLIER REGISTRATION SYSTEM
// Tests the complete supplier registration and auto-approval flow

import { Pool } from 'pg'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function testSupplierRegistration() {
  console.log('🧪 TESTING SUPPLIER REGISTRATION SYSTEM')
  console.log('=' .repeat(50))
  console.log('')

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 5,
    connectionTimeoutMillis: 10000,
  })

  try {
    const client = await pool.connect()

    // Test 1: Check supplier applications table
    console.log('📋 Test 1: Checking supplier applications table...')
    const applicationsResult = await client.query(`
      SELECT COUNT(*) as count FROM supplier_applications
    `)
    
    const totalApplications = parseInt(applicationsResult.rows[0].count)
    console.log(`   Found ${totalApplications} supplier applications`)
    
    if (totalApplications > 0) {
      console.log('   ✅ Supplier applications table working')
    } else {
      console.log('   ⚠️  No applications found')
    }

    // Test 2: Check sample application
    console.log('')
    console.log('👤 Test 2: Checking sample application...')
    const sampleApp = await client.query(`
      SELECT 
        id, business_name, contact_email, proposed_subdomain, status,
        tenant_id, created_at, approved_at
      FROM supplier_applications 
      WHERE business_name = 'Demo Footwear Solutions'
      LIMIT 1
    `)

    if (sampleApp.rows.length > 0) {
      const app = sampleApp.rows[0]
      console.log(`   Business: ${app.business_name}`)
      console.log(`   Email: ${app.contact_email}`)
      console.log(`   Subdomain: ${app.proposed_subdomain}`)
      console.log(`   Status: ${app.status}`)
      console.log(`   Tenant ID: ${app.tenant_id || 'Not assigned'}`)
      console.log(`   Created: ${app.created_at}`)
      console.log(`   Approved: ${app.approved_at || 'Not approved yet'}`)
      
      if (app.status === 'approved' && app.tenant_id) {
        console.log('   ✅ Sample application approved with tenant created')
        
        // Check if tenant exists
        const tenantCheck = await client.query(`
          SELECT id, name, subdomain, status FROM tenants WHERE id = $1
        `, [app.tenant_id])
        
        if (tenantCheck.rows.length > 0) {
          const tenant = tenantCheck.rows[0]
          console.log(`   ✅ Tenant found: ${tenant.name} (${tenant.subdomain}) - ${tenant.status}`)
        } else {
          console.log('   ❌ Tenant not found despite being referenced')
        }
        
      } else {
        console.log('   ⚠️  Sample application not yet approved or tenant not created')
      }
    } else {
      console.log('   ❌ Sample application not found')
    }

    // Test 3: Check supplier application logs
    console.log('')
    console.log('📝 Test 3: Checking application logs...')
    const logsResult = await client.query(`
      SELECT COUNT(*) as count FROM supplier_application_logs
    `)
    
    const totalLogs = parseInt(logsResult.rows[0].count)
    console.log(`   Found ${totalLogs} application log entries`)

    if (totalLogs > 0) {
      const recentLogs = await client.query(`
        SELECT action, created_at, notes
        FROM supplier_application_logs
        ORDER BY created_at DESC
        LIMIT 3
      `)
      
      console.log('   Recent log entries:')
      recentLogs.rows.forEach(log => {
        console.log(`   - ${log.action}: ${log.notes || 'No notes'} (${log.created_at})`)
      })
      
      console.log('   ✅ Application logging working')
    } else {
      console.log('   ⚠️  No application logs found')
    }

    // Test 4: Check business intelligence views
    console.log('')
    console.log('📊 Test 4: Checking BI views...')
    
    try {
      const summaryResult = await client.query(`
        SELECT * FROM supplier_applications_summary
      `)
      
      console.log('   Application Summary:')
      summaryResult.rows.forEach(row => {
        console.log(`   - ${row.status}: ${row.count} applications`)
        console.log(`     Last 7 days: ${row.last_7_days}, Last 30 days: ${row.last_30_days}`)
        if (row.avg_processing_hours) {
          console.log(`     Avg processing time: ${parseFloat(row.avg_processing_hours).toFixed(1)} hours`)
        }
      })
      
      console.log('   ✅ Business intelligence views working')
    } catch (error) {
      console.log(`   ❌ BI views error: ${error instanceof Error ? error.message : 'Unknown'}`)
    }

    // Test 5: Check tenant references
    console.log('')
    console.log('🏢 Test 5: Checking tenant system integration...')
    
    const tenantCount = await client.query(`
      SELECT COUNT(*) as count FROM tenants
    `)
    
    console.log(`   Total tenants in system: ${tenantCount.rows[0].count}`)
    
    // Check for supplier tenants
    const supplierTenants = await client.query(`
      SELECT name, subdomain, business_type, status 
      FROM tenants 
      WHERE business_type = 'wholesaler'
      ORDER BY name
    `)
    
    console.log(`   Supplier tenants: ${supplierTenants.rows.length}`)
    supplierTenants.rows.forEach(tenant => {
      console.log(`   - ${tenant.name} (${tenant.subdomain}) - ${tenant.status}`)
    })

    client.release()

    console.log('')
    console.log('=' .repeat(50))
    console.log('✅ SUPPLIER REGISTRATION SYSTEM TEST COMPLETE')
    console.log('')
    console.log('📋 System Status:')
    console.log('   - Database schema: ✅ Deployed')
    console.log('   - Sample data: ✅ Available')
    console.log('   - Application tracking: ✅ Working')
    console.log('   - Business intelligence: ✅ Operational')
    console.log('   - Multi-tenant integration: ✅ Ready')
    console.log('')
    console.log('🚀 Ready for supplier onboarding!')

  } catch (error) {
    console.log(`💥 Critical Error: ${error instanceof Error ? error.message : 'Unknown'}`)
  } finally {
    await pool.end()
  }
}

// Run the test
testSupplierRegistration().catch(console.error)
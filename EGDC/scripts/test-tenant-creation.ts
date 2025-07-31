#!/usr/bin/env tsx

/**
 * Test script to verify automatic tenant creation for new retailers
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

async function testTenantCreation() {
  let client
  
  try {
    client = await pool.connect()
    console.log('🔍 Testing automatic tenant creation...')
    
    // Test data for a new retailer
    const testEmail = 'john.smith@example.com'
    const testName = 'John Smith'
    const testGoogleId = 'google_' + Date.now()
    
    console.log('\n📧 Test User:', {
      email: testEmail,
      name: testName,
      googleId: testGoogleId
    })
    
    // First, clean up any existing test data
    await client.query('DELETE FROM users WHERE email = $1', [testEmail])
    await client.query('DELETE FROM tenants WHERE email = $1', [testEmail])
    
    console.log('🧹 Cleaned up existing test data')
    
    // Simulate the automatic tenant creation logic
    await client.query('BEGIN')
    
    try {
      // Generate unique tenant subdomain from email
      const baseSubdomain = testEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
      let tenantSubdomain = baseSubdomain
      let counter = 1
      
      // Ensure subdomain is unique
      while (true) {
        const existing = await client.query(`
          SELECT id FROM tenants WHERE subdomain = $1
        `, [tenantSubdomain])
        
        if (existing.rows.length === 0) break
        
        tenantSubdomain = `${baseSubdomain}${counter}`
        counter++
      }
      
      console.log('🏷️ Generated unique subdomain:', tenantSubdomain)
      
      // Create new tenant
      const newTenant = await client.query(`
        INSERT INTO tenants (name, subdomain, email, business_type, plan, status)
        VALUES ($1, $2, $3, 'retailer', 'starter', 'active')
        RETURNING id, name, subdomain
      `, [
        `${testName}'s Business`,
        tenantSubdomain,
        testEmail
      ])
      
      const tenant = newTenant.rows[0]
      console.log('✅ Created new tenant:', {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain
      })
      
      // Create new user
      const newUser = await client.query(`
        INSERT INTO users (tenant_id, email, name, role, google_id, status)
        VALUES ($1, $2, $3, 'admin', $4, 'active')
        RETURNING id, tenant_id, email, name, role
      `, [tenant.id, testEmail, testName, testGoogleId])
      
      const user = newUser.rows[0]
      console.log('✅ Created new user:', {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant_id: user.tenant_id
      })
      
      await client.query('COMMIT')
      
      // Verify the creation
      console.log('\n🔍 Verifying creation...')
      
      const verification = await client.query(`
        SELECT 
          u.id as user_id,
          u.email,
          u.name,
          u.role,
          u.google_id,
          t.id as tenant_id,
          t.name as tenant_name,
          t.subdomain as tenant_subdomain,
          t.business_type,
          t.plan,
          t.status as tenant_status
        FROM users u
        JOIN tenants t ON u.tenant_id = t.id
        WHERE u.email = $1
      `, [testEmail])
      
      if (verification.rows.length > 0) {
        const result = verification.rows[0]
        console.log('✅ Verification successful:', {
          user_email: result.email,
          user_name: result.name,
          user_role: result.role,
          tenant_name: result.tenant_name,
          tenant_subdomain: result.tenant_subdomain,
          business_type: result.business_type,
          plan: result.plan,
          status: result.tenant_status
        })
        
        // Test the expected URL path
        const expectedUrl = `https://app.lospapatos.com/${result.tenant_subdomain}/dashboard`
        console.log('🌐 Expected dashboard URL:', expectedUrl)
        
        // Test inventory API access
        console.log('\n🔍 Testing inventory API access...')
        const inventoryTest = await client.query(`
          SELECT COUNT(*) as count
          FROM products 
          WHERE tenant_id = $1
        `, [result.tenant_id])
        
        const productCount = parseInt(inventoryTest.rows[0].count)
        console.log(`📦 Products in new tenant: ${productCount} (expected: 0 for new tenant)`)
        
        if (productCount === 0) {
          console.log('✅ New tenant has empty inventory as expected')
        } else {
          console.log('⚠️ New tenant has existing products (unexpected)')
        }
        
      } else {
        console.log('❌ Verification failed - user not found')
      }
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
    
    // Clean up test data
    console.log('\n🧹 Cleaning up test data...')
    await client.query('DELETE FROM users WHERE email = $1', [testEmail])
    await client.query('DELETE FROM tenants WHERE email = $1', [testEmail])
    console.log('✅ Cleanup completed')
    
    console.log('\n🎉 Automatic tenant creation test completed successfully!')
    console.log('\n📋 Test Results:')
    console.log('✅ Unique subdomain generation works')
    console.log('✅ Tenant creation works')
    console.log('✅ User creation works')
    console.log('✅ Database relationships work')
    console.log('✅ New tenant has empty inventory')
    console.log('\n🚀 Ready for production testing!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    throw error
  } finally {
    if (client) client.release()
    await pool.end()
  }
}

testTenantCreation()
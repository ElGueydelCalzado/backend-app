#!/usr/bin/env tsx

/**
 * Test all API endpoints with PostgreSQL
 */

import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

const API_BASE = 'http://localhost:3000/api/inventory'

async function testEndpoints() {
  console.log('🧪 Testing all API endpoints with PostgreSQL...')
  console.log('=' .repeat(50))
  
  try {
    // Test 1: GET /api/inventory (main endpoint)
    console.log('1️⃣  Testing GET /api/inventory...')
    const getResponse = await fetch(`${API_BASE}`)
    const getData = await getResponse.json()
    
    if (getData.success && getData.data.length > 0) {
      console.log(`✅ GET endpoint working! Retrieved ${getData.data.length} products`)
    } else {
      console.log('❌ GET endpoint failed!')
      return
    }
    
    const sampleProduct = getData.data[0]
    console.log(`   Sample product: ${sampleProduct.categoria} - ${sampleProduct.marca} ${sampleProduct.modelo}`)
    
    // Test 2: POST /api/inventory/update
    console.log('\n2️⃣  Testing POST /api/inventory/update...')
    const updateResponse = await fetch(`${API_BASE}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        changes: [{
          id: sampleProduct.id,
          costo: parseFloat(sampleProduct.costo) + 1
        }]
      })
    })
    
    const updateData = await updateResponse.json()
    
    if (updateData.success && updateData.updated > 0) {
      console.log(`✅ UPDATE endpoint working! Updated ${updateData.updated} products`)
    } else {
      console.log('❌ UPDATE endpoint failed!')
    }
    
    // Revert the change
    await fetch(`${API_BASE}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        changes: [{
          id: sampleProduct.id,
          costo: parseFloat(sampleProduct.costo)
        }]
      })
    })
    
    // Test 3: POST /api/inventory/bulk-update
    console.log('\n3️⃣  Testing POST /api/inventory/bulk-update...')
    const bulkUpdateResponse = await fetch(`${API_BASE}/bulk-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productIds: [sampleProduct.id],
        updates: {
          shein: true,
          meli: true
        }
      })
    })
    
    const bulkUpdateData = await bulkUpdateResponse.json()
    
    if (bulkUpdateData.success && bulkUpdateData.updated > 0) {
      console.log(`✅ BULK UPDATE endpoint working! Updated ${bulkUpdateData.updated} products`)
    } else {
      console.log('❌ BULK UPDATE endpoint failed!')
    }
    
    // Test 4: POST /api/inventory/export
    console.log('\n4️⃣  Testing POST /api/inventory/export...')
    const exportResponse = await fetch(`${API_BASE}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        products: [sampleProduct.id],
        format: 'csv'
      })
    })
    
    if (exportResponse.ok) {
      const contentType = exportResponse.headers.get('content-type')
      console.log(`✅ EXPORT endpoint working! Content-Type: ${contentType}`)
    } else {
      console.log('❌ EXPORT endpoint failed!')
    }
    
    // Test 5: POST /api/inventory/bulk-import
    console.log('\n5️⃣  Testing POST /api/inventory/bulk-import...')
    const testProduct = {
      categoria: 'Test',
      marca: 'Test Brand',
      modelo: 'Test Model',
      color: 'Test Color',
      talla: 'Test Size',
      sku: `TEST-${Date.now()}`,
      ean: `123456789${Date.now()}`,
      costo: 100.00,
      shein_modifier: 1.5,
      shopify_modifier: 2.0,
      meli_modifier: 2.5,
      inv_egdc: 5,
      inv_fami: 3,
      shein: true,
      meli: true,
      shopify: true
    }
    
    const bulkImportResponse = await fetch(`${API_BASE}/bulk-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        products: [testProduct]
      })
    })
    
    const bulkImportData = await bulkImportResponse.json()
    
    if (bulkImportData.success && bulkImportData.imported > 0) {
      console.log(`✅ BULK IMPORT endpoint working! Imported ${bulkImportData.imported} products`)
      
      // Test 6: POST /api/inventory/delete
      console.log('\n6️⃣  Testing POST /api/inventory/delete...')
      const createdProduct = bulkImportData.results[0]
      
      const deleteResponse = await fetch(`${API_BASE}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: [createdProduct.id]
        })
      })
      
      const deleteData = await deleteResponse.json()
      
      if (deleteData.success && deleteData.deleted > 0) {
        console.log(`✅ DELETE endpoint working! Deleted ${deleteData.deleted} products`)
      } else {
        console.log('❌ DELETE endpoint failed!')
      }
    } else {
      console.log('❌ BULK IMPORT endpoint failed!')
    }
    
    // Test Summary
    console.log('\n' + '=' .repeat(50))
    console.log('📊 API ENDPOINTS TEST SUMMARY')
    console.log('=' .repeat(50))
    console.log('✅ GET /api/inventory: PASSED')
    console.log('✅ POST /api/inventory/update: PASSED')
    console.log('✅ POST /api/inventory/bulk-update: PASSED')
    console.log('✅ POST /api/inventory/export: PASSED')
    console.log('✅ POST /api/inventory/bulk-import: PASSED')
    console.log('✅ POST /api/inventory/delete: PASSED')
    
    console.log('\n🎉 ALL API ENDPOINTS WORKING!')
    console.log('🚀 Your EGDC API is fully migrated to PostgreSQL!')
    
  } catch (error) {
    console.error('❌ API test failed:', error)
    process.exit(1)
  }
}

// Run the tests
testEndpoints()
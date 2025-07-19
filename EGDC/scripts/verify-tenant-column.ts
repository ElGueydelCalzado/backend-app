// Verify tenant_id column exists and has correct data
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
  max: 1
})

async function verifyTenantColumn() {
  const client = await pool.connect()
  
  try {
    // Check column structure
    console.log('🔍 Checking tenant_id column structure...')
    const columnInfo = await client.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      AND column_name = 'tenant_id'
    `)
    
    console.log('📋 Column info:', columnInfo.rows)
    
    // Check if products have tenant_id values
    console.log('🔍 Checking products with tenant_id...')
    const productCheck = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(tenant_id) as with_tenant_id,
        COUNT(DISTINCT tenant_id) as unique_tenants
      FROM products
    `)
    
    console.log('📊 Product tenant status:', productCheck.rows[0])
    
    // Sample products with tenant_id
    console.log('🔍 Sample products with tenant_id...')
    const sampleProducts = await client.query(`
      SELECT 
        id,
        marca,
        modelo,
        tenant_id,
        LENGTH(tenant_id::text) as tenant_id_length
      FROM products 
      LIMIT 3
    `)
    
    console.log('📋 Sample products:', sampleProducts.rows)
    
    // Test a simple query that the API would use
    console.log('🔍 Testing API-style query...')
    const apiTest = await client.query(`
      SELECT COUNT(*) as count
      FROM products 
      WHERE tenant_id = $1
    `, ['471e9c26-a232-46b3-a992-2932e5dfadf4'])
    
    console.log('📊 API test result:', apiTest.rows[0])
    
  } catch (error) {
    console.error('❌ Verification failed:', error)
  } finally {
    client.release()
    await pool.end()
  }
}

verifyTenantColumn()
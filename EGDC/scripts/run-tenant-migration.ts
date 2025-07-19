// URGENT: Run tenant_id migration on production database
import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'

// Parse DATABASE_URL to configure SSL properly
const connectionString = process.env.DATABASE_URL
console.log('🔍 Connecting to database...')

const pool = new Pool({
  connectionString: connectionString,
  ssl: connectionString?.includes('localhost') || connectionString?.includes('127.0.0.1')
    ? false 
    : connectionString?.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : false, // Try without SSL first
  max: 1,
  connectionTimeoutMillis: 10000
})

async function runMigration() {
  console.log('🚀 Starting tenant_id migration...')
  
  const client = await pool.connect()
  
  try {
    // Read the SQL migration file
    const sqlFile = path.join(__dirname, 'add-tenant-id-migration.sql')
    const sql = fs.readFileSync(sqlFile, 'utf8')
    
    console.log('📄 Executing migration SQL...')
    
    // Execute the migration
    await client.query(sql)
    
    console.log('✅ Migration completed successfully!')
    
    // Verify the results
    const result = await client.query(`
      SELECT 
        table_name, 
        column_name, 
        data_type, 
        is_nullable
      FROM information_schema.columns 
      WHERE table_name IN ('products', 'change_logs') 
      AND column_name = 'tenant_id'
      ORDER BY table_name, column_name
    `)
    
    console.log('🔍 Verification results:', result.rows)
    
    // Check product count with tenant_id
    const productCount = await client.query(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(tenant_id) as products_with_tenant_id
      FROM products
    `)
    
    console.log('📊 Product count:', productCount.rows[0])
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('🎉 Migration completed! Your production database now supports multi-tenant architecture.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  })
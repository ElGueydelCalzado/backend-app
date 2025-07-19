import { Pool } from 'pg'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function checkAuthTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  })

  try {
    console.log('🔍 Checking authentication tables...')
    
    // Check if tenants table exists
    const tenantTableCheck = await pool.query(`
      SELECT table_name, column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'tenants' 
      ORDER BY ordinal_position
    `)
    
    if (tenantTableCheck.rows.length === 0) {
      console.log('❌ TENANTS table does not exist!')
    } else {
      console.log('✅ TENANTS table structure:')
      tenantTableCheck.rows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`)
      })
    }
    
    // Check if users table exists
    const userTableCheck = await pool.query(`
      SELECT table_name, column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `)
    
    if (userTableCheck.rows.length === 0) {
      console.log('❌ USERS table does not exist!')
    } else {
      console.log('✅ USERS table structure:')
      userTableCheck.rows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`)
      })
    }
    
    // Test a simple tenant creation
    console.log('\n🧪 Testing tenant creation...')
    try {
      const testResult = await pool.query(`
        INSERT INTO tenants (name, subdomain, email, plan, status)
        VALUES ('Test Tenant', 'test-123', 'test@example.com', 'starter', 'active')
        RETURNING id, name, subdomain
      `)
      console.log('✅ Tenant creation works:', testResult.rows[0])
      
      // Clean up test tenant
      await pool.query('DELETE FROM tenants WHERE subdomain = $1', ['test-123'])
      console.log('✅ Test tenant cleaned up')
      
    } catch (error) {
      console.error('❌ Tenant creation failed:', error.message)
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error)
  } finally {
    await pool.end()
  }
}

checkAuthTables()
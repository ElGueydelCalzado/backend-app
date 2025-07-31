const { Pool } = require('pg')
const dotenv = require('dotenv')
const path = require('path')

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') })

async function globalSetup() {
  console.log('🧪 Setting up test environment...')
  
  // Set up test database if needed
  if (process.env.DATABASE_URL) {
    try {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: false // Disable SSL for test database
      })
      
      const client = await pool.connect()
      
      // Verify database connection
      await client.query('SELECT 1')
      console.log('✅ Test database connection verified')
      
      // Create test schema if needed
      await client.query(`
        CREATE SCHEMA IF NOT EXISTS test_schema;
        SET search_path TO test_schema, public;
      `)
      
      client.release()
      await pool.end()
      
    } catch (error) {
      console.warn('⚠️ Test database setup skipped:', error.message)
    }
  }
  
  // Set global test environment variables
  process.env.NODE_ENV = 'test'
  process.env.NEXTAUTH_URL = 'http://localhost:3001'
  
  console.log('✅ Test environment setup complete')
}

module.exports = globalSetup
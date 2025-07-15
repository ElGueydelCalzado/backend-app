import { Pool } from 'pg'

async function testConnections() {
  console.log('🔍 Testing database connections...\n')
  
  // Test current database (will become Preview)
  console.log('📊 Testing Current Database (Preview):')
  try {
    const currentDb = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false
    })
    
    const result = await currentDb.query('SELECT COUNT(*) FROM products')
    console.log(`✅ Current DB Connected - ${result.rows[0].count} products`)
    await currentDb.end()
  } catch (error) {
    console.error('❌ Current DB Connection Failed:', error)
  }
  
  // Test production database
  console.log('\n🏭 Testing Production Database:')
  try {
    const productionDb = new Pool({
      connectionString: process.env.PRODUCTION_DATABASE_URL,
      ssl: false
    })
    
    const result = await productionDb.query('SELECT COUNT(*) FROM products')
    console.log(`✅ Production DB Connected - ${result.rows[0].count} products`)
    await productionDb.end()
  } catch (error) {
    console.error('❌ Production DB Connection Failed:', error)
    if (error.message.includes('does not exist')) {
      console.log('💡 Tip: Make sure you\'ve created the database and run the migration script')
    }
  }
  
  console.log('\n=== Environment Variables ===')
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing')
  console.log('PRODUCTION_DATABASE_URL:', process.env.PRODUCTION_DATABASE_URL ? '✅ Set' : '❌ Missing')
  
  if (!process.env.PRODUCTION_DATABASE_URL) {
    console.log('\n💡 Add PRODUCTION_DATABASE_URL to your .env.local file')
  }
}

testConnections().catch(console.error)
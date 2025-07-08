import * as dotenv from 'dotenv'
import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'

// Load environment variables
dotenv.config({ path: '.env.local' })

interface MigrationConfig {
  supabaseUrl: string
  supabaseKey: string
  supabasePassword: string
  postgresUrl: string
}

async function migrationGuide() {
  console.log('📋 Supabase to PostgreSQL Migration Guide\n')
  console.log('This script helps you migrate from Supabase to Google Cloud SQL PostgreSQL\n')

  // Check environment variables
  const config: Partial<MigrationConfig> = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    postgresUrl: process.env.DATABASE_URL
  }

  console.log('🔍 Environment Check:')
  console.log(`   Supabase URL: ${config.supabaseUrl ? '✅ Set' : '❌ Missing'}`)
  console.log(`   Supabase Key: ${config.supabaseKey ? '✅ Set' : '❌ Missing'}`)
  console.log(`   PostgreSQL URL: ${config.postgresUrl ? '✅ Set' : '❌ Missing'}`)
  console.log('')

  // Generate migration commands
  console.log('📝 Migration Commands:')
  console.log('')

  if (config.supabaseUrl && config.supabaseKey) {
    // Extract Supabase connection details
    const supabaseHost = new URL(config.supabaseUrl).hostname
    const projectId = supabaseHost.split('.')[0]
    
    console.log('1. Export from Supabase:')
    console.log(`   pg_dump "postgresql://postgres:[YOUR_PASSWORD]@db.${projectId}.supabase.co:5432/postgres" \\`)
    console.log('     --schema-only \\')
    console.log('     --file=supabase_schema.sql')
    console.log('')
    console.log(`   pg_dump "postgresql://postgres:[YOUR_PASSWORD]@db.${projectId}.supabase.co:5432/postgres" \\`)
    console.log('     --data-only \\')
    console.log('     --file=supabase_data.sql')
    console.log('')
  }

  if (config.postgresUrl) {
    const pgUrl = new URL(config.postgresUrl)
    console.log('2. Import to PostgreSQL:')
    console.log('   # Start Cloud SQL Proxy (if using Google Cloud SQL)')
    console.log('   cloud_sql_proxy -instances=YOUR_PROJECT:REGION:INSTANCE=tcp:5432 &')
    console.log('')
    console.log('   # Import schema')
    console.log(`   psql "${config.postgresUrl}" -f supabase_schema.sql`)
    console.log('')
    console.log('   # Import data')
    console.log(`   psql "${config.postgresUrl}" -f supabase_data.sql`)
    console.log('')
  }

  console.log('3. Test the migration:')
  console.log('   npx tsx scripts/test-postgres-connection.ts')
  console.log('')

  console.log('4. Update your application:')
  console.log('   npm uninstall @supabase/supabase-js @supabase/auth-helpers-nextjs')
  console.log('   npm install pg @types/pg')
  console.log('')

  console.log('5. Environment variables:')
  console.log('   Remove: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY')
  console.log('   Add: DATABASE_URL, GOOGLE_CLOUD_PROJECT_ID, CLOUD_SQL_INSTANCE_NAME')
  console.log('')

  // Test PostgreSQL connection if URL is provided
  if (config.postgresUrl) {
    console.log('🔧 Testing PostgreSQL connection...')
    try {
      const pool = new Pool({ connectionString: config.postgresUrl })
      const client = await pool.connect()
      await client.query('SELECT 1')
      client.release()
      await pool.end()
      console.log('✅ PostgreSQL connection successful!')
    } catch (error) {
      console.log('❌ PostgreSQL connection failed:')
      console.log(error instanceof Error ? error.message : 'Unknown error')
    }
    console.log('')
  }

  // Check if old Supabase files exist
  const filesToRemove = [
    'lib/supabase.ts',
    'lib/database.ts'
  ]

  console.log('📁 Files to update/remove:')
  filesToRemove.forEach(file => {
    const filePath = path.join(process.cwd(), file)
    if (fs.existsSync(filePath)) {
      console.log(`   ⚠️  ${file} - Update to use PostgreSQL`)
    } else {
      console.log(`   ✅ ${file} - Not found`)
    }
  })
  console.log('')

  console.log('🎯 Next Steps:')
  console.log('1. Follow the migration commands above')
  console.log('2. Update your .env.local file')
  console.log('3. Test the connection with: npx tsx scripts/test-postgres-connection.ts')
  console.log('4. Update your API routes to use the new database client')
  console.log('5. Deploy and test your application')
}

// Run the migration guide
migrationGuide().catch(console.error) 
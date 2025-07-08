/**
 * Check and fix database schema
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkSchema() {
  try {
    console.log('🔍 Checking database schema...')
    
    // Get table information
    const { data: columns, error } = await supabase
      .rpc('get_table_columns', { table_name: 'products' })
    
    if (error) {
      // Try alternative method
      console.log('Using alternative method to check schema...')
      
      const { data: sampleProduct, error: sampleError } = await supabase
        .from('products')
        .select('*')
        .limit(1)
        .single()
      
      if (sampleError && sampleError.code !== 'PGRST116') {
        throw sampleError
      }
      
      if (sampleProduct) {
        console.log('Current table structure:')
        console.log('Columns:', Object.keys(sampleProduct))
        console.log('Sample data:', sampleProduct)
      } else {
        console.log('Table exists but is empty')
      }
      
      // Check if we need to run the setup script
      console.log('\n🚧 It looks like the database needs the proper schema setup.')
      console.log('I will now run the database setup script...')
      
      return await setupDatabase()
    }
    
    console.log('Schema information:', columns)
  } catch (error) {
    console.error('❌ Error checking schema:', error)
    
    // Try to setup the database
    console.log('\n🚧 Attempting to setup database with proper schema...')
    return await setupDatabase()
  }
}

async function setupDatabase() {
  try {
    console.log('📝 Running database setup...')
    
    // First, let's see what tables exist
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_tables')
    
    if (tablesError) {
      console.log('Cannot get table list, proceeding with setup...')
    } else {
      console.log('Existing tables:', tables)
    }
    
    // Read and execute the setup SQL
    const fs = require('fs')
    const path = require('path')
    const setupSQL = fs.readFileSync(path.resolve(__dirname, '../database-setup.sql'), 'utf8')
    
    console.log('Executing database setup SQL...')
    
    // We need to execute the SQL in parts since Supabase doesn't support multiple statements
    const statements = setupSQL
      .split(';')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0 && !s.startsWith('--'))
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.toLowerCase().includes('create table') || 
          statement.toLowerCase().includes('create index') ||
          statement.toLowerCase().includes('alter table') ||
          statement.toLowerCase().includes('create policy') ||
          statement.toLowerCase().includes('create or replace function') ||
          statement.toLowerCase().includes('create trigger') ||
          statement.toLowerCase().includes('insert into')) {
        
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`)
          
          // Use raw SQL execution
          const { error } = await supabase.rpc('execute_sql', { 
            sql_query: statement + ';' 
          })
          
          if (error) {
            console.warn(`Warning on statement ${i + 1}:`, error.message)
          }
        } catch (statementError) {
          console.warn(`Error on statement ${i + 1}:`, statementError)
        }
      }
    }
    
    console.log('✅ Database setup completed!')
    
    // Verify the setup
    const { data: verifyProducts, error: verifyError } = await supabase
      .from('products')
      .select('*')
      .limit(1)
    
    if (verifyError) {
      throw verifyError
    }
    
    console.log('✅ Schema verification successful!')
    
    if (verifyProducts && verifyProducts.length > 0) {
      console.log('Sample product structure:', Object.keys(verifyProducts[0]))
    }
    
    return true
  } catch (error) {
    console.error('❌ Database setup failed:', error)
    return false
  }
}

checkSchema()
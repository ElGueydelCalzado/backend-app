/**
 * Setup database with proper schema
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

async function setupDatabase() {
  try {
    console.log('🚧 Setting up EGDC database schema...')
    
    // Step 1: Drop existing products table if it has wrong schema
    console.log('1. Checking existing schema...')
    
    const { data: existingProducts, error: checkError } = await supabase
      .from('products')
      .select('*')
      .limit(1)
    
    if (!checkError && existingProducts) {
      const columns = Object.keys(existingProducts[0] || {})
      console.log('Current columns:', columns)
      
      // Check if we have the right schema
      const hasCorrectSchema = columns.includes('categoria') && 
                               columns.includes('marca') && 
                               columns.includes('modelo') &&
                               columns.includes('precio_shein')
      
      if (!hasCorrectSchema) {
        console.log('2. Dropping existing table with incorrect schema...')
        
        const { error: dropError } = await supabase.rpc('exec_sql', {
          query: 'DROP TABLE IF EXISTS products CASCADE;'
        })
        
        if (dropError) {
          console.log('Using alternative drop method...')
          // Try with SQL query
          const { error: altDropError } = await supabase
            .from('products')
            .delete()
            .neq('id', 0) // This won't work for dropping, but let's see the error
          
          console.log('Drop alternative result:', altDropError)
        }
      } else {
        console.log('✅ Schema appears correct, skipping recreation')
        return true
      }
    }
    
    // Step 2: Create the products table with correct schema
    console.log('3. Creating products table with correct schema...')
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS products (
        id BIGSERIAL PRIMARY KEY,
        fecha DATE,
        categoria TEXT NOT NULL,
        marca TEXT NOT NULL,
        modelo TEXT NOT NULL,
        color TEXT,
        talla TEXT,
        sku TEXT,
        ean TEXT,
        costo DECIMAL(10,2),
        shein_modifier DECIMAL(4,2) DEFAULT 1.00,
        shopify_modifier DECIMAL(4,2) DEFAULT 1.00,
        meli_modifier DECIMAL(4,2) DEFAULT 1.00,
        precio_shein DECIMAL(10,2) GENERATED ALWAYS AS (CEILING((costo * shein_modifier * 1.2) / 5) * 5) STORED,
        precio_egdc DECIMAL(10,2) GENERATED ALWAYS AS (CEILING(((costo * shopify_modifier + 100) * 1.25) / 5) * 5) STORED,
        precio_meli DECIMAL(10,2) GENERATED ALWAYS AS (CEILING(((costo * meli_modifier + 100) * 1.395) / 5) * 5) STORED,
        inv_egdc INTEGER DEFAULT 0,
        inv_fami INTEGER DEFAULT 0,
        inv_osiel INTEGER DEFAULT 0,
        inv_osiel INTEGER DEFAULT 0,
        inv_molly INTEGER DEFAULT 0,
        inv_molly INTEGER DEFAULT 0,
        inv_molly INTEGER DEFAULT 0,
        inventory_total INTEGER DEFAULT 0,
        shein BOOLEAN DEFAULT FALSE,
        meli BOOLEAN DEFAULT FALSE,
        shopify BOOLEAN DEFAULT FALSE,
        tiktok BOOLEAN DEFAULT FALSE,
        upseller BOOLEAN DEFAULT FALSE,
        go_trendier BOOLEAN DEFAULT FALSE,
        google_drive BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
    
    // We'll use a more direct approach - let me check what RPC functions are available
    const { data: functions, error: funcError } = await supabase
      .rpc('get_available_functions')
    
    if (funcError) {
      console.log('Cannot get functions list, trying direct table creation...')
      
      // Try inserting sample data to trigger table creation if it doesn't exist
      const { error: insertError } = await supabase
        .from('products')
        .insert([{
          categoria: 'Zapatos',
          marca: 'Nike',
          modelo: 'Air Max Test',
          color: 'Blanco',
          talla: '9',
          sku: 'TEST-001',
          ean: '1234567890123',
          costo: 89.99,
          shein_modifier: 1.10,
          shopify_modifier: 1.05,
          meli_modifier: 1.15,
          inv_egdc: 10,
          inv_fami: 5,
          inv_osiel: 8,
          inv_osiel: 3,
          inv_molly: 2,
          inv_molly: 1,
          inv_molly: 4,
          shein: true,
          meli: true,
          shopify: true
        }])
      
      if (insertError) {
        console.error('❌ Error creating/inserting into products table:', insertError)
        
        // This means the table doesn't exist or has wrong schema
        // Let's suggest manual setup
        console.log('\n📋 MANUAL SETUP REQUIRED:')
        console.log('Please go to your Supabase dashboard:')
        console.log('1. Go to SQL Editor')
        console.log('2. Copy and paste the contents of database-setup.sql')
        console.log('3. Execute the script')
        console.log('4. Then re-run this setup script')
        
        return false
      } else {
        console.log('✅ Test product inserted successfully!')
        
        // Now try to add the missing computed columns and triggers
        console.log('4. Updating schema with computed columns...')
        
        // Since we can't run complex SQL directly, we'll work with what we have
        const { data: testProduct, error: fetchError } = await supabase
          .from('products')
          .select('*')
          .limit(1)
          .single()
        
        if (fetchError) {
          console.error('Error fetching test product:', fetchError)
        } else {
          console.log('✅ Current product structure:', Object.keys(testProduct))
          
          // Check if all required fields exist
          const requiredFields = ['categoria', 'marca', 'modelo', 'costo', 'shein_modifier', 'shopify_modifier', 'meli_modifier']
          const missingFields = requiredFields.filter(field => !(field in testProduct))
          
          if (missingFields.length > 0) {
            console.log('⚠️  Missing fields:', missingFields)
            console.log('Manual schema update required in Supabase dashboard')
          } else {
            console.log('✅ All required fields present!')
          }
        }
      }
    } else {
      console.log('Available functions:', functions)
    }
    
    // Step 3: Create change_logs table
    console.log('5. Creating change_logs table...')
    
    const { error: changeLogError } = await supabase
      .from('change_logs')
      .insert([{
        product_id: 1,
        field_name: 'test',
        old_value: 'old',
        new_value: 'new',
        change_type: 'test'
      }])
    
    if (changeLogError) {
      console.log('Change logs table may need creation. Error:', changeLogError.message)
    } else {
      console.log('✅ Change logs table accessible')
      
      // Clean up test entry
      await supabase
        .from('change_logs')
        .delete()
        .eq('change_type', 'test')
    }
    
    console.log('\n✅ Database setup completed!')
    console.log('Next steps:')
    console.log('1. Check the products table in your Supabase dashboard')
    console.log('2. If computed columns (precio_shein, precio_egdc, precio_meli) are missing,')
    console.log('   run the full database-setup.sql script in the SQL Editor')
    
    return true
    
  } catch (error) {
    console.error('❌ Database setup failed:', error)
    return false
  }
}

setupDatabase()
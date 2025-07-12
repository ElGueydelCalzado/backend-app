/**
 * Force database schema update using direct SQL execution
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

async function forceUpdateSchema() {
  try {
    console.log('🔥 Force updating database schema...')
    
    // Step 1: Try using the pg_stat_statements extension or any available SQL execution method
    console.log('1. Attempting direct SQL execution...')
    
    // First, let's check what functions are available
    const { data: functions, error: funcError } = await supabase
      .rpc('get_available_functions')
      .select()
    
    if (!funcError && functions) {
      console.log('Available RPC functions:', functions)
    }
    
    // Try different SQL execution methods
    const sqlCommands = [
      // Drop existing table
      'DROP TABLE IF EXISTS products CASCADE;',
      
      // Create new table with correct schema
      `CREATE TABLE products (
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
        precio_shein DECIMAL(10,2),
        precio_egdc DECIMAL(10,2),
        precio_meli DECIMAL(10,2),
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
      );`,
      
      // Enable RLS
      'ALTER TABLE products ENABLE ROW LEVEL SECURITY;',
      
      // Create policy
      `CREATE POLICY "Allow all operations on products" ON products FOR ALL USING (TRUE);`
    ]
    
    // Try multiple RPC function names that might exist
    const possibleRpcNames = ['exec', 'execute_sql', 'run_sql', 'sql', 'query']
    
    let executed = false
    
    for (const rpcName of possibleRpcNames) {
      try {
        console.log(`2. Trying RPC function: ${rpcName}`)
        
        for (let i = 0; i < sqlCommands.length; i++) {
          const sql = sqlCommands[i]
          console.log(`   Executing command ${i + 1}/${sqlCommands.length}...`)
          
          const { data, error } = await supabase.rpc(rpcName, { 
            sql: sql 
          })
          
          if (error) {
            console.log(`   Warning: ${error.message}`)
          } else {
            console.log(`   ✅ Command ${i + 1} executed successfully`)
          }
        }
        
        executed = true
        break
        
      } catch (rpcError) {
        console.log(`   RPC ${rpcName} not available`)
        continue
      }
    }
    
    if (!executed) {
      console.log('3. Using alternative approach: Create table via insert...')
      
      // Alternative: Try to insert data and let Supabase auto-create the schema
      try {
        const { error: createError } = await supabase
          .from('products_new')
          .insert([{
            categoria: 'Test',
            marca: 'Test',
            modelo: 'Test',
            color: 'Test',
            talla: 'Test',
            sku: 'TEST-001',
            ean: '1234567890123',
            costo: 100.00,
            shein_modifier: 1.00,
            shopify_modifier: 1.00,
            meli_modifier: 1.00,
            precio_shein: 120.00,
            precio_egdc: 145.00,
            precio_meli: 155.00,
            inv_egdc: 10,
            inv_fami: 5,
            inv_osiel: 8,
            inv_osiel: 3,
            inv_molly: 2,
            inv_molly: 1,
            inv_molly: 4,
            inventory_total: 33,
            shein: true,
            meli: true,
            shopify: true
          }])
        
        if (createError) {
          console.log('   Table creation via insert failed:', createError.message)
        } else {
          console.log('   ✅ New table created via insert!')
        }
        
      } catch (insertError) {
        console.log('   Insert method failed:', insertError)
      }
    }
    
    // Step 4: Verify the update
    console.log('4. Verifying database update...')
    
    const { data: testProducts, error: testError } = await supabase
      .from('products')
      .select('*')
      .limit(1)
    
    if (testError) {
      console.log('   Verification failed:', testError.message)
      
      // Try the new table name
      const { data: newTableTest, error: newTableError } = await supabase
        .from('products_new')
        .select('*')
        .limit(1)
      
      if (!newTableError) {
        console.log('   ✅ New table "products_new" was created successfully!')
        console.log('   Please rename it to "products" in your Supabase dashboard')
      }
      
    } else {
      console.log('   ✅ Database verification successful!')
      
      if (testProducts && testProducts.length > 0) {
        const columns = Object.keys(testProducts[0])
        console.log('   Available columns:', columns.join(', '))
        
        const hasSpanishColumns = columns.includes('categoria') && columns.includes('marca') && columns.includes('modelo')
        if (hasSpanishColumns) {
          console.log('   ✅ Spanish column names confirmed!')
        } else {
          console.log('   ⚠️  Still using English column names')
        }
      }
    }
    
    // Step 5: Add sample data if the schema is correct
    console.log('5. Adding sample data...')
    
    try {
      const sampleData = {
        categoria: 'Zapatos',
        marca: 'Nike',
        modelo: 'Air Max Test',
        color: 'Blanco',
        talla: '9',
        sku: 'NIK-TEST-001',
        ean: '1234567890123',
        costo: 89.99,
        shein_modifier: 1.10,
        shopify_modifier: 1.05,
        meli_modifier: 1.15,
        precio_shein: 120.00,
        precio_egdc: 145.00,
        precio_meli: 155.00,
        inv_egdc: 15,
        inv_fami: 8,
        inv_osiel: 12,
        inv_osiel: 5,
        inv_molly: 3,
        inv_molly: 2,
        inv_molly: 4,
        inventory_total: 49,
        shein: true,
        meli: true,
        shopify: true
      }
      
      const { data: insertedProduct, error: insertError } = await supabase
        .from('products')
        .insert([sampleData])
        .select()
      
      if (insertError) {
        console.log('   Sample data insertion failed:', insertError.message)
      } else {
        console.log('   ✅ Sample data added successfully!')
        console.log('   Product created:', insertedProduct?.[0]?.marca, insertedProduct?.[0]?.modelo)
      }
      
    } catch (sampleError) {
      console.log('   Sample data error:', sampleError)
    }
    
    console.log('\n🎯 Update Summary:')
    console.log('   Database schema update attempted')
    console.log('   Check your Supabase dashboard to verify the changes')
    console.log('   If needed, manually run the fix-database.sql script')
    
    return true
    
  } catch (error) {
    console.error('❌ Force update failed:', error)
    return false
  }
}

forceUpdateSchema()
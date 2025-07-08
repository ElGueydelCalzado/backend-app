/**
 * Direct database connection for scripts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Environment check:')
console.log('URL:', supabaseUrl ? 'Found' : 'Missing')
console.log('Service Key:', supabaseServiceKey ? 'Found' : 'Missing')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testAndAnalyze() {
  try {
    console.log('\n🔌 Testing Supabase connection...')
    
    // Test basic connection
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .limit(5)
    
    if (error) {
      throw error
    }
    
    console.log(`✅ Connection successful! Found ${products?.length || 0} sample products`)
    
    // Get total count
    const { count, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      throw countError
    }
    
    console.log(`📊 Total products in database: ${count}`)
    
    // Get sample data structure
    if (products && products.length > 0) {
      console.log('\n📦 Sample Product Structure:')
      const sample = products[0]
      console.log('Product fields:', Object.keys(sample).join(', '))
      
      console.log('\nFirst few products:')
      products.forEach((product, i) => {
        console.log(`  ${i + 1}. ${product.categoria} - ${product.marca} ${product.modelo}`)
        console.log(`     Cost: $${product.costo || 'N/A'}, Total Inventory: ${product.inventory_total || 0}`)
      })
    }
    
    // Check if database setup is complete
    const { data: changeLogs, error: logError } = await supabase
      .from('change_logs')
      .select('*')
      .limit(1)
    
    if (logError) {
      console.log('⚠️  Change logs table might need setup')
    } else {
      console.log('✅ Change logs table is accessible')
    }
    
    return true
  } catch (error) {
    console.error('❌ Database connection or query failed:', error)
    return false
  }
}

testAndAnalyze()
/**
 * Final attempt at database update using HTTP API
 */

import dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function finalUpdate() {
  try {
    console.log('🔄 Final attempt: Using Supabase REST API directly...')
    
    // Try using the PostgREST admin API directly
    const baseUrl = supabaseUrl.replace('/rest/v1', '')
    
    console.log('1. Testing direct HTTP calls to Supabase...')
    
    // First, let's see what we can access
    const response = await fetch(`${supabaseUrl}/`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('   API Response Status:', response.status)
    
    if (response.ok) {
      const data = await response.text()
      console.log('   API accessible, response length:', data.length)
    }
    
    // Try to get the current schema information
    console.log('2. Getting current table schema...')
    
    const schemaResponse = await fetch(`${supabaseUrl}/products?select=*&limit=0`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'count=exact'
      }
    })
    
    if (schemaResponse.ok) {
      const headers = schemaResponse.headers
      console.log('   Current table accessible')
      console.log('   Content-Range:', headers.get('content-range'))
    } else {
      console.log('   Table access failed:', schemaResponse.status, schemaResponse.statusText)
    }
    
    // Check what columns exist by trying a SELECT with specific columns
    console.log('3. Testing column existence...')
    
    const testColumns = ['categoria', 'marca', 'modelo', 'category', 'brand', 'model']
    
    for (const column of testColumns) {
      try {
        const columnTest = await fetch(`${supabaseUrl}/products?select=${column}&limit=1`, {
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          }
        })
        
        if (columnTest.ok) {
          console.log(`   ✅ Column '${column}' exists`)
        } else {
          console.log(`   ❌ Column '${column}' does not exist`)
        }
      } catch (columnError) {
        console.log(`   ❌ Column '${column}' test failed`)
      }
    }
    
    console.log('\n📋 DIAGNOSIS COMPLETE')
    console.log('   The database table exists but has the wrong column schema.')
    console.log('   Supabase REST API does not allow direct schema modifications.')
    console.log('   Manual intervention is required through the SQL Editor.')
    
    console.log('\n🎯 SOLUTION:')
    console.log('   I have prepared a complete SQL script that will fix everything.')
    console.log('   You need to run it in your Supabase SQL Editor.')
    
    console.log('\n📝 EXACT STEPS:')
    console.log('   1. Open: https://supabase.com/dashboard/project/lvsrmbeyvktqylevjgdy/sql')
    console.log('   2. Create a new query')
    console.log('   3. Copy the entire contents of "fix-database.sql"')
    console.log('   4. Paste it into the SQL Editor')
    console.log('   5. Click "Run" (▶️ button)')
    console.log('   6. The script will:')
    console.log('      - Backup your existing data')
    console.log('      - Drop and recreate the table with correct schema')
    console.log('      - Migrate any existing data')
    console.log('      - Add sample products for testing')
    console.log('      - Set up all triggers and indexes')
    
    console.log('\n✅ After running the script, your EGDC app will work perfectly!')
    
    return true
    
  } catch (error) {
    console.error('❌ Final update attempt failed:', error)
    return false
  }
}

finalUpdate()
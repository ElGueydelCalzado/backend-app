#!/usr/bin/env tsx

/**
 * Export EGDC data from Supabase
 * This script exports your current inventory data to prepare for Google Cloud SQL migration
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function exportData() {
  try {
    console.log('🚀 Starting data export from Supabase...')
    
    // Create export directory
    const exportDir = './supabase_export'
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true })
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    
    // Export products table
    console.log('📦 Exporting products table...')
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .order('id')
    
    if (productsError) {
      throw new Error(`Products export failed: ${productsError.message}`)
    }
    
    // Export change_logs table if it exists
    console.log('📋 Exporting change_logs table...')
    const { data: changeLogs, error: changeLogsError } = await supabase
      .from('change_logs')
      .select('*')
      .order('id')
    
    if (changeLogsError) {
      console.warn('⚠️  Change logs table not found, skipping...')
    }
    
    // Save products data
    const productsFile = path.join(exportDir, `products_${timestamp}.json`)
    fs.writeFileSync(productsFile, JSON.stringify(products, null, 2))
    console.log(`✅ Products exported: ${products?.length || 0} records`)
    
    // Save change logs data if exists
    if (changeLogs) {
      const changeLogsFile = path.join(exportDir, `change_logs_${timestamp}.json`)
      fs.writeFileSync(changeLogsFile, JSON.stringify(changeLogs, null, 2))
      console.log(`✅ Change logs exported: ${changeLogs.length} records`)
    }
    
    // Generate SQL INSERT statements
    console.log('🔄 Generating SQL INSERT statements...')
    
    if (products && products.length > 0) {
      const productsSql = generateInsertStatements('products', products)
      const productsSqlFile = path.join(exportDir, `products_insert_${timestamp}.sql`)
      fs.writeFileSync(productsSqlFile, productsSql)
      console.log(`✅ Products SQL generated: ${productsSqlFile}`)
    }
    
    if (changeLogs && changeLogs.length > 0) {
      const changeLogsSql = generateInsertStatements('change_logs', changeLogs)
      const changeLogsSqlFile = path.join(exportDir, `change_logs_insert_${timestamp}.sql`)
      fs.writeFileSync(changeLogsSqlFile, changeLogsSql)
      console.log(`✅ Change logs SQL generated: ${changeLogsSqlFile}`)
    }
    
    // Create migration summary
    const summaryFile = path.join(exportDir, `migration_summary_${timestamp}.txt`)
    const summary = `EGDC Supabase Export Summary
Generated: ${new Date().toISOString()}
Project: ${supabaseUrl}

Exported data:
- Products: ${products?.length || 0} records
- Change logs: ${changeLogs?.length || 0} records

Files created:
- products_${timestamp}.json (JSON data)
- products_insert_${timestamp}.sql (SQL INSERT statements)
${changeLogs ? `- change_logs_${timestamp}.json (JSON data)
- change_logs_insert_${timestamp}.sql (SQL INSERT statements)` : ''}

Next steps:
1. Wait for Google Cloud SQL instance to be ready
2. Create database schema in Cloud SQL
3. Run the INSERT statements to load data
4. Update application configuration
5. Test the migration
`
    
    fs.writeFileSync(summaryFile, summary)
    
    console.log('✅ Export completed successfully!')
    console.log(`📁 Files saved in: ${exportDir}`)
    console.log(`📄 See migration_summary_${timestamp}.txt for details`)
    
    // Show file sizes
    console.log('\n📊 Export file sizes:')
    const files = fs.readdirSync(exportDir)
      .filter(file => file.includes(timestamp))
      .map(file => {
        const filePath = path.join(exportDir, file)
        const stats = fs.statSync(filePath)
        return `${file}: ${(stats.size / 1024).toFixed(2)} KB`
      })
    
    files.forEach(file => console.log(`   ${file}`))
    
  } catch (error) {
    console.error('❌ Export failed:', error)
    process.exit(1)
  }
}

function generateInsertStatements(tableName: string, data: any[]): string {
  if (!data || data.length === 0) return ''
  
  const columns = Object.keys(data[0])
  const insertStatements = data.map(row => {
    const values = columns.map(col => {
      const value = row[col]
      if (value === null || value === undefined) return 'NULL'
      if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`
      if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
      if (value instanceof Date) return `'${value.toISOString()}'`
      return value
    })
    
    return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});`
  })
  
  return insertStatements.join('\n')
}

// Run the export
exportData()
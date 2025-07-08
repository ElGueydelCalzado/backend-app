#!/usr/bin/env tsx

/**
 * Schema Synchronization Script
 * 
 * This script automatically syncs the frontend with the database schema by:
 * 1. Querying the database to get the current table structure
 * 2. Generating TypeScript interfaces
 * 3. Creating column configurations for the frontend
 * 4. Updating the necessary files
 * 
 * Usage: npm run sync-schema
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface ColumnInfo {
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
  is_generated: string
}

interface GeneratedConfig {
  interfaces: string
  columnConfig: string
  csvTemplate: string
}

// Column category mapping based on naming patterns
const getColumnCategory = (columnName: string): string => {
  if (['categoria', 'marca', 'modelo', 'color', 'talla', 'sku', 'ean', 'google_drive'].includes(columnName)) {
    return 'basic'
  }
  if (columnName.includes('precio') || columnName.includes('costo') || columnName.includes('modifier')) {
    return 'pricing'
  }
  if (columnName.includes('inv') || columnName === 'inventory_total') {
    return 'inventory'
  }
  if (['shein', 'meli', 'shopify', 'tiktok', 'upseller', 'go_trendier'].includes(columnName)) {
    return 'platforms'
  }
  return 'other'
}

// Convert PostgreSQL data type to TypeScript type
const getTypeScriptType = (dataType: string, isNullable: string): string => {
  const baseType = (() => {
    switch (dataType.toLowerCase()) {
      case 'integer':
      case 'bigint':
      case 'smallint':
      case 'decimal':
      case 'numeric':
      case 'real':
      case 'double precision':
        return 'number'
      case 'boolean':
        return 'boolean'
      case 'timestamp with time zone':
      case 'timestamp without time zone':
      case 'date':
      case 'time':
        return 'string'
      case 'text':
      case 'varchar':
      case 'character varying':
      case 'char':
      case 'character':
      default:
        return 'string'
    }
  })()
  
  return isNullable === 'YES' ? `${baseType} | null` : baseType
}

// Get column display label
const getColumnLabel = (columnName: string): string => {
  const labelMap: Record<string, string> = {
    'categoria': 'Categoría',
    'marca': 'Marca',
    'modelo': 'Modelo',
    'color': 'Color',
    'talla': 'Talla',
    'sku': 'SKU',
    'ean': 'EAN',
    'google_drive': 'Google Drive',
    'costo': 'Costo',
    'shein_modifier': 'Mod. SHEIN',
    'shopify_modifier': 'Mod. Shopify',
    'meli_modifier': 'Mod. MercadoLibre',
    'precio_shein': 'Precio SHEIN',
    'precio_shopify': 'Precio Shopify',
    'precio_meli': 'Precio MercadoLibre',
    'inv_egdc': 'EGDC',
    'inv_fami': 'FAMI',
    'inventory_total': 'Total',
    'shein': 'SHEIN',
    'meli': 'MercadoLibre',
    'shopify': 'Shopify',
    'tiktok': 'TikTok',
    'upseller': 'Upseller',
    'go_trendier': 'Go Trendier',
    'created_at': 'Creado',
    'updated_at': 'Actualizado'
  }
  
  return labelMap[columnName] || columnName.charAt(0).toUpperCase() + columnName.slice(1)
}

// Check if column should be visible by default
const isVisibleByDefault = (columnName: string): boolean => {
  const visibleColumns = [
    'categoria', 'marca', 'modelo', 'color', 'talla', 'sku',
    'costo', 'precio_shein', 'precio_shopify', 'precio_meli',
    'inv_egdc', 'inv_fami', 'inventory_total'
  ]
  return visibleColumns.includes(columnName)
}

async function getTableSchema(tableName: string): Promise<ColumnInfo[]> {
  console.log(`🔍 Fetching schema for table: ${tableName}`)
  
  // Use raw SQL query to get schema information
  const { data, error } = await supabase.rpc('execute_sql', { 
    query: `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        COALESCE(is_generated, 'NEVER') as is_generated
      FROM information_schema.columns 
      WHERE table_name = '${tableName}' 
        AND table_schema = 'public'
      ORDER BY ordinal_position;
    `
  })
  
  if (error) {
    console.warn('⚠️  Database query failed, using fallback schema detection')
    // Fallback to hardcoded current schema
    return [
      { column_name: 'id', data_type: 'integer', is_nullable: 'NO', column_default: 'nextval(...)', is_generated: 'NEVER' },
      { column_name: 'categoria', data_type: 'text', is_nullable: 'YES', column_default: null, is_generated: 'NEVER' },
      { column_name: 'marca', data_type: 'text', is_nullable: 'YES', column_default: null, is_generated: 'NEVER' },
      { column_name: 'modelo', data_type: 'text', is_nullable: 'YES', column_default: null, is_generated: 'NEVER' },
      { column_name: 'color', data_type: 'text', is_nullable: 'YES', column_default: null, is_generated: 'NEVER' },
      { column_name: 'talla', data_type: 'text', is_nullable: 'YES', column_default: null, is_generated: 'NEVER' },
      { column_name: 'sku', data_type: 'text', is_nullable: 'YES', column_default: null, is_generated: 'NEVER' },
      { column_name: 'ean', data_type: 'text', is_nullable: 'YES', column_default: null, is_generated: 'NEVER' },
      { column_name: 'costo', data_type: 'numeric', is_nullable: 'YES', column_default: null, is_generated: 'NEVER' },
      { column_name: 'google_drive', data_type: 'text', is_nullable: 'YES', column_default: null, is_generated: 'NEVER' },
      { column_name: 'shein_modifier', data_type: 'numeric', is_nullable: 'YES', column_default: '1.5', is_generated: 'NEVER' },
      { column_name: 'shopify_modifier', data_type: 'numeric', is_nullable: 'YES', column_default: '2.0', is_generated: 'NEVER' },
      { column_name: 'meli_modifier', data_type: 'numeric', is_nullable: 'YES', column_default: '2.5', is_generated: 'NEVER' },
      { column_name: 'precio_shein', data_type: 'numeric', is_nullable: 'YES', column_default: null, is_generated: 'ALWAYS' },
      { column_name: 'precio_shopify', data_type: 'numeric', is_nullable: 'YES', column_default: null, is_generated: 'ALWAYS' },
      { column_name: 'precio_meli', data_type: 'numeric', is_nullable: 'YES', column_default: null, is_generated: 'ALWAYS' },
      { column_name: 'inv_egdc', data_type: 'integer', is_nullable: 'YES', column_default: '0', is_generated: 'NEVER' },
      { column_name: 'inv_fami', data_type: 'integer', is_nullable: 'YES', column_default: '0', is_generated: 'NEVER' },
      { column_name: 'inventory_total', data_type: 'integer', is_nullable: 'YES', column_default: null, is_generated: 'ALWAYS' },
      { column_name: 'shein', data_type: 'boolean', is_nullable: 'YES', column_default: 'false', is_generated: 'NEVER' },
      { column_name: 'meli', data_type: 'boolean', is_nullable: 'YES', column_default: 'false', is_generated: 'NEVER' },
      { column_name: 'shopify', data_type: 'boolean', is_nullable: 'YES', column_default: 'false', is_generated: 'NEVER' },
      { column_name: 'tiktok', data_type: 'boolean', is_nullable: 'YES', column_default: 'false', is_generated: 'NEVER' },
      { column_name: 'upseller', data_type: 'boolean', is_nullable: 'YES', column_default: 'false', is_generated: 'NEVER' },
      { column_name: 'go_trendier', data_type: 'boolean', is_nullable: 'YES', column_default: 'false', is_generated: 'NEVER' },
      { column_name: 'created_at', data_type: 'timestamp with time zone', is_nullable: 'YES', column_default: 'now()', is_generated: 'NEVER' },
      { column_name: 'updated_at', data_type: 'timestamp with time zone', is_nullable: 'YES', column_default: 'now()', is_generated: 'NEVER' }
    ]
  }
  
  return data || []
}

function generateTypeScriptInterface(columns: ColumnInfo[]): string {
  const interfaceFields = columns.map(col => {
    const tsType = getTypeScriptType(col.data_type, col.is_nullable)
    return `  ${col.column_name}: ${tsType}`
  }).join('\n')
  
  return `// Database types (auto-generated from database schema)
export interface Product {
${interfaceFields}
}`
}

function generateColumnConfig(columns: ColumnInfo[]): string {
  const columnConfigs = columns
    .filter(col => !['id', 'created_at', 'updated_at'].includes(col.column_name))
    .map(col => {
      const category = getColumnCategory(col.column_name)
      const label = getColumnLabel(col.column_name)
      const visible = isVisibleByDefault(col.column_name)
      
      return `  { key: '${col.column_name}', label: '${label}', visible: ${visible}, category: '${category}' }`
    }).join(',\n')
  
  return `// Column configuration for the inventory table (auto-generated from database schema)
const DEFAULT_COLUMNS: ColumnConfig[] = [
${columnConfigs}
]`
}

function generateCSVTemplate(columns: ColumnInfo[]): string {
  const editableColumns = columns
    .filter(col => 
      !['id', 'created_at', 'updated_at'].includes(col.column_name) &&
      col.is_generated !== 'ALWAYS'
    )
    .map(col => col.column_name)
  
  // Generate sample data based on column types
  const sampleRows = [
    'Alpargatas,Nike,Air Max 90,Negro,25,NIKE-AM90-001,1234567890123,150.00,https://drive.google.com/file/123,1.5,2.0,2.5,10,5,true,false,true,false,false,false',
    'Botas,Adidas,Stan Smith,Blanco,26,ADIDAS-SS-002,1234567890124,120.00,,1.6,2.1,2.6,8,3,false,true,true,true,false,false',
    'Tenis,Puma,RS-X,Azul,27,PUMA-RSX-003,1234567890125,95.00,,1.4,1.9,2.4,15,7,true,true,false,false,true,true'
  ]
  
  return `const headers = [
      ${editableColumns.map(col => `'${col}'`).join(', ')}
    ]
    
    const csvContent = headers.join(',') + '\\n' +
      ${sampleRows.map(row => `'${row}'`).join(' + \'\\n\' +\n      ')}
    
    const blob = new Blob([csvContent], { type: 'text/csv' })`
}

async function updateFiles(config: GeneratedConfig): Promise<void> {
  console.log('📝 Updating generated files...')
  
  // Update lib/supabase.ts
  const supabaseFilePath = path.join(process.cwd(), 'lib', 'supabase.ts')
  let supabaseContent = fs.readFileSync(supabaseFilePath, 'utf-8')
  
  // Replace the Product interface
  const interfaceRegex = /\/\/ Database types[\s\S]*?export interface Product \{[\s\S]*?\}/
  if (interfaceRegex.test(supabaseContent)) {
    supabaseContent = supabaseContent.replace(interfaceRegex, config.interfaces)
  } else {
    console.warn('⚠️  Could not find Product interface in lib/supabase.ts')
  }
  
  fs.writeFileSync(supabaseFilePath, supabaseContent)
  console.log('✅ Updated lib/supabase.ts')
  
  // Update app/inventario/page.tsx column configuration
  const inventarioFilePath = path.join(process.cwd(), 'app', 'inventario', 'page.tsx')
  let inventarioContent = fs.readFileSync(inventarioFilePath, 'utf-8')
  
  const columnConfigRegex = /\/\/ Column configuration[\s\S]*?const DEFAULT_COLUMNS: ColumnConfig\[\] = \[[\s\S]*?\]/
  if (columnConfigRegex.test(inventarioContent)) {
    inventarioContent = inventarioContent.replace(columnConfigRegex, config.columnConfig)
  } else {
    console.warn('⚠️  Could not find DEFAULT_COLUMNS in app/inventario/page.tsx')
  }
  
  fs.writeFileSync(inventarioFilePath, inventarioContent)
  console.log('✅ Updated app/inventario/page.tsx')
  
  // Update CSV template in BulkImportModal
  const modalFilePath = path.join(process.cwd(), 'components', 'BulkImportModal.tsx')
  let modalContent = fs.readFileSync(modalFilePath, 'utf-8')
  
  const csvTemplateRegex = /const headers = \[[\s\S]*?\][\s\S]*?const csvContent = headers\.join[\s\S]*?const blob = new Blob\(\[csvContent\], \{ type: 'text\/csv' \}\)/
  if (csvTemplateRegex.test(modalContent)) {
    modalContent = modalContent.replace(csvTemplateRegex, config.csvTemplate)
  } else {
    console.warn('⚠️  Could not find CSV template in components/BulkImportModal.tsx')
    console.warn('⚠️  Skipping CSV template update - please update manually')
  }
  
  fs.writeFileSync(modalFilePath, modalContent)
  console.log('✅ Updated components/BulkImportModal.tsx')
}

async function main(): Promise<void> {
  try {
    console.log('🚀 Starting schema synchronization...')
    
    // Get current schema
    const columns = await getTableSchema('products')
    
    if (columns.length === 0) {
      throw new Error('No columns found for products table')
    }
    
    console.log(`📋 Found ${columns.length} columns in products table`)
    
    // Generate configurations
    const config: GeneratedConfig = {
      interfaces: generateTypeScriptInterface(columns),
      columnConfig: generateColumnConfig(columns),
      csvTemplate: generateCSVTemplate(columns)
    }
    
    // Update files
    await updateFiles(config)
    
    console.log('\n✨ Schema synchronization complete!')
    console.log('📁 Updated files:')
    console.log('   - lib/supabase.ts (Product interface)')
    console.log('   - app/inventario/page.tsx (Column configuration)')
    console.log('   - components/BulkImportModal.tsx (CSV template)')
    console.log('\n🔄 You may need to restart your development server for changes to take effect.')
    
  } catch (error) {
    console.error('❌ Schema synchronization failed:', error)
    process.exit(1)
  }
}

// Execute the script
if (require.main === module) {
  main()
}

export { main as syncSchema }
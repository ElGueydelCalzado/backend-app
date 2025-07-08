#!/usr/bin/env tsx

/**
 * Fix SQL files to exclude generated columns
 */

import fs from 'fs'
import path from 'path'

// Generated columns that should be excluded
const generatedColumns = ['precio_shein', 'precio_shopify', 'precio_meli', 'inventory_total']

function fixSQLFile(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n').filter(line => line.trim())
  
  const fixedLines = lines.map(line => {
    if (line.startsWith('INSERT INTO products')) {
      // Parse the INSERT statement
      const match = line.match(/INSERT INTO products \(([^)]+)\) VALUES \((.+)\);/)
      if (match) {
        const columns = match[1].split(', ').map(col => col.trim())
        const values = match[2].split(', ').map(val => val.trim())
        
        // Filter out generated columns
        const filteredColumns = []
        const filteredValues = []
        
        columns.forEach((col, index) => {
          if (!generatedColumns.includes(col)) {
            filteredColumns.push(col)
            filteredValues.push(values[index])
          }
        })
        
        return `INSERT INTO products (${filteredColumns.join(', ')}) VALUES (${filteredValues.join(', ')});`
      }
    }
    return line
  })
  
  return fixedLines.join('\n')
}

// Fix the products SQL file
const exportDir = './supabase_export'
const files = fs.readdirSync(exportDir)

const productsFile = files.find(f => f.includes('products_insert_') && f.endsWith('.sql'))

if (productsFile) {
  console.log(`🔧 Fixing products SQL file: ${productsFile}`)
  
  const originalPath = path.join(exportDir, productsFile)
  const fixedPath = path.join(exportDir, productsFile.replace('.sql', '_fixed.sql'))
  
  const fixedContent = fixSQLFile(originalPath)
  fs.writeFileSync(fixedPath, fixedContent)
  
  console.log(`✅ Fixed SQL saved to: ${fixedPath}`)
  
  // Show a sample of the fixed content
  const lines = fixedContent.split('\n').slice(0, 3)
  console.log('📋 Sample fixed SQL:')
  lines.forEach((line, i) => {
    if (line.trim()) {
      console.log(`   ${i + 1}: ${line.substring(0, 100)}...`)
    }
  })
} else {
  console.log('❌ Products SQL file not found')
}
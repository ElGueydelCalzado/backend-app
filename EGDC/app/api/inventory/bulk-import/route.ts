import { NextRequest, NextResponse } from 'next/server'
import { PostgresManager } from '@/lib/postgres'
import * as XLSX from 'xlsx'

interface BulkImportRequest {
  products: Array<{
    categoria?: string | null
    marca?: string | null
    modelo?: string | null
    color?: string | null
    talla?: string | null
    sku?: string | null
    ean?: string | null
    costo?: number | null
    google_drive?: string | null
    // Physical dimensions and weight
    height_cm?: number | null
    length_cm?: number | null
    thickness_cm?: number | null
    weight_grams?: number | null
    shein_modifier?: number | null
    shopify_modifier?: number | null
    meli_modifier?: number | null
    inv_egdc?: number | null
    inv_fami?: number | null
    inv_osiel?: number | null
    inv_molly?: number | null
    shein?: boolean | null
    meli?: boolean | null
    shopify?: boolean | null
    tiktok?: boolean | null
    upseller?: boolean | null
    go_trendier?: boolean | null
  }>
}

// Helper function to parse file data
function parseFileData(data: any[][]): any[] {
  if (!data || data.length < 2) return []

  const headers = data[0].map((h: any) => String(h).trim().toLowerCase())
  const products: any[] = []

  for (let i = 1; i < data.length; i++) {
    const row = data[i]
    
    // Skip empty rows
    if (!row || row.every(cell => !cell || String(cell).trim() === '')) {
      continue
    }
    
    const product: any = {}
    
    headers.forEach((header, index) => {
      const rawValue = row[index]
      const value = rawValue !== null && rawValue !== undefined ? String(rawValue).trim() : ''
      
      switch (header) {
        case 'costo':
        case 'shein_modifier':
        case 'shopify_modifier':
        case 'meli_modifier':
        case 'height_cm':
        case 'length_cm':
        case 'thickness_cm':
          product[header] = value ? parseFloat(value) : null
          break
        case 'inv_egdc':
        case 'inv_fami':
        case 'inv_osiel':
        case 'inv_molly':
        case 'weight_grams':
          product[header] = value ? parseInt(value) : (header.startsWith('inv_') ? 0 : null)
          break
        case 'shein':
        case 'meli':
        case 'shopify':
        case 'tiktok':
        case 'upseller':
        case 'go_trendier':
          product[header] = value.toLowerCase() === 'true' || value === '1'
          break
        default:
          product[header] = value
      }
    })

    products.push(product)
  }

  return products
}

export async function POST(request: NextRequest) {
  // Set a longer timeout for bulk operations
  const startTime = Date.now()
  const TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
  
  try {
    let products: any[] = []
    
    // Check if it's a file upload (FormData) or JSON
    const contentType = request.headers.get('content-type')
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData()
      const file = formData.get('file') as File
      
      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No file provided' },
          { status: 400 }
        )
      }

      // Read file content
      const buffer = await file.arrayBuffer()
      const fileExtension = file.name.split('.').pop()?.toLowerCase()
      
      if (fileExtension === 'csv') {
        // Handle CSV files
        const text = new TextDecoder().decode(buffer)
        const lines = text.split('\n').filter(line => line.trim())
        if (lines.length < 2) {
          return NextResponse.json(
            { success: false, error: 'CSV file must have at least a header and one data row' },
            { status: 400 }
          )
        }
        
        const data = lines.map(line => {
          return line.split(',').map(cell => cell.trim())
        })
        
        products = parseFileData(data)
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Handle Excel files
        const workbook = XLSX.read(buffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        
        products = parseFileData(data as any[][])
      } else {
        return NextResponse.json(
          { success: false, error: 'Unsupported file format. Use CSV, XLSX, or XLS.' },
          { status: 400 }
        )
      }
    } else {
      // Handle JSON data (legacy support)
      const body: BulkImportRequest = await request.json()
      products = body.products
    }

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid products found to import' },
        { status: 400 }
      )
    }

    console.log(`Bulk importing ${products.length} products...`)

    // Validate required fields for each product
    const validationErrors = []
    const requiredFields = ['categoria', 'marca', 'modelo', 'color', 'talla', 'sku']
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      for (const field of requiredFields) {
        if (!product[field] || String(product[field]).trim() === '') {
          validationErrors.push({
            row: i + 2, // +2 because of 0-based index and header row
            field,
            message: `Campo requerido "${field}" está vacío`,
            value: product[field]
          })
        }
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Se encontraron ${validationErrors.length} errores de validación`,
          validationErrors
        },
        { status: 400 }
      )
    }

    // Check for duplicate SKUs and EANs in the import batch only
    const skus = products.map(p => p.sku).filter(Boolean)
    const eans = products.map(p => p.ean).filter(Boolean)
    
    const duplicateSkus = skus.filter((sku, index) => skus.indexOf(sku) !== index)
    const duplicateEans = eans.filter((ean, index) => eans.indexOf(ean) !== index)
    
    if (duplicateSkus.length > 0 || duplicateEans.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Duplicate SKUs/EANs found in import batch',
          duplicateSkus,
          duplicateEans
        },
        { status: 400 }
      )
    }

    // Note: We no longer check for existing SKUs in database since we'll use UPSERT
    // This allows updating existing products with new data

    // Process in batches using UPSERT to handle existing SKUs
    const BATCH_SIZE = 100 // Larger batches since we're using efficient batch upsert
    const results = []
    const errors = []
    let updatedCount = 0
    let insertedCount = 0

    for (let batchStart = 0; batchStart < products.length; batchStart += BATCH_SIZE) {
      // Check for timeout
      if (Date.now() - startTime > TIMEOUT_MS) {
        console.error('Bulk import timeout reached')
        break
      }
      
      const batch = products.slice(batchStart, batchStart + BATCH_SIZE)
      console.log(`Processing UPSERT batch ${Math.floor(batchStart / BATCH_SIZE) + 1}/${Math.ceil(products.length / BATCH_SIZE)} (${Date.now() - startTime}ms elapsed)`)

      // Prepare batch data - pass through all fields, let upsert handle the logic
      const batchData = batch.map(product => ({
        categoria: product.categoria,
        marca: product.marca,
        modelo: product.modelo,
        color: product.color,
        talla: product.talla,
        sku: product.sku,
        ean: product.ean,
        costo: product.costo,
        google_drive: product.google_drive,
        height_cm: product.height_cm,
        length_cm: product.length_cm,
        thickness_cm: product.thickness_cm,
        weight_grams: product.weight_grams,
        shein_modifier: product.shein_modifier,
        shopify_modifier: product.shopify_modifier,
        meli_modifier: product.meli_modifier,
        inv_egdc: product.inv_egdc,
        inv_fami: product.inv_fami,
        inv_osiel: product.inv_osiel,
        inv_molly: product.inv_molly,
        shein: product.shein,
        meli: product.meli,
        shopify: product.shopify,
        tiktok: product.tiktok,
        upseller: product.upseller,
        go_trendier: product.go_trendier
      }))

      try {
        // Use batch upsert for handling existing products
        const batchResult = await PostgresManager.batchUpsertProducts(batchData)
        
        // Type guard to ensure batchResult has the expected structure
        if (batchResult && typeof batchResult === 'object' && 'results' in batchResult && 'errors' in batchResult) {
          results.push(...batchResult.results)
          errors.push(...batchResult.errors)
          
          // Track updates vs inserts (simplified - we'll count all as processed)
          console.log(`Batch processed: ${batchResult.results.length} products, ${batchResult.errors.length} errors`)
        } else {
          // Fallback for unexpected return format
          console.error('Unexpected batch result format:', batchResult)
          errors.push({
            error: 'Unexpected batch result format',
            batch: `Batch starting at row ${batchStart + 2}`,
            index: batchStart
          })
        }
      } catch (error) {
        console.error(`Error in batch upsert starting at ${batchStart}:`, error)
        errors.push({
          error: error instanceof Error ? error.message : 'Unknown batch error',
          batch: `Batch starting at row ${batchStart + 2}`, // +2 for header and 0-based index
          index: batchStart
        })
      }
    }

    const response = {
      success: errors.length === 0,
      processed_count: results.length,
      imported_or_updated: results.length, // UPSERT combines insert + update
      total: products.length,
      errors: errors.length,
      results,
      errorDetails: errors.length > 0 ? errors : undefined,
      message: errors.length === 0 
        ? `¡${results.length} productos procesados exitosamente! (nuevos productos creados o existentes actualizados)`
        : `${results.length} productos procesados, ${errors.length} errores encontrados`
    }

    if (errors.length > 0 && results.length === 0) {
      return NextResponse.json(response, { status: 400 })
    }

    console.log(`Bulk UPSERT completed: ${results.length} processed (inserted/updated), ${errors.length} errors`)

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in bulk import:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}
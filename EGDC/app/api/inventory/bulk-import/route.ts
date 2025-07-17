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

    // Check for duplicate SKUs and EANs in the import batch
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

    // Check for existing SKUs and EANs in database
    const conditions = []
    const params = []
    
    if (skus.length > 0) {
      conditions.push('sku = ANY($1)')
      params.push(skus)
    }
    
    if (eans.length > 0) {
      conditions.push(`ean = ANY($${params.length + 1})`)
      params.push(eans)
    }
    
    if (conditions.length > 0) {
      const existingCheck = await PostgresManager.query(`
        SELECT id, sku, ean, marca, modelo FROM products WHERE ${conditions.join(' OR ')}
      `, params)

      if (existingCheck.rows.length > 0) {
        const existingDetails = existingCheck.rows.map(row => 
          `ID: ${row.id}, SKU: ${row.sku || 'N/A'}, EAN: ${row.ean || 'N/A'} (${row.marca} ${row.modelo})`
        )
        return NextResponse.json(
          { 
            success: false, 
            error: 'SKUs/EANs already exist in database',
            existingProducts: existingDetails
          },
          { status: 409 }
        )
      }
    }

    // Process in batches to avoid timeout
    const BATCH_SIZE = 100
    const results = []
    const errors = []

    for (let batchStart = 0; batchStart < products.length; batchStart += BATCH_SIZE) {
      const batch = products.slice(batchStart, batchStart + BATCH_SIZE)
      console.log(`Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1}/${Math.ceil(products.length / BATCH_SIZE)}`)

      // Prepare batch data
      const batchData = batch.map(product => ({
        categoria: product.categoria || null,
        marca: product.marca || null,
        modelo: product.modelo || null,
        color: product.color || null,
        talla: product.talla || null,
        sku: product.sku || null,
        ean: product.ean || null,
        costo: product.costo || null,
        google_drive: product.google_drive || null,
        // Physical dimensions and weight
        height_cm: product.height_cm || null,
        length_cm: product.length_cm || null,
        thickness_cm: product.thickness_cm || null,
        weight_grams: product.weight_grams || null,
        shein_modifier: product.shein_modifier || 1.5,
        shopify_modifier: product.shopify_modifier || 2.0,
        meli_modifier: product.meli_modifier || 2.5,
        inv_egdc: product.inv_egdc || 0,
        inv_fami: product.inv_fami || 0,
        inv_osiel: product.inv_osiel || 0,
        inv_molly: product.inv_molly || 0,
        shein: product.shein || false,
        meli: product.meli || false,
        shopify: product.shopify || false,
        tiktok: product.tiktok || false,
        upseller: product.upseller || false,
        go_trendier: product.go_trendier || false
      }))

      try {
        // Use batch insert for better performance
        const batchResults = await PostgresManager.batchCreateProducts(batchData)
        results.push(...batchResults)
      } catch (error) {
        console.error(`Error importing batch starting at ${batchStart}:`, error)
        // Fall back to individual processing for this batch
        for (let i = 0; i < batch.length; i++) {
          const product = batch[i]
          try {
            const createdProduct = await PostgresManager.createProduct(batchData[i])
            results.push(createdProduct)
          } catch (individualError) {
            console.error(`Error importing product ${batchStart + i + 1}:`, individualError)
            errors.push({ 
              error: individualError instanceof Error ? individualError.message : 'Unknown error', 
              product,
              index: batchStart + i + 1
            })
          }
        }
      }
    }

    const response = {
      success: errors.length === 0,
      imported_count: results.length,
      imported: results.length,
      total: products.length,
      errors: errors.length,
      results,
      errorDetails: errors.length > 0 ? errors : undefined
    }

    if (errors.length > 0 && results.length === 0) {
      return NextResponse.json(response, { status: 400 })
    }

    console.log(`Bulk import completed: ${results.length} imported, ${errors.length} errors`)

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
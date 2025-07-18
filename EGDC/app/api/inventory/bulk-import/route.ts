// TENANT-SAFE Bulk Import API
// 🔒 All imports are automatically assigned to the authenticated tenant

import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-context'
import { TenantSafePostgresManager } from '@/lib/postgres-tenant-safe'
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
      const value = row[index]
      
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        const normalizedHeader = header.toLowerCase().replace(/\s+/g, '_')
        
        // Map common header variations
        switch (normalizedHeader) {
          case 'categoria':
          case 'category':
            product.categoria = String(value).trim()
            break
          case 'marca':
          case 'brand':
            product.marca = String(value).trim()
            break
          case 'modelo':
          case 'model':
            product.modelo = String(value).trim()
            break
          case 'color':
            product.color = String(value).trim()
            break
          case 'talla':
          case 'size':
            product.talla = String(value).trim()
            break
          case 'sku':
            product.sku = String(value).trim()
            break
          case 'ean':
          case 'barcode':
            product.ean = String(value).trim()
            break
          case 'costo':
          case 'cost':
          case 'price':
            product.costo = parseFloat(String(value)) || 0
            break
          case 'google_drive':
          case 'googledrive':
          case 'drive_url':
            product.google_drive = String(value).trim()
            break
          case 'height_cm':
          case 'height':
            product.height_cm = parseFloat(String(value)) || null
            break
          case 'length_cm':
          case 'length':
            product.length_cm = parseFloat(String(value)) || null
            break
          case 'thickness_cm':
          case 'thickness':
            product.thickness_cm = parseFloat(String(value)) || null
            break
          case 'weight_grams':
          case 'weight':
            product.weight_grams = parseFloat(String(value)) || null
            break
          case 'shein_modifier':
            product.shein_modifier = parseFloat(String(value)) || 1.5
            break
          case 'shopify_modifier':
            product.shopify_modifier = parseFloat(String(value)) || 2.0
            break
          case 'meli_modifier':
            product.meli_modifier = parseFloat(String(value)) || 2.5
            break
          case 'inv_egdc':
          case 'inventory_egdc':
            product.inv_egdc = parseInt(String(value)) || 0
            break
          case 'inv_fami':
          case 'inventory_fami':
            product.inv_fami = parseInt(String(value)) || 0
            break
          case 'inv_osiel':
          case 'inventory_osiel':
            product.inv_osiel = parseInt(String(value)) || 0
            break
          case 'inv_molly':
          case 'inventory_molly':
            product.inv_molly = parseInt(String(value)) || 0
            break
          case 'shein':
            product.shein = ['true', '1', 'yes', 'si'].includes(String(value).toLowerCase())
            break
          case 'meli':
          case 'mercadolibre':
            product.meli = ['true', '1', 'yes', 'si'].includes(String(value).toLowerCase())
            break
          case 'shopify':
            product.shopify = ['true', '1', 'yes', 'si'].includes(String(value).toLowerCase())
            break
          case 'tiktok':
            product.tiktok = ['true', '1', 'yes', 'si'].includes(String(value).toLowerCase())
            break
          case 'upseller':
            product.upseller = ['true', '1', 'yes', 'si'].includes(String(value).toLowerCase())
            break
          case 'go_trendier':
            product.go_trendier = ['true', '1', 'yes', 'si'].includes(String(value).toLowerCase())
            break
        }
      }
    })

    // Only add product if it has at least SKU or basic info
    if (product.sku || (product.categoria && product.marca && product.modelo)) {
      products.push(product)
    }
  }

  return products
}

export async function POST(request: NextRequest) {
  try {
    // 🔒 STEP 1: Validate tenant context
    const tenantContext = await getTenantContext(request)
    
    if (!tenantContext) {
      return NextResponse.json({
        success: false,
        error: 'No tenant context found. Please login.',
        code: 'TENANT_CONTEXT_MISSING'
      }, { status: 401 })
    }

    console.log('🔒 Processing bulk import for tenant:', {
      tenant_id: tenantContext.user.tenant_id,
      tenant_name: tenantContext.user.tenant_name,
      user_email: tenantContext.user.email
    })

    const contentType = request.headers.get('content-type')
    let products: any[] = []

    if (contentType?.includes('application/json')) {
      // Handle JSON request
      const body: BulkImportRequest = await request.json()
      products = body.products || []
    } else if (contentType?.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData()
      const file = formData.get('file') as File
      
      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No file provided' },
          { status: 400 }
        )
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const workbook = XLSX.read(buffer)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      
      products = parseFileData(data as any[][])
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid content type. Use JSON or multipart/form-data' },
        { status: 400 }
      )
    }

    if (!products || products.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No products to import' },
        { status: 400 }
      )
    }

    console.log(`🔒 Processing ${products.length} products for tenant ${tenantContext.user.tenant_name}`)

    // 🔒 STEP 2: Process products with tenant isolation
    const result = await TenantSafePostgresManager.batchUpsertProducts(
      tenantContext.user.tenant_id,
      products
    )

    // 🔒 STEP 3: Log import activity
    console.log(`🔒 Tenant ${tenantContext.user.tenant_name} bulk import summary:`, {
      successful_imports: result.results.length,
      errors: result.errors.length,
      total_products: products.length
    })

    const response = {
      success: true,
      imported_count: result.results.length,
      products: result.results,
      tenant: {
        id: tenantContext.user.tenant_id,
        name: tenantContext.user.tenant_name,
        subdomain: tenantContext.user.tenant_subdomain
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
      message: `Successfully imported ${result.results.length} products${result.errors.length > 0 ? ` with ${result.errors.length} errors` : ''}`
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Error in tenant-safe bulk import:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to import products',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
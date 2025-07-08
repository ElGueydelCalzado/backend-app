import { NextRequest, NextResponse } from 'next/server'
import { PostgresManager } from '@/lib/postgres'

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
    shein_modifier?: number | null
    shopify_modifier?: number | null
    meli_modifier?: number | null
    inv_egdc?: number | null
    inv_fami?: number | null
    inv_bodega_principal?: number | null
    inv_tienda_centro?: number | null
    inv_tienda_norte?: number | null
    inv_tienda_sur?: number | null
    inv_online?: number | null
    shein?: boolean | null
    meli?: boolean | null
    shopify?: boolean | null
    tiktok?: boolean | null
    upseller?: boolean | null
    go_trendier?: boolean | null
  }>
}

export async function POST(request: NextRequest) {
  try {
    const body: BulkImportRequest = await request.json()
    const { products } = body

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Products array is required' },
        { status: 400 }
      )
    }

    console.log(`Bulk importing ${products.length} products...`)

    // Check for duplicate SKUs in the import batch
    const skus = products.map(p => p.sku).filter(Boolean)
    const duplicateSkus = skus.filter((sku, index) => skus.indexOf(sku) !== index)
    
    if (duplicateSkus.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Duplicate SKUs found in import batch',
          duplicates: duplicateSkus
        },
        { status: 400 }
      )
    }

    // Check for existing SKUs in database
    const existingSkusCheck = await PostgresManager.query(`
      SELECT sku FROM products WHERE sku = ANY($1)
    `, [skus])

    if (existingSkusCheck.rows.length > 0) {
      const existingSkus = existingSkusCheck.rows.map(row => row.sku)
      return NextResponse.json(
        { 
          success: false, 
          error: 'SKUs already exist in database',
          existingSkus
        },
        { status: 409 }
      )
    }

    const results = []
    const errors = []

    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      
      try {
        // Set default values
        const productData = {
          categoria: product.categoria || null,
          marca: product.marca || null,
          modelo: product.modelo || null,
          color: product.color || null,
          talla: product.talla || null,
          sku: product.sku || null,
          ean: product.ean || null,
          costo: product.costo || null,
          google_drive: product.google_drive || null,
          shein_modifier: product.shein_modifier || 1.5,
          shopify_modifier: product.shopify_modifier || 2.0,
          meli_modifier: product.meli_modifier || 2.5,
          inv_egdc: product.inv_egdc || 0,
          inv_fami: product.inv_fami || 0,
          inv_bodega_principal: product.inv_bodega_principal || 0,
          inv_tienda_centro: product.inv_tienda_centro || 0,
          inv_tienda_norte: product.inv_tienda_norte || 0,
          inv_tienda_sur: product.inv_tienda_sur || 0,
          inv_online: product.inv_online || 0,
          shein: product.shein || false,
          meli: product.meli || false,
          shopify: product.shopify || false,
          tiktok: product.tiktok || false,
          upseller: product.upseller || false,
          go_trendier: product.go_trendier || false
        }

        // Create the product
        const createdProduct = await PostgresManager.createProduct(productData)

        // Log the creation
        await PostgresManager.logChange(
          createdProduct.id,
          'created',
          null,
          `Bulk import - ${productData.categoria} - ${productData.marca} ${productData.modelo}`,
          'bulk_import'
        )

        results.push(createdProduct)
      } catch (error) {
        console.error(`Error importing product ${i + 1}:`, error)
        errors.push({ 
          error: error instanceof Error ? error.message : 'Unknown error', 
          product,
          index: i + 1
        })
      }
    }

    const response = {
      success: errors.length === 0,
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
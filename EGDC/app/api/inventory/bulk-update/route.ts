import { NextRequest, NextResponse } from 'next/server'
import { PostgresManager } from '@/lib/postgres'

interface BulkUpdateRequest {
  productIds: number[]
  updates: {
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
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: BulkUpdateRequest = await request.json()
    const { productIds, updates } = body

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product IDs array is required' },
        { status: 400 }
      )
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Updates object is required' },
        { status: 400 }
      )
    }

    console.log(`Bulk updating ${productIds.length} products...`)

    const results = []
    const errors = []

    for (const productId of productIds) {
      try {
        // Get current product for change logging
        const currentProduct = await PostgresManager.getProductById(productId)
        if (!currentProduct) {
          errors.push({ error: `Product with ID ${productId} not found`, productId })
          continue
        }

        // Filter out undefined values
        const validUpdates = Object.entries(updates)
          .filter(([_, value]) => value !== undefined)
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})

        if (Object.keys(validUpdates).length === 0) {
          errors.push({ error: 'No valid updates provided', productId })
          continue
        }

        // Update the product
        const updatedProduct = await PostgresManager.updateProduct(productId, validUpdates)

        // Log changes for audit trail
        for (const [field, newValue] of Object.entries(validUpdates)) {
          const oldValue = currentProduct[field]
          if (oldValue !== newValue) {
            await PostgresManager.logChange(
              productId,
              field,
              oldValue,
              newValue,
              'bulk_update'
            )
          }
        }

        results.push(updatedProduct)
      } catch (error) {
        console.error(`Error updating product ${productId}:`, error)
        errors.push({ 
          error: error instanceof Error ? error.message : 'Unknown error', 
          productId 
        })
      }
    }

    const response = {
      success: errors.length === 0,
      updated: results.length,
      errors: errors.length,
      results,
      errorDetails: errors.length > 0 ? errors : undefined
    }

    if (errors.length > 0 && results.length === 0) {
      return NextResponse.json(response, { status: 400 })
    }

    console.log(`Bulk update completed: ${results.length} updated, ${errors.length} errors`)

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in bulk update:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}
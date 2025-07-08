import { NextRequest, NextResponse } from 'next/server'
import { PostgresManager } from '@/lib/postgres'

interface UpdateChange {
  id: number
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
}

interface RequestBody {
  changes: UpdateChange[]
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json()
    const { changes } = body

    if (!changes || !Array.isArray(changes)) {
      return NextResponse.json(
        { success: false, error: 'Changes array is required' },
        { status: 400 }
      )
    }

    if (changes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No changes provided' },
        { status: 400 }
      )
    }

    console.log(`Processing ${changes.length} product updates...`)

    const results = []
    const errors = []

    for (const change of changes) {
      try {
        if (!change.id) {
          errors.push({ error: 'Product ID is required', change })
          continue
        }

        // Get current product for change logging
        const currentProduct = await PostgresManager.getProductById(change.id)
        if (!currentProduct) {
          errors.push({ error: `Product with ID ${change.id} not found`, change })
          continue
        }

        // Create update object (excluding id)
        const { id, ...updates } = change
        const updateFields = Object.entries(updates)
          .filter(([_, value]) => value !== undefined)
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})

        if (Object.keys(updateFields).length === 0) {
          errors.push({ error: 'No valid updates provided', change })
          continue
        }

        // Update the product
        const updatedProduct = await PostgresManager.updateProduct(change.id, updateFields)

        // Log changes for audit trail
        for (const [field, newValue] of Object.entries(updateFields)) {
          const oldValue = currentProduct[field]
          if (oldValue !== newValue) {
            await PostgresManager.logChange(
              change.id,
              field,
              oldValue,
              newValue,
              'update'
            )
          }
        }

        results.push(updatedProduct)
      } catch (error) {
        console.error(`Error updating product ${change.id}:`, error)
        errors.push({ 
          error: error instanceof Error ? error.message : 'Unknown error', 
          change 
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

    console.log(`Successfully updated ${results.length} products, ${errors.length} errors`)

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error processing updates:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}
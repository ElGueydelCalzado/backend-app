// TENANT-SAFE Bulk Update API
// 🔒 All updates validate tenant ownership before modifying data

import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-context'
import { TenantSafePostgresManager } from '@/lib/postgres-tenant-safe'

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
    // 🔒 STEP 1: Validate tenant context
    const tenantContext = await getTenantContext(request)
    
    if (!tenantContext) {
      return NextResponse.json({
        success: false,
        error: 'No tenant context found. Please login.',
        code: 'TENANT_CONTEXT_MISSING'
      }, { status: 401 })
    }

    console.log('🔒 Processing bulk update for tenant:', {
      tenant_id: tenantContext.user.tenant_id,
      tenant_name: tenantContext.user.tenant_name,
      user_email: tenantContext.user.email
    })

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

    console.log(`🔒 Bulk updating ${productIds.length} products for tenant ${tenantContext.user.tenant_name}`)

    const results = []
    const errors = []

    // 🔒 STEP 2: Process each product with tenant validation
    for (const productId of productIds) {
      try {
        // 🔒 STEP 3: Validate tenant ownership before update
        const currentProduct = await TenantSafePostgresManager.getProductById(productId, tenantContext.user.tenant_id)
        if (!currentProduct) {
          errors.push({ error: `Product with ID ${productId} not found or access denied`, productId })
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

        // 🔒 STEP 4: Perform tenant-safe update
        const updatedProduct = await TenantSafePostgresManager.updateProduct(
          productId,
          tenantContext.user.tenant_id,
          validUpdates
        )

        if (updatedProduct) {
          results.push(updatedProduct)
          console.log(`✅ Bulk updated product ${productId} for tenant ${tenantContext.user.tenant_name}`)
        } else {
          errors.push({ error: 'Failed to update product', productId })
        }

      } catch (error) {
        console.error(`❌ Error updating product ${productId}:`, error)
        errors.push({ 
          error: error instanceof Error ? error.message : 'Unknown error', 
          productId 
        })
      }
    }

    // 🔒 STEP 5: Log bulk update activity
    console.log(`🔒 Tenant ${tenantContext.user.tenant_name} bulk update summary:`, {
      successful_updates: results.length,
      errors: errors.length,
      total_products: productIds.length
    })

    const response = {
      success: errors.length === 0,
      updated: results.length,
      errors: errors.length,
      results,
      tenant: {
        id: tenantContext.user.tenant_id,
        name: tenantContext.user.tenant_name,
        subdomain: tenantContext.user.tenant_subdomain
      },
      errorDetails: errors.length > 0 ? errors : undefined,
      message: `Successfully updated ${results.length} products${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    }

    if (errors.length > 0 && results.length === 0) {
      return NextResponse.json(response, { status: 400 })
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Error in tenant-safe bulk update:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to bulk update products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
// TENANT-SAFE Inventory Update API
// 🔒 All updates validate tenant ownership before modifying data

import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-context'
import { TenantSafePostgresManager } from '@/lib/postgres-tenant-safe'

interface UpdateChange {
  id: number
  categoria?: string | null
  marca?: string | null
  modelo?: string | null
  color?: string | null
  talla?: string | null
  sku?: string | null
  ean?: string | null
  google_drive?: string | null
  // Physical dimensions and weight
  height_cm?: number | null
  length_cm?: number | null
  thickness_cm?: number | null
  weight_grams?: number | null
  costo?: number | null
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

interface RequestBody {
  changes: UpdateChange[]
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

    console.log('🔒 Processing updates for tenant:', {
      tenant_id: tenantContext.user.tenant_id,
      tenant_name: tenantContext.user.tenant_name,
      user_email: tenantContext.user.email
    })

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

    console.log(`🔒 Processing ${changes.length} product updates for tenant ${tenantContext.user.tenant_name}`)

    const updatedProducts = []
    const errors = []

    // 🔒 STEP 2: Process each change with tenant validation
    for (const change of changes) {
      try {
        const { id, ...updates } = change

        if (!id) {
          errors.push({
            id: 'unknown',
            error: 'Product ID is required'
          })
          continue
        }

        // 🔒 STEP 3: Validate tenant ownership before update
        const currentProduct = await TenantSafePostgresManager.getProductById(id, tenantContext.user.tenant_id)
        
        if (!currentProduct) {
          errors.push({
            id,
            error: 'Product not found or access denied'
          })
          continue
        }

        // 🔒 STEP 4: Perform tenant-safe update
        const updatedProduct = await TenantSafePostgresManager.updateProduct(
          id,
          tenantContext.user.tenant_id,
          updates
        )

        if (updatedProduct) {
          updatedProducts.push(updatedProduct)
          console.log(`✅ Updated product ${id} for tenant ${tenantContext.user.tenant_name}`)
        } else {
          errors.push({
            id,
            error: 'Failed to update product'
          })
        }

      } catch (error) {
        console.error(`❌ Error updating product ${change.id}:`, error)
        errors.push({
          id: change.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // 🔒 STEP 5: Log change activity (for audit trail)
    console.log(`🔒 Tenant ${tenantContext.user.tenant_name} update summary:`, {
      successful_updates: updatedProducts.length,
      errors: errors.length,
      total_changes: changes.length
    })

    const response = {
      success: true,
      updated_count: updatedProducts.length,
      products: updatedProducts,
      tenant: {
        id: tenantContext.user.tenant_id,
        name: tenantContext.user.tenant_name,
        subdomain: tenantContext.user.tenant_subdomain
      },
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully updated ${updatedProducts.length} products${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Error in tenant-safe inventory update:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update inventory',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
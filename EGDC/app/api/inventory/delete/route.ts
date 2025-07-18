// TENANT-SAFE Delete API
// 🔒 All deletions validate tenant ownership before removing data

import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-context'
import { TenantSafePostgresManager } from '@/lib/postgres-tenant-safe'

interface DeleteRequest {
  ids: number[]
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

    console.log('🔒 Processing delete operation for tenant:', {
      tenant_id: tenantContext.user.tenant_id,
      tenant_name: tenantContext.user.tenant_name,
      user_email: tenantContext.user.email
    })

    const body: DeleteRequest = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product IDs array is required' },
        { status: 400 }
      )
    }

    console.log(`🔒 Deleting ${ids.length} products for tenant ${tenantContext.user.tenant_name}`)

    const results = []
    const errors = []

    // 🔒 STEP 2: Process each deletion with tenant validation
    for (const productId of ids) {
      try {
        // 🔒 STEP 3: Validate tenant ownership before deletion
        const productToDelete = await TenantSafePostgresManager.getProductById(productId, tenantContext.user.tenant_id)
        if (!productToDelete) {
          errors.push({ error: `Product with ID ${productId} not found or access denied`, productId })
          continue
        }

        // 🔒 STEP 4: Perform tenant-safe deletion
        const deletedProduct = await TenantSafePostgresManager.deleteProduct(productId, tenantContext.user.tenant_id)

        if (deletedProduct) {
          results.push(deletedProduct)
          console.log(`✅ Deleted product ${productId} for tenant ${tenantContext.user.tenant_name}`)
        } else {
          errors.push({ error: 'Failed to delete product', productId })
        }

      } catch (error) {
        console.error(`❌ Error deleting product ${productId}:`, error)
        errors.push({ 
          error: error instanceof Error ? error.message : 'Unknown error', 
          productId 
        })
      }
    }

    // 🔒 STEP 5: Log deletion activity
    console.log(`🔒 Tenant ${tenantContext.user.tenant_name} deletion summary:`, {
      successful_deletions: results.length,
      errors: errors.length,
      total_products: ids.length
    })

    const response = {
      success: results.length > 0,
      deleted: results.length,
      errors: errors.length,
      results,
      tenant: {
        id: tenantContext.user.tenant_id,
        name: tenantContext.user.tenant_name,
        subdomain: tenantContext.user.tenant_subdomain
      },
      errorDetails: errors.length > 0 ? errors : undefined,
      message: `Successfully deleted ${results.length} products${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    }

    if (errors.length > 0 && results.length === 0) {
      return NextResponse.json(response, { status: 400 })
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Error in tenant-safe delete operation:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
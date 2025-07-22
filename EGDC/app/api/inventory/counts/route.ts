// EGDC Marketplace Evolution: Task 2.3
// Product Counts API Endpoint
// Returns product counts for warehouse tabs (EGDC, FAMI, Osiel, Molly)

import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, executeWithTenant } from '@/lib/tenant-context'
import { mockInventoryAPI } from '@/lib/mock-data'

interface WarehouseCounts {
  egdc: number
  fami: number
  osiel: number
  molly: number
}

export async function GET(request: NextRequest) {
  try {
    // Use mock data in preview environment
    if (process.env.USE_MOCK_DATA === 'true') {
      console.log('Using mock data for product counts...')
      const mockCounts: WarehouseCounts = {
        egdc: 10,
        fami: 4,
        osiel: 5,
        molly: 4
      }
      return NextResponse.json({
        success: true,
        data: mockCounts,
        message: 'Mock product counts'
      })
    }

    // Get tenant context from session
    const tenantContext = await getTenantContext(request)
    
    if (!tenantContext) {
      return NextResponse.json({
        success: false,
        error: 'No tenant context found. Please login.',
        code: 'TENANT_CONTEXT_MISSING'
      }, { status: 401 })
    }

    console.log('📊 Fetching product counts for tenant:', {
      tenant_id: tenantContext.user.tenant_id,
      tenant_name: tenantContext.user.tenant_name,
      user_email: tenantContext.user.email
    })

    // Initialize counts
    const counts: WarehouseCounts = {
      egdc: 0,
      fami: 0,
      osiel: 0,
      molly: 0
    }

    // Get EGDC (own inventory) count
    const egdcCountQuery = `
      SELECT COUNT(*) as count
      FROM products
      WHERE tenant_id = $1 AND inv_egdc > 0
    `
    
    const egdcResult = await executeWithTenant<{ count: string }>(
      tenantContext.user.tenant_id,
      egdcCountQuery,
      [tenantContext.user.tenant_id]
    )
    
    counts.egdc = parseInt(egdcResult[0]?.count || '0')

    // Get supplier product counts
    // We need to get all supplier tenant IDs first
    const suppliersQuery = `
      SELECT id, subdomain 
      FROM tenants 
      WHERE business_type = 'wholesaler' AND status = 'active'
    `
    
    const suppliersResult = await executeWithTenant<{ id: string, subdomain: string }>(
      tenantContext.user.tenant_id,
      suppliersQuery,
      []
    )

    // For each supplier, count their products with inventory
    for (const supplier of suppliersResult) {
      const supplierCountQuery = `
        SELECT COUNT(*) as count
        FROM products
        WHERE tenant_id = $1 AND (
          CASE 
            WHEN $2 = 'fami' THEN inv_fami > 0
            WHEN $2 = 'osiel' THEN inv_osiel > 0  
            WHEN $2 = 'molly' THEN inv_molly > 0
            ELSE false
          END
        )
      `
      
      const supplierCountResult = await executeWithTenant<{ count: string }>(
        tenantContext.user.tenant_id,
        supplierCountQuery,
        [supplier.id, supplier.subdomain]
      )
      
      const count = parseInt(supplierCountResult[0]?.count || '0')
      
      // Map subdomain to count
      switch (supplier.subdomain) {
        case 'fami':
          counts.fami = count
          break
        case 'osiel':
          counts.osiel = count
          break
        case 'molly':
          counts.molly = count
          break
      }
    }

    console.log('📊 Product counts calculated:', counts)

    return NextResponse.json({
      success: true,
      data: counts,
      message: `Product counts: EGDC ${counts.egdc}, FAMI ${counts.fami}, Osiel ${counts.osiel}, Molly ${counts.molly}`
    })

  } catch (error) {
    console.error('Error fetching product counts:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch product counts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST endpoint for refreshing counts (optional, for cache invalidation)
export async function POST(request: NextRequest) {
  try {
    // This endpoint can be used to refresh/recalculate counts
    // For now, just redirect to GET
    return GET(request)
  } catch (error) {
    console.error('Error refreshing product counts:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to refresh product counts'
    }, { status: 500 })
  }
}
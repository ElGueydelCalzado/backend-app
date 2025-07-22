// Multi-Tenant Inventory API for Google Cloud PostgreSQL
import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, executeWithTenant } from '@/lib/tenant-context'
import { mockInventoryAPI } from '@/lib/mock-data'

export async function GET(request: NextRequest) {
  try {
    // Use mock data in preview environment
    if (process.env.USE_MOCK_DATA === 'true') {
      console.log('Using mock data for preview...')
      const mockResult = await mockInventoryAPI.getProducts()
      return NextResponse.json({
        success: true,
        data: mockResult.data,
        pagination: {
          page: 1,
          limit: 100,
          totalItems: mockResult.data.length,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        },
        message: `Mock data: ${mockResult.data.length} products`
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

    const { searchParams } = new URL(request.url)
    const supplier = searchParams.get('supplier') || '' // New supplier filter parameter
    
    console.log('🏢 Fetching inventory for tenant:', {
      tenant_id: tenantContext.user.tenant_id,
      tenant_name: tenantContext.user.tenant_name,
      user_email: tenantContext.user.email,
      supplier_filter: supplier || 'none'
    })
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const search = searchParams.get('search') || ''
    const categoria = searchParams.get('categoria') || ''
    const marca = searchParams.get('marca') || ''
    const modelo = searchParams.get('modelo') || ''
    
    // Build WHERE clause for filters
    let whereClause = ''
    const params: any[] = []
    let paramIndex = 1
    
    if (supplier) {
      // When supplier is specified, filter by supplier's tenant_id
      // First, get the supplier's tenant_id from subdomain
      const supplierQuery = `SELECT id FROM tenants WHERE subdomain = $1 AND business_type = 'wholesaler'`
      const supplierResult = await executeWithTenant(
        tenantContext.user.tenant_id,
        supplierQuery,
        [supplier]
      )
      
      if (supplierResult.length === 0) {
        return NextResponse.json({
          success: false,
          error: `Supplier '${supplier}' not found`,
          code: 'SUPPLIER_NOT_FOUND'
        }, { status: 404 })
      }
      
      const supplierTenantId = (supplierResult[0] as any).id
      whereClause = 'WHERE tenant_id = $1'
      params.push(supplierTenantId)
      paramIndex = 2
    } else {
      // Default behavior: filter by user's tenant_id
      whereClause = 'WHERE tenant_id = $1'
      params.push(tenantContext.user.tenant_id)
      paramIndex = 2
    }
    
    if (search) {
      whereClause += ` AND (
        LOWER(modelo) LIKE LOWER($${paramIndex}) OR 
        LOWER(marca) LIKE LOWER($${paramIndex + 1}) OR 
        LOWER(categoria) LIKE LOWER($${paramIndex + 2}) OR
        LOWER(color) LIKE LOWER($${paramIndex + 3}) OR
        LOWER(sku) LIKE LOWER($${paramIndex + 4})
      )`
      const searchTerm = `%${search}%`
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm)
      paramIndex += 5
    }
    
    if (categoria) {
      whereClause += ` AND categoria = $${paramIndex}`
      params.push(categoria)
      paramIndex++
    }
    
    if (marca) {
      whereClause += ` AND marca = $${paramIndex}`
      params.push(marca)
      paramIndex++
    }
    
    if (modelo) {
      whereClause += ` AND modelo = $${paramIndex}`
      params.push(modelo)
      paramIndex++
    }
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM products 
      ${whereClause}
    `
    
    const countResult = await executeWithTenant<{ total: string }>(
      tenantContext.user.tenant_id,
      countQuery,
      params
    )
    
    const totalItems = parseInt(countResult[0].total)
    const totalPages = Math.ceil(totalItems / limit)
    const offset = (page - 1) * limit
    
    // Get products with pagination
    const productsQuery = `
      SELECT 
        id,
        fecha,
        categoria,
        marca,
        modelo,
        color,
        talla,
        sku,
        ean,
        google_drive,
        costo,
        shein_modifier,
        shopify_modifier,
        meli_modifier,
        precio_shein,
        precio_shopify,
        precio_meli,
        inv_egdc,
        inv_fami,
        inv_osiel,
        inv_molly,
        inventory_total,
        shein,
        meli,
        shopify,
        tiktok,
        upseller,
        go_trendier,
        created_at,
        updated_at
      FROM products 
      ${whereClause}
      ORDER BY categoria, marca, modelo
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    
    params.push(limit, offset)
    
    const products = await executeWithTenant(
      tenantContext.user.tenant_id,
      productsQuery,
      params
    )
    
    console.log(`✅ Successfully fetched ${products.length} products for tenant ${tenantContext.user.tenant_name}`)
    
    return NextResponse.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      },
      tenant: {
        id: tenantContext.user.tenant_id,
        name: tenantContext.user.tenant_name,
        subdomain: tenantContext.user.tenant_subdomain
      },
      message: `Fetched ${products.length} products`
    })
    
  } catch (error) {
    console.error('❌ Error fetching inventory:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch inventory data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
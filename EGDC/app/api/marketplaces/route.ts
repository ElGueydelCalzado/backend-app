import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/postgres-tenant-safe'
import { Marketplace, ApiResponse } from '@/lib/types'
import { createMercadoLibreIntegration } from '@/lib/marketplace-integrations/mercadolibre'
import { createShopifyIntegration } from '@/lib/marketplace-integrations/shopify'
import { securityMonitor } from '@/lib/monitoring'
import { performanceMonitor } from '@/lib/performance-monitor'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const pool = await connectToDatabase()
    const { searchParams } = new URL(request.url)
    const includeHealth = searchParams.get('includeHealth') === 'true'
    
    const result = await pool.query(`
      SELECT 
        id,
        name,
        slug,
        platform,
        status,
        icon,
        description,
        app_id,
        client_id,
        sync_products,
        sync_prices,
        sync_inventory,
        auto_publish,
        import_orders,
        last_sync_at,
        store_url,
        seller_id,
        store_name,
        published_products_count,
        sync_errors_count,
        sync_success_rate,
        created_at,
        updated_at
      FROM marketplaces 
      WHERE tenant_id = $1
      ORDER BY created_at ASC
    `, [request.headers.get('x-tenant-id') || 'default'])

    let marketplaces: Marketplace[] = result.rows

    // Include health status for each marketplace if requested
    if (includeHealth) {
      marketplaces = await Promise.all(marketplaces.map(async (marketplace) => {
        const healthStatus = await getMarketplaceHealth(marketplace)
        return { ...marketplace, healthStatus }
      }))
    }

    const response: ApiResponse<Marketplace[]> = {
      success: true,
      data: marketplaces,
      metadata: {
        total: marketplaces.length,
        activeCount: marketplaces.filter(m => m.status === 'active').length,
        lastUpdated: new Date().toISOString()
      }
    }

    // Record performance metrics
    performanceMonitor.recordRequest(Date.now() - startTime, false)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching marketplaces:', error)
    
    // Log security event
    securityMonitor.logEvent({
      type: 'error',
      ip: request.ip || 'unknown',
      endpoint: '/api/marketplaces',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    })
    
    performanceMonitor.recordRequest(Date.now() - startTime, true)
    
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch marketplaces'
    }
    
    return NextResponse.json(response, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const pool = await connectToDatabase()
    const body = await request.json()
    const tenantId = request.headers.get('x-tenant-id') || 'default'
    
    const {
      name,
      slug,
      platform,
      icon = '🛒',
      description,
      app_id,
      client_id,
      client_secret,
      access_token,
      refresh_token,
      sync_products = true,
      sync_prices = true,
      sync_inventory = true,
      auto_publish = false,
      import_orders = true,
      store_url,
      seller_id,
      store_name,
      webhook_secret
    } = body

    // Validate required fields
    if (!name || !slug || !platform) {
      return NextResponse.json({
        success: false,
        error: 'Name, slug, and platform are required'
      }, { status: 400 })
    }

    // Validate platform-specific requirements
    if (platform === 'mercadolibre' && (!client_id || !access_token || !seller_id)) {
      return NextResponse.json({
        success: false,
        error: 'MercadoLibre requires client_id, access_token, and seller_id'
      }, { status: 400 })
    }

    if (platform === 'shopify' && (!store_url || !access_token)) {
      return NextResponse.json({
        success: false,
        error: 'Shopify requires store_url and access_token'
      }, { status: 400 })
    }

    // Test connection before saving
    const connectionTest = await testMarketplaceConnection({
      platform,
      client_id,
      client_secret,
      access_token,
      refresh_token,
      store_url,
      seller_id,
      webhook_secret
    })

    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        error: `Connection test failed: ${connectionTest.error}`
      }, { status: 400 })
    }

    const result = await pool.query(`
      INSERT INTO marketplaces (
        tenant_id, name, slug, platform, icon, description, app_id, client_id, client_secret,
        access_token, refresh_token, sync_products, sync_prices, sync_inventory,
        auto_publish, import_orders, store_url, seller_id, store_name, webhook_secret,
        status, sync_success_rate
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *
    `, [
      tenantId, name, slug, platform, icon, description, app_id, client_id, client_secret,
      access_token, refresh_token, sync_products, sync_prices, sync_inventory,
      auto_publish, import_orders, store_url, seller_id, store_name, webhook_secret,
      'active', 100.0
    ])

    const marketplace: Marketplace = result.rows[0]

    // Log marketplace creation event
    securityMonitor.logEvent({
      type: 'integration_created',
      ip: request.ip || 'unknown',
      endpoint: '/api/marketplaces',
      details: { 
        platform: marketplace.platform, 
        marketplaceId: marketplace.id,
        tenantId 
      }
    })

    performanceMonitor.recordRequest(Date.now() - startTime, false)

    const response: ApiResponse<Marketplace> = {
      success: true,
      data: marketplace,
      message: `${platform} marketplace integration created successfully`
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error creating marketplace:', error)
    
    performanceMonitor.recordRequest(Date.now() - startTime, true)
    
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json({
        success: false,
        error: 'A marketplace with this slug already exists'
      }, { status: 409 })
    }
    
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create marketplace'
    }
    
    return NextResponse.json(response, { status: 500 })
  }
}

// Helper function to test marketplace connections
async function testMarketplaceConnection(config: any) {
  try {
    switch (config.platform) {
      case 'mercadolibre':
        const mlIntegration = createMercadoLibreIntegration({
          clientId: config.client_id,
          clientSecret: config.client_secret,
          accessToken: config.access_token,
          refreshToken: config.refresh_token,
          sellerId: config.seller_id
        })
        return await mlIntegration.testConnection()
        
      case 'shopify':
        const shopifyIntegration = createShopifyIntegration({
          storeUrl: config.store_url,
          accessToken: config.access_token,
          apiVersion: '2024-01',
          webhookSecret: config.webhook_secret
        })
        return await shopifyIntegration.testConnection()
        
      default:
        return { success: false, error: 'Unsupported platform' }
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Connection test failed' 
    }
  }
}

// Helper function to get marketplace health status
async function getMarketplaceHealth(marketplace: Marketplace) {
  try {
    switch (marketplace.platform) {
      case 'mercadolibre':
        if (marketplace.client_id && marketplace.access_token) {
          const integration = createMercadoLibreIntegration({
            clientId: marketplace.client_id,
            clientSecret: marketplace.client_secret || '',
            accessToken: marketplace.access_token,
            refreshToken: marketplace.refresh_token || '',
            sellerId: marketplace.seller_id || ''
          })
          return integration.getHealthStatus()
        }
        break
      case 'shopify':
        if (marketplace.store_url && marketplace.access_token) {
          const integration = createShopifyIntegration({
            storeUrl: marketplace.store_url,
            accessToken: marketplace.access_token,
            apiVersion: '2024-01'
          })
          return integration.getHealthStatus()
        }
        break
    }
    
    return { status: 'unknown', message: 'Integration not configured' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Health check failed' }
  }
}

// New endpoint for bulk sync operations
export async function PUT(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const marketplaceIds = searchParams.get('marketplaces')?.split(',') || []
    
    if (action === 'sync' && marketplaceIds.length > 0) {
      const results = await Promise.all(
        marketplaceIds.map(async (id) => {
          try {
            return await syncMarketplace(id)
          } catch (error) {
            return {
              marketplaceId: id,
              success: false,
              error: error instanceof Error ? error.message : 'Sync failed'
            }
          }
        })
      )
      
      performanceMonitor.recordRequest(Date.now() - startTime, false)
      
      return NextResponse.json({
        success: true,
        data: results,
        message: `Sync completed for ${results.length} marketplaces`
      })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action or missing marketplace IDs'
    }, { status: 400 })
    
  } catch (error) {
    performanceMonitor.recordRequest(Date.now() - startTime, true)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Bulk operation failed'
    }, { status: 500 })
  }
}

// Helper function to sync a single marketplace
async function syncMarketplace(marketplaceId: string) {
  const pool = await connectToDatabase()
  
  // Get marketplace configuration
  const marketplaceResult = await pool.query(
    'SELECT * FROM marketplaces WHERE id = $1',
    [marketplaceId]
  )
  
  if (marketplaceResult.rows.length === 0) {
    throw new Error(`Marketplace ${marketplaceId} not found`)
  }
  
  const marketplace = marketplaceResult.rows[0]
  
  // Get products to sync
  const productsResult = await pool.query(`
    SELECT * FROM products 
    WHERE tenant_id = $1 
    AND status = 'active'
    AND inventory_total > 0
  `, [marketplace.tenant_id])
  
  const products = productsResult.rows
  
  // Perform sync based on platform
  switch (marketplace.platform) {
    case 'mercadolibre':
      const mlIntegration = createMercadoLibreIntegration({
        clientId: marketplace.client_id,
        clientSecret: marketplace.client_secret,
        accessToken: marketplace.access_token,
        refreshToken: marketplace.refresh_token,
        sellerId: marketplace.seller_id
      })
      return await mlIntegration.syncProducts(products)
      
    case 'shopify':
      const shopifyIntegration = createShopifyIntegration({
        storeUrl: marketplace.store_url,
        accessToken: marketplace.access_token,
        apiVersion: '2024-01'
      })
      return await shopifyIntegration.syncProducts(products)
      
    default:
      throw new Error(`Unsupported platform: ${marketplace.platform}`)
  }
}
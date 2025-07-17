import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/postgres'
import { Marketplace, ApiResponse } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const pool = await connectToDatabase()
    
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
        created_at,
        updated_at
      FROM marketplaces 
      ORDER BY created_at ASC
    `)

    const marketplaces: Marketplace[] = result.rows

    const response: ApiResponse<Marketplace[]> = {
      success: true,
      data: marketplaces
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching marketplaces:', error)
    
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch marketplaces'
    }
    
    return NextResponse.json(response, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const pool = await connectToDatabase()
    const body = await request.json()
    
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
      store_name
    } = body

    // Validate required fields
    if (!name || !slug || !platform) {
      return NextResponse.json({
        success: false,
        error: 'Name, slug, and platform are required'
      }, { status: 400 })
    }

    const result = await pool.query(`
      INSERT INTO marketplaces (
        name, slug, platform, icon, description, app_id, client_id, client_secret,
        access_token, refresh_token, sync_products, sync_prices, sync_inventory,
        auto_publish, import_orders, store_url, seller_id, store_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `, [
      name, slug, platform, icon, description, app_id, client_id, client_secret,
      access_token, refresh_token, sync_products, sync_prices, sync_inventory,
      auto_publish, import_orders, store_url, seller_id, store_name
    ])

    const marketplace: Marketplace = result.rows[0]

    const response: ApiResponse<Marketplace> = {
      success: true,
      data: marketplace,
      message: 'Marketplace created successfully'
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error creating marketplace:', error)
    
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
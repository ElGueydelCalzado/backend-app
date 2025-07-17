import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/postgres'
import { Marketplace, ApiResponse } from '@/lib/types'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const pool = await connectToDatabase()
    const { slug } = params
    
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
      WHERE slug = $1
    `, [slug])

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Marketplace not found'
      }, { status: 404 })
    }

    const marketplace: Marketplace = result.rows[0]

    const response: ApiResponse<Marketplace> = {
      success: true,
      data: marketplace
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching marketplace:', error)
    
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch marketplace'
    }
    
    return NextResponse.json(response, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const pool = await connectToDatabase()
    const { slug } = params
    const body = await request.json()
    
    const {
      name,
      description,
      app_id,
      client_id,
      client_secret,
      access_token,
      refresh_token,
      sync_products,
      sync_prices,
      sync_inventory,
      auto_publish,
      import_orders,
      store_url,
      seller_id,
      store_name
    } = body

    // Build dynamic UPDATE query
    const updateFields = []
    const values = []
    let paramCount = 1

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount}`)
      values.push(name)
      paramCount++
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount}`)
      values.push(description)
      paramCount++
    }
    if (app_id !== undefined) {
      updateFields.push(`app_id = $${paramCount}`)
      values.push(app_id)
      paramCount++
    }
    if (client_id !== undefined) {
      updateFields.push(`client_id = $${paramCount}`)
      values.push(client_id)
      paramCount++
    }
    if (client_secret !== undefined) {
      updateFields.push(`client_secret = $${paramCount}`)
      values.push(client_secret)
      paramCount++
    }
    if (access_token !== undefined) {
      updateFields.push(`access_token = $${paramCount}`)
      values.push(access_token)
      paramCount++
    }
    if (refresh_token !== undefined) {
      updateFields.push(`refresh_token = $${paramCount}`)
      values.push(refresh_token)
      paramCount++
    }
    if (sync_products !== undefined) {
      updateFields.push(`sync_products = $${paramCount}`)
      values.push(sync_products)
      paramCount++
    }
    if (sync_prices !== undefined) {
      updateFields.push(`sync_prices = $${paramCount}`)
      values.push(sync_prices)
      paramCount++
    }
    if (sync_inventory !== undefined) {
      updateFields.push(`sync_inventory = $${paramCount}`)
      values.push(sync_inventory)
      paramCount++
    }
    if (auto_publish !== undefined) {
      updateFields.push(`auto_publish = $${paramCount}`)
      values.push(auto_publish)
      paramCount++
    }
    if (import_orders !== undefined) {
      updateFields.push(`import_orders = $${paramCount}`)
      values.push(import_orders)
      paramCount++
    }
    if (store_url !== undefined) {
      updateFields.push(`store_url = $${paramCount}`)
      values.push(store_url)
      paramCount++
    }
    if (seller_id !== undefined) {
      updateFields.push(`seller_id = $${paramCount}`)
      values.push(seller_id)
      paramCount++
    }
    if (store_name !== undefined) {
      updateFields.push(`store_name = $${paramCount}`)
      values.push(store_name)
      paramCount++
    }

    if (updateFields.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No fields to update'
      }, { status: 400 })
    }

    values.push(slug) // Add slug as the last parameter

    const result = await pool.query(`
      UPDATE marketplaces 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE slug = $${paramCount}
      RETURNING *
    `, values)

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Marketplace not found'
      }, { status: 404 })
    }

    const marketplace: Marketplace = result.rows[0]

    const response: ApiResponse<Marketplace> = {
      success: true,
      data: marketplace,
      message: 'Marketplace updated successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating marketplace:', error)
    
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update marketplace'
    }
    
    return NextResponse.json(response, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const pool = await connectToDatabase()
    const { slug } = params
    
    const result = await pool.query(`
      DELETE FROM marketplaces 
      WHERE slug = $1
      RETURNING id, name
    `, [slug])

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Marketplace not found'
      }, { status: 404 })
    }

    const response: ApiResponse<{ id: number; name: string }> = {
      success: true,
      data: result.rows[0],
      message: 'Marketplace deleted successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error deleting marketplace:', error)
    
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete marketplace'
    }
    
    return NextResponse.json(response, { status: 500 })
  }
}
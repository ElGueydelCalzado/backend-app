import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/postgres'
import { Warehouse, ApiResponse } from '@/lib/types'

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
        type,
        status,
        icon,
        description,
        api_url,
        sync_enabled,
        sync_frequency,
        sync_bidirectional,
        notify_low_stock,
        last_sync_at,
        min_stock_threshold,
        auto_reorder,
        default_markup_percentage,
        product_count,
        created_at,
        updated_at
      FROM warehouses 
      WHERE slug = $1
    `, [slug])

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Warehouse not found'
      }, { status: 404 })
    }

    const warehouse: Warehouse = result.rows[0]

    const response: ApiResponse<Warehouse> = {
      success: true,
      data: warehouse
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching warehouse:', error)
    
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch warehouse'
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
      api_url,
      api_key,
      api_secret,
      webhook_url,
      sync_enabled,
      sync_frequency,
      sync_bidirectional,
      notify_low_stock,
      min_stock_threshold,
      auto_reorder,
      default_markup_percentage
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
    if (api_url !== undefined) {
      updateFields.push(`api_url = $${paramCount}`)
      values.push(api_url)
      paramCount++
    }
    if (api_key !== undefined) {
      updateFields.push(`api_key = $${paramCount}`)
      values.push(api_key)
      paramCount++
    }
    if (api_secret !== undefined) {
      updateFields.push(`api_secret = $${paramCount}`)
      values.push(api_secret)
      paramCount++
    }
    if (webhook_url !== undefined) {
      updateFields.push(`webhook_url = $${paramCount}`)
      values.push(webhook_url)
      paramCount++
    }
    if (sync_enabled !== undefined) {
      updateFields.push(`sync_enabled = $${paramCount}`)
      values.push(sync_enabled)
      paramCount++
    }
    if (sync_frequency !== undefined) {
      updateFields.push(`sync_frequency = $${paramCount}`)
      values.push(sync_frequency)
      paramCount++
    }
    if (sync_bidirectional !== undefined) {
      updateFields.push(`sync_bidirectional = $${paramCount}`)
      values.push(sync_bidirectional)
      paramCount++
    }
    if (notify_low_stock !== undefined) {
      updateFields.push(`notify_low_stock = $${paramCount}`)
      values.push(notify_low_stock)
      paramCount++
    }
    if (min_stock_threshold !== undefined) {
      updateFields.push(`min_stock_threshold = $${paramCount}`)
      values.push(min_stock_threshold)
      paramCount++
    }
    if (auto_reorder !== undefined) {
      updateFields.push(`auto_reorder = $${paramCount}`)
      values.push(auto_reorder)
      paramCount++
    }
    if (default_markup_percentage !== undefined) {
      updateFields.push(`default_markup_percentage = $${paramCount}`)
      values.push(default_markup_percentage)
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
      UPDATE warehouses 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE slug = $${paramCount}
      RETURNING *
    `, values)

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Warehouse not found'
      }, { status: 404 })
    }

    const warehouse: Warehouse = result.rows[0]

    const response: ApiResponse<Warehouse> = {
      success: true,
      data: warehouse,
      message: 'Warehouse updated successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating warehouse:', error)
    
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update warehouse'
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
      DELETE FROM warehouses 
      WHERE slug = $1
      RETURNING id, name
    `, [slug])

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Warehouse not found'
      }, { status: 404 })
    }

    const response: ApiResponse<{ id: number; name: string }> = {
      success: true,
      data: result.rows[0],
      message: 'Warehouse deleted successfully'
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error deleting warehouse:', error)
    
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete warehouse'
    }
    
    return NextResponse.json(response, { status: 500 })
  }
}
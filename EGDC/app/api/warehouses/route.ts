import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/postgres-tenant-safe'
import { Warehouse, ApiResponse } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const pool = await connectToDatabase()
    
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
      ORDER BY created_at ASC
    `)

    const warehouses: Warehouse[] = result.rows

    const response: ApiResponse<Warehouse[]> = {
      success: true,
      data: warehouses
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching warehouses:', error)
    
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch warehouses'
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
      type = 'external',
      icon = '🏭',
      description,
      api_url,
      api_key,
      api_secret,
      webhook_url,
      sync_enabled = false,
      sync_frequency = 15,
      sync_bidirectional = false,
      notify_low_stock = true,
      min_stock_threshold = 5,
      auto_reorder = false,
      default_markup_percentage = 0
    } = body

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json({
        success: false,
        error: 'Name and slug are required'
      }, { status: 400 })
    }

    const result = await pool.query(`
      INSERT INTO warehouses (
        name, slug, type, icon, description, api_url, api_key, api_secret, webhook_url,
        sync_enabled, sync_frequency, sync_bidirectional, notify_low_stock,
        min_stock_threshold, auto_reorder, default_markup_percentage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      name, slug, type, icon, description, api_url, api_key, api_secret, webhook_url,
      sync_enabled, sync_frequency, sync_bidirectional, notify_low_stock,
      min_stock_threshold, auto_reorder, default_markup_percentage
    ])

    const warehouse: Warehouse = result.rows[0]

    const response: ApiResponse<Warehouse> = {
      success: true,
      data: warehouse,
      message: 'Warehouse created successfully'
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error creating warehouse:', error)
    
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json({
        success: false,
        error: 'A warehouse with this slug already exists'
      }, { status: 409 })
    }
    
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create warehouse'
    }
    
    return NextResponse.json(response, { status: 500 })
  }
}
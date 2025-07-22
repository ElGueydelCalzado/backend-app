// DYNAMIC COLUMN MANAGEMENT API
// Allows users to safely add/remove columns without database access

import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, executeWithTenant } from '@/lib/tenant-context'

// GET - List all custom columns for tenant
export async function GET(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext(request)
    
    if (!tenantContext) {
      return NextResponse.json({
        success: false,
        error: 'No tenant context found. Please login.',
        code: 'TENANT_CONTEXT_MISSING'
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tableName = searchParams.get('table') || 'products'

    console.log('📋 Fetching custom columns for tenant:', {
      tenant_id: tenantContext.user.tenant_id,
      tenant_name: tenantContext.user.tenant_name,
      table_name: tableName
    })

    // Get custom columns using the database function
    const columnsQuery = `
      SELECT * FROM get_custom_columns($1, $2)
    `
    
    const columns = await executeWithTenant(
      tenantContext.user.tenant_id,
      columnsQuery,
      [tenantContext.user.tenant_id, tableName]
    )

    return NextResponse.json({
      success: true,
      data: columns,
      message: `Found ${columns.length} custom columns for ${tableName} table`
    })

  } catch (error) {
    console.error('Error fetching custom columns:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch custom columns',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Add new custom column
export async function POST(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext(request)
    
    if (!tenantContext) {
      return NextResponse.json({
        success: false,
        error: 'No tenant context found. Please login.',
        code: 'TENANT_CONTEXT_MISSING'
      }, { status: 401 })
    }

    const body = await request.json()
    const { 
      table_name = 'products',
      column_name,
      column_type,
      display_name,
      description,
      default_value
    } = body

    // Validate required fields
    if (!column_name || !column_type || !display_name) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: column_name, column_type, display_name'
      }, { status: 400 })
    }

    console.log('➕ Adding custom column for tenant:', {
      tenant_id: tenantContext.user.tenant_id,
      tenant_name: tenantContext.user.tenant_name,
      column_name,
      column_type,
      display_name
    })

    // Use the safe column addition function
    const addColumnQuery = `
      SELECT add_custom_column($1, $2, $3, $4, $5, $6, $7, $8) as result
    `
    
    const result = await executeWithTenant(
      tenantContext.user.tenant_id,
      addColumnQuery,
      [
        tenantContext.user.tenant_id,
        table_name,
        column_name,
        column_type,
        display_name,
        description,
        default_value,
        tenantContext.user.id
      ]
    )

    const addResult = result[0]?.result

    if (addResult.success) {
      return NextResponse.json({
        success: true,
        data: addResult,
        message: `Custom column '${display_name}' added successfully`
      })
    } else {
      return NextResponse.json({
        success: false,
        error: addResult.error
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Error adding custom column:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to add custom column',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE - Remove custom column
export async function DELETE(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext(request)
    
    if (!tenantContext) {
      return NextResponse.json({
        success: false,
        error: 'No tenant context found. Please login.',
        code: 'TENANT_CONTEXT_MISSING'
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const columnId = searchParams.get('id')

    if (!columnId) {
      return NextResponse.json({
        success: false,
        error: 'Column ID is required'
      }, { status: 400 })
    }

    console.log('🗑️ Removing custom column for tenant:', {
      tenant_id: tenantContext.user.tenant_id,
      tenant_name: tenantContext.user.tenant_name,
      column_id: columnId
    })

    // Use the safe column removal function
    const removeColumnQuery = `
      SELECT remove_custom_column($1, $2, $3) as result
    `
    
    const result = await executeWithTenant(
      tenantContext.user.tenant_id,
      removeColumnQuery,
      [tenantContext.user.tenant_id, columnId, tenantContext.user.id]
    )

    const removeResult = result[0]?.result

    if (removeResult.success) {
      return NextResponse.json({
        success: true,
        data: removeResult,
        message: 'Custom column removed successfully'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: removeResult.error
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Error removing custom column:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to remove custom column',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
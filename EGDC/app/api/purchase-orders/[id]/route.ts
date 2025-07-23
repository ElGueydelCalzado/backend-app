// EGDC Marketplace Evolution: Task 1.7
// Individual Purchase Order API Endpoint
// Handles detailed purchase order operations

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth-config'
import { TenantSafePostgresManager, pool } from '@/lib/postgres-tenant-safe'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Fetch individual purchase order with full details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.tenant_id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const resolvedParams = await params
    const orderId = resolvedParams.id
    const tenant_id = session.user.tenant_id

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    const client = await pool.connect()
    
    try {
      // Set tenant context for RLS
      await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenant_id])

      // Fetch purchase order with complete details
      const orderResult = await client.query(`
        SELECT 
          po.*,
          
          -- Retailer information
          rt.name as retailer_name,
          rt.subdomain as retailer_subdomain,
          rt.email as retailer_email,
          ru.name as retailer_user_name,
          
          -- Supplier information
          st.name as supplier_name,
          st.subdomain as supplier_subdomain,
          st.email as supplier_email,
          st.supplier_settings,
          su.name as supplier_user_name
          
        FROM purchase_orders po
        JOIN tenants rt ON po.retailer_tenant_id = rt.id
        JOIN tenants st ON po.supplier_tenant_id = st.id
        LEFT JOIN users ru ON po.retailer_user_id = ru.id
        LEFT JOIN users su ON po.supplier_user_id = su.id
        WHERE po.id = $1 
        AND (po.retailer_tenant_id = $2 OR po.supplier_tenant_id = $2)
      `, [orderId, tenant_id])

      if (orderResult.rows.length === 0) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      const order = orderResult.rows[0]

      // Fetch detailed order items
      const itemsResult = await client.query(`
        SELECT 
          poi.*,
          p.categoria,
          p.google_drive,
          CASE 
            WHEN $2 LIKE '%fami%' THEN p.inv_fami
            WHEN $2 LIKE '%osiel%' THEN p.inv_osiel  
            WHEN $2 LIKE '%molly%' THEN p.inv_molly
            ELSE 0
          END as current_inventory
        FROM purchase_order_items poi
        LEFT JOIN products p ON poi.product_id = p.id
        WHERE poi.order_id = $1
        ORDER BY poi.created_at
      `, [orderId, order.supplier_tenant_id])

      const orderData = {
        ...order,
        supplier_settings: order.supplier_settings || {},
        is_retailer: order.retailer_tenant_id === tenant_id,
        is_supplier: order.supplier_tenant_id === tenant_id,
        items: itemsResult.rows,
        
        // Calculate totals from items
        calculated_totals: {
          item_count: itemsResult.rows.length,
          total_quantity: itemsResult.rows.reduce((sum, item) => sum + item.quantity, 0),
          total_line_value: itemsResult.rows.reduce((sum, item) => sum + parseFloat(item.line_total || 0), 0)
        }
      }

      return NextResponse.json({
        success: true,
        data: orderData
      })

    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Error fetching purchase order:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch purchase order' 
    }, { status: 500 })
  }
}

// PUT - Update specific purchase order
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.tenant_id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const resolvedParams = await params
    const orderId = resolvedParams.id
    const tenant_id = session.user.tenant_id
    const user_id = session.user.id

    const body = await request.json()
    const { 
      action, 
      supplier_notes, 
      retailer_notes,
      estimated_delivery_date, 
      tracking_number,
      payment_method,
      items_shipped 
    } = body

    if (!orderId || !action) {
      return NextResponse.json({ 
        error: 'Missing required fields: action' 
      }, { status: 400 })
    }

    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Set tenant context for RLS
      await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenant_id])

      // Verify order exists and get current status
      const orderResult = await client.query(`
        SELECT id, status, supplier_tenant_id, retailer_tenant_id, order_number
        FROM purchase_orders 
        WHERE id = $1 AND (supplier_tenant_id = $2 OR retailer_tenant_id = $2)
      `, [orderId, tenant_id])

      if (orderResult.rows.length === 0) {
        throw new Error('Order not found or insufficient permissions')
      }

      const order = orderResult.rows[0]
      const isSupplier = order.supplier_tenant_id === tenant_id
      const isRetailer = order.retailer_tenant_id === tenant_id

      let newStatus = order.status
      let updateFields = []
      let queryParams = [orderId]
      let paramCount = 1

      // Validate action permissions and business rules
      switch (action) {
        case 'confirm':
          if (!isSupplier) {
            throw new Error('Only suppliers can confirm orders')
          }
          if (order.status !== 'pending') {
            throw new Error('Order can only be confirmed when pending')
          }
          newStatus = 'confirmed'
          paramCount++
          updateFields.push(`supplier_user_id = $${paramCount}`)
          queryParams.push(user_id)
          break
          
        case 'process':
          if (!isSupplier) {
            throw new Error('Only suppliers can mark orders as processing')
          }
          if (order.status !== 'confirmed') {
            throw new Error('Order must be confirmed before processing')
          }
          newStatus = 'processing'
          break
          
        case 'ship':
          if (!isSupplier) {
            throw new Error('Only suppliers can ship orders')
          }
          if (order.status !== 'processing') {
            throw new Error('Order must be processing before shipping')
          }
          if (!tracking_number) {
            throw new Error('Tracking number required for shipping')
          }
          newStatus = 'shipped'
          break
          
        case 'deliver':
          if (!isRetailer) {
            throw new Error('Only retailers can confirm delivery')
          }
          if (order.status !== 'shipped') {
            throw new Error('Order must be shipped before delivery confirmation')
          }
          newStatus = 'delivered'
          break
          
        case 'cancel':
          if (order.status === 'delivered') {
            throw new Error('Cannot cancel delivered orders')
          }
          if (order.status === 'shipped' && !isSupplier) {
            throw new Error('Only suppliers can cancel shipped orders')
          }
          newStatus = 'cancelled'
          break
          
        case 'dispute':
          if (!['shipped', 'delivered'].includes(order.status)) {
            throw new Error('Can only dispute shipped or delivered orders')
          }
          newStatus = 'disputed'
          break
          
        case 'update_notes':
          // Allow both parties to update their respective notes
          newStatus = order.status // Keep same status
          break
          
        default:
          throw new Error('Invalid action')
      }

      // Build update query
      paramCount++
      updateFields.push(`status = $${paramCount}`)
      queryParams.push(newStatus)

      // Handle notes updates
      if (supplier_notes !== undefined && isSupplier) {
        paramCount++
        updateFields.push(`supplier_notes = $${paramCount}`)
        queryParams.push(supplier_notes)
      }

      if (retailer_notes !== undefined && isRetailer) {
        paramCount++
        updateFields.push(`retailer_notes = $${paramCount}`)
        queryParams.push(retailer_notes)
      }

      // Handle other field updates
      if (estimated_delivery_date && isSupplier) {
        paramCount++
        updateFields.push(`estimated_delivery_date = $${paramCount}`)
        queryParams.push(estimated_delivery_date)
      }

      if (tracking_number && isSupplier) {
        paramCount++
        updateFields.push(`tracking_number = $${paramCount}`)
        queryParams.push(tracking_number)
      }

      if (payment_method && isRetailer) {
        paramCount++
        updateFields.push(`payment_method = $${paramCount}`)
        queryParams.push(payment_method)
      }

      // Update the order
      const updateResult = await client.query(`
        UPDATE purchase_orders 
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE id = $1
        RETURNING id, order_number, status, updated_at, confirmed_at, shipped_at, delivered_at, cancelled_at
      `, queryParams)

      // Handle item shipping updates
      if (items_shipped && Array.isArray(items_shipped) && isSupplier) {
        for (const item of items_shipped) {
          await client.query(`
            UPDATE purchase_order_items 
            SET quantity_shipped = $2, updated_at = NOW()
            WHERE order_id = $1 AND product_id = $3
          `, [orderId, item.quantity_shipped, item.product_id])
        }
      }

      await client.query('COMMIT')

      return NextResponse.json({
        success: true,
        data: updateResult.rows[0],
        message: `Order ${order.order_number} ${action} successful`
      })

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Error updating purchase order:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to update purchase order' 
    }, { status: 500 })
  }
}

// DELETE - Cancel/Delete purchase order (only for pending orders)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.tenant_id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const resolvedParams = await params
    const orderId = resolvedParams.id
    const tenant_id = session.user.tenant_id

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Set tenant context for RLS
      await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenant_id])

      // Verify order exists and is deletable
      const orderResult = await client.query(`
        SELECT id, status, order_number, retailer_tenant_id
        FROM purchase_orders 
        WHERE id = $1 AND retailer_tenant_id = $2
      `, [orderId, tenant_id])

      if (orderResult.rows.length === 0) {
        return NextResponse.json({ error: 'Order not found or insufficient permissions' }, { status: 404 })
      }

      const order = orderResult.rows[0]

      if (order.status !== 'pending') {
        throw new Error('Can only delete pending orders. Use cancel action for confirmed orders.')
      }

      // Delete order items first (due to foreign key constraints)
      await client.query('DELETE FROM purchase_order_items WHERE order_id = $1', [orderId])
      
      // Delete the order
      await client.query('DELETE FROM purchase_orders WHERE id = $1', [orderId])

      await client.query('COMMIT')

      return NextResponse.json({
        success: true,
        message: `Order ${order.order_number} deleted successfully`
      })

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Error deleting purchase order:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to delete purchase order' 
    }, { status: 500 })
  }
}
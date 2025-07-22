// EGDC Marketplace Evolution: Task 1.7
// Purchase Orders API Endpoint
// Handles creation and retrieval of B2B purchase orders with proper validation

import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, executeWithTenant } from '@/lib/tenant-context'

// Interface for purchase order creation
interface CreatePurchaseOrderRequest {
  supplier_tenant_id: string
  items: Array<{
    product_id: number
    quantity: number
    unit_cost: number
  }>
  shipping_address: {
    name: string
    address: string
    city: string
    state: string
    postal_code: string
    country: string
    phone?: string
  }
  retailer_notes?: string
  payment_method?: string
}

interface PurchaseOrderItem {
  product_id: number
  product_sku: string
  product_name: string
  product_brand: string
  product_model: string
  product_color: string
  product_size: string
  quantity: number
  unit_cost: number
  line_total: number
}

// POST - Create new purchase order
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

    const retailer_tenant_id = tenantContext.user.tenant_id
    const retailer_user_id = tenantContext.user.id

    const body: CreatePurchaseOrderRequest = await request.json()
    const { supplier_tenant_id, items, shipping_address, retailer_notes, payment_method } = body

    // Validate required fields
    if (!supplier_tenant_id || !items || items.length === 0 || !shipping_address) {
      return NextResponse.json({ 
        error: 'Missing required fields: supplier_tenant_id, items, shipping_address' 
      }, { status: 400 })
    }

    // Validate that retailer is not trying to order from themselves
    if (retailer_tenant_id === supplier_tenant_id) {
      return NextResponse.json({ 
        error: 'Cannot create purchase order with yourself as supplier' 
      }, { status: 400 })
    }

    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // Set tenant context for RLS
      await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [retailer_tenant_id])

      // Verify supplier exists and is a wholesaler
      const supplierResult = await client.query(`
        SELECT id, name, business_type, supplier_settings 
        FROM tenants 
        WHERE id = $1 AND business_type = 'wholesaler' AND status = 'active'
      `, [supplier_tenant_id])

      if (supplierResult.rows.length === 0) {
        throw new Error('Supplier not found or not available')
      }

      const supplier = supplierResult.rows[0]
      const supplierSettings = supplier.supplier_settings || {}

      // Verify all products exist and belong to supplier
      const productIds = items.map(item => item.product_id)
      const productsResult = await client.query(`
        SELECT id, sku, marca, modelo, color, talla, costo, 
               CONCAT(marca, ' ', modelo) as name,
               CASE 
                 WHEN $2 LIKE '%fami%' THEN inv_fami
                 WHEN $2 LIKE '%osiel%' THEN inv_osiel  
                 WHEN $2 LIKE '%molly%' THEN inv_molly
                 ELSE 0
               END as available_inventory
        FROM products 
        WHERE id = ANY($1) AND tenant_id = $2
      `, [productIds, supplier_tenant_id])

      if (productsResult.rows.length !== items.length) {
        throw new Error('Some products not found or not available from this supplier')
      }

      // Validate inventory and create order items data
      const orderItems: PurchaseOrderItem[] = []
      let subtotal = 0

      for (const item of items) {
        const product = productsResult.rows.find(p => p.id === item.product_id)
        if (!product) {
          throw new Error(`Product ${item.product_id} not found`)
        }

        if (product.available_inventory < item.quantity) {
          throw new Error(`Insufficient inventory for ${product.name}. Available: ${product.available_inventory}, Requested: ${item.quantity}`)
        }

        if (item.quantity <= 0) {
          throw new Error(`Invalid quantity for ${product.name}`)
        }

        const line_total = item.quantity * item.unit_cost
        subtotal += line_total

        orderItems.push({
          product_id: item.product_id,
          product_sku: product.sku || '',
          product_name: product.name || '',
          product_brand: product.marca || '',
          product_model: product.modelo || '',
          product_color: product.color || '',
          product_size: product.talla || '',
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          line_total
        })
      }

      // Check minimum order requirements
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
      const minimumOrder = supplierSettings.minimum_order || 0
      
      if (minimumOrder > 0 && totalQuantity < minimumOrder) {
        throw new Error(`Order does not meet minimum requirement of ${minimumOrder} units. Current: ${totalQuantity}`)
      }

      // Generate order number
      const orderNumberResult = await client.query('SELECT generate_order_number() as order_number')
      const orderNumber = orderNumberResult.rows[0].order_number

      // Get payment terms from supplier settings
      const paymentTerms = supplierSettings.payment_terms || 'Net 30'

      // Create purchase order
      const purchaseOrderResult = await client.query(`
        INSERT INTO purchase_orders (
          order_number,
          retailer_tenant_id,
          supplier_tenant_id, 
          retailer_user_id,
          status,
          items,
          subtotal,
          shipping_address,
          payment_terms,
          payment_method,
          retailer_notes,
          estimated_delivery_date
        ) VALUES (
          $1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10,
          CURRENT_DATE + INTERVAL '1 day' * COALESCE($11::integer, 7)
        )
        RETURNING id, order_number, total_amount, created_at, estimated_delivery_date
      `, [
        orderNumber,
        retailer_tenant_id,
        supplier_tenant_id,
        retailer_user_id,
        JSON.stringify(orderItems),
        subtotal,
        JSON.stringify(shipping_address),
        paymentTerms,
        payment_method || 'bank_transfer',
        retailer_notes,
        supplierSettings.lead_time_days
      ])

      const purchaseOrder = purchaseOrderResult.rows[0]

      // Create detailed order items records
      for (const item of orderItems) {
        await client.query(`
          INSERT INTO purchase_order_items (
            order_id, product_id, product_sku, product_name, 
            product_brand, product_model, product_color, product_size,
            quantity, unit_cost
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          purchaseOrder.id,
          item.product_id,
          item.product_sku,
          item.product_name,
          item.product_brand,
          item.product_model,
          item.product_color,
          item.product_size,
          item.quantity,
          item.unit_cost
        ])
      }

      await client.query('COMMIT')

      return NextResponse.json({
        success: true,
        data: {
          id: purchaseOrder.id,
          order_number: purchaseOrder.order_number,
          total_amount: purchaseOrder.total_amount,
          estimated_delivery_date: purchaseOrder.estimated_delivery_date,
          created_at: purchaseOrder.created_at,
          supplier_name: supplier.name,
          item_count: orderItems.length,
          total_quantity: totalQuantity
        }
      })

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Error creating purchase order:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to create purchase order' 
    }, { status: 500 })
  }
}

// GET - Fetch purchase orders
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenant_id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const tenant_id = session.user.tenant_id
    const { searchParams } = new URL(request.url)
    
    // Query parameters
    const status = searchParams.get('status')
    const supplier_id = searchParams.get('supplier_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const order_by = searchParams.get('order_by') || 'created_at'
    const order_dir = searchParams.get('order_dir') || 'DESC'

    const client = await pool.connect()
    
    try {
      // Set tenant context for RLS
      await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenant_id])

      // Build query conditions
      let whereConditions = []
      let queryParams = [tenant_id]
      let paramCount = 1

      if (status) {
        paramCount++
        whereConditions.push(`po.status = $${paramCount}`)
        queryParams.push(status)
      }

      if (supplier_id) {
        paramCount++
        whereConditions.push(`po.supplier_tenant_id = $${paramCount}`)
        queryParams.push(supplier_id)
      }

      const whereClause = whereConditions.length > 0 
        ? `AND ${whereConditions.join(' AND ')}` 
        : ''

      // Validate order_by to prevent SQL injection
      const allowedOrderBy = ['created_at', 'order_number', 'total_amount', 'status', 'estimated_delivery_date']
      const safeOrderBy = allowedOrderBy.includes(order_by) ? order_by : 'created_at'
      const safeOrderDir = order_dir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

      // Fetch purchase orders with supplier information
      const ordersResult = await client.query(`
        SELECT 
          po.id,
          po.order_number,
          po.status,
          po.subtotal,
          po.tax_amount,
          po.shipping_cost,
          po.total_amount,
          po.payment_terms,
          po.payment_status,
          po.payment_due_date,
          po.estimated_delivery_date,
          po.actual_delivery_date,
          po.tracking_number,
          po.retailer_notes,
          po.supplier_notes,
          po.created_at,
          po.updated_at,
          po.confirmed_at,
          po.shipped_at,
          
          -- Supplier information
          st.name as supplier_name,
          st.subdomain as supplier_subdomain,
          st.supplier_settings,
          
          -- Order metrics
          jsonb_array_length(po.items) as item_count,
          
          -- Calculate total quantity from items
          (
            SELECT SUM((item->>'quantity')::integer)
            FROM jsonb_array_elements(po.items) as item
          ) as total_quantity
          
        FROM purchase_orders po
        JOIN tenants st ON po.supplier_tenant_id = st.id
        WHERE (po.retailer_tenant_id = $1 OR po.supplier_tenant_id = $1)
        ${whereClause}
        ORDER BY po.${safeOrderBy} ${safeOrderDir}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `, [...queryParams, limit, offset])

      // Get total count for pagination
      const countResult = await client.query(`
        SELECT COUNT(*) as total
        FROM purchase_orders po
        WHERE (po.retailer_tenant_id = $1 OR po.supplier_tenant_id = $1)
        ${whereClause}
      `, queryParams)

      const orders = ordersResult.rows.map(order => ({
        ...order,
        supplier_settings: order.supplier_settings || {},
        is_retailer: order.retailer_tenant_id === tenant_id,
        is_supplier: order.supplier_tenant_id === tenant_id
      }))

      return NextResponse.json({
        success: true,
        data: {
          orders,
          pagination: {
            total: parseInt(countResult.rows[0].total),
            limit,
            offset,
            has_more: (offset + limit) < parseInt(countResult.rows[0].total)
          }
        }
      })

    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Error fetching purchase orders:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch purchase orders' 
    }, { status: 500 })
  }
}

// PUT - Update purchase order (for suppliers to confirm/update orders)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenant_id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const tenant_id = session.user.tenant_id
    const body = await request.json()
    const { order_id, action, supplier_notes, estimated_delivery_date, tracking_number } = body

    if (!order_id || !action) {
      return NextResponse.json({ 
        error: 'Missing required fields: order_id, action' 
      }, { status: 400 })
    }

    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Set tenant context for RLS
      await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenant_id])

      // Verify order exists and user has permission to update it
      const orderResult = await client.query(`
        SELECT id, status, supplier_tenant_id, retailer_tenant_id
        FROM purchase_orders 
        WHERE id = $1 AND supplier_tenant_id = $2
      `, [order_id, tenant_id])

      if (orderResult.rows.length === 0) {
        throw new Error('Order not found or insufficient permissions')
      }

      const order = orderResult.rows[0]
      let newStatus = order.status
      let updateFields = []
      let queryParams = [order_id]
      let paramCount = 1

      // Handle different actions
      switch (action) {
        case 'confirm':
          if (order.status !== 'pending') {
            throw new Error('Order can only be confirmed when pending')
          }
          newStatus = 'confirmed'
          break
          
        case 'process':
          if (order.status !== 'confirmed') {
            throw new Error('Order must be confirmed before processing')
          }
          newStatus = 'processing'
          break
          
        case 'ship':
          if (order.status !== 'processing') {
            throw new Error('Order must be processing before shipping')
          }
          newStatus = 'shipped'
          break
          
        case 'cancel':
          if (!['pending', 'confirmed'].includes(order.status)) {
            throw new Error('Order can only be cancelled when pending or confirmed')
          }
          newStatus = 'cancelled'
          break
          
        default:
          throw new Error('Invalid action')
      }

      // Build update query
      paramCount++
      updateFields.push(`status = $${paramCount}`)
      queryParams.push(newStatus)

      if (supplier_notes) {
        paramCount++
        updateFields.push(`supplier_notes = $${paramCount}`)
        queryParams.push(supplier_notes)
      }

      if (estimated_delivery_date) {
        paramCount++
        updateFields.push(`estimated_delivery_date = $${paramCount}`)
        queryParams.push(estimated_delivery_date)
      }

      if (tracking_number) {
        paramCount++
        updateFields.push(`tracking_number = $${paramCount}`)
        queryParams.push(tracking_number)
      }

      // Update order
      const updateResult = await client.query(`
        UPDATE purchase_orders 
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE id = $1
        RETURNING id, order_number, status, updated_at
      `, queryParams)

      await client.query('COMMIT')

      return NextResponse.json({
        success: true,
        data: updateResult.rows[0]
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
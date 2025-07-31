import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { OrderRoutingEngine, orderRoutingSchema } from '../../../../lib/business-logic/order-routing'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

// Initialize order routing engine
const orderEngine = new OrderRoutingEngine(pool)

// Ensure tables exist
async function ensureOrderTables() {
  try {
    await pool.query(orderRoutingSchema)
  } catch (error) {
    console.error('Error creating order tables:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureOrderTables()
    
    const orderData = await request.json()
    
    // Validate required fields
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order items are required' },
        { status: 400 }
      )
    }

    if (!orderData.shipping || !orderData.shipping.email) {
      return NextResponse.json(
        { success: false, error: 'Shipping information is required' },
        { status: 400 }
      )
    }

    // Process the order through the routing engine
    const result = await orderEngine.processOrder({
      items: orderData.items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.product?.precio_shopify || 0
      })),
      shippingAddress: orderData.shipping,
      paymentInfo: orderData.payment || { method: 'card' },
      subtotal: orderData.subtotal || 0,
      shipping: orderData.shipping || 0,
      tax: orderData.tax || 0,
      total: orderData.total || 0,
      status: 'pending'
    })

    // Send confirmation email (in production, this would be handled by a proper email service)
    console.log('Order created:', {
      orderId: result.orderId,
      estimatedDelivery: result.estimatedDelivery,
      fulfillmentPlan: result.fulfillmentPlan
    })

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      estimatedDelivery: result.estimatedDelivery,
      fulfillmentPlan: {
        items: result.fulfillmentPlan.items.length,
        preferredCarrier: result.fulfillmentPlan.preferredCarrier,
        totalShippingCost: result.fulfillmentPlan.totalShippingCost
      },
      message: 'Order processed successfully'
    })

  } catch (error) {
    console.error('Error processing order:', error)
    
    let errorMessage = 'Error processing order'
    let statusCode = 500
    
    if (error instanceof Error) {
      if (error.message.includes('not available')) {
        errorMessage = 'One or more products are no longer available'
        statusCode = 400
      } else {
        errorMessage = error.message
      }
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const orderId = searchParams.get('orderId')
    const customerEmail = searchParams.get('email')

    if (orderId) {
      // Get specific order details
      const orderDetails = await orderEngine.getOrderDetails(parseInt(orderId))
      
      if (!orderDetails) {
        return NextResponse.json(
          { success: false, error: 'Order not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        order: orderDetails
      })
    }

    if (customerEmail) {
      // Get customer's order history
      const query = `
        SELECT 
          id,
          total_amount,
          status,
          estimated_delivery,
          preferred_carrier,
          tracking_number,
          created_at,
          (
            SELECT COUNT(*) 
            FROM consumer_order_items 
            WHERE order_id = consumer_orders.id
          ) as item_count
        FROM consumer_orders 
        WHERE customer_email = $1 
        ORDER BY created_at DESC 
        LIMIT 20
      `

      const result = await pool.query(query, [customerEmail])

      return NextResponse.json({
        success: true,
        orders: result.rows
      })
    }

    return NextResponse.json(
      { success: false, error: 'Order ID or customer email required' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching orders' },
      { status: 500 }
    )
  }
}
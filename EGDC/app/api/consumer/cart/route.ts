import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

// Create cart table if it doesn't exist
async function ensureCartTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS consumer_cart (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(session_id, product_id)
      )
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_consumer_cart_session_id ON consumer_cart(session_id)
    `)
  } catch (error) {
    console.error('Error creating cart table:', error)
  }
}

// Get session ID from request (in production, this would use proper session management)
function getSessionId(request: NextRequest): string {
  const sessionId = request.headers.get('x-session-id') || 
                   request.cookies.get('session-id')?.value ||
                   'anonymous-' + Math.random().toString(36).substr(2, 9)
  return sessionId
}

// GET - Fetch cart items
export async function GET(request: NextRequest) {
  try {
    await ensureCartTable()
    
    const sessionId = getSessionId(request)

    const query = `
      SELECT 
        c.id,
        c.product_id,
        c.quantity,
        c.created_at,
        p.categoria,
        p.marca,
        p.modelo,
        p.color,
        p.talla,
        p.sku,
        p.google_drive,
        p.precio_shopify,
        p.inventory_total
      FROM consumer_cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.session_id = $1
      ORDER BY c.created_at DESC
    `

    const result = await pool.query(query, [sessionId])

    const items = result.rows.map(row => ({
      id: row.id,
      productId: row.product_id,
      quantity: row.quantity,
      product: {
        id: row.product_id,
        categoria: row.categoria,
        marca: row.marca,
        modelo: row.modelo,
        color: row.color,
        talla: row.talla,
        sku: row.sku,
        google_drive: row.google_drive,
        precio_shopify: row.precio_shopify,
        inventory_total: row.inventory_total
      }
    }))

    return NextResponse.json({
      success: true,
      items
    })

  } catch (error) {
    console.error('Error fetching cart:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching cart' },
      { status: 500 }
    )
  }
}

// POST - Add item to cart
export async function POST(request: NextRequest) {
  try {
    await ensureCartTable()
    
    const sessionId = getSessionId(request)
    const { productId, quantity = 1 } = await request.json()

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Check if product exists and has inventory
    const productQuery = `
      SELECT id, inventory_total, precio_shopify 
      FROM products 
      WHERE id = $1 AND inventory_total > 0 AND shopify = true
    `
    const productResult = await pool.query(productQuery, [productId])

    if (productResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not available' },
        { status: 404 }
      )
    }

    const product = productResult.rows[0]

    // Check if requested quantity is available
    if (quantity > product.inventory_total) {
      return NextResponse.json(
        { success: false, error: 'Insufficient inventory' },
        { status: 400 }
      )
    }

    // Insert or update cart item
    const upsertQuery = `
      INSERT INTO consumer_cart (session_id, product_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (session_id, product_id)
      DO UPDATE SET 
        quantity = consumer_cart.quantity + $3,
        updated_at = NOW()
      RETURNING id, quantity
    `

    const result = await pool.query(upsertQuery, [sessionId, productId, quantity])

    // Check if total quantity doesn't exceed inventory
    const finalQuantity = result.rows[0].quantity
    if (finalQuantity > product.inventory_total) {
      // Update to max available
      await pool.query(
        'UPDATE consumer_cart SET quantity = $1 WHERE id = $2',
        [product.inventory_total, result.rows[0].id]
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Product added to cart',
      cartItemId: result.rows[0].id
    })

  } catch (error) {
    console.error('Error adding to cart:', error)
    return NextResponse.json(
      { success: false, error: 'Error adding to cart' },
      { status: 500 }
    )
  }
}

// DELETE - Clear cart
export async function DELETE(request: NextRequest) {
  try {
    await ensureCartTable()
    
    const sessionId = getSessionId(request)

    await pool.query(
      'DELETE FROM consumer_cart WHERE session_id = $1',
      [sessionId]
    )

    return NextResponse.json({
      success: true,
      message: 'Cart cleared'
    })

  } catch (error) {
    console.error('Error clearing cart:', error)
    return NextResponse.json(
      { success: false, error: 'Error clearing cart' },
      { status: 500 }
    )
  }
}
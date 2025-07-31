import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

function getSessionId(request: NextRequest): string {
  const sessionId = request.headers.get('x-session-id') || 
                   request.cookies.get('session-id')?.value ||
                   'anonymous-' + Math.random().toString(36).substr(2, 9)
  return sessionId
}

// PUT - Update cart item quantity
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = getSessionId(request)
    const cartItemId = parseInt(params.id)
    const { quantity } = await request.json()

    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid quantity' },
        { status: 400 }
      )
    }

    // Get cart item with product info
    const cartQuery = `
      SELECT c.id, c.product_id, p.inventory_total
      FROM consumer_cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.id = $1 AND c.session_id = $2
    `

    const cartResult = await pool.query(cartQuery, [cartItemId, sessionId])

    if (cartResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cart item not found' },
        { status: 404 }
      )
    }

    const cartItem = cartResult.rows[0]

    // Check if quantity is available
    if (quantity > cartItem.inventory_total) {
      return NextResponse.json(
        { success: false, error: 'Insufficient inventory' },
        { status: 400 }
      )
    }

    // Update quantity
    await pool.query(
      'UPDATE consumer_cart SET quantity = $1, updated_at = NOW() WHERE id = $2',
      [quantity, cartItemId]
    )

    return NextResponse.json({
      success: true,
      message: 'Cart item updated'
    })

  } catch (error) {
    console.error('Error updating cart item:', error)
    return NextResponse.json(
      { success: false, error: 'Error updating cart item' },
      { status: 500 }
    )
  }
}

// DELETE - Remove cart item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = getSessionId(request)
    const cartItemId = parseInt(params.id)

    const result = await pool.query(
      'DELETE FROM consumer_cart WHERE id = $1 AND session_id = $2',
      [cartItemId, sessionId]
    )

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Cart item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Cart item removed'
    })

  } catch (error) {
    console.error('Error removing cart item:', error)
    return NextResponse.json(
      { success: false, error: 'Error removing cart item' },
      { status: 500 }
    )
  }
}
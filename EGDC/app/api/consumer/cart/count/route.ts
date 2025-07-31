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

export async function GET(request: NextRequest) {
  try {
    const sessionId = getSessionId(request)

    const query = `
      SELECT COALESCE(SUM(quantity), 0) as count
      FROM consumer_cart 
      WHERE session_id = $1
    `

    const result = await pool.query(query, [sessionId])
    const count = parseInt(result.rows[0].count) || 0

    return NextResponse.json({
      success: true,
      count
    })

  } catch (error) {
    console.error('Error fetching cart count:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching cart count', count: 0 },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { AffiliateSystem } from '../../../../lib/affiliate/affiliate-system'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

const affiliateSystem = new AffiliateSystem(pool)

// Request a payout
export async function POST(request: NextRequest) {
  try {
    const {
      affiliateId,
      amount,
      paymentMethod = 'bank_transfer'
    } = await request.json()

    if (!affiliateId || !amount) {
      return NextResponse.json(
        { success: false, error: 'Affiliate ID and amount are required' },
        { status: 400 }
      )
    }

    if (amount < 500) {
      return NextResponse.json(
        { success: false, error: 'Minimum payout amount is $500 MXN' },
        { status: 400 }
      )
    }

    const validPaymentMethods = ['bank_transfer', 'paypal', 'stripe', 'cash']
    if (!validPaymentMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment method' },
        { status: 400 }
      )
    }

    // Check affiliate exists and is active
    const affiliateResult = await pool.query(`
      SELECT id, status, total_commissions 
      FROM affiliates 
      WHERE id = $1
    `, [affiliateId])

    if (affiliateResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Affiliate not found' },
        { status: 404 }
      )
    }

    const affiliate = affiliateResult.rows[0]

    if (affiliate.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Affiliate account is not active' },
        { status: 400 }
      )
    }

    // Check available balance
    const balanceResult = await pool.query(`
      SELECT COALESCE(SUM(commission_amount), 0) as available_balance
      FROM affiliate_commissions 
      WHERE affiliate_id = $1 AND status = 'approved'
    `, [affiliateId])

    const availableBalance = parseFloat(balanceResult.rows[0].available_balance)

    if (amount > availableBalance) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient balance',
          availableBalance
        },
        { status: 400 }
      )
    }

    // Request payout
    const payoutId = await affiliateSystem.requestPayout(
      affiliateId,
      amount,
      paymentMethod as any
    )

    // Get payout details
    const payoutResult = await pool.query(`
      SELECT 
        id, amount, currency, status, payment_method,
        fees, net_amount, requested_at
      FROM affiliate_payouts 
      WHERE id = $1
    `, [payoutId])

    const payout = payoutResult.rows[0]

    // Send notification (in production, this would be handled by a proper notification service)
    console.log('Payout requested:', {
      payoutId,
      affiliateId,
      amount,
      paymentMethod
    })

    return NextResponse.json({
      success: true,
      payout: {
        id: payout.id,
        amount: parseFloat(payout.amount),
        currency: payout.currency,
        status: payout.status,
        paymentMethod: payout.payment_method,
        fees: parseFloat(payout.fees),
        netAmount: parseFloat(payout.net_amount),
        requestedAt: payout.requested_at
      },
      message: 'Payout request submitted successfully'
    })

  } catch (error) {
    console.error('Error requesting payout:', error)
    
    let errorMessage = 'Error processing payout request'
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

// Get payout history
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const affiliateId = searchParams.get('affiliateId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!affiliateId) {
      return NextResponse.json(
        { success: false, error: 'Affiliate ID is required' },
        { status: 400 }
      )
    }

    let whereClause = 'WHERE affiliate_id = $1'
    const params: any[] = [affiliateId]

    if (status) {
      whereClause += ' AND status = $2'
      params.push(status)
    }

    // Get total count
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM affiliate_payouts 
      ${whereClause}
    `, params)

    const totalPayouts = parseInt(countResult.rows[0].total)

    // Get payouts
    const payoutsResult = await pool.query(`
      SELECT * FROM affiliate_payouts 
      ${whereClause}
      ORDER BY requested_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset])

    const payouts = payoutsResult.rows.map((payout: any) => ({
      id: payout.id,
      amount: parseFloat(payout.amount),
      currency: payout.currency,
      status: payout.status,
      paymentMethod: payout.payment_method,
      paymentReference: payout.payment_reference,
      taxWithheld: parseFloat(payout.tax_withheld || 0),
      fees: parseFloat(payout.fees || 0),
      netAmount: parseFloat(payout.net_amount),
      requestedAt: payout.requested_at,
      processedAt: payout.processed_at,
      completedAt: payout.completed_at
    }))

    // Get available balance
    const balanceResult = await pool.query(`
      SELECT COALESCE(SUM(commission_amount), 0) as available_balance
      FROM affiliate_commissions 
      WHERE affiliate_id = $1 AND status = 'approved'
    `, [affiliateId])

    const availableBalance = parseFloat(balanceResult.rows[0].available_balance)

    return NextResponse.json({
      success: true,
      payouts,
      pagination: {
        total: totalPayouts,
        limit,
        offset,
        hasMore: offset + limit < totalPayouts
      },
      availableBalance
    })

  } catch (error) {
    console.error('Error fetching payouts:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching payout history' },
      { status: 500 }
    )
  }
}

// Update payout status (admin only)
export async function PUT(request: NextRequest) {
  try {
    const {
      payoutId,
      status,
      paymentReference,
      adminKey
    } = await request.json()

    // Simple admin authentication (in production, use proper authentication)
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!payoutId || !status) {
      return NextResponse.json(
        { success: false, error: 'Payout ID and status are required' },
        { status: 400 }
      )
    }

    const validStatuses = ['requested', 'processing', 'completed', 'failed', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Update payout status
    const updateFields = ['status = $2']
    const params = [payoutId, status]

    if (status === 'processing') {
      updateFields.push('processed_at = NOW()')
    } else if (status === 'completed') {
      updateFields.push('completed_at = NOW()')
      if (paymentReference) {
        updateFields.push(`payment_reference = $${params.length + 1}`)
        params.push(paymentReference)
      }
    }

    const updateQuery = `
      UPDATE affiliate_payouts 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING *
    `

    const result = await pool.query(updateQuery, params)

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Payout not found' },
        { status: 404 }
      )
    }

    const payout = result.rows[0]

    // If payout is completed, update affiliate's last payment date
    if (status === 'completed') {
      await pool.query(`
        UPDATE affiliates 
        SET 
          last_payment = NOW(),
          total_earnings = total_earnings + $1
        WHERE id = $2
      `, [payout.net_amount, payout.affiliate_id])
    }

    // Send notification to affiliate
    console.log('Payout status updated:', {
      payoutId,
      status,
      paymentReference
    })

    return NextResponse.json({
      success: true,
      payout: {
        id: payout.id,
        status: payout.status,
        paymentReference: payout.payment_reference,
        processedAt: payout.processed_at,
        completedAt: payout.completed_at
      },
      message: 'Payout status updated successfully'
    })

  } catch (error) {
    console.error('Error updating payout status:', error)
    return NextResponse.json(
      { success: false, error: 'Error updating payout status' },
      { status: 500 }
    )
  }
}
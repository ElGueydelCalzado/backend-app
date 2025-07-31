import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { AffiliateSystem } from '../../../../lib/affiliate/affiliate-system'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

const affiliateSystem = new AffiliateSystem(pool)

// Track affiliate clicks
export async function POST(request: NextRequest) {
  try {
    const {
      referralCode,
      productId,
      source = 'direct',
      customData
    } = await request.json()

    if (!referralCode) {
      return NextResponse.json(
        { success: false, error: 'Referral code is required' },
        { status: 400 }
      )
    }

    // Get client information
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Extract country and city from IP (in production, use a proper IP geolocation service)
    const country = request.headers.get('cf-ipcountry') || undefined
    const city = request.headers.get('cf-ipcity') || undefined

    const clickId = await affiliateSystem.trackClick(referralCode, productId, {
      source,
      ipAddress,
      userAgent,
      country,
      city
    })

    // Set tracking cookie for later conversion attribution
    const response = NextResponse.json({
      success: true,
      clickId,
      message: 'Click tracked successfully'
    })

    // Set cookie with referral code for 30 days
    response.cookies.set('affiliate_ref', referralCode, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })

    return response

  } catch (error) {
    console.error('Error tracking affiliate click:', error)
    
    let errorMessage = 'Error tracking click'
    let statusCode = 500
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid or inactive referral code')) {
        errorMessage = error.message
        statusCode = 400
      }
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    )
  }
}

// Process affiliate commission when order is completed
export async function PUT(request: NextRequest) {
  try {
    const {
      orderId,
      customerId,
      items,
      total,
      referralCode
    } = await request.json()

    if (!orderId || !customerId || !items || !total) {
      return NextResponse.json(
        { success: false, error: 'Order ID, customer ID, items, and total are required' },
        { status: 400 }
      )
    }

    // If no referral code provided, try to get it from the order context or customer history
    let finalReferralCode = referralCode

    if (!finalReferralCode) {
      // In a real implementation, you might check for:
      // 1. Referral code stored with the order
      // 2. Recent affiliate clicks from this customer
      // 3. Customer's referral history
      
      // For now, we'll skip commission processing if no referral code
      return NextResponse.json({
        success: true,
        message: 'No referral code found, no commission processed'
      })
    }

    const commissionId = await affiliateSystem.processCommission(orderId, {
      customerId,
      items: items.map((item: any) => ({
        productId: item.productId || item.product_id,
        price: item.price || item.unit_price,
        quantity: item.quantity
      })),
      total
    }, finalReferralCode)

    if (commissionId) {
      return NextResponse.json({
        success: true,
        commissionId,
        message: 'Commission processed successfully'
      })
    } else {
      return NextResponse.json({
        success: true,
        message: 'No commission processed (inactive referral code or other reason)'
      })
    }

  } catch (error) {
    console.error('Error processing affiliate commission:', error)
    return NextResponse.json(
      { success: false, error: 'Error processing commission' },
      { status: 500 }
    )
  }
}

// Get affiliate tracking statistics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const referralCode = searchParams.get('referralCode')
    const period = searchParams.get('period') || '30d'

    if (!referralCode) {
      return NextResponse.json(
        { success: false, error: 'Referral code is required' },
        { status: 400 }
      )
    }

    // Get affiliate by referral code
    const affiliateResult = await pool.query(
      'SELECT id FROM affiliates WHERE referral_code = $1',
      [referralCode]
    )

    if (affiliateResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Affiliate not found' },
        { status: 404 }
      )
    }

    const affiliateId = affiliateResult.rows[0].id

    // Get tracking statistics
    const stats = await affiliateSystem.getAffiliateStats(
      affiliateId, 
      period as '7d' | '30d' | '90d' | '1y'
    )

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('Error fetching affiliate stats:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching statistics' },
      { status: 500 }
    )
  }
}
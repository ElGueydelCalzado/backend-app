import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { AffiliateSystem } from '../../../../lib/affiliate/affiliate-system'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

const affiliateSystem = new AffiliateSystem(pool)

export async function POST(request: NextRequest) {
  try {
    // Initialize affiliate system if not already done
    await affiliateSystem.initializeAffiliateSystem()
    
    const {
      email,
      firstName,
      lastName,
      companyName,
      website,
      socialMedia,
      phone,
      address
    } = await request.json()

    // Validate required fields
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { success: false, error: 'Email, first name, and last name are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if affiliate already exists
    const existingAffiliate = await pool.query(
      'SELECT id FROM affiliates WHERE email = $1',
      [email]
    )

    if (existingAffiliate.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'An affiliate with this email already exists' },
        { status: 409 }
      )
    }

    // Register new affiliate
    const affiliate = await affiliateSystem.registerAffiliate({
      email,
      firstName,
      lastName,
      companyName,
      website,
      socialMedia,
      phone,
      address
    })

    // Send welcome email (in production, this would be handled by a proper email service)
    console.log('Affiliate registered:', {
      id: affiliate.id,
      email: affiliate.email,
      referralCode: affiliate.referralCode
    })

    return NextResponse.json({
      success: true,
      affiliate: {
        id: affiliate.id,
        email: affiliate.email,
        firstName: affiliate.firstName,
        lastName: affiliate.lastName,
        referralCode: affiliate.referralCode,
        status: affiliate.status,
        tier: affiliate.tier,
        commissionRate: affiliate.commissionRate
      },
      message: 'Affiliate registration successful. Application pending approval.'
    })

  } catch (error) {
    console.error('Error registering affiliate:', error)
    
    let errorMessage = 'Error registering affiliate'
    let statusCode = 500
    
    if (error instanceof Error) {
      if (error.message.includes('duplicate key')) {
        errorMessage = 'An affiliate with this information already exists'
        statusCode = 409
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
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email parameter is required' },
        { status: 400 }
      )
    }

    // Check affiliate status
    const result = await pool.query(`
      SELECT 
        id, email, first_name, last_name, status, tier, 
        referral_code, commission_rate, join_date
      FROM affiliates 
      WHERE email = $1
    `, [email])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Affiliate not found' },
        { status: 404 }
      )
    }

    const affiliate = result.rows[0]

    return NextResponse.json({
      success: true,
      affiliate: {
        id: affiliate.id,
        email: affiliate.email,
        firstName: affiliate.first_name,
        lastName: affiliate.last_name,
        status: affiliate.status,
        tier: affiliate.tier,
        referralCode: affiliate.referral_code,
        commissionRate: parseFloat(affiliate.commission_rate),
        joinDate: affiliate.join_date
      }
    })

  } catch (error) {
    console.error('Error checking affiliate status:', error)
    return NextResponse.json(
      { success: false, error: 'Error checking affiliate status' },
      { status: 500 }
    )
  }
}
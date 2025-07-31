import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

// Handle affiliate link redirects
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code
    
    if (!code) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Find affiliate link by short code or custom alias
    const linkResult = await pool.query(`
      SELECT 
        al.*,
        a.referral_code,
        a.status as affiliate_status
      FROM affiliate_links al
      JOIN affiliates a ON al.affiliate_id = a.id
      WHERE 
        (al.id LIKE $1 OR al.custom_alias = $2)
        AND al.is_active = true
        AND (al.expires_at IS NULL OR al.expires_at > NOW())
        AND a.status = 'active'
    `, [`%${code}%`, code])

    if (linkResult.rows.length === 0) {
      // Redirect to homepage if link not found
      return NextResponse.redirect(new URL('/', request.url))
    }

    const link = linkResult.rows[0]

    // Get client information for tracking
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const referer = request.headers.get('referer') || 'direct'
    
    // Extract country and city from IP (in production, use a proper IP geolocation service)
    const country = request.headers.get('cf-ipcountry') || undefined
    const city = request.headers.get('cf-ipcity') || undefined

    // Track the click asynchronously (don't wait for it to complete)
    trackClick(link, ipAddress, userAgent, referer, country, city)

    // Determine the final URL
    let finalUrl = link.original_url

    // If it's a product link, ensure referral code is in the URL
    if (link.link_type === 'product' && link.product_id) {
      const url = new URL(finalUrl, request.url)
      url.searchParams.set('ref', link.referral_code)
      finalUrl = url.toString()
    }

    // Create redirect response
    const response = NextResponse.redirect(new URL(finalUrl, request.url))

    // Set tracking cookie for conversion attribution
    response.cookies.set('affiliate_ref', link.referral_code, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })

    // Set additional tracking cookies
    response.cookies.set('affiliate_link_id', link.id, {
      maxAge: 30 * 24 * 60 * 60,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })

    return response

  } catch (error) {
    console.error('Error processing affiliate redirect:', error)
    
    // Redirect to homepage in case of error
    return NextResponse.redirect(new URL('/', request.url))
  }
}

// Async function to track the click
async function trackClick(
  link: any,
  ipAddress: string,
  userAgent: string,
  referer: string,
  country?: string,
  city?: string
) {
  try {
    // Insert click record
    await pool.query(`
      INSERT INTO affiliate_clicks (
        affiliate_id, product_id, referral_code, click_source, 
        ip_address, user_agent, country, city
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      link.affiliate_id,
      link.product_id,
      link.referral_code,
      `link_${link.id}`,
      ipAddress,
      userAgent,
      country,
      city
    ])

    // Update affiliate click count
    await pool.query(
      'UPDATE affiliates SET total_clicks = total_clicks + 1 WHERE id = $1',
      [link.affiliate_id]
    )

    // Update link click count and last clicked time
    await pool.query(`
      UPDATE affiliate_links 
      SET 
        click_count = click_count + 1, 
        last_clicked = NOW() 
      WHERE id = $1
    `, [link.id])

  } catch (error) {
    console.error('Error tracking affiliate click:', error)
  }
}

// Handle POST requests for tracking additional data
export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { customData, event } = await request.json()
    const code = params.code

    // Find the link
    const linkResult = await pool.query(`
      SELECT al.*, a.referral_code
      FROM affiliate_links al
      JOIN affiliates a ON al.affiliate_id = a.id
      WHERE (al.id LIKE $1 OR al.custom_alias = $2)
    `, [`%${code}%`, code])

    if (linkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Link not found' },
        { status: 404 }
      )
    }

    const link = linkResult.rows[0]

    // Track custom event
    if (event === 'page_view' || event === 'add_to_cart' || event === 'purchase_intent') {
      await pool.query(`
        INSERT INTO affiliate_events (
          affiliate_id, link_id, event_type, event_data, 
          ip_address, user_agent, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        link.affiliate_id,
        link.id,
        event,
        JSON.stringify(customData),
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
      ])
    }

    return NextResponse.json({
      success: true,
      message: 'Event tracked successfully'
    })

  } catch (error) {
    console.error('Error tracking affiliate event:', error)
    return NextResponse.json(
      { success: false, error: 'Error tracking event' },
      { status: 500 }
    )
  }
}

// Update the affiliate tables to include an events table
export const affiliateEventsSchema = `
  CREATE TABLE IF NOT EXISTS affiliate_events (
    id SERIAL PRIMARY KEY,
    affiliate_id VARCHAR(255) NOT NULL REFERENCES affiliates(id),
    link_id VARCHAR(255) REFERENCES affiliate_links(id),
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_affiliate_events_affiliate_id ON affiliate_events(affiliate_id);
  CREATE INDEX IF NOT EXISTS idx_affiliate_events_type ON affiliate_events(event_type);
  CREATE INDEX IF NOT EXISTS idx_affiliate_events_created_at ON affiliate_events(created_at);
`
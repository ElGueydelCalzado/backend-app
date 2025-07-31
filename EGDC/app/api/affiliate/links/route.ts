import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { AffiliateSystem } from '../../../../lib/affiliate/affiliate-system'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

const affiliateSystem = new AffiliateSystem(pool)

// Create affiliate link
export async function POST(request: NextRequest) {
  try {
    const {
      affiliateId,
      productId,
      categoryId,
      linkType = 'product',
      originalUrl,
      title,
      description,
      customAlias,
      expiresAt
    } = await request.json()

    if (!affiliateId || !originalUrl || !title) {
      return NextResponse.json(
        { success: false, error: 'Affiliate ID, original URL, and title are required' },
        { status: 400 }
      )
    }

    // Validate affiliate exists and is active
    const affiliateResult = await pool.query(
      'SELECT id, status FROM affiliates WHERE id = $1',
      [affiliateId]
    )

    if (affiliateResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Affiliate not found' },
        { status: 404 }
      )
    }

    if (affiliateResult.rows[0].status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Affiliate account is not active' },
        { status: 400 }
      )
    }

    // Validate link type
    const validLinkTypes = ['product', 'category', 'homepage', 'custom']
    if (!validLinkTypes.includes(linkType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid link type' },
        { status: 400 }
      )
    }

    // If custom alias is provided, check if it's already taken
    if (customAlias) {
      const existingAlias = await pool.query(
        'SELECT id FROM affiliate_links WHERE custom_alias = $1',
        [customAlias]
      )

      if (existingAlias.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Custom alias is already taken' },
          { status: 409 }
        )
      }
    }

    // Create the affiliate link
    const affiliateLink = await affiliateSystem.createAffiliateLink(affiliateId, {
      productId,
      categoryId,
      linkType: linkType as any,
      originalUrl,
      title,
      description,
      customAlias,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    })

    return NextResponse.json({
      success: true,
      link: affiliateLink,
      message: 'Affiliate link created successfully'
    })

  } catch (error) {
    console.error('Error creating affiliate link:', error)
    
    let errorMessage = 'Error creating affiliate link'
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

// Get affiliate links
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const affiliateId = searchParams.get('affiliateId')
    const linkType = searchParams.get('linkType')
    const isActive = searchParams.get('isActive')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!affiliateId) {
      return NextResponse.json(
        { success: false, error: 'Affiliate ID is required' },
        { status: 400 }
      )
    }

    let whereClause = 'WHERE affiliate_id = $1'
    const params: any[] = [affiliateId]

    if (linkType) {
      whereClause += ' AND link_type = $2'
      params.push(linkType)
    }

    if (isActive !== null) {
      whereClause += ` AND is_active = $${params.length + 1}`
      params.push(isActive === 'true')
    }

    // Add expiry check
    whereClause += ` AND (expires_at IS NULL OR expires_at > NOW())`

    // Get total count
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM affiliate_links 
      ${whereClause}
    `, params)

    const totalLinks = parseInt(countResult.rows[0].total)

    // Get links with product information if applicable
    const linksResult = await pool.query(`
      SELECT 
        al.*,
        p.marca as product_brand,
        p.modelo as product_model,
        p.precio_shopify as product_price
      FROM affiliate_links al
      LEFT JOIN products p ON al.product_id = p.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset])

    const links = linksResult.rows.map((link: any) => ({
      id: link.id,
      affiliateId: link.affiliate_id,
      productId: link.product_id,
      categoryId: link.category_id,
      linkType: link.link_type,
      originalUrl: link.original_url,
      shortUrl: link.short_url,
      customAlias: link.custom_alias,
      title: link.title,
      description: link.description,
      isActive: link.is_active,
      clickCount: link.click_count,
      conversionCount: link.conversion_count,
      lastClicked: link.last_clicked,
      createdAt: link.created_at,
      expiresAt: link.expires_at,
      product: link.product_id ? {
        brand: link.product_brand,
        model: link.product_model,
        price: parseFloat(link.product_price || 0)
      } : null
    }))

    return NextResponse.json({
      success: true,
      links,
      pagination: {
        total: totalLinks,
        limit,
        offset,
        hasMore: offset + limit < totalLinks
      }
    })

  } catch (error) {
    console.error('Error fetching affiliate links:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching affiliate links' },
      { status: 500 }
    )
  }
}

// Update affiliate link
export async function PUT(request: NextRequest) {
  try {
    const {
      linkId,
      affiliateId,
      title,
      description,
      isActive,
      expiresAt
    } = await request.json()

    if (!linkId || !affiliateId) {
      return NextResponse.json(
        { success: false, error: 'Link ID and Affiliate ID are required' },
        { status: 400 }
      )
    }

    // Check if link belongs to affiliate
    const linkResult = await pool.query(
      'SELECT id FROM affiliate_links WHERE id = $1 AND affiliate_id = $2',
      [linkId, affiliateId]
    )

    if (linkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Link not found or access denied' },
        { status: 404 }
      )
    }

    // Build update query
    const updateFields = []
    const params = [linkId]

    if (title !== undefined) {
      updateFields.push(`title = $${params.length + 1}`)
      params.push(title)
    }

    if (description !== undefined) {
      updateFields.push(`description = $${params.length + 1}`)
      params.push(description)
    }

    if (isActive !== undefined) {
      updateFields.push(`is_active = $${params.length + 1}`)
      params.push(isActive)
    }

    if (expiresAt !== undefined) {
      updateFields.push(`expires_at = $${params.length + 1}`)
      params.push(expiresAt ? new Date(expiresAt) : null)
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      )
    }

    const updateQuery = `
      UPDATE affiliate_links 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING *
    `

    const result = await pool.query(updateQuery, params)
    const updatedLink = result.rows[0]

    return NextResponse.json({
      success: true,
      link: {
        id: updatedLink.id,
        affiliateId: updatedLink.affiliate_id,
        title: updatedLink.title,
        description: updatedLink.description,
        isActive: updatedLink.is_active,
        expiresAt: updatedLink.expires_at
      },
      message: 'Affiliate link updated successfully'
    })

  } catch (error) {
    console.error('Error updating affiliate link:', error)
    return NextResponse.json(
      { success: false, error: 'Error updating affiliate link' },
      { status: 500 }
    )
  }
}

// Delete affiliate link
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const linkId = searchParams.get('linkId')
    const affiliateId = searchParams.get('affiliateId')

    if (!linkId || !affiliateId) {
      return NextResponse.json(
        { success: false, error: 'Link ID and Affiliate ID are required' },
        { status: 400 }
      )
    }

    // Check if link belongs to affiliate
    const result = await pool.query(
      'DELETE FROM affiliate_links WHERE id = $1 AND affiliate_id = $2 RETURNING id',
      [linkId, affiliateId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Link not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Affiliate link deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting affiliate link:', error)
    return NextResponse.json(
      { success: false, error: 'Error deleting affiliate link' },
      { status: 500 }
    )
  }
}
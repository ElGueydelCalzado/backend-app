import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('categoria')
    const brand = searchParams.get('marca')
    const color = searchParams.get('color')
    const size = searchParams.get('talla')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'name'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let whereConditions = ['inventory_total > 0', 'shopify = true'] // Only show products available on Shopify with inventory
    let params: any[] = []
    let paramIndex = 1

    // Add search condition
    if (search) {
      whereConditions.push(`(
        LOWER(marca) ILIKE $${paramIndex} OR 
        LOWER(modelo) ILIKE $${paramIndex} OR 
        LOWER(categoria) ILIKE $${paramIndex} OR 
        LOWER(color) ILIKE $${paramIndex}
      )`)
      params.push(`%${search.toLowerCase()}%`)
      paramIndex++
    }

    // Add filter conditions
    if (category) {
      whereConditions.push(`categoria = $${paramIndex}`)
      params.push(category)
      paramIndex++
    }

    if (brand) {
      whereConditions.push(`marca = $${paramIndex}`)
      params.push(brand)
      paramIndex++
    }

    if (color) {
      whereConditions.push(`color = $${paramIndex}`)
      params.push(color)
      paramIndex++
    }

    if (size) {
      whereConditions.push(`talla = $${paramIndex}`)
      params.push(size)
      paramIndex++
    }

    if (minPrice) {
      whereConditions.push(`precio_shopify >= $${paramIndex}`)
      params.push(parseFloat(minPrice))
      paramIndex++
    }

    if (maxPrice) {
      whereConditions.push(`precio_shopify <= $${paramIndex}`)
      params.push(parseFloat(maxPrice))
      paramIndex++
    }

    // Build ORDER BY clause
    let orderByClause = 'marca ASC, modelo ASC'
    switch (sortBy) {
      case 'price-low':
        orderByClause = 'precio_shopify ASC'
        break
      case 'price-high':
        orderByClause = 'precio_shopify DESC'
        break
      case 'newest':
        orderByClause = 'created_at DESC'
        break
      case 'rating':
        orderByClause = 'id DESC' // Placeholder until we have ratings
        break
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM products
      ${whereClause}
    `

    const countResult = await pool.query(countQuery, params)
    const totalProducts = parseInt(countResult.rows[0].total)

    // Get products
    const productsQuery = `
      SELECT 
        id,
        categoria,
        marca,
        modelo,
        color,
        talla,
        sku,
        google_drive,
        precio_shopify,
        inventory_total,
        created_at,
        updated_at
      FROM products
      ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    params.push(limit, offset)
    const productsResult = await pool.query(productsQuery, params)

    // Add mock ratings and reviews for demo purposes
    const products = productsResult.rows.map(product => ({
      ...product,
      rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
      reviews: Math.floor(Math.random() * 50) + 10 // 10-60 reviews
    }))

    // Get filter options for the current search
    const filtersQuery = `
      SELECT 
        ARRAY_AGG(DISTINCT categoria) FILTER (WHERE categoria IS NOT NULL) as categorias,
        ARRAY_AGG(DISTINCT marca) FILTER (WHERE marca IS NOT NULL) as marcas,
        ARRAY_AGG(DISTINCT color) FILTER (WHERE color IS NOT NULL) as colors,
        ARRAY_AGG(DISTINCT talla) FILTER (WHERE talla IS NOT NULL) as tallas,
        MIN(precio_shopify) as min_price,
        MAX(precio_shopify) as max_price
      FROM products
      WHERE inventory_total > 0 AND shopify = true
    `

    const filtersResult = await pool.query(filtersQuery)
    const filterOptions = filtersResult.rows[0]

    return NextResponse.json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        total: totalProducts,
        totalPages: Math.ceil(totalProducts / limit),
        hasNext: page * limit < totalProducts,
        hasPrev: page > 1
      },
      filters: {
        categorias: filterOptions.categorias || [],
        marcas: filterOptions.marcas || [],
        colors: filterOptions.colors || [],
        tallas: filterOptions.tallas || [],
        priceRange: [
          filterOptions.min_price || 0,
          filterOptions.max_price || 5000
        ]
      }
    })

  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error fetching products',
        products: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        },
        filters: {
          categorias: [],
          marcas: [],
          colors: [],
          tallas: [],
          priceRange: [0, 5000]
        }
      },
      { status: 500 }
    )
  }
}

// Get featured products for homepage
export async function POST(request: NextRequest) {
  try {
    const { type } = await request.json()

    let query = ''
    let params: any[] = []

    switch (type) {
      case 'featured':
        query = `
          SELECT 
            id, categoria, marca, modelo, color, talla, sku, google_drive, 
            precio_shopify, inventory_total, created_at
          FROM products 
          WHERE inventory_total > 5 AND shopify = true 
          ORDER BY inventory_total DESC, created_at DESC 
          LIMIT 8
        `
        break
      
      case 'new':
        query = `
          SELECT 
            id, categoria, marca, modelo, color, talla, sku, google_drive, 
            precio_shopify, inventory_total, created_at
          FROM products 
          WHERE inventory_total > 0 AND shopify = true 
          ORDER BY created_at DESC 
          LIMIT 8
        `
        break
      
      case 'sale':
        query = `
          SELECT 
            id, categoria, marca, modelo, color, talla, sku, google_drive, 
            precio_shopify, inventory_total, created_at
          FROM products 
          WHERE inventory_total > 0 AND shopify = true AND precio_shopify < 1000
          ORDER BY precio_shopify ASC 
          LIMIT 8
        `
        break
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid product type' },
          { status: 400 }
        )
    }

    const result = await pool.query(query, params)
    
    // Add mock ratings and reviews
    const products = result.rows.map(product => ({
      ...product,
      rating: Math.floor(Math.random() * 2) + 4,
      reviews: Math.floor(Math.random() * 50) + 10
    }))

    return NextResponse.json({
      success: true,
      products
    })

  } catch (error) {
    console.error('Error fetching featured products:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching featured products' },
      { status: 500 }
    )
  }
}
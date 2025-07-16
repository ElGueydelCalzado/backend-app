import { NextRequest, NextResponse } from 'next/server'
import { PostgresManager } from '@/lib/postgres'
import { mockInventoryAPI } from '@/lib/mock-data'

export async function GET(request: NextRequest) {
  try {
    // Use mock data in preview environment
    if (process.env.USE_MOCK_DATA === 'true') {
      console.log('Using mock data for preview...')
      const mockResult = await mockInventoryAPI.getProducts()
      return NextResponse.json({
        success: true,
        data: mockResult.data,
        pagination: {
          page: 1,
          limit: 100,
          totalItems: mockResult.data.length,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        },
        message: `Mock data: ${mockResult.data.length} products`
      })
    }

    console.log('Fetching inventory data from PostgreSQL...')
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const search = searchParams.get('search') || ''
    const categoria = searchParams.get('categoria') || ''
    const marca = searchParams.get('marca') || ''
    const modelo = searchParams.get('modelo') || ''
    
    const filters = {
      ...(categoria && { categoria }),
      ...(marca && { marca }),
      ...(modelo && { modelo })
    }
    
    const result = await PostgresManager.getProductsPaginated({
      page,
      limit,
      search,
      filters
    })
    
    console.log(`Successfully fetched ${result.data.length} products (page ${page}/${result.pagination.totalPages})`)
    
    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      message: `Successfully fetched ${result.data.length} products`
    })
    
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error',
        data: []
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { product } = await request.json()
    
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product data is required' },
        { status: 400 }
      )
    }
    
    console.log('Creating new product:', product)
    
    const newProduct = await PostgresManager.createProduct(product)
    
    // Log the creation
    await PostgresManager.logChange(
      newProduct.id,
      'created',
      null,
      'Product created',
      'create'
    )
    
    return NextResponse.json({
      success: true,
      data: newProduct,
      message: 'Product created successfully'
    })
    
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { PostgresManager } from '@/lib/postgres'

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching inventory data from PostgreSQL...')
    
    const products = await PostgresManager.getProducts()
    
    if (!products || products.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No products found'
      })
    }
    
    console.log(`Successfully fetched ${products.length} products`)
    
    return NextResponse.json({
      success: true,
      data: products,
      message: `Successfully fetched ${products.length} products`
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
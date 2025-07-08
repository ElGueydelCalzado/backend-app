import { NextRequest, NextResponse } from 'next/server'
import { PostgresManager } from '@/lib/postgres'

interface DeleteRequest {
  ids: number[]
}

export async function POST(request: NextRequest) {
  try {
    const body: DeleteRequest = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product IDs array is required' },
        { status: 400 }
      )
    }

    console.log(`Deleting ${ids.length} products...`)

    const results = []
    const errors = []

    for (const productId of ids) {
      try {
        // Get product info before deletion for logging
        const productToDelete = await PostgresManager.getProductById(productId)
        if (!productToDelete) {
          errors.push({ error: `Product with ID ${productId} not found`, productId })
          continue
        }

        // Delete the product
        const deletedProduct = await PostgresManager.deleteProduct(productId)

        // Log the deletion
        await PostgresManager.logChange(
          productId,
          'deleted',
          `${productToDelete.categoria} - ${productToDelete.marca} ${productToDelete.modelo}`,
          'Product deleted',
          'delete'
        )

        results.push(deletedProduct)
      } catch (error) {
        console.error(`Error deleting product ${productId}:`, error)
        errors.push({ 
          error: error instanceof Error ? error.message : 'Unknown error', 
          productId 
        })
      }
    }

    const response = {
      success: errors.length === 0,
      deleted: results.length,
      errors: errors.length,
      results,
      errorDetails: errors.length > 0 ? errors : undefined
    }

    if (errors.length > 0 && results.length === 0) {
      return NextResponse.json(response, { status: 400 })
    }

    console.log(`Delete completed: ${results.length} deleted, ${errors.length} errors`)

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in delete operation:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}
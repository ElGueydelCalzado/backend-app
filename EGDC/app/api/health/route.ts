import { NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: process.env.DATABASE_URL ? 'Connected' : 'Missing DATABASE_URL',
      branch: 'development',
      deployment: 'updated-from-main',
      routes: {
        inventario: 'Should be available at /inventario',
        api: 'Health check working'
      }
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'ERROR', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
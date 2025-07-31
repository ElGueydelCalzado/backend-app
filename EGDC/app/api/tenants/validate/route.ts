import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { createSecureDatabaseConfig } from '../../../../lib/database-config'

// Database connection pool
let pool: Pool | null = null

function getDatabasePool(): Pool {
  if (!pool) {
    pool = new Pool(createSecureDatabaseConfig())
  }
  return pool
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subdomain = searchParams.get('subdomain')
    
    if (!subdomain) {
      return NextResponse.json({ valid: false, error: 'Subdomain parameter required' }, { status: 400 })
    }
    
    const client = await getDatabasePool().connect()
    
    try {
      // Check both original subdomain and custom_subdomain fields
      const result = await client.query(`
        SELECT 
          id, 
          name, 
          subdomain as original_subdomain, 
          custom_subdomain,
          COALESCE(custom_subdomain, subdomain) as current_subdomain,
          email, 
          business_type, 
          status
        FROM tenants 
        WHERE (subdomain = $1 OR custom_subdomain = $1) AND status = 'active'
        LIMIT 1
      `, [subdomain.toLowerCase().trim()])
      
      const isValid = result.rows.length > 0
      const tenant = isValid ? result.rows[0] : null
      
      console.log('🔍 Tenant validation API:', {
        subdomain,
        valid: isValid,
        tenant: tenant ? { id: tenant.id, name: tenant.name } : null
      })
      
      return NextResponse.json({ 
        valid: isValid, 
        tenant: tenant,
        timestamp: new Date().toISOString()
      })
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('❌ Tenant validation API error:', {
      error: error.message,
      stack: error.stack
    })
    
    return NextResponse.json({ 
      valid: false, 
      error: 'Database error during tenant validation' 
    }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { Pool } from 'pg'
import { createSecureDatabaseConfig } from '@/lib/database-config'

const pool = new Pool(createSecureDatabaseConfig())

export async function GET(request: NextRequest) {
  try {
    // Get the user's token to see if they're authenticated
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    })

    if (!token || !token.email) {
      console.log('❌ No token or email found in complete-registration')
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Get signup preferences from localStorage (passed via URL params for server-side)
    const url = new URL(request.url)
    const accountType = url.searchParams.get('accountType') || 'retailer'
    const username = url.searchParams.get('username') || ''

    console.log('🔄 Complete registration for:', {
      email: token.email,
      accountType,
      username
    })

    // Check if user already has a tenant
    if (token.tenant_id && token.tenant_subdomain) {
      console.log('✅ User already has tenant, redirecting to dashboard')
      const businessRoute = token.business_type === 'supplier' ? 's' : 'r'
      return NextResponse.redirect(new URL(`/${token.tenant_subdomain}/${businessRoute}/dashboard`, request.url))
    }

    // Create tenant and user in database
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // Generate unique tenant subdomain
      const baseSubdomain = username || token.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
      let tenantSubdomain = baseSubdomain
      let counter = 1
      
      while (true) {
        const existing = await client.query(`
          SELECT id FROM tenants WHERE subdomain = $1
        `, [tenantSubdomain])
        
        if (existing.rows.length === 0) break
        
        tenantSubdomain = `${baseSubdomain}${counter}`
        counter++
      }

      // Create tenant
      const newTenant = await client.query(`
        INSERT INTO tenants (name, subdomain, email, business_type, plan, status)
        VALUES ($1, $2, $3, $4, 'starter', 'active')
        RETURNING id, name, subdomain, business_type
      `, [
        `${token.name || token.email}'s Business`,
        tenantSubdomain,
        token.email,
        accountType
      ])

      const tenant = newTenant.rows[0]

      // Set tenant context for RLS
      await client.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [tenant.id])

      // Create user
      await client.query(`
        INSERT INTO users (tenant_id, email, name, role, google_id, status)
        VALUES ($1, $2, $3, 'admin', $4, 'active')
      `, [tenant.id, token.email, token.name, token.sub])

      await client.query('COMMIT')

      console.log('✅ Registration completed:', {
        tenant_id: tenant.id,
        tenant_subdomain: tenant.subdomain,
        business_type: tenant.business_type
      })

      // Redirect to appropriate dashboard
      const businessRoute = tenant.business_type === 'supplier' ? 's' : 'r'
      return NextResponse.redirect(new URL(`/${tenant.subdomain}/${businessRoute}/dashboard`, request.url))

    } catch (error) {
      await client.query('ROLLBACK')
      console.error('❌ Registration failed:', error)
      return NextResponse.redirect(new URL('/signup?error=registration_failed', request.url))
    } finally {
      client.release()
    }

  } catch (error) {
    console.error('❌ Complete registration error:', error)
    return NextResponse.redirect(new URL('/signup?error=server_error', request.url))
  }
}

export async function POST(request: NextRequest) {
  return GET(request) // Handle both GET and POST
}
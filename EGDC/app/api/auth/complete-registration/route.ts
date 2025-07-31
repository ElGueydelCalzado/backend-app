import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth-config'
import { Pool } from 'pg'
import { createSecureDatabaseConfig } from '@/lib/database-config'

// Database connection for registration operations
let pool: Pool | null = null

function getRegistrationPool(): Pool {
  if (!pool) {
    pool = new Pool(createSecureDatabaseConfig())
  }
  return pool
}

export async function POST(request: NextRequest) {
  try {
    // Get current session to verify user is authenticated
    const session = await getServerSession(authConfig)
    
    if (!session?.user || !session.registration_required) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized or registration not required'
      }, { status: 401 })
    }

    const body = await request.json()
    const { business_name, subdomain, plan } = body

    // Validate required fields
    if (!business_name || !subdomain || !plan) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: business_name, subdomain, plan'
      }, { status: 400 })
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/
    if (subdomain.length < 3 || subdomain.length > 20 || !subdomainRegex.test(subdomain)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid subdomain format. Must be 3-20 characters, lowercase letters, numbers, and hyphens only.'
      }, { status: 400 })
    }

    const client = await getRegistrationPool().connect()

    try {
      await client.query('BEGIN')

      // Check if subdomain is available
      const existingTenant = await client.query(
        'SELECT id FROM tenants WHERE subdomain = $1',
        [subdomain]
      )

      if (existingTenant.rows.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'Subdomain already taken'
        }, { status: 409 })
      }

      // Create tenant
      const newTenant = await client.query(`
        INSERT INTO tenants (name, subdomain, email, business_type, plan, status)
        VALUES ($1, $2, $3, 'retailer', $4, 'active')
        RETURNING id, name, subdomain
      `, [
        business_name,
        subdomain,
        session.user.email
      ])

      const tenant = newTenant.rows[0]

      // Set RLS context for the new tenant
      await client.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [tenant.id])

      // Create user in the new tenant
      const newUser = await client.query(`
        INSERT INTO users (tenant_id, email, name, role, google_id, status)
        VALUES ($1, $2, $3, 'admin', $4, 'active')
        RETURNING id
      `, [
        tenant.id,
        session.user.email,
        session.user.name,
        session.user.id // Use session ID as Google ID
      ])

      await client.query('COMMIT')

      console.log('✅ Registration completed successfully:', {
        email: session.user.email,
        tenant_id: tenant.id,
        tenant_subdomain: tenant.subdomain,
        user_id: newUser.rows[0].id
      })

      // Return success with tenant info
      return NextResponse.json({
        success: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain
        }
      })

    } catch (error) {
      await client.query('ROLLBACK')
      console.error('❌ Registration completion failed:', error)
      
      return NextResponse.json({
        success: false,
        error: 'Registration completion failed. Please try again.'
      }, { status: 500 })

    } finally {
      client.release()
    }

  } catch (error) {
    console.error('❌ Complete registration API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authConfig } from '../../../../lib/auth-config'
import { Pool } from 'pg'
import { createSecureDatabaseConfig } from '../../../../lib/database-config'

let pool: Pool | null = null

function getDatabasePool(): Pool {
  if (!pool) {
    pool = new Pool(createSecureDatabaseConfig())
  }
  return pool
}

// GET - Get current account settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    
    if (!session?.user?.tenant_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await getDatabasePool().connect()

    try {
      // Get current tenant information
      const tenantResult = await client.query(`
        SELECT 
          id,
          name,
          display_name,
          subdomain as original_subdomain,
          custom_subdomain,
          COALESCE(custom_subdomain, subdomain) as current_subdomain,
          email,
          business_type,
          plan,
          status,
          subdomain_change_count,
          subdomain_history,
          created_at
        FROM tenants 
        WHERE id = $1
      `, [session.user.tenant_id])

      if (tenantResult.rows.length === 0) {
        return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
      }

      const tenant = tenantResult.rows[0]

      // Get pending account change requests
      const pendingRequestsResult = await client.query(`
        SELECT 
          id,
          requested_subdomain,
          status,
          admin_notes,
          created_at
        FROM account_change_requests 
        WHERE tenant_id = $1 AND status = 'pending'
        ORDER BY created_at DESC
      `, [session.user.tenant_id])

      return NextResponse.json({
        tenant: {
          ...tenant,
          subdomain_history: tenant.subdomain_history || []
        },
        pending_requests: pendingRequestsResult.rows,
        can_change_subdomain: true, // Could add business logic here
        max_changes_per_month: 3, // Business rule
        changes_this_month: tenant.subdomain_change_count || 0
      })

    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Account settings GET error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch account settings' 
    }, { status: 500 })
  }
}

// POST - Request account name change
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    
    if (!session?.user?.tenant_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { requested_subdomain, display_name } = body

    if (!requested_subdomain || typeof requested_subdomain !== 'string') {
      return NextResponse.json({ 
        error: 'requested_subdomain is required' 
      }, { status: 400 })
    }

    const client = await getDatabasePool().connect()

    try {
      // Check subdomain availability using database function
      const availabilityResult = await client.query(`
        SELECT check_subdomain_availability($1, $2) as available
      `, [requested_subdomain.toLowerCase().trim(), session.user.tenant_id])

      if (!availabilityResult.rows[0].available) {
        return NextResponse.json({ 
          error: 'Subdomain not available or invalid format',
          available: false
        }, { status: 400 })
      }

      // Get current tenant info
      const currentTenantResult = await client.query(`
        SELECT subdomain, custom_subdomain, name, subdomain_change_count
        FROM tenants WHERE id = $1
      `, [session.user.tenant_id])

      if (currentTenantResult.rows.length === 0) {
        return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
      }

      const currentTenant = currentTenantResult.rows[0]
      const currentSubdomain = currentTenant.custom_subdomain || currentTenant.subdomain

      // Check if it's the same as current subdomain
      if (requested_subdomain === currentSubdomain) {
        return NextResponse.json({ 
          error: 'Requested subdomain is the same as current subdomain' 
        }, { status: 400 })
      }

      // Check if user has reached change limit (business rule)
      const MAX_CHANGES_PER_MONTH = 3
      if ((currentTenant.subdomain_change_count || 0) >= MAX_CHANGES_PER_MONTH) {
        return NextResponse.json({ 
          error: `Maximum ${MAX_CHANGES_PER_MONTH} subdomain changes per month reached` 
        }, { status: 429 })
      }

      // Get user ID for the request
      const userResult = await client.query(`
        SELECT id FROM users WHERE tenant_id = $1 AND email = $2 LIMIT 1
      `, [session.user.tenant_id, session.user.email])

      const userId = userResult.rows[0]?.id

      await client.query('BEGIN')

      try {
        // Create account change request
        const requestResult = await client.query(`
          INSERT INTO account_change_requests (
            tenant_id, 
            requested_subdomain, 
            current_subdomain, 
            requested_by,
            status
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING id, created_at
        `, [
          session.user.tenant_id,
          requested_subdomain,
          currentSubdomain,
          userId,
          'pending'
        ])

        // For now, auto-approve the change (in production, this might require admin approval)
        const changeResult = await client.query(`
          SELECT apply_account_name_change($1, $2, $3) as result
        `, [session.user.tenant_id, requested_subdomain, userId])

        const result = changeResult.rows[0].result

        if (!result.success) {
          await client.query('ROLLBACK')
          return NextResponse.json({ 
            error: result.error || 'Failed to apply account name change' 
          }, { status: 400 })
        }

        // Update display name if provided
        if (display_name && typeof display_name === 'string') {
          await client.query(`
            UPDATE tenants SET display_name = $1, updated_at = NOW()
            WHERE id = $2
          `, [display_name.trim(), session.user.tenant_id])
        }

        await client.query('COMMIT')

        console.log('✅ Account name changed successfully:', {
          tenant_id: session.user.tenant_id,
          old_subdomain: result.old_subdomain,
          new_subdomain: result.new_subdomain,
          user: session.user.email
        })

        return NextResponse.json({
          success: true,
          message: 'Account name changed successfully',
          old_subdomain: result.old_subdomain,
          new_subdomain: result.new_subdomain,
          change_count: result.change_count,
          request_id: requestResult.rows[0].id
        })

      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }

    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Account settings POST error:', error)
    return NextResponse.json({ 
      error: 'Failed to process account name change request' 
    }, { status: 500 })
  }
}

// PATCH - Update account display settings only
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    
    if (!session?.user?.tenant_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { display_name } = body

    if (!display_name || typeof display_name !== 'string') {
      return NextResponse.json({ 
        error: 'display_name is required' 
      }, { status: 400 })
    }

    const client = await getDatabasePool().connect()

    try {
      const result = await client.query(`
        UPDATE tenants 
        SET display_name = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING display_name, updated_at
      `, [display_name.trim(), session.user.tenant_id])

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        message: 'Display name updated successfully',
        display_name: result.rows[0].display_name,
        updated_at: result.rows[0].updated_at
      })

    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Account settings PATCH error:', error)
    return NextResponse.json({ 
      error: 'Failed to update display name' 
    }, { status: 500 })
  }
}
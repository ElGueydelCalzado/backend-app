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

// GET - Check subdomain availability
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    
    if (!session?.user?.tenant_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const subdomain = searchParams.get('subdomain')

    if (!subdomain) {
      return NextResponse.json({ 
        error: 'subdomain parameter is required' 
      }, { status: 400 })
    }

    const client = await getDatabasePool().connect()

    try {
      // Check availability using database function
      const result = await client.query(`
        SELECT 
          check_subdomain_availability($1, $2) as available,
          validate_subdomain_format($1) as valid_format
      `, [subdomain.toLowerCase().trim(), session.user.tenant_id])

      const { available, valid_format } = result.rows[0]

      // Get validation details
      let validation_errors = []
      
      if (!valid_format) {
        // Check specific validation issues
        const subdomainLower = subdomain.toLowerCase().trim()
        
        if (subdomainLower.length < 3) {
          validation_errors.push('Subdomain must be at least 3 characters long')
        }
        
        if (subdomainLower.length > 30) {
          validation_errors.push('Subdomain must be no more than 30 characters long')
        }
        
        if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(subdomainLower) && subdomainLower.length > 1) {
          validation_errors.push('Subdomain can only contain lowercase letters, numbers, and hyphens')
        }
        
        if (subdomainLower.length === 1 && !/^[a-z0-9]$/.test(subdomainLower)) {
          validation_errors.push('Single character subdomains must be alphanumeric')
        }
        
        if (subdomainLower.includes('--')) {
          validation_errors.push('Subdomain cannot contain consecutive hyphens')
        }
        
        const reserved = ['www', 'app', 'api', 'admin', 'mail', 'ftp', 'blog', 'shop', 'store', 'support', 'help', 'login', 'auth', 'dashboard']
        if (reserved.includes(subdomainLower)) {
          validation_errors.push('This subdomain is reserved and cannot be used')
        }
      }

      // If format is valid but not available, check why
      if (valid_format && !available) {
        // Check if it's taken by another tenant
        const takenResult = await client.query(`
          SELECT COUNT(*) as count FROM tenants 
          WHERE (subdomain = $1 OR custom_subdomain = $1)
          AND id != $2 AND status = 'active'
        `, [subdomain.toLowerCase().trim(), session.user.tenant_id])

        if (parseInt(takenResult.rows[0].count) > 0) {
          validation_errors.push('This subdomain is already taken')
        }

        // Check if there's a pending request
        const pendingResult = await client.query(`
          SELECT COUNT(*) as count FROM account_change_requests 
          WHERE requested_subdomain = $1 AND status = 'pending'
          AND tenant_id != $2
        `, [subdomain.toLowerCase().trim(), session.user.tenant_id])

        if (parseInt(pendingResult.rows[0].count) > 0) {
          validation_errors.push('There is already a pending request for this subdomain')
        }
      }

      // Suggest alternatives if not available
      let suggestions = []
      if (!available && valid_format) {
        const baseSubdomain = subdomain.toLowerCase().trim()
        for (let i = 1; i <= 5; i++) {
          const suggestion = `${baseSubdomain}${i}`
          const suggestionResult = await client.query(`
            SELECT check_subdomain_availability($1, $2) as available
          `, [suggestion, session.user.tenant_id])
          
          if (suggestionResult.rows[0].available) {
            suggestions.push(suggestion)
          }
        }
      }

      return NextResponse.json({
        subdomain: subdomain.toLowerCase().trim(),
        available,
        valid_format,
        validation_errors,
        suggestions: suggestions.slice(0, 3), // Limit to 3 suggestions
        timestamp: new Date().toISOString()
      })

    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Subdomain check error:', error)
    return NextResponse.json({ 
      error: 'Failed to check subdomain availability' 
    }, { status: 500 })
  }
}
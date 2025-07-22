// DOMAIN MANAGEMENT API
// Admin interface for managing Vercel domains

import { NextRequest, NextResponse } from 'next/server'
import { VercelDomainManager, addSupplierDomain, checkDomainStatus } from '@/lib/vercel-domain-manager'
import { executeWithTenant } from '@/lib/tenant-context'

interface DomainWithTenant {
  subdomain: string
  domain: string
  exists: boolean
  verified: boolean
  ssl: boolean
  tenant_name?: string
  business_type?: string
  status?: string
  created_at?: string
}

// GET - List all domains with their status
export async function GET() {
  try {
    console.log('📋 Getting domain status for all tenants...')

    // Get all tenants from database
    const tenantsQuery = `
      SELECT subdomain, name, business_type, status, created_at
      FROM tenants 
      WHERE status = 'active'
      ORDER BY business_type, name
    `

    const tenants = await executeWithTenant(
      null,
      tenantsQuery,
      [],
      { skipTenantCheck: true }
    )

    // Check domain status for each tenant
    const domainStatuses: DomainWithTenant[] = []

    for (const tenant of tenants) {
      const status = await checkDomainStatus(tenant.subdomain)
      
      domainStatuses.push({
        subdomain: tenant.subdomain,
        domain: `${tenant.subdomain}.lospapatos.com`,
        exists: status.exists,
        verified: status.verified,
        ssl: status.ssl,
        tenant_name: tenant.name,
        business_type: tenant.business_type,
        status: tenant.status,
        created_at: tenant.created_at
      })
    }

    // Also check for core domains that should always exist
    const coreDomains = ['login', 'inv']
    for (const subdomain of coreDomains) {
      const status = await checkDomainStatus(subdomain)
      
      domainStatuses.unshift({
        subdomain,
        domain: `${subdomain}.lospapatos.com`,
        exists: status.exists,
        verified: status.verified,
        ssl: status.ssl,
        tenant_name: subdomain === 'login' ? 'Centralized Login' : 'Main App',
        business_type: 'system'
      })
    }

    console.log(`✅ Retrieved status for ${domainStatuses.length} domains`)

    return NextResponse.json({
      success: true,
      domains: domainStatuses,
      summary: {
        total: domainStatuses.length,
        active: domainStatuses.filter(d => d.verified).length,
        pending: domainStatuses.filter(d => d.exists && !d.verified).length,
        missing: domainStatuses.filter(d => !d.exists).length
      }
    })

  } catch (error) {
    console.error('❌ Error getting domain statuses:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get domain statuses',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Add new domain to Vercel
export async function POST(request: NextRequest) {
  try {
    const { subdomain } = await request.json()

    if (!subdomain) {
      return NextResponse.json({
        success: false,
        error: 'Subdomain is required'
      }, { status: 400 })
    }

    // Validate subdomain format
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return NextResponse.json({
        success: false,
        error: 'Subdomain must contain only lowercase letters, numbers, and hyphens'
      }, { status: 400 })
    }

    console.log('➕ Adding domain manually:', subdomain)

    // Check if subdomain exists in tenants (optional - can add domains for future tenants)
    const tenantCheck = await executeWithTenant(
      null,
      'SELECT name FROM tenants WHERE subdomain = $1',
      [subdomain],
      { skipTenantCheck: true }
    )

    if (tenantCheck.length === 0) {
      console.log('⚠️ Warning: Adding domain for subdomain without tenant:', subdomain)
    }

    // Add domain to Vercel
    const success = await addSupplierDomain(subdomain)

    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to add domain to Vercel'
      }, { status: 500 })
    }

    console.log('✅ Domain added successfully:', `${subdomain}.lospapatos.com`)

    return NextResponse.json({
      success: true,
      message: `Domain ${subdomain}.lospapatos.com added successfully`,
      domain: `${subdomain}.lospapatos.com`
    })

  } catch (error) {
    console.error('❌ Error adding domain:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to add domain',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE - Remove domain from Vercel
export async function DELETE(request: NextRequest) {
  try {
    const { subdomain } = await request.json()

    if (!subdomain) {
      return NextResponse.json({
        success: false,
        error: 'Subdomain is required'
      }, { status: 400 })
    }

    console.log('🗑️ Removing domain:', subdomain)

    // Prevent removal of critical domains
    const criticalDomains = ['login', 'inv', 'egdc']
    if (criticalDomains.includes(subdomain)) {
      return NextResponse.json({
        success: false,
        error: `Cannot remove critical domain: ${subdomain}`
      }, { status: 400 })
    }

    // Remove domain from Vercel
    if (!process.env.VERCEL_API_TOKEN || !process.env.VERCEL_PROJECT_ID) {
      return NextResponse.json({
        success: false,
        error: 'Vercel API credentials not configured'
      }, { status: 500 })
    }

    const domainManager = new VercelDomainManager()
    const result = await domainManager.removeDomain(subdomain)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to remove domain from Vercel'
      }, { status: 500 })
    }

    console.log('✅ Domain removed successfully:', `${subdomain}.lospapatos.com`)

    return NextResponse.json({
      success: true,
      message: `Domain ${subdomain}.lospapatos.com removed successfully`
    })

  } catch (error) {
    console.error('❌ Error removing domain:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to remove domain',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PATCH - Sync all tenant domains with Vercel
export async function PATCH() {
  try {
    console.log('🔄 Syncing all tenant domains with Vercel...')

    // Get all active tenants
    const tenants = await executeWithTenant(
      null,
      'SELECT subdomain, name FROM tenants WHERE status = $1 ORDER BY subdomain',
      ['active'],
      { skipTenantCheck: true }
    )

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[]
    }

    // Core domains that should always exist
    const coreDomains = ['login', 'inv']
    const allSubdomains = [...coreDomains, ...tenants.map(t => t.subdomain)]

    for (const subdomain of allSubdomains) {
      try {
        // Check if domain already exists
        const status = await checkDomainStatus(subdomain)
        
        if (status.exists) {
          console.log(`✅ Domain already exists: ${subdomain}`)
          results.skipped++
          continue
        }

        // Add missing domain
        const success = await addSupplierDomain(subdomain)
        
        if (success) {
          console.log(`✅ Added domain: ${subdomain}`)
          results.success++
        } else {
          console.log(`❌ Failed to add domain: ${subdomain}`)
          results.failed++
          results.errors.push(`Failed to add ${subdomain}`)
        }

      } catch (error) {
        console.error(`❌ Error processing ${subdomain}:`, error)
        results.failed++
        results.errors.push(`Error with ${subdomain}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    console.log('🏁 Domain sync completed:', results)

    return NextResponse.json({
      success: true,
      message: 'Domain sync completed',
      results
    })

  } catch (error) {
    console.error('❌ Error syncing domains:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to sync domains',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
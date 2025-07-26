// PATH-BASED TENANT MANAGEMENT API
// Admin interface for managing single app domain and tenant paths

import { NextRequest, NextResponse } from 'next/server'
import { VercelDomainManager, ensureAppDomainExists, checkAppDomainStatus, cleanupLegacySubdomain } from '@/lib/vercel-domain-manager'
import { executeWithTenant } from '@/lib/tenant-context'

interface TenantWithPath {
  tenant_slug: string
  tenant_path: string
  tenant_name?: string
  business_type?: string
  status?: string
  created_at?: string
}

interface AppDomainStatus {
  domain: string
  exists: boolean
  verified: boolean
  ssl: boolean
  tenants: TenantWithPath[]
}

// GET - Check app domain status and list all tenant paths
export async function GET() {
  try {
    console.log('📋 Getting app domain status and tenant paths...')

    // Check app domain status
    const domainStatus = await checkAppDomainStatus()

    // Get all active tenants from database
    const tenantsQuery = `
      SELECT 
        tenant_subdomain as tenant_slug,
        name as tenant_name, 
        business_type, 
        status, 
        created_at
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

    // Format tenant data for path-based architecture
    const tenantPaths: TenantWithPath[] = tenants.map(tenant => ({
      tenant_slug: tenant.tenant_slug,
      tenant_path: `/tenant/${tenant.tenant_slug}`,
      tenant_name: tenant.tenant_name,
      business_type: tenant.business_type,
      status: tenant.status,
      created_at: tenant.created_at
    }))

    const appDomainInfo: AppDomainStatus = {
      domain: 'app.lospapatos.com',
      exists: domainStatus.exists,
      verified: domainStatus.verified,
      ssl: domainStatus.ssl,
      tenants: tenantPaths
    }

    console.log(`✅ App domain status retrieved. Domain verified: ${domainStatus.verified}, Active tenants: ${tenantPaths.length}`)

    return NextResponse.json({
      success: true,
      appDomain: appDomainInfo,
      summary: {
        domain_verified: domainStatus.verified,
        active_tenants: tenantPaths.length,
        total_paths: tenantPaths.length + 2, // +2 for /login and other system paths
        architecture: 'path-based'
      }
    })

  } catch (error) {
    console.error('❌ Error getting domain status:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get domain status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Ensure app domain exists in Vercel
export async function POST() {
  try {
    console.log('🔧 Ensuring app domain exists in Vercel...')

    // Ensure app.lospapatos.com exists
    const success = await ensureAppDomainExists()

    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to ensure app domain exists in Vercel'
      }, { status: 500 })
    }

    console.log('✅ App domain ensured successfully: app.lospapatos.com')

    return NextResponse.json({
      success: true,
      message: 'App domain app.lospapatos.com is properly configured',
      domain: 'app.lospapatos.com',
      architecture: 'path-based'
    })

  } catch (error) {
    console.error('❌ Error ensuring app domain:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to ensure app domain',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE - Clean up legacy subdomain (migration helper)
export async function DELETE(request: NextRequest) {
  try {
    const { subdomain } = await request.json()

    if (!subdomain) {
      return NextResponse.json({
        success: false,
        error: 'Subdomain is required for cleanup'
      }, { status: 400 })
    }

    console.log('🧹 Cleaning up legacy subdomain:', subdomain)

    // Prevent removal of app domain
    if (subdomain === 'app') {
      return NextResponse.json({
        success: false,
        error: 'Cannot remove app domain - this is required for path-based architecture'
      }, { status: 400 })
    }

    // Clean up legacy subdomain
    const success = await cleanupLegacySubdomain(subdomain)

    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to clean up legacy subdomain'
      }, { status: 500 })
    }

    console.log('✅ Legacy subdomain cleaned up successfully:', `${subdomain}.lospapatos.com`)

    return NextResponse.json({
      success: true,
      message: `Legacy subdomain ${subdomain}.lospapatos.com cleaned up successfully`,
      note: 'Path-based architecture uses app.lospapatos.com/{tenant} instead'
    })

  } catch (error) {
    console.error('❌ Error cleaning up legacy subdomain:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to clean up legacy subdomain',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PATCH - Verify app domain configuration and tenant paths
export async function PATCH() {
  try {
    console.log('🔍 Verifying app domain configuration and tenant paths...')

    // Ensure app domain exists and is properly configured
    const domainSuccess = await ensureAppDomainExists()
    
    if (!domainSuccess) {
      return NextResponse.json({
        success: false,
        error: 'Failed to verify app domain configuration'
      }, { status: 500 })
    }

    // Get domain status
    const domainStatus = await checkAppDomainStatus()

    // Get all tenants and verify their path configuration
    const tenants = await executeWithTenant(
      null,
      'SELECT tenant_subdomain as tenant_slug, name FROM tenants WHERE status = $1 ORDER BY tenant_slug',
      ['active'],
      { skipTenantCheck: true }
    )

    const results = {
      domain_verified: domainStatus.verified,
      domain_ssl: domainStatus.ssl,
      active_tenant_paths: tenants.length,
      tenant_paths: tenants.map(t => `/tenant/${t.tenant_slug}`),
      system_paths: ['/login', '/dashboard', '/api'],
      architecture: 'path-based'
    }

    console.log('🏁 Path-based architecture verification completed:', results)

    return NextResponse.json({
      success: true,
      message: 'Path-based tenant architecture verified successfully',
      results
    })

  } catch (error) {
    console.error('❌ Error verifying path-based configuration:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to verify path-based configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
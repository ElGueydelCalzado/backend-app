// SUPPLIER ONBOARDING COMPLETION API
// Saves onboarding preferences and finalizes supplier setup

import { NextRequest, NextResponse } from 'next/server'
import { executeWithTenant } from '@/lib/tenant-context'

interface OnboardingData {
  application_id: string
  company_setup: {
    business_hours: string
    timezone: string
    currency: string
    language: string
  }
  product_catalog: {
    catalog_name: string
    import_method: 'manual' | 'csv' | 'api'
    sample_products: boolean
    product_categories: string[]
  }
  billing_setup: {
    plan_selected: string
    billing_cycle: 'monthly' | 'annual'
    payment_method: string
    billing_address: {
      street: string
      city: string
      state: string
      postal_code: string
      country: string
    }
  }
  user_management: {
    admin_users: Array<{
      name: string
      email: string
      role: string
    }>
    team_size: string
    permissions_setup: boolean
  }
  integration_settings: {
    connect_shopify: boolean
    connect_marketplace: boolean
    webhook_setup: boolean
    api_access: boolean
  }
}

// POST - Complete supplier onboarding
export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Processing supplier onboarding completion...')

    const onboardingData: OnboardingData = await request.json()

    // Validate required fields
    if (!onboardingData.application_id) {
      return NextResponse.json({
        success: false,
        error: 'Application ID is required'
      }, { status: 400 })
    }

    // Get application and tenant details
    const getApplicationQuery = `
      SELECT 
        sa.id, sa.business_name, sa.contact_email, sa.proposed_subdomain,
        sa.tenant_id, sa.status, sa.approved_at,
        t.id as tenant_db_id, t.name as tenant_name, t.subdomain as tenant_subdomain
      FROM supplier_applications sa
      LEFT JOIN tenants t ON sa.tenant_id = t.id
      WHERE sa.id = $1
    `

    const applicationResult = await executeWithTenant(
      null,
      getApplicationQuery,
      [onboardingData.application_id],
      { skipTenantCheck: true }
    )

    if (!applicationResult || applicationResult.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Application not found'
      }, { status: 404 })
    }

    const application = applicationResult[0]

    if (application.status !== 'approved' || !application.tenant_id) {
      return NextResponse.json({
        success: false,
        error: 'Application must be approved before onboarding can be completed'
      }, { status: 400 })
    }

    console.log('✅ Application found:', {
      business_name: application.business_name,
      tenant_id: application.tenant_id,
      subdomain: application.tenant_subdomain
    })

    // Update tenant with onboarding preferences
    const updateTenantQuery = `
      UPDATE tenants 
      SET 
        supplier_settings = supplier_settings || $2,
        settings = COALESCE(settings, '{}') || $3,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, subdomain, supplier_settings, settings
    `

    // Prepare supplier-specific settings
    const supplierSettings = {
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
      business_hours: onboardingData.company_setup.business_hours,
      timezone: onboardingData.company_setup.timezone,
      currency: onboardingData.company_setup.currency,
      language: onboardingData.company_setup.language,
      catalog_preferences: {
        name: onboardingData.product_catalog.catalog_name,
        import_method: onboardingData.product_catalog.import_method,
        sample_products: onboardingData.product_catalog.sample_products
      },
      billing_preferences: {
        plan: onboardingData.billing_setup.plan_selected,
        billing_cycle: onboardingData.billing_setup.billing_cycle,
        payment_method: onboardingData.billing_setup.payment_method
      },
      team_preferences: {
        team_size: onboardingData.user_management.team_size,
        admin_users: onboardingData.user_management.admin_users
      }
    }

    // Prepare general tenant settings
    const tenantSettings = {
      integrations: {
        shopify: onboardingData.integration_settings.connect_shopify,
        marketplace: onboardingData.integration_settings.connect_marketplace,
        webhook_setup: onboardingData.integration_settings.webhook_setup,
        api_access: onboardingData.integration_settings.api_access
      },
      onboarding: {
        completed: true,
        completed_at: new Date().toISOString(),
        version: '1.0'
      }
    }

    const tenantUpdateResult = await executeWithTenant(
      null,
      updateTenantQuery,
      [
        application.tenant_id,
        JSON.stringify(supplierSettings),
        JSON.stringify(tenantSettings)
      ],
      { skipTenantCheck: true }
    )

    const updatedTenant = tenantUpdateResult[0]

    // Add sample products if requested
    if (onboardingData.product_catalog.sample_products) {
      console.log('📦 Adding sample products to catalog...')
      
      const sampleProducts = [
        {
          categoria: 'Deportivos',
          marca: 'Sample Brand',
          modelo: 'Training Pro',
          color: 'Black',
          talla: '9',
          costo: 50.00,
          inventory_total: 25,
          description: 'Sample training shoe for demonstration'
        },
        {
          categoria: 'Casuales',
          marca: 'Sample Brand',
          modelo: 'Comfort Walk',
          color: 'Brown',
          talla: '8.5',
          costo: 65.00,
          inventory_total: 15,
          description: 'Sample casual shoe for demonstration'
        }
      ]

      for (const product of sampleProducts) {
        const insertProductQuery = `
          INSERT INTO products (
            tenant_id, categoria, marca, modelo, color, talla, costo,
            inventory_total, description, shein_modifier, shopify_modifier, meli_modifier,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, 2.5, 2.0, 2.8, NOW(), NOW()
          )
        `

        await executeWithTenant(
          application.tenant_id,
          insertProductQuery,
          [
            application.tenant_id,
            product.categoria,
            product.marca,
            product.modelo,
            product.color,
            product.talla,
            product.costo,
            product.inventory_total,
            product.description
          ]
        )
      }

      console.log('✅ Sample products added successfully')
    }

    // Create additional admin users if specified
    if (onboardingData.user_management.admin_users.length > 0) {
      console.log('👥 Creating additional admin users...')

      for (const adminUser of onboardingData.user_management.admin_users) {
        if (adminUser.name && adminUser.email) {
          const createUserQuery = `
            INSERT INTO users (
              tenant_id, email, name, role, status, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, 'invited', NOW(), NOW()
            )
            ON CONFLICT (tenant_id, email) DO NOTHING
          `

          await executeWithTenant(
            null,
            createUserQuery,
            [
              application.tenant_id,
              adminUser.email,
              adminUser.name,
              adminUser.role
            ],
            { skipTenantCheck: true }
          )
        }
      }

      console.log('✅ Admin users created successfully')
    }

    // Log onboarding completion
    const logCompletionQuery = `
      INSERT INTO supplier_application_logs (
        application_id, action, notes, created_at
      ) VALUES (
        $1, 'onboarding_completed', 'Supplier completed onboarding wizard', NOW()
      )
    `

    await executeWithTenant(
      null,
      logCompletionQuery,
      [onboardingData.application_id],
      { skipTenantCheck: true }
    )

    console.log('🎉 Supplier onboarding completed successfully:', {
      tenant_id: application.tenant_id,
      subdomain: application.tenant_subdomain,
      business_name: application.business_name
    })

    return NextResponse.json({
      success: true,
      data: {
        tenant_id: application.tenant_id,
        tenant_slug: application.tenant_subdomain, // Now used as path slug in path-based architecture
        business_name: application.business_name,
        workspace_url: `https://app.lospapatos.com/${application.tenant_subdomain}`,
        dashboard_url: `/${application.tenant_subdomain}/dashboard?welcome=true`
      },
      message: 'Onboarding completed successfully! Your supplier workspace is ready.'
    })

  } catch (error) {
    console.error('❌ Error completing supplier onboarding:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to complete supplier onboarding',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET - Check onboarding status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const applicationId = searchParams.get('application_id')

    if (!applicationId) {
      return NextResponse.json({
        success: false,
        error: 'Application ID is required'
      }, { status: 400 })
    }

    // Get application and onboarding status
    const getStatusQuery = `
      SELECT 
        sa.id, sa.business_name, sa.status, sa.tenant_id,
        t.name as tenant_name, t.subdomain,
        t.supplier_settings->'onboarding_completed' as onboarding_completed,
        t.supplier_settings->'onboarding_completed_at' as completed_at
      FROM supplier_applications sa
      LEFT JOIN tenants t ON sa.tenant_id = t.id
      WHERE sa.id = $1
    `

    const result = await executeWithTenant(
      null,
      getStatusQuery,
      [applicationId],
      { skipTenantCheck: true }
    )

    if (!result || result.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Application not found'
      }, { status: 404 })
    }

    const application = result[0]

    return NextResponse.json({
      success: true,
      data: {
        application_id: application.id,
        business_name: application.business_name,
        application_status: application.status,
        tenant_id: application.tenant_id,
        onboarding_completed: application.onboarding_completed === true,
        completed_at: application.completed_at,
        workspace_available: application.status === 'approved' && application.tenant_id,
        subdomain: application.subdomain
      }
    })

  } catch (error) {
    console.error('Error checking onboarding status:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check onboarding status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
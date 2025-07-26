// SUPPLIER REGISTRATION API
// Handles new supplier applications and automated tenant creation

import { NextRequest, NextResponse } from 'next/server'
import { executeWithTenant } from '@/lib/tenant-context'
import { nanoid } from 'nanoid'

interface SupplierRegistrationData {
  // Business Information
  business_name: string
  business_type: string
  industry: string
  website?: string
  description: string
  
  // Contact Information
  contact_name: string
  contact_email: string
  contact_phone: string
  business_address: {
    street: string
    city: string
    state: string
    postal_code: string
    country: string
  }
  
  // Business Details
  years_in_business?: string
  employee_count?: string
  annual_revenue?: string
  primary_markets: string[]
  
  // Platform Preferences
  product_categories: string[]
  estimated_products: string
  minimum_order_amount: number
  payment_terms: string
  shipping_methods: string[]
  
  // Legal & Compliance
  tax_id?: string
  business_license?: string
  certifications: string[]
  agrees_to_terms: boolean
  agrees_to_privacy: boolean
}

// POST - Create new supplier application
export async function POST(request: NextRequest) {
  try {
    console.log('🏢 Processing new supplier registration...')

    const registrationData: SupplierRegistrationData = await request.json()

    // Validate required fields
    const requiredFields = [
      'business_name', 'business_type', 'industry', 'description',
      'contact_name', 'contact_email', 'contact_phone',
      'product_categories', 'estimated_products', 'minimum_order_amount',
      'payment_terms', 'shipping_methods', 'agrees_to_terms', 'agrees_to_privacy'
    ]

    const missingFields = requiredFields.filter(field => {
      const value = registrationData[field as keyof SupplierRegistrationData]
      return !value || (Array.isArray(value) && value.length === 0)
    })

    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        fields: missingFields
      }, { status: 400 })
    }

    // Validate agreements
    if (!registrationData.agrees_to_terms || !registrationData.agrees_to_privacy) {
      return NextResponse.json({
        success: false,
        error: 'You must agree to the terms of service and privacy policy'
      }, { status: 400 })
    }

    // Generate unique tenant slug for path-based routing
    const baseTenantSlug = registrationData.business_name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 15)
    
    const uniqueId = nanoid(6).toLowerCase()
    const tenantSlug = `${baseTenantSlug}${uniqueId}`

    console.log('📝 Creating supplier application:', {
      business_name: registrationData.business_name,
      contact_email: registrationData.contact_email,
      tenant_slug: tenantSlug,
      estimated_products: registrationData.estimated_products
    })

    // Check if email already exists
    const emailCheckQuery = `
      SELECT COUNT(*) as count 
      FROM supplier_applications 
      WHERE contact_email = $1
    `

    const emailCheck = await executeWithTenant(
      null, // No tenant context for public registration
      emailCheckQuery,
      [registrationData.contact_email],
      { skipTenantCheck: true }
    )

    if (emailCheck && emailCheck[0]?.count > 0) {
      return NextResponse.json({
        success: false,
        error: 'An application with this email address already exists'
      }, { status: 409 })
    }

    // Create supplier application record
    const applicationId = nanoid()
    
    const createApplicationQuery = `
      INSERT INTO supplier_applications (
        id, business_name, business_type, industry, website, description,
        contact_name, contact_email, contact_phone, business_address,
        years_in_business, employee_count, annual_revenue, primary_markets,
        product_categories, estimated_products, minimum_order_amount,
        payment_terms, shipping_methods, tax_id, business_license,
        certifications, proposed_tenant_slug, status, 
        application_data, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23, 'pending',
        $24, NOW(), NOW()
      )
      RETURNING id, business_name, contact_email, proposed_tenant_slug, status, created_at
    `

    const applicationResult = await executeWithTenant(
      null,
      createApplicationQuery,
      [
        applicationId,
        registrationData.business_name,
        registrationData.business_type,
        registrationData.industry,
        registrationData.website,
        registrationData.description,
        registrationData.contact_name,
        registrationData.contact_email,
        registrationData.contact_phone,
        JSON.stringify(registrationData.business_address),
        registrationData.years_in_business,
        registrationData.employee_count,
        registrationData.annual_revenue,
        JSON.stringify(registrationData.primary_markets),
        JSON.stringify(registrationData.product_categories),
        registrationData.estimated_products,
        registrationData.minimum_order_amount,
        registrationData.payment_terms,
        JSON.stringify(registrationData.shipping_methods),
        registrationData.tax_id,
        registrationData.business_license,
        JSON.stringify(registrationData.certifications),
        tenantSlug,
        JSON.stringify(registrationData) // Store complete application data
      ],
      { skipTenantCheck: true }
    )

    const application = applicationResult[0]

    console.log('✅ Supplier application created:', {
      application_id: application.id,
      business_name: application.business_name,
      tenant_slug: application.proposed_tenant_slug
    })

    // Send notification email (in a real app)
    console.log('📧 Would send notification emails to:')
    console.log(`   - Applicant: ${registrationData.contact_email}`)
    console.log(`   - Admin: admin@lospapatos.com`)

    // For demo purposes, auto-approve the application
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 Auto-approving application in development mode...')
      
      try {
        const approvalResult = await approveSupplierApplication(application.id)
        console.log('✅ Application auto-approved:', approvalResult)
      } catch (error) {
        console.error('❌ Auto-approval failed:', error)
        // Don't fail the registration if auto-approval fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        application_id: application.id,
        business_name: application.business_name,
        tenant_slug: application.proposed_tenant_slug,
        status: application.status,
        message: 'Application submitted successfully'
      },
      message: 'Your supplier application has been submitted and is under review. You will receive an email with next steps within 24-48 hours.'
    })

  } catch (error) {
    console.error('❌ Error processing supplier registration:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process supplier registration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Function to approve supplier application and create tenant
async function approveSupplierApplication(applicationId: string) {
  console.log('🏗️ Creating supplier tenant for application:', applicationId)

  // Get application details
  const getApplicationQuery = `
    SELECT * FROM supplier_applications WHERE id = $1
  `
  
  const applicationData = await executeWithTenant(
    null,
    getApplicationQuery,
    [applicationId],
    { skipTenantCheck: true }
  )

  if (!applicationData || applicationData.length === 0) {
    throw new Error('Application not found')
  }

  const app = applicationData[0]
  const fullData = JSON.parse(app.application_data)

  // Create supplier tenant
  const createTenantQuery = `
    INSERT INTO tenants (
      name, tenant_slug, email, plan, status, business_type, access_mode,
      supplier_settings, billing_status, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
    )
    RETURNING id, name, tenant_slug, status
  `

  const supplierSettings = {
    minimum_order_amount: app.minimum_order_amount,
    payment_terms: app.payment_terms,
    shipping_methods: JSON.parse(app.shipping_methods),
    product_categories: JSON.parse(app.product_categories),
    business_address: JSON.parse(app.business_address),
    contact_info: {
      name: app.contact_name,
      email: app.contact_email,
      phone: app.contact_phone
    },
    business_details: {
      type: app.business_type,
      industry: app.industry,
      years_in_business: app.years_in_business,
      employee_count: app.employee_count,
      website: app.website
    },
    certifications: JSON.parse(app.certifications || '[]'),
    trial_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  }

  const tenantResult = await executeWithTenant(
    null,
    createTenantQuery,
    [
      app.business_name,
      app.proposed_tenant_slug,
      app.contact_email,
      'supplier_professional', // Default plan
      'active',
      'wholesaler',
      'full_access',
      JSON.stringify(supplierSettings),
      'trial'
    ],
    { skipTenantCheck: true }
  )

  const tenant = tenantResult[0]

  // Create admin user for the supplier
  const createUserQuery = `
    INSERT INTO users (
      tenant_id, email, name, role, status, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, NOW(), NOW()
    )
    RETURNING id, email, name, role
  `

  const userResult = await executeWithTenant(
    null,
    createUserQuery,
    [
      tenant.id,
      app.contact_email,
      app.contact_name,
      'admin',
      'active'
    ],
    { skipTenantCheck: true }
  )

  const user = userResult[0]

  // Update application status
  const updateApplicationQuery = `
    UPDATE supplier_applications 
    SET status = 'approved', tenant_id = $2, approved_at = NOW(), updated_at = NOW()
    WHERE id = $1
  `

  await executeWithTenant(
    null,
    updateApplicationQuery,
    [applicationId, tenant.id],
    { skipTenantCheck: true }
  )

  console.log('🎉 Supplier tenant created successfully:', {
    tenant_id: tenant.id,
    tenant_slug: tenant.tenant_slug,
    user_id: user.id,
    user_email: user.email
  })

  // Path-based routing - no domain management needed
  console.log('🌐 Tenant will be accessible at path-based URL:', `/app/${tenant.tenant_slug}`)

  return {
    tenant,
    user,
    application_id: applicationId
  }
}

// GET - Retrieve application status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const applicationId = searchParams.get('application_id')
    const email = searchParams.get('email')

    if (!applicationId && !email) {
      return NextResponse.json({
        success: false,
        error: 'Either application_id or email is required'
      }, { status: 400 })
    }

    let query = `
      SELECT 
        id, business_name, contact_email, proposed_tenant_slug, 
        status, created_at, approved_at, rejected_at
      FROM supplier_applications 
      WHERE 
    `
    let params = []

    if (applicationId) {
      query += 'id = $1'
      params.push(applicationId)
    } else {
      query += 'contact_email = $1'
      params.push(email)
    }

    const result = await executeWithTenant(
      null,
      query,
      params,
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
        status: application.status,
        submitted_at: application.created_at,
        approved_at: application.approved_at,
        rejected_at: application.rejected_at,
        tenant_slug: application.proposed_tenant_slug
      }
    })

  } catch (error) {
    console.error('Error retrieving application status:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve application status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
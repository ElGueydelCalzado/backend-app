// User Registration API for Multi-Tenant SaaS
import { NextRequest, NextResponse } from 'next/server'
import { createTenant, createUser } from '@/lib/tenant-context'
import { z } from 'zod'

// Registration schema validation
const registrationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  business_name: z.string().min(1, 'Business name is required'),
  subdomain: z.string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(20, 'Subdomain must be less than 20 characters')
    .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens'),
  plan: z.enum(['starter', 'professional', 'enterprise']).optional().default('starter'),
  google_id: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = registrationSchema.parse(body)
    
    console.log('🚀 Creating new tenant registration:', {
      business_name: validatedData.business_name,
      subdomain: validatedData.subdomain,
      email: validatedData.email,
      plan: validatedData.plan
    })
    
    // Create tenant
    const tenant = await createTenant({
      name: validatedData.business_name,
      subdomain: validatedData.subdomain,
      email: validatedData.email,
      plan: validatedData.plan
    })
    
    // Create admin user for the tenant
    const user = await createUser({
      tenant_id: tenant.id,
      email: validatedData.email,
      name: validatedData.name,
      role: 'admin',
      google_id: validatedData.google_id
    })
    
    console.log('✅ Successfully created tenant and user:', {
      tenant_id: tenant.id,
      user_id: user.id,
      subdomain: tenant.subdomain
    })
    
    return NextResponse.json({
      success: true,
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          plan: tenant.plan
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      },
      message: 'Account created successfully'
    })
    
  } catch (error) {
    console.error('❌ Registration error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }
    
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json({
          success: false,
          error: 'Business name or subdomain already exists',
          code: 'DUPLICATE_BUSINESS'
        }, { status: 409 })
      }
      
      if (error.message.includes('duplicate key')) {
        return NextResponse.json({
          success: false,
          error: 'Email already registered',
          code: 'DUPLICATE_EMAIL'
        }, { status: 409 })
      }
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create account',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Get registration status/info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subdomain = searchParams.get('subdomain')
    
    if (!subdomain) {
      return NextResponse.json({
        success: false,
        error: 'Subdomain parameter required'
      }, { status: 400 })
    }
    
    // Check if subdomain is available
    const { tenantPool } = await import('@/lib/tenant-context')
    const client = await tenantPool.connect()
    
    try {
      const result = await client.query(`
        SELECT 1 FROM tenants WHERE subdomain = $1
      `, [subdomain])
      
      return NextResponse.json({
        success: true,
        available: result.rows.length === 0
      })
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('❌ Error checking subdomain:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check subdomain availability'
    }, { status: 500 })
  }
}
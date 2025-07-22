// SETUP INITIAL DOMAINS
// Adds core domains and existing tenant domains to Vercel

import { addSupplierDomain, checkDomainStatus } from '../lib/vercel-domain-manager'
import { executeWithTenant } from '../lib/tenant-context'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function setupInitialDomains() {
  console.log('🚀 SETTING UP INITIAL DOMAINS')
  console.log('=' .repeat(50))
  console.log('')

  // Check required environment variables
  if (!process.env.VERCEL_API_TOKEN || !process.env.VERCEL_PROJECT_ID) {
    console.log('❌ Missing required environment variables:')
    console.log('   VERCEL_API_TOKEN - Get from https://vercel.com/account/tokens')
    console.log('   VERCEL_PROJECT_ID - Get from Vercel project settings')
    console.log('')
    console.log('Add these to your .env.local file:')
    console.log('VERCEL_API_TOKEN=your_token_here')
    console.log('VERCEL_PROJECT_ID=your_project_id_here')
    return
  }

  try {
    // Core system domains that should always exist
    const coreDomains = [
      { subdomain: 'login', description: 'Centralized login portal for lospapatos.com' }
    ]

    console.log('🔧 Setting up core domains...')
    for (const { subdomain, description } of coreDomains) {
      console.log(`\n📍 Processing: ${subdomain}.lospapatos.com`)
      console.log(`   Purpose: ${description}`)
      
      // Check current status
      const status = await checkDomainStatus(subdomain)
      console.log(`   Current status: ${status.exists ? 'EXISTS' : 'MISSING'}`)
      
      if (status.exists) {
        console.log(`   ✅ Already configured`)
        if (status.verified) {
          console.log(`   🔒 SSL certificate active`)
        } else {
          console.log(`   ⏳ SSL certificate pending`)
        }
      } else {
        console.log(`   ➕ Adding to Vercel...`)
        const success = await addSupplierDomain(subdomain)
        
        if (success) {
          console.log(`   ✅ Successfully added`)
        } else {
          console.log(`   ❌ Failed to add`)
        }
      }
    }

    // Get existing tenant domains from database
    console.log('\n🏢 Setting up tenant domains...')
    
    const tenants = await executeWithTenant(
      null,
      `SELECT subdomain, name, business_type, status FROM tenants WHERE status = 'active' ORDER BY business_type, name`,
      [],
      { skipTenantCheck: true }
    )

    console.log(`   Found ${tenants.length} active tenants`)

    for (const tenant of tenants) {
      console.log(`\n📍 Processing: ${tenant.subdomain}.lospapatos.com`)
      console.log(`   Tenant: ${tenant.name} (${tenant.business_type})`)
      
      // Check current status
      const status = await checkDomainStatus(tenant.subdomain)
      console.log(`   Current status: ${status.exists ? 'EXISTS' : 'MISSING'}`)
      
      if (status.exists) {
        console.log(`   ✅ Already configured`)
        if (status.verified) {
          console.log(`   🔒 SSL certificate active`)
        } else {
          console.log(`   ⏳ SSL certificate pending`)
        }
      } else {
        console.log(`   ➕ Adding to Vercel...`)
        const success = await addSupplierDomain(tenant.subdomain)
        
        if (success) {
          console.log(`   ✅ Successfully added`)
        } else {
          console.log(`   ❌ Failed to add`)
        }
      }
    }

    // Summary
    console.log('\n' + '=' .repeat(50))
    console.log('🎉 DOMAIN SETUP COMPLETE')
    console.log('')
    console.log('Next steps:')
    console.log('1. Check Vercel dashboard to see all domains')
    console.log('2. Wait for SSL certificates to provision (5-10 minutes)')
    console.log('3. Test subdomains: https://login.lospapatos.com')
    console.log('4. New suppliers will automatically get domains added')
    console.log('')
    console.log('🎯 Your B2B marketplace is ready for multi-tenant deployment!')

  } catch (error) {
    console.error('❌ Error setting up domains:', error)
    
    if (error instanceof Error && error.message.includes('403')) {
      console.log('\n💡 Possible solutions:')
      console.log('   1. Check your Vercel API token has correct permissions')
      console.log('   2. Make sure VERCEL_PROJECT_ID is correct')
      console.log('   3. Try regenerating your API token')
    }
  }
}

// Run the setup
setupInitialDomains().catch(console.error)
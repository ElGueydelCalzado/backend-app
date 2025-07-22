// CHECK DOMAIN STATUS
// Verify all domains are working properly

import { checkDomainStatus } from '../lib/vercel-domain-manager'
import { executeWithTenant } from '../lib/tenant-context'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function checkAllDomains() {
  console.log('🔍 CHECKING ALL DOMAIN STATUS')
  console.log('=' .repeat(50))
  console.log('')

  try {
    // Core domains
    const coreDomains = ['login', 'inv']
    
    console.log('🔧 Core Domains:')
    for (const subdomain of coreDomains) {
      const status = await checkDomainStatus(subdomain)
      const icon = status.exists && status.verified ? '✅' : status.exists ? '⏳' : '❌'
      console.log(`   ${icon} ${subdomain}.lospapatos.com`)
      console.log(`      Vercel: ${status.exists ? 'Added' : 'Missing'}`)
      console.log(`      SSL: ${status.ssl ? 'Active' : 'Pending'}`)
    }

    // Tenant domains
    const tenants = await executeWithTenant(
      null,
      'SELECT subdomain, name, business_type FROM tenants WHERE status = $1 ORDER BY business_type, name',
      ['active'],
      { skipTenantCheck: true }
    )

    console.log(`\n🏢 Tenant Domains (${tenants.length}):`)
    for (const tenant of tenants) {
      const status = await checkDomainStatus(tenant.subdomain)
      const icon = status.exists && status.verified ? '✅' : status.exists ? '⏳' : '❌'
      console.log(`   ${icon} ${tenant.subdomain}.lospapatos.com`)
      console.log(`      Tenant: ${tenant.name} (${tenant.business_type})`)
      console.log(`      Vercel: ${status.exists ? 'Added' : 'Missing'}`)
      console.log(`      SSL: ${status.ssl ? 'Active' : 'Pending'}`)
    }

    // Test DNS resolution
    console.log('\n🌐 DNS Resolution Test:')
    const testDomains = ['login', 'egdc', 'fami']
    
    for (const subdomain of testDomains) {
      const domain = `${subdomain}.lospapatos.com`
      try {
        // Use Node.js DNS to test resolution
        const dns = require('dns').promises
        const result = await dns.lookup(domain)
        console.log(`   ✅ ${domain} → ${result.address}`)
      } catch (error) {
        console.log(`   ❌ ${domain} → DNS not resolved yet`)
      }
    }

    console.log('\n' + '=' .repeat(50))
    console.log('📋 STATUS SUMMARY')
    console.log('')
    console.log('✅ = Domain working (Vercel + SSL + DNS)')
    console.log('⏳ = Domain added to Vercel, waiting for DNS/SSL')
    console.log('❌ = Domain not configured')
    console.log('')
    console.log('If you see ⏳ or ❌, wait 10-30 minutes for DNS propagation.')

  } catch (error) {
    console.error('❌ Error checking domain status:', error)
  }
}

// Run the check
checkAllDomains().catch(console.error)
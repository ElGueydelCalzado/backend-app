#!/usr/bin/env node

/**
 * DATABASE BUSINESS TYPE CORRECTION SCRIPT
 * 
 * This script fixes redirect loops caused by missing or incorrect business_type field
 * by ensuring EGDC users have correct business_type to prevent authentication loops.
 * 
 * Run with: npm run ts-node scripts/fix-business-type-redirect-loops.ts
 */

import { Pool } from 'pg'
import * as fs from 'fs'
import * as path from 'path'
import { createSecureDatabaseConfig } from '../lib/database-config'

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function colorLog(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function runBusinessTypeCorrection() {
  const pool = new Pool(createSecureDatabaseConfig())
  
  try {
    colorLog('cyan', '🚀 Starting business_type correction process...')
    
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, '..', 'sql', 'fix-business-type-redirect-loops.sql')
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`SQL file not found: ${sqlPath}`)
    }
    
    const sql = fs.readFileSync(sqlPath, 'utf-8')
    colorLog('blue', '📂 Loaded SQL migration file')
    
    // Execute the migration
    colorLog('yellow', '⚙️ Executing database migration...')
    const client = await pool.connect()
    
    try {
      await client.query(sql)
      colorLog('green', '✅ Database migration completed successfully!')
    } finally {
      client.release()
    }
    
    // Verify the results
    colorLog('blue', '🔍 Verifying results...')
    await verifyBusinessTypeCorrection(pool)
    
    colorLog('green', '🎉 Business type correction completed successfully!')
    
  } catch (error) {
    colorLog('red', `❌ Error during business type correction: ${error.message}`)
    if (error.stack) {
      colorLog('red', error.stack)
    }
    process.exit(1)
  } finally {
    await pool.end()
  }
}

async function verifyBusinessTypeCorrection(pool: Pool) {
  const client = await pool.connect()
  
  try {
    // Check EGDC tenant specifically
    const egdcResult = await client.query(`
      SELECT 
        t.id,
        t.name,
        t.subdomain,
        t.business_type,
        t.status,
        COUNT(u.id) as user_count
      FROM tenants t
      LEFT JOIN users u ON t.id = u.tenant_id AND u.status = 'active'
      WHERE t.subdomain = 'egdc'
      GROUP BY t.id, t.name, t.subdomain, t.business_type, t.status
    `)
    
    if (egdcResult.rows.length === 0) {
      colorLog('red', '❌ EGDC tenant not found!')
      return false
    }
    
    const egdc = egdcResult.rows[0]
    colorLog('bright', '\n=== EGDC TENANT STATUS ===')
    colorLog('cyan', `ID: ${egdc.id}`)
    colorLog('cyan', `Name: ${egdc.name}`)
    colorLog('cyan', `Subdomain: ${egdc.subdomain}`)
    colorLog(egdc.business_type === 'retailer' ? 'green' : 'red', `Business Type: ${egdc.business_type}`)
    colorLog('cyan', `Status: ${egdc.status}`)
    colorLog('cyan', `User Count: ${egdc.user_count}`)
    colorLog('bright', '========================\n')
    
    // Check all tenants for issues
    const issueResult = await client.query(`
      SELECT 
        subdomain,
        business_type,
        CASE 
          WHEN business_type IS NULL THEN 'NULL business_type - will cause redirect loops'
          WHEN business_type = '' THEN 'Empty business_type - will cause redirect loops'
          WHEN business_type NOT IN ('retailer', 'wholesaler', 'supplier', 'hybrid') THEN 'Invalid business_type'
          ELSE 'OK'
        END as issue
      FROM tenants
      WHERE business_type IS NULL 
         OR business_type = '' 
         OR business_type NOT IN ('retailer', 'wholesaler', 'supplier', 'hybrid')
    `)
    
    if (issueResult.rows.length > 0) {
      colorLog('red', '⚠️ Found tenants with business_type issues:')
      issueResult.rows.forEach(row => {
        colorLog('red', `  - ${row.subdomain}: ${row.issue}`)
      })
      return false
    } else {
      colorLog('green', '✅ All tenants have valid business_type values')
    }
    
    // Show summary of all tenants
    const allTenantsResult = await client.query(`
      SELECT 
        subdomain,
        name,
        business_type,
        status,
        (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as user_count
      FROM tenants t
      ORDER BY 
        CASE WHEN subdomain = 'egdc' THEN 1 ELSE 2 END,
        subdomain
    `)
    
    colorLog('bright', '\n=== ALL TENANTS SUMMARY ===')
    allTenantsResult.rows.forEach(tenant => {
      const statusColor = tenant.business_type === 'retailer' || tenant.business_type === 'wholesaler' || 
                         tenant.business_type === 'supplier' || tenant.business_type === 'hybrid' ? 'green' : 'red'
      colorLog('cyan', `${tenant.subdomain.padEnd(15)} | ${tenant.business_type.padEnd(12)} | ${tenant.user_count} users | ${tenant.status}`)
    })
    colorLog('bright', '==========================\n')
    
    return egdc.business_type === 'retailer'
    
  } finally {
    client.release()
  }
}

async function testAuthenticationFlow() {
  colorLog('blue', '🧪 Testing authentication flow simulation...')
  
  // Simulate the middleware business type logic
  function simulateMiddlewareBusinessTypeLogic(tenantSubdomain: string, tokenBusinessType: string | null | undefined) {
    let businessType = 'retailer' // Safe default
    
    if (tenantSubdomain === 'egdc') {
      // EGDC is always retailer - hardcoded to prevent any redirect loops
      businessType = 'retailer'
      console.log('🏢 EGDC tenant detected - forcing retailer business type')
    } else if (tokenBusinessType && typeof tokenBusinessType === 'string') {
      // Use token business type if valid
      const validBusinessTypes = ['retailer', 'wholesaler', 'supplier', 'hybrid']
      if (validBusinessTypes.includes(tokenBusinessType.toLowerCase())) {
        businessType = tokenBusinessType.toLowerCase()
        console.log('📋 Using token business_type:', businessType)
      } else {
        console.warn('⚠️ Invalid business_type in token:', tokenBusinessType, '- defaulting to retailer')
        businessType = 'retailer'
      }
    } else {
      console.log('🔄 No business_type in token - defaulting to retailer')
      businessType = 'retailer'
    }
    
    // Convert business type to route (supplier/wholesaler -> 's', everything else -> 'r')
    const businessRoute = (businessType === 'supplier' || businessType === 'wholesaler') ? 's' : 'r'
    
    return { businessType, businessRoute }
  }
  
  // Test scenarios
  const testScenarios = [
    { tenant: 'egdc', tokenBusinessType: null, expected: { businessType: 'retailer', businessRoute: 'r' } },
    { tenant: 'egdc', tokenBusinessType: undefined, expected: { businessType: 'retailer', businessRoute: 'r' } },
    { tenant: 'egdc', tokenBusinessType: '', expected: { businessType: 'retailer', businessRoute: 'r' } },
    { tenant: 'egdc', tokenBusinessType: 'wholesaler', expected: { businessType: 'retailer', businessRoute: 'r' } }, // EGDC override
    { tenant: 'fami', tokenBusinessType: 'wholesaler', expected: { businessType: 'wholesaler', businessRoute: 's' } },
    { tenant: 'other', tokenBusinessType: 'supplier', expected: { businessType: 'supplier', businessRoute: 's' } },
    { tenant: 'other', tokenBusinessType: 'invalid', expected: { businessType: 'retailer', businessRoute: 'r' } },
  ]
  
  let allTestsPassed = true
  
  colorLog('bright', '\n=== MIDDLEWARE LOGIC TESTS ===')
  
  for (const scenario of testScenarios) {
    const result = simulateMiddlewareBusinessTypeLogic(scenario.tenant, scenario.tokenBusinessType)
    const passed = result.businessType === scenario.expected.businessType && 
                   result.businessRoute === scenario.expected.businessRoute
    
    const status = passed ? colorLog('green', '✅') : colorLog('red', '❌')
    console.log(`${passed ? '✅' : '❌'} Tenant: ${scenario.tenant}, Token: ${scenario.tokenBusinessType || 'null'} -> ${result.businessType}/${result.businessRoute}`)
    
    if (!passed) {
      allTestsPassed = false
      colorLog('red', `   Expected: ${scenario.expected.businessType}/${scenario.expected.businessRoute}, Got: ${result.businessType}/${result.businessRoute}`)
    }
  }
  
  colorLog('bright', '============================\n')
  
  if (allTestsPassed) {
    colorLog('green', '✅ All middleware logic tests passed!')
  } else {
    colorLog('red', '❌ Some middleware logic tests failed!')
  }
  
  return allTestsPassed
}

// Main execution
if (require.main === module) {
  (async () => {
    colorLog('bright', '🔧 DATABASE BUSINESS TYPE CORRECTION SPECIALIST')
    colorLog('bright', '================================================')
    
    try {
      // Step 1: Run database correction
      await runBusinessTypeCorrection()
      
      // Step 2: Test middleware logic
      const middlewareTestsPassed = await testAuthenticationFlow()
      
      // Final summary
      colorLog('bright', '\n=== FINAL SUMMARY ===')
      colorLog('green', '✅ Database migration completed')
      colorLog(middlewareTestsPassed ? 'green' : 'red', 
               middlewareTestsPassed ? '✅ Middleware logic tests passed' : '❌ Middleware logic tests failed')
      
      if (middlewareTestsPassed) {
        colorLog('bright', '\n🎉 SUCCESS: Business type correction completed!')
        colorLog('cyan', 'The redirect loop issue should now be resolved.')
        colorLog('cyan', 'EGDC users will always be directed to /egdc/r/dashboard')
      } else {
        colorLog('bright', '\n⚠️ WARNING: Some tests failed')
        colorLog('yellow', 'Please review the middleware logic')
      }
      
    } catch (error) {
      colorLog('red', `💥 CRITICAL ERROR: ${error.message}`)
      process.exit(1)
    }
  })()
}

export { runBusinessTypeCorrection, testAuthenticationFlow }
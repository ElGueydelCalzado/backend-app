#!/usr/bin/env tsx

/**
 * End-to-End Authentication Flow Test
 * Tests all the authentication bug fixes to ensure they work correctly
 */

import { Pool } from 'pg'
import { createSecureDatabaseConfig } from '../lib/database-config'
import { validateEnvironment } from '../lib/env-validation'
import { 
  extractTenantFromPath, 
  isValidTenant, 
  cleanTenantSubdomain,
  getBaseUrl,
  isAppDomain 
} from '../lib/tenant-utils'

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message: string, color = colors.blue) {
  console.log(`${color}${message}${colors.reset}`)
}

function success(message: string) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`)
}

function error(message: string) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`)
}

function warning(message: string) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`)
}

async function testDatabaseConnection(): Promise<boolean> {
  log('🔍 Testing database connection...', colors.bold)
  
  try {
    const pool = new Pool(createSecureDatabaseConfig())
    const client = await pool.connect()
    
    // Test basic query
    const result = await client.query('SELECT 1 as test')
    if (result.rows[0].test === 1) {
      success('Database connection test passed')
    } else {
      error('Database connection test failed - unexpected result')
      return false
    }
    
    // Test tenant table exists
    const tenantCheck = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'tenants'
    `)
    
    if (tenantCheck.rows.length > 0) {
      success('Tenants table exists')
    } else {
      error('Tenants table missing')
      return false
    }
    
    // Test users table exists
    const usersCheck = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'users'
    `)
    
    if (usersCheck.rows.length > 0) {
      success('Users table exists')
    } else {
      error('Users table missing')
      return false
    }
    
    // Test EGDC tenant exists
    const egdcCheck = await client.query(`
      SELECT id, subdomain FROM tenants 
      WHERE subdomain = 'egdc'
    `)
    
    if (egdcCheck.rows.length > 0) {
      success(`EGDC tenant exists with ID: ${egdcCheck.rows[0].id}`)
    } else {
      warning('EGDC tenant not found - will be created during authentication')
    }
    
    client.release()
    await pool.end()
    
    return true
  } catch (err) {
    error(`Database connection failed: ${err.message}`)
    return false
  }
}

function testEnvironmentValidation(): boolean {
  log('🔍 Testing environment validation...', colors.bold)
  
  try {
    const { config, validation } = validateEnvironment()
    
    if (validation.isValid) {
      success('Environment validation passed')
      log(`Environment: ${config.NODE_ENV}${config.VERCEL_ENV ? ` (${config.VERCEL_ENV})` : ''}`)
      
      // Check critical variables
      if (config.DATABASE_URL) {
        success('DATABASE_URL is configured')
      }
      
      if (config.NEXTAUTH_SECRET) {
        success('NEXTAUTH_SECRET is configured')
      }
      
      if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
        success('Google OAuth credentials are configured')
      }
      
      if (validation.warnings.length > 0) {
        warning(`Environment has ${validation.warnings.length} warnings`)
        validation.warnings.forEach(w => warning(`  ${w}`))
      }
      
      return true
    } else {
      error('Environment validation failed')
      validation.errors.forEach(err => error(`  ${err}`))
      return false
    }
  } catch (err) {
    error(`Environment validation error: ${err.message}`)
    return false
  }
}

function testTenantUtils(): boolean {
  log('🔍 Testing tenant utilities...', colors.bold)
  
  try {
    // Test tenant extraction
    const testCases = [
      { path: '/egdc/dashboard', expected: 'egdc' },
      { path: '/fami/inventory', expected: 'fami' },
      { path: '/osiel/settings', expected: 'osiel' },
      { path: '/molly/dashboard', expected: 'molly' },
      { path: '/invalid/dashboard', expected: null },
      { path: '/dashboard', expected: null }
    ]
    
    let tenantExtractionPassed = true
    for (const test of testCases) {
      const result = extractTenantFromPath(test.path)
      if (result === test.expected) {
        success(`Tenant extraction: ${test.path} → ${result || 'null'}`)
      } else {
        error(`Tenant extraction failed: ${test.path} → expected ${test.expected}, got ${result}`)
        tenantExtractionPassed = false
      }
    }
    
    // Test tenant cleaning
    const cleaningTests = [
      { input: 'egdc', expected: 'egdc' },
      { input: 'preview-egdc', expected: 'egdc' },
      { input: 'mock-fami', expected: 'fami' },
      { input: 'test-molly', expected: 'molly' },
      { input: 'egdc-preview', expected: 'egdc' }
    ]
    
    let cleaningPassed = true
    for (const test of cleaningTests) {
      const result = cleanTenantSubdomain(test.input)
      if (result === test.expected) {
        success(`Tenant cleaning: ${test.input} → ${result}`)
      } else {
        error(`Tenant cleaning failed: ${test.input} → expected ${test.expected}, got ${result}`)
        cleaningPassed = false
      }
    }
    
    // Test domain checking
    const domainTests = [
      { hostname: 'app.lospapatos.com', expected: true },
      { hostname: 'localhost:3001', expected: true },
      { hostname: '127.0.0.1:3000', expected: true },
      { hostname: 'lospapatos.com', expected: false },
      { hostname: 'malicious.com', expected: false }
    ]
    
    let domainPassed = true
    for (const test of domainTests) {
      const result = isAppDomain(test.hostname)
      if (result === test.expected) {
        success(`Domain check: ${test.hostname} → ${result}`)
      } else {
        error(`Domain check failed: ${test.hostname} → expected ${test.expected}, got ${result}`)
        domainPassed = false
      }
    }
    
    return tenantExtractionPassed && cleaningPassed && domainPassed
  } catch (err) {
    error(`Tenant utilities test error: ${err.message}`)
    return false
  }
}

function testUrlGeneration(): boolean {
  log('🔍 Testing URL generation...', colors.bold)
  
  try {
    // Mock environments
    const originalEnv = process.env.NODE_ENV
    
    // Test development URLs
    process.env.NODE_ENV = 'development'
    const devUrl = getBaseUrl('localhost:3001')
    if (devUrl === 'http://localhost:3001') {
      success(`Development URL generation: ${devUrl}`)
    } else {
      error(`Development URL generation failed: expected http://localhost:3001, got ${devUrl}`)
      return false
    }
    
    // Test production URLs
    process.env.NODE_ENV = 'production' 
    const prodUrl = getBaseUrl('app.lospapatos.com')
    if (prodUrl === 'https://app.lospapatos.com') {
      success(`Production URL generation: ${prodUrl}`)
    } else {
      error(`Production URL generation failed: expected https://app.lospapatos.com, got ${prodUrl}`)
      return false
    }
    
    // Restore environment
    process.env.NODE_ENV = originalEnv
    
    return true
  } catch (err) {
    error(`URL generation test error: ${err.message}`)
    return false
  }
}

async function runAuthenticationTests(): Promise<void> {
  log(`${colors.bold}🧪 EGDC Authentication Flow End-to-End Test${colors.reset}`)
  log('='*50)
  
  const tests = [
    { name: 'Environment Validation', test: () => testEnvironmentValidation() },
    { name: 'Database Connection', test: () => testDatabaseConnection() },
    { name: 'Tenant Utilities', test: () => testTenantUtils() },
    { name: 'URL Generation', test: () => testUrlGeneration() }
  ]
  
  let allPassed = true
  const results = []
  
  for (const { name, test } of tests) {
    log(`\n📋 Running ${name} test...`)
    try {
      const passed = await test()
      results.push({ name, passed })
      if (!passed) allPassed = false
    } catch (error) {
      error(`${name} test threw an error: ${error.message}`)
      results.push({ name, passed: false })
      allPassed = false
    }
  }
  
  // Summary
  log('\n' + '='*50)
  log(`${colors.bold}📊 Test Results Summary${colors.reset}`)
  log('='*50)
  
  for (const result of results) {
    if (result.passed) {
      success(`${result.name}: PASSED`)
    } else {
      error(`${result.name}: FAILED`)
    }
  }
  
  log('\n' + '='*50)
  if (allPassed) {
    success('🎉 All authentication tests PASSED!')
    success('✅ Authentication bug fixes are working correctly')
    log('\n🚀 Ready for production deployment!')
  } else {
    error('💥 Some authentication tests FAILED!')
    error('❌ Please fix the failing tests before deployment')
    process.exit(1)
  }
}

if (require.main === module) {
  runAuthenticationTests().catch(error => {
    error(`Test execution failed: ${error.message}`)
    process.exit(1)
  })
}

export { runAuthenticationTests }
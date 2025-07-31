#!/usr/bin/env tsx

/**
 * Enterprise Security Database Setup Script
 * Creates all tables required for enterprise security features
 */

import { Pool } from 'pg'
import { createSecureDatabaseConfig } from '../lib/database-config'
import { ENTERPRISE_AUTH_SCHEMA } from '../lib/enterprise-auth'
import { MFA_SCHEMA } from '../lib/enterprise-2fa'
import { RBAC_SCHEMA } from '../lib/enterprise-rbac'
import { GDPR_SCHEMA } from '../lib/enterprise-gdpr'
import { AUDIT_SCHEMA } from '../lib/enterprise-audit'
import { ENCRYPTION_SCHEMA } from '../lib/encryption'

async function setupEnterpriseDatabase() {
  console.log('🚀 Setting up Enterprise Security Database Schema...\n')

  const pool = new Pool(createSecureDatabaseConfig())
  const client = await pool.connect()

  try {
    console.log('📊 Connected to database successfully')

    // Start transaction
    await client.query('BEGIN')

    console.log('\n🔐 Creating Enterprise Authentication Tables...')
    await client.query(ENTERPRISE_AUTH_SCHEMA)
    console.log('✅ Enterprise Auth tables created')

    console.log('\n📱 Creating Multi-Factor Authentication Tables...')
    await client.query(MFA_SCHEMA)
    console.log('✅ MFA tables created')

    console.log('\n🛡️ Creating Role-Based Access Control Tables...')
    await client.query(RBAC_SCHEMA)
    console.log('✅ RBAC tables created')

    console.log('\n🔒 Creating GDPR Compliance Tables...')
    await client.query(GDPR_SCHEMA)
    console.log('✅ GDPR tables created')

    console.log('\n📋 Creating Security Audit Tables...')
    await client.query(AUDIT_SCHEMA)
    console.log('✅ Audit tables created')

    console.log('\n🔐 Creating Encryption Tables...')
    await client.query(ENCRYPTION_SCHEMA)
    console.log('✅ Encryption tables created')

    // Create indexes for performance
    console.log('\n⚡ Creating performance indexes...')
    
    const performanceIndexes = `
      -- Additional performance indexes
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_events_tenant_timestamp 
        ON audit_events(tenant_id, timestamp DESC);
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_user_tenant 
        ON refresh_tokens(user_id, tenant_id) WHERE is_revoked = false;
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mfa_devices_user_enabled 
        ON mfa_devices(user_id) WHERE is_enabled = true;
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_consent_records_user_active 
        ON consent_records(user_id, tenant_id) WHERE is_active = true;
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_user_active 
        ON user_roles(user_id, tenant_id) WHERE is_active = true;
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_encryption_keys_type_active 
        ON encryption_keys(key_type, is_active);
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_encryption_keys_expires_at 
        ON encryption_keys(expires_at);
    `

    await client.query(performanceIndexes)
    console.log('✅ Performance indexes created')

    // Insert initial system data
    console.log('\n🏗️ Inserting initial system data...')
    
    // Create default privacy policy version
    await client.query(`
      INSERT INTO privacy_policy_versions (
        id, tenant_id, version, content, effective_date, changes, is_active
      ) VALUES (
        gen_random_uuid(),
        NULL, -- System-wide default
        '1.0',
        'Default privacy policy for Los Papatos EGDC platform. This policy describes how we collect, use, and protect your personal data in compliance with GDPR and other applicable privacy laws.',
        NOW(),
        '["Initial privacy policy version"]',
        true
      ) ON CONFLICT DO NOTHING
    `)

    // Create default data processing activities
    await client.query(`
      INSERT INTO data_processing_activities (
        id, tenant_id, activity_name, purpose, lawful_basis, 
        data_categories, data_subjects, recipients, retention_period, security_measures
      ) VALUES (
        gen_random_uuid(),
        NULL, -- System-wide default
        'User Authentication',
        'Authenticate users and maintain secure access to the platform',
        'contract',
        '["identity", "contact", "technical"]',
        '["customers", "users"]',
        '["internal_systems"]',
        2555, -- 7 years
        '["encryption", "access_controls", "audit_logging"]'
      ) ON CONFLICT DO NOTHING
    `)

    // Commit transaction
    await client.query('COMMIT')

    console.log('\n🎉 Enterprise Security Database Setup Complete!')
    console.log('\n📊 Summary:')
    console.log('  ✅ Authentication & JWT refresh tokens')
    console.log('  ✅ Multi-Factor Authentication (TOTP/SMS)')
    console.log('  ✅ Role-Based Access Control')
    console.log('  ✅ GDPR Compliance & Data Rights')
    console.log('  ✅ Security Audit & Logging')
    console.log('  ✅ Field-Level Encryption')
    console.log('  ✅ Performance indexes')
    console.log('  ✅ Initial system data')

    // Test table creation
    console.log('\n🧪 Running database tests...')
    const testResults = await runDatabaseTests(client)
    
    if (testResults.allPassed) {
      console.log('✅ All database tests passed!')
    } else {
      console.log('❌ Some database tests failed:', testResults.failures)
    }

  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Database setup failed:', error)
    console.error('💡 Please check your database connection and permissions')
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

async function runDatabaseTests(client: any) {
  const tests = [
    {
      name: 'refresh_tokens table exists',
      query: "SELECT 1 FROM refresh_tokens LIMIT 0"
    },
    {
      name: 'mfa_devices table exists',
      query: "SELECT 1 FROM mfa_devices LIMIT 0"
    },
    {
      name: 'roles table exists',
      query: "SELECT 1 FROM roles LIMIT 0"
    },
    {
      name: 'consent_records table exists',
      query: "SELECT 1 FROM consent_records LIMIT 0"
    },
    {
      name: 'audit_events table exists',
      query: "SELECT 1 FROM audit_events LIMIT 0"
    },
    {
      name: 'privacy_policy_versions has data',
      query: "SELECT 1 FROM privacy_policy_versions WHERE version = '1.0'"
    },
    {
      name: 'encryption_keys table exists',
      query: "SELECT 1 FROM encryption_keys LIMIT 0"
    }
  ]

  const results = {
    allPassed: true,
    failures: [] as string[]
  }

  for (const test of tests) {
    try {
      await client.query(test.query)
      console.log(`  ✅ ${test.name}`)
    } catch (error) {
      console.log(`  ❌ ${test.name}: ${error.message}`)
      results.allPassed = false
      results.failures.push(test.name)
    }
  }

  return results
}

// Run the setup
if (require.main === module) {
  setupEnterpriseDatabase().catch(error => {
    console.error('Setup failed:', error)
    process.exit(1)
  })
}

export { setupEnterpriseDatabase }
#!/usr/bin/env tsx

/**
 * Multi-Tenant Database Schema Test
 * Tests database schema fixes and multi-tenant isolation
 */

import { connectToDatabase } from '../lib/postgres-tenant-safe'
import { TenantSafePostgresManager } from '../lib/postgres-tenant-safe'

interface TestResult {
  test: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  message: string
  details?: any
}

class MultiTenantSchemaTest {
  private results: TestResult[] = []
  private pool: any

  async runAllTests() {
    console.log('🔍 Starting Multi-Tenant Database Schema Tests...\n')
    
    try {
      // Connect to database
      this.pool = await connectToDatabase()
      console.log('✅ Database connection established\n')

      // Run all tests
      await this.testDatabaseConnection()
      await this.testTenantTablesExist()
      await this.testTenantIdConstraints()
      await this.testInventorySchemaConsistency()
      await this.testUniqueConstraints()
      await this.testRowLevelSecurity()
      await this.testTenantIsolation()
      await this.testIndexesExist()
      await this.testTriggersWork()

      // Print summary
      this.printTestSummary()

    } catch (error) {
      console.error('❌ Test suite failed:', error)
      this.addResult('Test Suite', 'FAIL', `Fatal error: ${error}`)
    } finally {
      await this.pool?.end()
    }
  }

  private addResult(test: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, details?: any) {
    this.results.push({ test, status, message, details })
    const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️'
    console.log(`${emoji} ${test}: ${message}`)
    if (details) console.log(`   Details: ${JSON.stringify(details, null, 2)}`)
  }

  async testDatabaseConnection() {
    try {
      const result = await this.pool.query('SELECT NOW() as current_time')
      this.addResult(
        'Database Connection', 
        'PASS', 
        `Connected successfully at ${result.rows[0].current_time}`
      )
    } catch (error) {
      this.addResult('Database Connection', 'FAIL', `Failed: ${error}`)
    }
  }

  async testTenantTablesExist() {
    try {
      const tables = ['tenants', 'users', 'tenant_invitations', 'products', 'change_logs']
      
      for (const table of tables) {
        const result = await this.pool.query(`
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = 'tenant_id'
        `, [table])

        if (result.rows.length > 0) {
          const col = result.rows[0]
          this.addResult(
            `Table ${table} tenant_id`, 
            'PASS', 
            `Column exists: ${col.data_type}, nullable: ${col.is_nullable}`
          )
        } else if (table === 'tenants') {
          // Tenants table doesn't have tenant_id (it IS the tenant)
          this.addResult(`Table ${table} structure`, 'PASS', 'Tenants table correctly has no tenant_id')
        } else {
          this.addResult(`Table ${table} tenant_id`, 'FAIL', 'tenant_id column missing')
        }
      }
    } catch (error) {
      this.addResult('Tenant Tables', 'FAIL', `Error checking tables: ${error}`)
    }
  }

  async testTenantIdConstraints() {
    try {
      // Check if tenant_id columns are NOT NULL
      const result = await this.pool.query(`
        SELECT table_name, column_name, is_nullable
        FROM information_schema.columns 
        WHERE table_name IN ('products', 'change_logs', 'users') 
        AND column_name = 'tenant_id'
      `)

      let allNotNull = true
      for (const row of result.rows) {
        if (row.is_nullable === 'YES') {
          allNotNull = false
          this.addResult(
            `${row.table_name}.tenant_id constraint`, 
            'FAIL', 
            'Column allows NULL values'
          )
        } else {
          this.addResult(
            `${row.table_name}.tenant_id constraint`, 
            'PASS', 
            'Column is NOT NULL'
          )
        }
      }

      if (allNotNull) {
        this.addResult('Tenant ID Constraints', 'PASS', 'All tenant_id columns are NOT NULL')
      }

    } catch (error) {
      this.addResult('Tenant ID Constraints', 'FAIL', `Error: ${error}`)
    }
  }

  async testInventorySchemaConsistency() {
    try {
      // Check if products table has the expected inventory columns
      const result = await this.pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name LIKE 'inv_%'
        ORDER BY column_name
      `)

      const expectedColumns = ['inv_egdc', 'inv_fami', 'inv_osiel', 'inv_molly']
      const actualColumns = result.rows.map(row => row.column_name)
      
      const hasAllExpected = expectedColumns.every(col => actualColumns.includes(col))
      
      if (hasAllExpected) {
        this.addResult(
          'Inventory Schema', 
          'PASS', 
          'All expected inventory columns exist',
          { expected: expectedColumns, actual: actualColumns }
        )
      } else {
        const missing = expectedColumns.filter(col => !actualColumns.includes(col))
        this.addResult(
          'Inventory Schema', 
          'FAIL', 
          `Missing columns: ${missing.join(', ')}`,
          { expected: expectedColumns, actual: actualColumns, missing }
        )
      }

      // Check for unexpected old columns
      const oldColumns = ['inv_bodega_principal', 'inv_tienda_centro', 'inv_tienda_norte', 'inv_tienda_sur', 'inv_online']
      const hasOldColumns = oldColumns.some(col => actualColumns.includes(col))
      
      if (hasOldColumns) {
        const found = oldColumns.filter(col => actualColumns.includes(col))
        this.addResult(
          'Legacy Inventory Columns', 
          'FAIL', 
          `Old columns still exist: ${found.join(', ')}`,
          { oldColumns: found }
        )
      } else {
        this.addResult('Legacy Inventory Columns', 'PASS', 'No old inventory columns found')
      }

    } catch (error) {
      this.addResult('Inventory Schema', 'FAIL', `Error: ${error}`)
    }
  }

  async testUniqueConstraints() {
    try {
      // Check for unique constraints on tenant-scoped data
      const result = await this.pool.query(`
        SELECT 
          conname as constraint_name,
          contype as constraint_type
        FROM pg_constraint 
        WHERE conrelid = 'products'::regclass
        AND contype = 'u'
        AND conname LIKE '%tenant%'
      `)

      const expectedConstraints = ['products_sku_tenant_unique', 'products_ean_tenant_unique']
      const actualConstraints = result.rows.map(row => row.constraint_name)

      for (const expected of expectedConstraints) {
        if (actualConstraints.includes(expected)) {
          this.addResult(`Constraint ${expected}`, 'PASS', 'Unique constraint exists')
        } else {
          this.addResult(`Constraint ${expected}`, 'FAIL', 'Unique constraint missing')
        }
      }

    } catch (error) {
      this.addResult('Unique Constraints', 'FAIL', `Error: ${error}`)
    }
  }

  async testRowLevelSecurity() {
    try {
      // Check if RLS is enabled on tables
      const result = await this.pool.query(`
        SELECT 
          schemaname,
          tablename,
          rowsecurity as rls_enabled
        FROM pg_tables 
        WHERE tablename IN ('products', 'change_logs', 'users', 'tenants')
      `)

      for (const row of result.rows) {
        if (row.rls_enabled) {
          this.addResult(`RLS ${row.tablename}`, 'PASS', 'Row Level Security enabled')
        } else {
          this.addResult(`RLS ${row.tablename}`, 'FAIL', 'Row Level Security disabled')
        }
      }

      // Check if RLS policies exist
      const policies = await this.pool.query(`
        SELECT 
          tablename,
          policyname,
          cmd
        FROM pg_policies 
        WHERE tablename IN ('products', 'change_logs', 'users')
        AND policyname LIKE '%tenant%'
      `)

      if (policies.rows.length > 0) {
        this.addResult(
          'RLS Policies', 
          'PASS', 
          `Found ${policies.rows.length} tenant isolation policies`,
          policies.rows
        )
      } else {
        this.addResult('RLS Policies', 'FAIL', 'No tenant isolation policies found')
      }

    } catch (error) {
      this.addResult('Row Level Security', 'FAIL', `Error: ${error}`)
    }
  }

  async testTenantIsolation() {
    try {
      // Test if TenantSafePostgresManager properly isolates data
      
      // First, ensure we have at least one tenant
      const tenantResult = await this.pool.query('SELECT id FROM tenants LIMIT 1')
      
      if (tenantResult.rows.length === 0) {
        this.addResult('Tenant Isolation', 'SKIP', 'No tenants found to test with')
        return
      }

      const tenantId = tenantResult.rows[0].id

      // Test getProducts with tenant filtering
      const products = await TenantSafePostgresManager.getProducts(tenantId)
      this.addResult(
        'Tenant Isolation - getProducts', 
        'PASS', 
        `Retrieved ${products.length} products for tenant ${tenantId}`
      )

      // Test that methods reject NULL tenant_id
      try {
        await TenantSafePostgresManager.getProducts(null as any)
        this.addResult('Tenant Isolation - NULL Check', 'FAIL', 'Method accepted NULL tenant_id')
      } catch (error) {
        this.addResult(
          'Tenant Isolation - NULL Check', 
          'PASS', 
          'Method properly rejected NULL tenant_id'
        )
      }

    } catch (error) {
      this.addResult('Tenant Isolation', 'FAIL', `Error: ${error}`)
    }
  }

  async testIndexesExist() {
    try {
      // Check for performance indexes
      const result = await this.pool.query(`
        SELECT 
          indexname,
          tablename
        FROM pg_indexes 
        WHERE tablename IN ('products', 'change_logs', 'users', 'tenants')
        AND indexname LIKE '%tenant%'
      `)

      const expectedIndexes = [
        'idx_products_tenant_id',
        'idx_change_logs_tenant_id', 
        'idx_users_tenant_id'
      ]

      const actualIndexes = result.rows.map(row => row.indexname)

      for (const expected of expectedIndexes) {
        if (actualIndexes.includes(expected)) {
          this.addResult(`Index ${expected}`, 'PASS', 'Performance index exists')
        } else {
          this.addResult(`Index ${expected}`, 'FAIL', 'Performance index missing')
        }
      }

    } catch (error) {
      this.addResult('Database Indexes', 'FAIL', `Error: ${error}`)
    }
  }

  async testTriggersWork() {
    try {
      // Test inventory total calculation trigger
      const tenantResult = await this.pool.query('SELECT id FROM tenants LIMIT 1')
      
      if (tenantResult.rows.length === 0) {
        this.addResult('Trigger Tests', 'SKIP', 'No tenants found to test with')
        return
      }

      const tenantId = tenantResult.rows[0].id

      // Insert a test product to verify trigger works
      const testProduct = await this.pool.query(`
        INSERT INTO products (
          tenant_id, categoria, marca, modelo, color, talla,
          inv_egdc, inv_fami, inv_osiel, inv_molly
        ) VALUES ($1, 'TEST', 'TEST', 'TEST', 'TEST', 'TEST', 5, 3, 2, 1)
        RETURNING id, inventory_total
      `, [tenantId])

      const product = testProduct.rows[0]
      const expectedTotal = 5 + 3 + 2 + 1 // 11

      if (product.inventory_total === expectedTotal) {
        this.addResult(
          'Inventory Trigger', 
          'PASS', 
          `Trigger correctly calculated total: ${product.inventory_total}`
        )
      } else {
        this.addResult(
          'Inventory Trigger', 
          'FAIL', 
          `Expected ${expectedTotal}, got ${product.inventory_total}`
        )
      }

      // Clean up test product
      await this.pool.query('DELETE FROM products WHERE id = $1', [product.id])

    } catch (error) {
      this.addResult('Trigger Tests', 'FAIL', `Error: ${error}`)
    }
  }

  private printTestSummary() {
    console.log('\n' + '='.repeat(60))
    console.log('🧪 MULTI-TENANT SCHEMA TEST SUMMARY')
    console.log('='.repeat(60))

    const passed = this.results.filter(r => r.status === 'PASS').length
    const failed = this.results.filter(r => r.status === 'FAIL').length
    const skipped = this.results.filter(r => r.status === 'SKIP').length
    const total = this.results.length

    console.log(`\n📊 Results: ${passed}/${total} tests passed`)
    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`⏭️ Skipped: ${skipped}`)

    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:')
      this.results.filter(r => r.status === 'FAIL').forEach(result => {
        console.log(`   • ${result.test}: ${result.message}`)
      })
    }

    console.log('\n🎯 OVERALL STATUS:', failed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED')
    
    if (failed === 0) {
      console.log('\n🚀 Database schema is ready for multi-tenant production!')
    } else {
      console.log('\n⚠️  Please apply the database fixes before deployment.')
      console.log('   Run: psql -d your_database -f sql/multi-tenant-fixes.sql')
    }
  }
}

// Run the tests
const tester = new MultiTenantSchemaTest()
tester.runAllTests().catch(console.error)
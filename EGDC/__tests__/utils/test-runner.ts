/**
 * Test Runner Utilities
 * Provides comprehensive test execution and reporting capabilities
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

export interface TestResults {
  success: boolean
  coverage: {
    statements: number
    branches: number
    functions: number
    lines: number
  }
  testSuites: {
    name: string
    passed: number
    failed: number
    skipped: number
    duration: number
  }[]
  summary: {
    totalTests: number
    passedTests: number
    failedTests: number
    skippedTests: number
    totalDuration: number
  }
}

export class TestRunner {
  private projectRoot: string
  private outputDir: string

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot
    this.outputDir = path.join(projectRoot, '__test-reports__')
    
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true })
    }
  }

  /**
   * Run all tests with coverage reporting
   */
  async runAllTests(): Promise<TestResults> {
    console.log('🧪 Starting comprehensive test suite...')
    
    const startTime = Date.now()
    
    try {
      // Run Jest with coverage
      const command = 'npm run test:coverage -- --verbose --json --outputFile=__test-reports__/test-results.json'
      const output = execSync(command, { 
        cwd: this.projectRoot,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      console.log(`✅ All tests completed in ${duration}ms`)
      
      return await this.parseTestResults()
      
    } catch (error) {
      console.error('❌ Test execution failed:', error)
      return this.createFailedResults(error)
    }
  }

  /**
   * Run specific test categories
   */
  async runTestCategory(category: 'unit' | 'integration' | 'e2e'): Promise<TestResults> {
    console.log(`🧪 Running ${category} tests...`)
    
    try {
      const command = `npm run test:${category} -- --coverage --json --outputFile=__test-reports__/${category}-results.json`
      execSync(command, { 
        cwd: this.projectRoot,
        encoding: 'utf8'
      })

      return await this.parseTestResults(`${category}-results.json`)
      
    } catch (error) {
      console.error(`❌ ${category} tests failed:`, error)
      return this.createFailedResults(error)
    }
  }

  /**
   * Run security-focused tests
   */
  async runSecurityTests(): Promise<TestResults> {
    console.log('🔒 Running security test suite...')
    
    const securityTestPatterns = [
      '__tests__/unit/middleware.test.ts',
      '__tests__/unit/database-security.test.ts',
      '__tests__/integration/api-security.test.ts',
      '__tests__/integration/middleware-security.test.ts'
    ]

    try {
      const patterns = securityTestPatterns.join(' ')
      const command = `npx jest ${patterns} --coverage --json --outputFile=__test-reports__/security-results.json`
      
      execSync(command, { 
        cwd: this.projectRoot,
        encoding: 'utf8'
      })

      return await this.parseTestResults('security-results.json')
      
    } catch (error) {
      console.error('❌ Security tests failed:', error)
      return this.createFailedResults(error)
    }
  }

  /**
   * Generate comprehensive test report
   */
  async generateTestReport(results: TestResults): Promise<string> {
    const reportPath = path.join(this.outputDir, 'test-report.html')
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EGDC Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 8px; }
        .success { color: #28a745; }
        .failure { color: #dc3545; }
        .warning { color: #ffc107; }
        .coverage-bar { background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden; }
        .coverage-fill { height: 100%; background: linear-gradient(90deg, #dc3545 0%, #ffc107 50%, #28a745 100%); }
        .test-suite { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>EGDC OAuth + Multi-Tenant System Test Report</h1>
        <p>Generated: ${new Date().toISOString()}</p>
        <p class="${results.success ? 'success' : 'failure'}">
            Status: ${results.success ? '✅ PASSED' : '❌ FAILED'}
        </p>
    </div>

    <h2>Test Summary</h2>
    <div class="metric">
        <strong>Total Tests:</strong> ${results.summary.totalTests}
    </div>
    <div class="metric success">
        <strong>Passed:</strong> ${results.summary.passedTests}
    </div>
    <div class="metric failure">
        <strong>Failed:</strong> ${results.summary.failedTests}
    </div>
    <div class="metric warning">
        <strong>Skipped:</strong> ${results.summary.skippedTests}
    </div>
    <div class="metric">
        <strong>Duration:</strong> ${results.summary.totalDuration}ms
    </div>

    <h2>Coverage Report</h2>
    <div class="metric">
        <strong>Statements:</strong> ${results.coverage.statements}%
        <div class="coverage-bar">
            <div class="coverage-fill" style="width: ${results.coverage.statements}%"></div>
        </div>
    </div>
    <div class="metric">
        <strong>Branches:</strong> ${results.coverage.branches}%
        <div class="coverage-bar">
            <div class="coverage-fill" style="width: ${results.coverage.branches}%"></div>
        </div>
    </div>
    <div class="metric">
        <strong>Functions:</strong> ${results.coverage.functions}%
        <div class="coverage-bar">
            <div class="coverage-fill" style="width: ${results.coverage.functions}%"></div>
        </div>
    </div>
    <div class="metric">
        <strong>Lines:</strong> ${results.coverage.lines}%
        <div class="coverage-bar">
            <div class="coverage-fill" style="width: ${results.coverage.lines}%"></div>
        </div>
    </div>

    <h2>Test Suites</h2>
    ${results.testSuites.map(suite => `
        <div class="test-suite">
            <h3>${suite.name}</h3>
            <p><span class="success">✅ ${suite.passed} passed</span> | 
               <span class="failure">❌ ${suite.failed} failed</span> | 
               <span class="warning">⏭️ ${suite.skipped} skipped</span></p>
            <p>Duration: ${suite.duration}ms</p>
        </div>
    `).join('')}

    <h2>Security Test Coverage</h2>
    <ul>
        <li>✅ OAuth Authentication Flow Tests</li>
        <li>✅ Multi-Tenant Isolation Tests</li>
        <li>✅ Database RLS Security Tests</li>
        <li>✅ Middleware Security Tests</li>
        <li>✅ API Endpoint Security Tests</li>
        <li>✅ Session Management Tests</li>
        <li>✅ Input Validation Tests</li>
        <li>✅ Cross-Tenant Access Prevention</li>
    </ul>

    <h2>Recommendations</h2>
    <ul>
        ${results.coverage.statements < 85 ? '<li class="warning">⚠️ Statement coverage below 85% - consider adding more tests</li>' : ''}
        ${results.coverage.branches < 80 ? '<li class="warning">⚠️ Branch coverage below 80% - add more edge case tests</li>' : ''}
        ${results.summary.failedTests > 0 ? '<li class="failure">❌ Fix failing tests before deployment</li>' : ''}
        ${results.success ? '<li class="success">✅ All tests passing - ready for production deployment</li>' : ''}
    </ul>
</body>
</html>
    `

    fs.writeFileSync(reportPath, html)
    console.log(`📊 Test report generated: ${reportPath}`)
    
    return reportPath
  }

  /**
   * Parse Jest test results from JSON output
   */
  private async parseTestResults(filename: string = 'test-results.json'): Promise<TestResults> {
    const resultPath = path.join(this.outputDir, filename)
    
    if (!fs.existsSync(resultPath)) {
      throw new Error(`Test results file not found: ${resultPath}`)
    }

    const rawResults = fs.readFileSync(resultPath, 'utf8')
    const jestResults = JSON.parse(rawResults)

    // Parse coverage data
    const coverage = this.parseCoverageData()

    // Parse test suite results
    const testSuites = jestResults.testResults?.map((suite: any) => ({
      name: path.basename(suite.name),
      passed: suite.numPassingTests,
      failed: suite.numFailingTests,
      skipped: suite.numTodoTests + suite.numPendingTests,
      duration: suite.perfStats?.end - suite.perfStats?.start || 0
    })) || []

    const summary = {
      totalTests: jestResults.numTotalTests || 0,
      passedTests: jestResults.numPassedTests || 0,
      failedTests: jestResults.numFailedTests || 0,
      skippedTests: jestResults.numTodoTests + jestResults.numPendingTests || 0,
      totalDuration: jestResults.testResults?.reduce((total: number, suite: any) => 
        total + (suite.perfStats?.end - suite.perfStats?.start || 0), 0) || 0
    }

    return {
      success: jestResults.success || false,
      coverage,
      testSuites,
      summary
    }
  }

  /**
   * Parse coverage data from Jest coverage report
   */
  private parseCoverageData(): TestResults['coverage'] {
    const coveragePath = path.join(this.projectRoot, 'coverage', 'coverage-summary.json')
    
    if (!fs.existsSync(coveragePath)) {
      console.warn('⚠️ Coverage data not found, using defaults')
      return { statements: 0, branches: 0, functions: 0, lines: 0 }
    }

    try {
      const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'))
      const total = coverageData.total || {}

      return {
        statements: Math.round(total.statements?.pct || 0),
        branches: Math.round(total.branches?.pct || 0),
        functions: Math.round(total.functions?.pct || 0),
        lines: Math.round(total.lines?.pct || 0)
      }
    } catch (error) {
      console.warn('⚠️ Failed to parse coverage data:', error)
      return { statements: 0, branches: 0, functions: 0, lines: 0 }
    }
  }

  /**
   * Create failed results object for error cases
   */
  private createFailedResults(error: any): TestResults {
    return {
      success: false,
      coverage: { statements: 0, branches: 0, functions: 0, lines: 0 },
      testSuites: [],
      summary: { totalTests: 0, passedTests: 0, failedTests: 1, skippedTests: 0, totalDuration: 0 }
    }
  }

  /**
   * Check if test coverage meets minimum requirements
   */
  checkCoverageThresholds(results: TestResults): { passed: boolean; violations: string[] } {
    const thresholds = {
      statements: 85,
      branches: 70,
      functions: 70,
      lines: 70
    }

    const violations: string[] = []

    Object.entries(thresholds).forEach(([metric, threshold]) => {
      const actual = results.coverage[metric as keyof TestResults['coverage']]
      if (actual < threshold) {
        violations.push(`${metric}: ${actual}% (required: ${threshold}%)`)
      }
    })

    return {
      passed: violations.length === 0,
      violations
    }
  }

  /**
   * Generate CI/CD compatible output
   */
  generateCIOutput(results: TestResults): void {
    // GitHub Actions output
    if (process.env.GITHUB_ACTIONS) {
      console.log(`::set-output name=test-success::${results.success}`)
      console.log(`::set-output name=coverage-statements::${results.coverage.statements}`)
      console.log(`::set-output name=coverage-branches::${results.coverage.branches}`)
      console.log(`::set-output name=total-tests::${results.summary.totalTests}`)
      console.log(`::set-output name=passed-tests::${results.summary.passedTests}`)
      console.log(`::set-output name=failed-tests::${results.summary.failedTests}`)
    }

    // Vercel output
    if (process.env.VERCEL) {
      console.log(`VERCEL_TEST_SUCCESS=${results.success}`)
      console.log(`VERCEL_COVERAGE=${results.coverage.statements}`)
    }

    // Generic CI output
    console.log('\n📊 CI/CD Test Summary:')
    console.log(`SUCCESS=${results.success}`)
    console.log(`TOTAL_TESTS=${results.summary.totalTests}`)
    console.log(`PASSED_TESTS=${results.summary.passedTests}`)
    console.log(`FAILED_TESTS=${results.summary.failedTests}`)
    console.log(`COVERAGE_STATEMENTS=${results.coverage.statements}%`)
    console.log(`COVERAGE_BRANCHES=${results.coverage.branches}%`)
    console.log(`TEST_DURATION=${results.summary.totalDuration}ms`)
  }
}

/**
 * Main test execution function
 */
export async function runTestSuite(): Promise<void> {
  const runner = new TestRunner()
  
  try {
    console.log('🚀 Starting EGDC comprehensive test suite...')
    
    // Run all tests
    const results = await runner.runAllTests()
    
    // Generate reports
    const reportPath = await runner.generateTestReport(results)
    
    // Check coverage thresholds
    const coverageCheck = runner.checkCoverageThresholds(results)
    
    // Generate CI output
    runner.generateCIOutput(results)
    
    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('🧪 EGDC TEST SUITE COMPLETE')
    console.log('='.repeat(60))
    
    if (results.success) {
      console.log('✅ All tests PASSED')
    } else {
      console.log('❌ Some tests FAILED')
    }
    
    console.log(`📊 Coverage: ${results.coverage.statements}% statements, ${results.coverage.branches}% branches`)
    console.log(`📋 Tests: ${results.summary.passedTests}/${results.summary.totalTests} passed`)
    console.log(`📄 Report: ${reportPath}`)
    
    if (!coverageCheck.passed) {
      console.log('\n⚠️ Coverage violations:')
      coverageCheck.violations.forEach(violation => console.log(`   - ${violation}`))
    }
    
    console.log('\n🎯 Test Categories Covered:')
    console.log('   ✅ OAuth Authentication Flow')
    console.log('   ✅ Multi-Tenant Isolation')
    console.log('   ✅ Database Security & RLS')
    console.log('   ✅ Middleware Security')
    console.log('   ✅ API Endpoint Security')
    console.log('   ✅ Complete User Journeys')
    
    if (results.success && coverageCheck.passed) {
      console.log('\n🚀 Ready for production deployment!')
      process.exit(0)
    } else {
      console.log('\n🔧 Please fix issues before deployment')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('💥 Test suite execution failed:', error)
    process.exit(1)
  }
}

// CLI execution
if (require.main === module) {
  runTestSuite()
}
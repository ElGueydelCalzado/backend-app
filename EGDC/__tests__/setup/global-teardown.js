async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...')
  
  // Clean up any global test resources
  // Database connections should be closed by individual tests
  
  console.log('✅ Test environment cleanup complete')
}

module.exports = globalTeardown
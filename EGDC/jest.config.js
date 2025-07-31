const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/out/',
    '<rootDir>/build/'
  ],
  collectCoverageFrom: [
    'lib/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'app/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!jest.config.js',
    '!jest.setup.js'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
  testEnvironmentOptions: {
    url: 'http://localhost:3001'
  },
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/__tests__/unit/**/*.(test|spec).(js|jsx|ts|tsx)'],
      testEnvironment: 'jest-environment-jsdom'
    },
    {
      displayName: 'integration', 
      testMatch: ['<rootDir>/__tests__/integration/**/*.(test|spec).(js|jsx|ts|tsx)'],
      testEnvironment: 'jest-environment-node'
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/__tests__/e2e/**/*.(test|spec).(js|jsx|ts|tsx)'],
      testEnvironment: 'jest-environment-node'
    }
  ],
  // Test timeout for async operations
  testTimeout: 30000,
  // Global setup for test database
  globalSetup: '<rootDir>/__tests__/setup/global-setup.js',
  globalTeardown: '<rootDir>/__tests__/setup/global-teardown.js'
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
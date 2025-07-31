# EGDC OAuth + Multi-Tenant System - Testing Documentation

## Overview

This document describes the comprehensive testing infrastructure established for the EGDC OAuth + Multi-Tenant system, focusing on security validation and bug prevention for the authentication and tenant isolation features.

## Test Architecture

### Test Categories

1. **Unit Tests** (`__tests__/unit/`)
   - Individual component and function testing
   - Authentication configuration testing
   - Tenant utilities validation
   - Database security configuration

2. **Integration Tests** (`__tests__/integration/`)
   - Database Row Level Security (RLS) testing
   - Complete authentication flow testing
   - API security validation
   - Middleware security integration

3. **End-to-End Tests** (`__tests__/e2e/`)
   - Complete user journey testing
   - Multi-tenant onboarding flows
   - Cross-tenant isolation validation

## Security Test Coverage

### Priority 1: Authentication Flow Testing ✅

- **OAuth Authentication Workflow**
  - Google OAuth token validation
  - JWT token generation and parsing
  - Session creation and management
  - Tenant mapping on first login

- **Multi-Tenant Session Management**
  - Tenant context isolation
  - Cross-tenant access prevention
  - Session-to-tenant validation
  - Tenant-specific redirects

- **Database Authentication**
  - RLS context setting verification
  - Tenant creation workflow validation
  - User-tenant mapping security

### Priority 2: Security Vulnerability Prevention ✅

- **Authentication Bypass Prevention**
  - Environment-specific security enforcement
  - Production security validation
  - Middleware authentication checks

- **Tenant Isolation Verification**
  - Cross-tenant data access prevention
  - Row Level Security policy testing
  - API endpoint tenant validation

- **Input Validation & SQL Injection Prevention**
  - Parameterized query validation
  - Malicious input sanitization
  - Path traversal prevention

### Priority 3: Integration & Performance ✅

- **Complete User Journey Testing**
  - New user registration flows
  - Existing user authentication
  - Multi-tenant dashboard access
  - Concurrent user handling

- **API Security Validation**
  - Tenant-scoped API access
  - Unauthorized access prevention
  - Rate limiting verification
  - CORS and security headers

## Test Infrastructure

### Configuration

```javascript
// jest.config.js
- Multi-environment support (jsdom, node)
- Coverage thresholds (85% statements, 70% branches)
- Separate test projects (unit, integration, e2e)
- Global setup and teardown
```

### Database Testing

```typescript
// __tests__/utils/database-setup.ts
- Test database initialization
- RLS policy testing
- Transaction isolation
- Data cleanup utilities
```

### Mock Data

```typescript
// __tests__/fixtures/test-data.ts
- Comprehensive test fixtures
- User and tenant mock data
- JWT token mocks
- Error scenario data
```

## Running Tests

### Local Development

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:e2e

# Run security-focused tests
npm run test:auth
npm run test:tenant

# Watch mode for development
npm run test:watch
```

### Environment Setup

```bash
# Copy test environment file
cp .env.test.example .env.test

# Required test environment variables
NODE_ENV=test
NEXTAUTH_SECRET=test-secret-key
DATABASE_URL=postgres://test:test@localhost:5432/egdc_test
GOOGLE_CLIENT_ID=test-google-client-id
GOOGLE_CLIENT_SECRET=test-google-client-secret
```

### Test Database Setup

```sql
-- Create test database
CREATE DATABASE egdc_test;

-- Setup test schema
CREATE SCHEMA test_schema;
SET search_path TO test_schema, public;

-- Enable RLS for testing
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
```

## Continuous Integration

### GitHub Actions Workflow

The CI pipeline (`/.github/workflows/test.yml`) includes:

- **Matrix Testing**: Node.js 18.x and 20.x
- **Database Setup**: PostgreSQL test instance
- **Sequential Test Execution**:
  1. Unit tests
  2. Integration tests  
  3. E2E tests
  4. Security tests
- **Coverage Reporting**: Codecov integration
- **Security Audit**: npm audit + security-focused tests
- **Performance Testing**: Memory and execution time validation

### Coverage Requirements

- **Statements**: 85% minimum
- **Branches**: 70% minimum  
- **Functions**: 70% minimum
- **Lines**: 70% minimum

### Test Reports

Automated generation of:
- HTML test reports (`__test-reports__/test-report.html`)
- Coverage reports (`coverage/lcov-report/`)
- CI/CD compatible outputs
- PR comment summaries

## Test Structure

### Key Test Files

```
__tests__/
├── unit/
│   ├── auth-config.test.ts          # OAuth & JWT testing
│   ├── tenant-utils.test.ts         # Tenant validation
│   ├── middleware.test.ts           # Middleware security
│   └── database-security.test.ts    # Database config security
├── integration/
│   ├── auth-flow.test.ts            # Complete auth flows
│   ├── database-rls.test.ts         # RLS integration
│   ├── api-security.test.ts         # API endpoint security
│   └── middleware-security.test.ts  # Full middleware testing
├── e2e/
│   └── user-journey.test.ts         # End-to-end workflows
├── fixtures/
│   └── test-data.ts                 # Mock data & fixtures
├── utils/
│   ├── auth-test-helpers.ts         # Auth testing utilities
│   ├── database-setup.ts            # Test DB management
│   └── test-runner.ts               # Comprehensive test runner
└── setup/
    ├── global-setup.js              # Test environment setup
    └── global-teardown.js           # Cleanup
```

## Security Test Scenarios

### Authentication Security

- ✅ OAuth provider validation
- ✅ Token expiration handling
- ✅ Session hijacking prevention
- ✅ Cross-site request forgery (CSRF) protection
- ✅ SQL injection prevention
- ✅ XSS attack prevention

### Multi-Tenant Security

- ✅ Tenant data isolation
- ✅ Cross-tenant access prevention
- ✅ RLS policy enforcement
- ✅ API endpoint tenant validation
- ✅ URL manipulation protection
- ✅ Session tenant consistency

### Infrastructure Security

- ✅ Database connection security
- ✅ Environment variable validation
- ✅ SSL/TLS enforcement
- ✅ Security header implementation
- ✅ Rate limiting validation
- ✅ Input sanitization

## Debugging Tests

### Running Individual Tests

```bash
# Run specific test file
npx jest __tests__/unit/auth-config.test.ts --verbose

# Run specific test case
npx jest --testNamePattern="should create tenant and user" --verbose

# Debug mode
npx jest --runInBand --detectOpenHandles --verbose
```

### Common Issues

1. **Database Connection Issues**
   ```bash
   # Check PostgreSQL is running
   pg_isready -h localhost -p 5432 -U postgres
   
   # Verify test database exists  
   psql -h localhost -U postgres -l | grep egdc_test
   ```

2. **Environment Variables**
   ```bash
   # Verify test environment
   npm run test -- --verbose --detectOpenHandles
   ```

3. **Memory Leaks**
   ```bash
   # Check for open handles
   npx jest --detectOpenHandles --forceExit
   ```

## Production Readiness Validation

### Deployment Checklist

- ✅ All tests passing (100% pass rate)
- ✅ Coverage thresholds met (>85% statements)
- ✅ Security tests validated
- ✅ Performance benchmarks met
- ✅ No memory leaks detected
- ✅ Database connections properly closed
- ✅ Error handling verified
- ✅ Cross-tenant isolation confirmed

### Pre-Deployment Testing

```bash
# Run comprehensive test suite
npm run test:coverage

# Generate deployment report
npx tsx __tests__/utils/test-runner.ts

# Validate security specifically
npx jest __tests__/integration/api-security.test.ts --verbose
```

## Monitoring & Maintenance

### Test Maintenance

- **Daily**: Automated test runs via CI/CD
- **Weekly**: Coverage report review
- **Monthly**: Test data cleanup and fixture updates
- **Per Release**: Full security test validation

### Performance Monitoring

- Test execution time tracking
- Memory usage validation
- Database connection pooling verification
- Concurrent request handling validation

## Contact & Support

For questions about the testing infrastructure:
- Review test documentation in individual test files
- Check CI/CD pipeline logs for detailed error information
- Validate local environment setup matches CI configuration

---

**Test Coverage Status**: ✅ All critical authentication and multi-tenant security paths covered  
**Last Updated**: January 2025  
**Test Suite Version**: 1.0.0
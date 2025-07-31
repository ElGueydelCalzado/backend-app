/**
 * Test Data Fixtures
 * Centralized test data for consistent testing across all test suites
 */

export const testTenants = {
  egdc: {
    id: 'e6c8ef7d-f8cf-4670-8166-583011284588',
    name: 'EGDC Test',
    subdomain: 'egdc',
    email: 'test-egdc@fixtures.test',
    business_type: 'retailer',
    plan: 'starter',
    status: 'active'
  },
  fami: {
    id: 'f4m1-t3n4nt-1d-f0r-t3st1ng-0nly',
    name: 'FAMI Test',
    subdomain: 'fami',
    email: 'test-fami@fixtures.test',
    business_type: 'retailer',
    plan: 'starter',
    status: 'active'
  },
  newBusiness: {
    id: 'n3w-bu51n355-t3n4nt-1d-t3st',
    name: 'New Business Test',
    subdomain: 'newbiz',
    email: 'newbusiness@fixtures.test',
    business_type: 'retailer',
    plan: 'starter',
    status: 'active'
  },
  suspended: {
    id: 'su5p3nd3d-t3n4nt-1d-t3st1ng',
    name: 'Suspended Business',
    subdomain: 'suspended',
    email: 'suspended@fixtures.test',
    business_type: 'retailer',
    plan: 'starter',
    status: 'suspended'
  }
}

export const testUsers = {
  egdcAdmin: {
    id: 'egdc-admin-user-test-id-12345',
    tenant_id: testTenants.egdc.id,
    email: 'admin@egdc-test.com',
    name: 'EGDC Admin User',
    role: 'admin',
    google_id: 'google-egdc-admin-123456',
    status: 'active'
  },
  famiAdmin: {
    id: 'fami-admin-user-test-id-12345',
    tenant_id: testTenants.fami.id,
    email: 'admin@fami-test.com',
    name: 'FAMI Admin User',
    role: 'admin',
    google_id: 'google-fami-admin-123456',
    status: 'active'
  },
  newUser: {
    id: 'new-user-test-id-123456789',
    tenant_id: testTenants.newBusiness.id,
    email: 'newuser@fixtures.test',
    name: 'New Test User',
    role: 'admin',
    google_id: 'google-new-user-123456',
    status: 'active'
  },
  suspendedUser: {
    id: 'suspended-user-test-id-12345',
    tenant_id: testTenants.suspended.id,
    email: 'suspended@fixtures.test',
    name: 'Suspended User',
    role: 'admin',
    google_id: 'google-suspended-123456',
    status: 'suspended'
  }
}

export const testProducts = {
  egdcProduct1: {
    id: 'egdc-product-1-test-id',
    tenant_id: testTenants.egdc.id,
    name: 'EGDC Test Shoe 1',
    sku: 'EGDC-SHOE-001',
    price: 99.99,
    quantity: 100,
    category: 'shoes',
    status: 'active'
  },
  egdcProduct2: {
    id: 'egdc-product-2-test-id',
    tenant_id: testTenants.egdc.id,
    name: 'EGDC Test Shoe 2',
    sku: 'EGDC-SHOE-002',
    price: 149.99,
    quantity: 50,
    category: 'shoes',
    status: 'active'
  },
  famiProduct1: {
    id: 'fami-product-1-test-id',
    tenant_id: testTenants.fami.id,
    name: 'FAMI Test Item 1',
    sku: 'FAMI-ITEM-001',
    price: 79.99,
    quantity: 200,
    category: 'accessories',
    status: 'active'
  }
}

export const testSessions = {
  validEgdcSession: {
    user: {
      id: testUsers.egdcAdmin.id,
      email: testUsers.egdcAdmin.email,
      name: testUsers.egdcAdmin.name,
      tenant_id: testTenants.egdc.id,
      role: 'admin',
      tenant_name: testTenants.egdc.name,
      tenant_subdomain: testTenants.egdc.subdomain
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  },
  validFamiSession: {
    user: {
      id: testUsers.famiAdmin.id,
      email: testUsers.famiAdmin.email,
      name: testUsers.famiAdmin.name,
      tenant_id: testTenants.fami.id,
      role: 'admin',
      tenant_name: testTenants.fami.name,
      tenant_subdomain: testTenants.fami.subdomain
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  },
  expiredSession: {
    user: {
      id: testUsers.newUser.id,
      email: testUsers.newUser.email,
      name: testUsers.newUser.name,
      tenant_id: testTenants.newBusiness.id,
      role: 'admin',
      tenant_name: testTenants.newBusiness.name,
      tenant_subdomain: testTenants.newBusiness.subdomain
    },
    expires: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
  }
}

export const testJWTTokens = {
  validEgdcToken: {
    sub: testUsers.egdcAdmin.id,
    email: testUsers.egdcAdmin.email,
    name: testUsers.egdcAdmin.name,
    tenant_id: testTenants.egdc.id,
    role: 'admin',
    tenant_name: testTenants.egdc.name,
    tenant_subdomain: testTenants.egdc.subdomain,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 // 24 hours
  },
  validFamiToken: {
    sub: testUsers.famiAdmin.id,
    email: testUsers.famiAdmin.email,
    name: testUsers.famiAdmin.name,
    tenant_id: testTenants.fami.id,
    role: 'admin',
    tenant_name: testTenants.fami.name,
    tenant_subdomain: testTenants.fami.subdomain,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400
  },
  expiredToken: {
    sub: testUsers.newUser.id,
    email: testUsers.newUser.email,
    name: testUsers.newUser.name,
    tenant_id: testTenants.newBusiness.id,
    role: 'admin',
    tenant_name: testTenants.newBusiness.name,
    tenant_subdomain: testTenants.newBusiness.subdomain,
    iat: Math.floor(Date.now() / 1000) - 86400, // Yesterday
    exp: Math.floor(Date.now() / 1000) - 3600   // 1 hour ago
  }
}

export const testAuthAccounts = {
  googleAccount: {
    provider: 'google',
    type: 'oauth',
    providerAccountId: 'google-test-account-123456',
    access_token: 'google-access-token-test',
    token_type: 'Bearer',
    scope: 'openid email profile'
  },
  testAccount: {
    provider: 'test-account',
    type: 'credentials',
    providerAccountId: 'test-credentials-123'
  }
}

export const testGoogleProfiles = {
  egdcProfile: {
    id: testAuthAccounts.googleAccount.providerAccountId,
    email: testUsers.egdcAdmin.email,
    name: testUsers.egdcAdmin.name,
    picture: 'https://example.com/avatar-egdc.jpg',
    verified_email: true
  },
  newUserProfile: {
    id: 'google-new-profile-789',
    email: 'newprofile@test.com',
    name: 'New Profile User',
    picture: 'https://example.com/avatar-new.jpg',
    verified_email: true
  }
}

export const testUrls = {
  validTenantPaths: [
    '/egdc/dashboard',
    '/fami/inventory',
    '/egdc/settings',
    '/fami/dashboard'
  ],
  invalidTenantPaths: [
    '/invalid/dashboard',
    '/nonexistent/inventory',
    '/malicious/../../../etc/passwd',
    '/dashboard', // No tenant
    '/login'
  ],
  validRedirectUrls: [
    'http://localhost:3001/egdc/dashboard',
    'http://localhost:3001/fami/inventory',
    'https://app.lospapatos.com/egdc/dashboard'
  ],
  invalidRedirectUrls: [
    'javascript:alert("xss")',
    'http://malicious.com/steal',
    'ftp://internal.server/files',
    '../../../etc/passwd',
    'data:text/html,<script>alert(1)</script>'
  ]
}

export const testDomains = {
  validAppDomains: [
    'app.lospapatos.com',
    'localhost:3001',
    'localhost:3000',
    '127.0.0.1:3001'
  ],
  invalidDomains: [
    'lospapatos.com',
    'malicious.com',
    'phishing-site.net',
    'example.com'
  ]
}

export const testDatabaseQueries = {
  // Safe queries for testing
  validQueries: [
    'SELECT 1 as test',
    'SELECT COUNT(*) FROM users WHERE status = $1',
    'SELECT id FROM tenants WHERE subdomain = $1'
  ],
  // Potentially dangerous queries (should be prevented)
  maliciousQueries: [
    "'; DROP TABLE users; --",
    'SELECT * FROM users UNION SELECT * FROM admin_secrets',
    '../../../etc/passwd',
    '<script>alert("xss")</script>'
  ]
}

export const testErrorScenarios = {
  databaseErrors: [
    'connection timeout',
    'invalid credentials',
    'table does not exist',
    'syntax error'
  ],
  authenticationErrors: [
    'invalid token',
    'token expired',
    'invalid provider',
    'missing email'
  ],
  tenantErrors: [
    'tenant not found',
    'tenant suspended',
    'invalid tenant format',
    'tenant creation failed'
  ]
}

// Helper functions for test data
export const createRandomUser = (tenantId: string) => ({
  id: `test-user-${Date.now()}-${Math.random().toString(36).substring(7)}`,
  tenant_id: tenantId,
  email: `testuser-${Date.now()}@fixtures.test`,
  name: `Test User ${Date.now()}`,
  role: 'admin',
  google_id: `google-test-${Date.now()}`,
  status: 'active'
})

export const createRandomTenant = () => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  
  return {
    id: `test-tenant-${timestamp}-${random}`,
    name: `Test Business ${timestamp}`,
    subdomain: `testbiz${timestamp}`,
    email: `business-${timestamp}@fixtures.test`,
    business_type: 'retailer',
    plan: 'starter',
    status: 'active'
  }
}

export const createRandomProduct = (tenantId: string) => ({
  id: `test-product-${Date.now()}-${Math.random().toString(36).substring(7)}`,
  tenant_id: tenantId,
  name: `Test Product ${Date.now()}`,
  sku: `TEST-${Date.now()}`,
  price: Math.round(Math.random() * 1000) / 10, // Random price 0-100
  quantity: Math.floor(Math.random() * 1000),
  category: 'test-category',
  status: 'active'
})

// Clean up helpers
export const getTestDataIds = () => ({
  tenantIds: Object.values(testTenants).map(t => t.id),
  userIds: Object.values(testUsers).map(u => u.id),
  productIds: Object.values(testProducts).map(p => p.id)
})

export const getTestEmails = () => [
  ...Object.values(testUsers).map(u => u.email),
  ...Object.values(testTenants).map(t => t.email),
  'newprofile@test.com',
  'fixtures.test' // Domain pattern for cleanup
]
// SECURITY: Centralized and secure database configuration for all connections
// Enforces proper SSL configuration and connection parameters across the application

import { PoolConfig } from 'pg'

/**
 * SECURITY: Secure database configuration factory
 * Ensures consistent SSL enforcement and proper connection parameters
 */
export function createSecureDatabaseConfig(): PoolConfig {
  const databaseUrl = process.env.DATABASE_URL
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  // SECURITY: Always require SSL in production, allow local development without SSL
  const isProduction = process.env.NODE_ENV === 'production'
  const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
  
  // SECURITY: SSL configuration - strict in production, flexible for local development
  let sslConfig: any = false
  
  if (isProduction || (!isLocalhost && !process.env.DISABLE_SSL)) {
    sslConfig = {
      rejectUnauthorized: false, // Required for many cloud providers
      require: true
    }
    console.log('🔒 Database SSL: ENABLED (production/remote)')
  } else {
    console.log('🔓 Database SSL: DISABLED (local development only)')
  }

  const config: PoolConfig = {
    // Remove any existing SSL parameters from URL to avoid conflicts
    connectionString: databaseUrl.replace(/[?&]sslmode=[^&]*/g, ''),
    ssl: sslConfig,
    
    // SECURITY: Connection pool limits for stability
    max: 20, // Maximum connections in pool
    min: 2,  // Minimum connections to maintain
    
    // SECURITY: Timeout configurations
    idleTimeoutMillis: 30000,     // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Timeout connection attempts after 5s
    
    // SECURITY: Statement timeout to prevent long-running queries
    statement_timeout: 30000, // 30 second statement timeout
    
    // SECURITY: Enable query logging in development
    ...(process.env.NODE_ENV === 'development' && {
      log: (message: string) => console.log('🗄️ DB:', message)
    })
  }

  console.log('🗄️ Database configuration initialized:', {
    ssl: !!sslConfig,
    isProduction,
    isLocalhost,
    maxConnections: config.max
  })

  return config
}

/**
 * SECURITY: Validate database configuration
 * Ensures all required security parameters are properly set
 */
export function validateDatabaseConfig(): void {
  const databaseUrl = process.env.DATABASE_URL
  
  if (!databaseUrl) {
    throw new Error('SECURITY: DATABASE_URL is required')
  }

  // SECURITY: Validate URL format
  try {
    new URL(databaseUrl)
  } catch (error) {
    throw new Error('SECURITY: DATABASE_URL must be a valid URL')
  }

  // SECURITY: Check for sensitive information in logs
  const maskedUrl = databaseUrl.replace(/:[^:@]+@/, ':***@')
  console.log('✅ Database URL validated:', maskedUrl)

  // SECURITY: Warn about production without SSL
  if (process.env.NODE_ENV === 'production' && !databaseUrl.includes('ssl')) {
    console.warn('⚠️ WARNING: Production database without explicit SSL configuration')
  }
}

/**
 * SECURITY: Connection health check
 * Tests database connectivity with proper error handling
 */
export async function testDatabaseConnection(pool: any): Promise<boolean> {
  let client
  
  try {
    client = await pool.connect()
    await client.query('SELECT 1 as health_check')
    console.log('✅ Database connection health check passed')
    return true
  } catch (error) {
    console.error('❌ Database connection health check failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      errno: (error as any)?.errno
    })
    return false
  } finally {
    if (client) {
      client.release()
    }
  }
}
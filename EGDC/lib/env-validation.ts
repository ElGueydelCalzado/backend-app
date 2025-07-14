// Environment variable validation for production
function validateEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const config = {
  DATABASE_URL: validateEnvVar('DATABASE_URL'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_SECRET_KEY: validateEnvVar('API_SECRET_KEY'),
  JWT_SECRET: validateEnvVar('JWT_SECRET'),
  ENCRYPTION_KEY: validateEnvVar('ENCRYPTION_KEY'),
}

// Validate database URL format
if (!config.DATABASE_URL.includes('sslmode=require')) {
  console.warn('⚠️ Database URL should include sslmode=require for production')
}

// Validate encryption key length
if (config.ENCRYPTION_KEY.length < 32) {
  throw new Error('ENCRYPTION_KEY must be at least 32 characters long')
}

console.log('✅ Environment validation passed')
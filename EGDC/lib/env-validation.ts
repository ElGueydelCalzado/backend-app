/**
 * COMPREHENSIVE ENVIRONMENT VARIABLE VALIDATION
 * Ensures all critical authentication and database variables are properly configured
 */

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

interface EnvironmentConfig {
  // Database
  DATABASE_URL: string
  
  // NextAuth
  NEXTAUTH_SECRET: string
  NEXTAUTH_URL?: string
  
  // Google OAuth
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  
  // Security
  API_SECRET_KEY?: string
  JWT_SECRET?: string
  ENCRYPTION_KEY?: string
  
  // Environment
  NODE_ENV: string
  VERCEL_ENV?: string
}

function validateRequired(name: string, description?: string): string {
  const value = process.env[name]
  if (!value || value.trim() === '') {
    throw new Error(`❌ Missing required environment variable: ${name}${description ? ` (${description})` : ''}`)
  }
  return value.trim()
}

function validateOptional(name: string, defaultValue?: string): string | undefined {
  const value = process.env[name]
  return value?.trim() || defaultValue
}

function validateUrl(url: string, name: string): ValidationResult {
  const result: ValidationResult = { isValid: true, errors: [], warnings: [] }
  
  try {
    new URL(url)
  } catch {
    result.isValid = false
    result.errors.push(`${name} is not a valid URL: ${url}`)
  }
  
  return result
}

function validateDatabaseUrl(url: string): ValidationResult {
  const result: ValidationResult = { isValid: true, errors: [], warnings: [] }
  
  if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
    result.errors.push('DATABASE_URL must be a PostgreSQL connection string')
    result.isValid = false
  }
  
  if (process.env.NODE_ENV === 'production' && !url.includes('sslmode=require')) {
    result.warnings.push('DATABASE_URL should include sslmode=require for production security')
  }
  
  return result
}

function validateSecretLength(secret: string, name: string, minLength: number = 32): ValidationResult {
  const result: ValidationResult = { isValid: true, errors: [], warnings: [] }
  
  if (secret.length < minLength) {
    result.errors.push(`${name} must be at least ${minLength} characters long (current: ${secret.length})`)
    result.isValid = false
  }
  
  if (secret.length < 64) {
    result.warnings.push(`${name} should be at least 64 characters for better security`)
  }
  
  return result
}

export function validateEnvironment(): { config: EnvironmentConfig; validation: ValidationResult } {
  console.log('🔍 Starting comprehensive environment validation...')
  
  const validation: ValidationResult = { isValid: true, errors: [], warnings: [] }
  
  try {
    // Required variables
    const DATABASE_URL = validateRequired('DATABASE_URL', 'PostgreSQL connection string')
    const NEXTAUTH_SECRET = validateRequired('NEXTAUTH_SECRET', 'NextAuth.js secret key')
    const GOOGLE_CLIENT_ID = validateRequired('GOOGLE_CLIENT_ID', 'Google OAuth client ID')
    const GOOGLE_CLIENT_SECRET = validateRequired('GOOGLE_CLIENT_SECRET', 'Google OAuth client secret')
    
    // Optional variables
    const NODE_ENV = validateOptional('NODE_ENV', 'development')!
    const VERCEL_ENV = validateOptional('VERCEL_ENV')
    const NEXTAUTH_URL = validateOptional('NEXTAUTH_URL')
    const API_SECRET_KEY = validateOptional('API_SECRET_KEY')
    const JWT_SECRET = validateOptional('JWT_SECRET')
    const ENCRYPTION_KEY = validateOptional('ENCRYPTION_KEY')
    
    const config: EnvironmentConfig = {
      DATABASE_URL,
      NEXTAUTH_SECRET,
      NEXTAUTH_URL,
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      API_SECRET_KEY,
      JWT_SECRET,
      ENCRYPTION_KEY,
      NODE_ENV,
      VERCEL_ENV
    }
    
    // Validate database URL
    const dbValidation = validateDatabaseUrl(DATABASE_URL)
    validation.errors.push(...dbValidation.errors)
    validation.warnings.push(...dbValidation.warnings)
    if (!dbValidation.isValid) validation.isValid = false
    
    // Validate NEXTAUTH_SECRET
    const authSecretValidation = validateSecretLength(NEXTAUTH_SECRET, 'NEXTAUTH_SECRET')
    validation.errors.push(...authSecretValidation.errors)
    validation.warnings.push(...authSecretValidation.warnings)
    if (!authSecretValidation.isValid) validation.isValid = false
    
    // Validate NEXTAUTH_URL if provided
    if (NEXTAUTH_URL) {
      const nextAuthUrlValidation = validateUrl(NEXTAUTH_URL, 'NEXTAUTH_URL')
      validation.errors.push(...nextAuthUrlValidation.errors)
      validation.warnings.push(...nextAuthUrlValidation.warnings)
      if (!nextAuthUrlValidation.isValid) validation.isValid = false
    }
    
    // Validate Google OAuth credentials
    if (GOOGLE_CLIENT_ID.length < 10) {
      validation.errors.push('GOOGLE_CLIENT_ID appears to be invalid (too short)')
      validation.isValid = false
    }
    
    if (GOOGLE_CLIENT_SECRET.length < 10) {
      validation.errors.push('GOOGLE_CLIENT_SECRET appears to be invalid (too short)')
      validation.isValid = false
    }
    
    // Validate optional security keys - only warn, don't fail
    if (ENCRYPTION_KEY) {
      const encryptionValidation = validateSecretLength(ENCRYPTION_KEY, 'ENCRYPTION_KEY', 32)
      // Convert errors to warnings for optional keys
      validation.warnings.push(...encryptionValidation.errors)
      validation.warnings.push(...encryptionValidation.warnings)
      // Don't fail validation for optional keys
    }
    
    // Environment-specific validations
    if (NODE_ENV === 'production') {
      if (!NEXTAUTH_URL) {
        validation.warnings.push('NEXTAUTH_URL should be set in production for better security')
      }
      
      if (!API_SECRET_KEY) {
        validation.warnings.push('API_SECRET_KEY should be set in production')
      }
    }
    
    // Log validation results
    if (validation.errors.length > 0) {
      console.error('❌ Environment validation failed:')
      validation.errors.forEach(error => console.error(`   ${error}`))
    }
    
    if (validation.warnings.length > 0) {
      console.warn('⚠️ Environment validation warnings:')
      validation.warnings.forEach(warning => console.warn(`   ${warning}`))
    }
    
    if (validation.isValid) {
      console.log('✅ Environment validation passed successfully')
      console.log(`🌍 Environment: ${NODE_ENV}${VERCEL_ENV ? ` (${VERCEL_ENV})` : ''}`)
    }
    
    return { config, validation }
    
  } catch (error) {
    validation.isValid = false
    validation.errors.push(`Critical validation error: ${error.message}`)
    
    console.error('💥 Critical environment validation error:', error.message)
    
    return { 
      config: {} as EnvironmentConfig, 
      validation 
    }
  }
}

// Lazy validation - only run when explicitly requested
let cachedValidation: { config: EnvironmentConfig; validation: ValidationResult } | null = null

export function getValidatedEnvironment(): { config: EnvironmentConfig; validation: ValidationResult } {
  if (!cachedValidation) {
    cachedValidation = validateEnvironment()
    
    // Warn in production if environment has issues, but don't fail hard
    if (process.env.NODE_ENV === 'production' && !cachedValidation.validation.isValid) {
      console.error('💥 CRITICAL: Environment validation failed in production')
      console.error('Application will start but may have limited functionality')
      // Don't exit - let the app start with warnings
    }
  }
  
  return cachedValidation
}

// Export lazy getters for backward compatibility
export const config = new Proxy({} as EnvironmentConfig, {
  get(target, prop) {
    return getValidatedEnvironment().config[prop as keyof EnvironmentConfig]
  }
})

export const validation = new Proxy({} as ValidationResult, {
  get(target, prop) {
    return getValidatedEnvironment().validation[prop as keyof ValidationResult]
  }
})
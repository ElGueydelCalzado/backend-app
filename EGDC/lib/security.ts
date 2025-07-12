/**
 * Security utilities for EGDC application
 */

import crypto from 'crypto'
import { NextRequest } from 'next/server'

// Security configuration
export const SECURITY_CONFIG = {
  // Rate limiting
  RATE_LIMIT: {
    MAX_REQUESTS: 100,
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  },
  
  // Input validation
  INPUT_VALIDATION: {
    MAX_STRING_LENGTH: 255,
    MAX_NUMBER_VALUE: 999999999,
    ALLOWED_CATEGORIES: [
      'Zapatos', 'Botas', 'Sandalias', 'Deportivos', 'Formales', 'Casuales'
    ],
    ALLOWED_PLATFORMS: [
      'shein', 'meli', 'shopify', 'tiktok', 'upseller', 'go_trendier'
    ]
  },
  
  // Session configuration
  SESSION: {
    COOKIE_NAME: 'egdc-session',
    MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
    SECURE: process.env.NODE_ENV === 'production',
    HTTP_ONLY: true,
    SAME_SITE: 'strict' as const
  }
}

// Rate limiting store (in-memory for development, use Redis for production)
const rateLimit = new Map<string, { count: number; resetTime: number }>()

/**
 * Rate limiting middleware
 */
export function checkRateLimit(request: NextRequest): boolean {
  const ip = getClientIP(request)
  const now = Date.now()
  const key = `rate_limit:${ip}`
  
  // Clean expired entries
  for (const [k, v] of rateLimit.entries()) {
    if (now > v.resetTime) {
      rateLimit.delete(k)
    }
  }
  
  const current = rateLimit.get(key)
  
  if (!current) {
    rateLimit.set(key, {
      count: 1,
      resetTime: now + SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS
    })
    return true
  }
  
  if (now > current.resetTime) {
    rateLimit.set(key, {
      count: 1,
      resetTime: now + SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS
    })
    return true
  }
  
  if (current.count >= SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS) {
    return false
  }
  
  current.count++
  return true
}

/**
 * Get client IP address
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (real) {
    return real
  }
  
  return 'unknown'
}

/**
 * Validate input data
 */
export function validateInput(data: any, type: 'product' | 'update' | 'filter'): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid input data'] }
  }
  
  switch (type) {
    case 'product':
      return validateProductInput(data)
    case 'update':
      return validateUpdateInput(data)
    case 'filter':
      return validateFilterInput(data)
    default:
      return { valid: false, errors: ['Invalid validation type'] }
  }
}

/**
 * Validate product input
 */
function validateProductInput(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Required fields
  if (!data.categoria || typeof data.categoria !== 'string') {
    errors.push('Category is required and must be a string')
  } else if (data.categoria.length > SECURITY_CONFIG.INPUT_VALIDATION.MAX_STRING_LENGTH) {
    errors.push('Category is too long')
  }
  
  if (!data.marca || typeof data.marca !== 'string') {
    errors.push('Brand is required and must be a string')
  } else if (data.marca.length > SECURITY_CONFIG.INPUT_VALIDATION.MAX_STRING_LENGTH) {
    errors.push('Brand is too long')
  }
  
  if (!data.modelo || typeof data.modelo !== 'string') {
    errors.push('Model is required and must be a string')
  } else if (data.modelo.length > SECURITY_CONFIG.INPUT_VALIDATION.MAX_STRING_LENGTH) {
    errors.push('Model is too long')
  }
  
  // Validate cost if provided
  if (data.costo !== undefined && data.costo !== null) {
    if (typeof data.costo !== 'number' || data.costo < 0) {
      errors.push('Cost must be a positive number')
    } else if (data.costo > SECURITY_CONFIG.INPUT_VALIDATION.MAX_NUMBER_VALUE) {
      errors.push('Cost is too large')
    }
  }
  
  // Validate inventory fields (4 locations)
  const inventoryFields = [
    'inv_egdc', 'inv_fami', 'inv_osiel', 'inv_molly'
  ]
  
  for (const field of inventoryFields) {
    if (data[field] !== undefined && data[field] !== null) {
      if (typeof data[field] !== 'number' || data[field] < 0) {
        errors.push(`${field} must be a non-negative number`)
      } else if (data[field] > SECURITY_CONFIG.INPUT_VALIDATION.MAX_NUMBER_VALUE) {
        errors.push(`${field} is too large`)
      }
    }
  }
  
  // Validate platform flags
  for (const platform of SECURITY_CONFIG.INPUT_VALIDATION.ALLOWED_PLATFORMS) {
    if (data[platform] !== undefined && typeof data[platform] !== 'boolean') {
      errors.push(`${platform} must be a boolean value`)
    }
  }
  
  return { valid: errors.length === 0, errors }
}

/**
 * Validate update input
 */
function validateUpdateInput(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!data.changes || !Array.isArray(data.changes)) {
    errors.push('Changes must be an array')
    return { valid: false, errors }
  }
  
  if (data.changes.length === 0) {
    errors.push('At least one change is required')
  }
  
  if (data.changes.length > 100) {
    errors.push('Too many changes in single request')
  }
  
  for (let i = 0; i < data.changes.length; i++) {
    const change = data.changes[i]
    
    if (!change.id || typeof change.id !== 'number') {
      errors.push(`Change ${i + 1}: ID is required and must be a number`)
    }
    
    // Validate individual field updates
    const productValidation = validateProductInput(change)
    if (!productValidation.valid) {
      errors.push(...productValidation.errors.map(e => `Change ${i + 1}: ${e}`))
    }
  }
  
  return { valid: errors.length === 0, errors }
}

/**
 * Validate filter input
 */
function validateFilterInput(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (data.search && typeof data.search !== 'string') {
    errors.push('Search must be a string')
  } else if (data.search && data.search.length > SECURITY_CONFIG.INPUT_VALIDATION.MAX_STRING_LENGTH) {
    errors.push('Search term is too long')
  }
  
  if (data.categories && !Array.isArray(data.categories)) {
    errors.push('Categories must be an array')
  }
  
  if (data.brands && !Array.isArray(data.brands)) {
    errors.push('Brands must be an array')
  }
  
  if (data.models && !Array.isArray(data.models)) {
    errors.push('Models must be an array')
  }
  
  return { valid: errors.length === 0, errors }
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return ''
  
  return input
    .trim()
    .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
    .slice(0, SECURITY_CONFIG.INPUT_VALIDATION.MAX_STRING_LENGTH)
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Hash password or sensitive data
 */
export function hashData(data: string, salt?: string): string {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(data, actualSalt, 10000, 64, 'sha512').toString('hex')
  return `${actualSalt}:${hash}`
}

/**
 * Verify hashed data
 */
export function verifyHash(data: string, hash: string): boolean {
  const [salt, originalHash] = hash.split(':')
  const verifyHash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex')
  return originalHash === verifyHash
}

/**
 * Log security event
 */
export function logSecurityEvent(
  event: string,
  ip: string,
  details?: Record<string, any>
): void {
  const timestamp = new Date().toISOString()
  
  console.log(`[SECURITY] ${timestamp} - ${event} from ${ip}`, details || {})
  
  // In production, you might want to send this to a logging service
  // or store in a dedicated security log table
}

/**
 * Check if request is from allowed origin
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const allowedOrigins = [
    'http://localhost:3000',
    'https://your-production-domain.com'
  ]
  
  if (!origin) {
    // Allow requests without origin (like from server-side or mobile apps)
    return true
  }
  
  return allowedOrigins.includes(origin)
}

/**
 * Add security headers to response
 */
export function addSecurityHeaders(headers: Headers): void {
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('X-XSS-Protection', '1; mode=block')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  
  if (process.env.NODE_ENV === 'production') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
}
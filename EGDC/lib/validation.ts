import { NextResponse } from 'next/server'

export interface ApiError {
  success: false
  error: string
  code: string
  details?: string
  timestamp: string
}

export interface ApiSuccess<T = any> {
  success: true
  data: T
  message?: string
  timestamp: string
}

export type ApiResponse<T = any> = ApiSuccess<T> | ApiError

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function createErrorResponse(
  error: string,
  code: string,
  status: number = 400,
  details?: string
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      success: false,
      error,
      code,
      details,
      timestamp: new Date().toISOString()
    },
    { status }
  )
}

export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    },
    { status }
  )
}

export function validateRequired(value: any, fieldName: string): void {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError(`${fieldName} is required`, fieldName)
  }
}

export function validateString(value: any, fieldName: string, options: {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
} = {}): void {
  if (options.required && (value === null || value === undefined || value === '')) {
    throw new ValidationError(`${fieldName} is required`, fieldName)
  }

  if (value !== null && value !== undefined && value !== '') {
    if (typeof value !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, fieldName)
    }

    if (options.minLength && value.length < options.minLength) {
      throw new ValidationError(`${fieldName} must be at least ${options.minLength} characters`, fieldName)
    }

    if (options.maxLength && value.length > options.maxLength) {
      throw new ValidationError(`${fieldName} must be no more than ${options.maxLength} characters`, fieldName)
    }

    if (options.pattern && !options.pattern.test(value)) {
      throw new ValidationError(`${fieldName} format is invalid`, fieldName)
    }
  }
}

export function validateNumber(value: any, fieldName: string, options: {
  required?: boolean
  min?: number
  max?: number
  integer?: boolean
} = {}): void {
  if (options.required && (value === null || value === undefined)) {
    throw new ValidationError(`${fieldName} is required`, fieldName)
  }

  if (value !== null && value !== undefined) {
    const num = typeof value === 'string' ? parseFloat(value) : value

    if (isNaN(num) || typeof num !== 'number') {
      throw new ValidationError(`${fieldName} must be a valid number`, fieldName)
    }

    if (options.integer && !Number.isInteger(num)) {
      throw new ValidationError(`${fieldName} must be an integer`, fieldName)
    }

    if (options.min !== undefined && num < options.min) {
      throw new ValidationError(`${fieldName} must be at least ${options.min}`, fieldName)
    }

    if (options.max !== undefined && num > options.max) {
      throw new ValidationError(`${fieldName} must be no more than ${options.max}`, fieldName)
    }
  }
}

export function validateArray(value: any, fieldName: string, options: {
  required?: boolean
  minLength?: number
  maxLength?: number
} = {}): void {
  if (options.required && (!value || !Array.isArray(value))) {
    throw new ValidationError(`${fieldName} is required and must be an array`, fieldName)
  }

  if (value && Array.isArray(value)) {
    if (options.minLength && value.length < options.minLength) {
      throw new ValidationError(`${fieldName} must contain at least ${options.minLength} items`, fieldName)
    }

    if (options.maxLength && value.length > options.maxLength) {
      throw new ValidationError(`${fieldName} must contain no more than ${options.maxLength} items`, fieldName)
    }
  }
}

export function validateProductChange(change: any): void {
  if (!change || typeof change !== 'object') {
    throw new ValidationError('Change must be an object')
  }

  // Validate required ID
  validateNumber(change.id, 'id', { required: true, integer: true, min: 1 })

  // Validate string fields
  validateString(change.categoria, 'categoria', { maxLength: 100 })
  validateString(change.marca, 'marca', { maxLength: 100 })
  validateString(change.modelo, 'modelo', { maxLength: 100 })
  validateString(change.color, 'color', { maxLength: 50 })
  validateString(change.talla, 'talla', { maxLength: 20 })
  validateString(change.sku, 'sku', { maxLength: 50 })
  validateString(change.ean, 'ean', { maxLength: 50, pattern: /^[0-9]*$/ })

  // Validate numeric fields
  validateNumber(change.costo, 'costo', { min: 0, max: 999999 })
  validateNumber(change.shein_modifier, 'shein_modifier', { min: 0, max: 10 })
  validateNumber(change.shopify_modifier, 'shopify_modifier', { min: 0, max: 10 })
  validateNumber(change.meli_modifier, 'meli_modifier', { min: 0, max: 10 })

  // Validate dimension fields (must be positive if provided)
  validateNumber(change.height_cm, 'height_cm', { min: 0.1, max: 100 })
  validateNumber(change.length_cm, 'length_cm', { min: 0.1, max: 150 })
  validateNumber(change.thickness_cm, 'thickness_cm', { min: 0.1, max: 50 })
  validateNumber(change.weight_grams, 'weight_grams', { min: 1, max: 10000, integer: true })

  // Validate inventory fields (must be non-negative integers)
  validateNumber(change.inv_egdc, 'inv_egdc', { min: 0, max: 999999, integer: true })
  validateNumber(change.inv_fami, 'inv_fami', { min: 0, max: 999999, integer: true })
  validateNumber(change.inv_osiel, 'inv_osiel', { min: 0, max: 999999, integer: true })
  validateNumber(change.inv_molly, 'inv_molly', { min: 0, max: 999999, integer: true })
}

export function sanitizeString(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return value || null
  
  // Remove potentially dangerous characters and trim
  return value
    .trim()
    .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Remove control characters
    .substring(0, 1000) // Limit length
}
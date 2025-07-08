/**
 * Security middleware for EGDC API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  checkRateLimit, 
  validateOrigin, 
  addSecurityHeaders, 
  logSecurityEvent, 
  getClientIP 
} from './security'

/**
 * Security middleware wrapper for API routes
 */
export function withSecurity(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const ip = getClientIP(request)
    const method = request.method
    const url = request.url
    
    try {
      // 1. Check rate limiting
      if (!checkRateLimit(request)) {
        logSecurityEvent('RATE_LIMIT_EXCEEDED', ip, { method, url })
        return NextResponse.json(
          { 
            success: false, 
            error: 'Rate limit exceeded. Please try again later.' 
          },
          { status: 429 }
        )
      }
      
      // 2. Validate origin for non-GET requests
      if (method !== 'GET' && !validateOrigin(request)) {
        logSecurityEvent('INVALID_ORIGIN', ip, { 
          method, 
          url, 
          origin: request.headers.get('origin') 
        })
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid origin' 
          },
          { status: 403 }
        )
      }
      
      // 3. Check Content-Type for POST requests
      if (method === 'POST') {
        const contentType = request.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          logSecurityEvent('INVALID_CONTENT_TYPE', ip, { 
            method, 
            url, 
            contentType 
          })
          return NextResponse.json(
            { 
              success: false, 
              error: 'Invalid content type. Expected application/json' 
            },
            { status: 400 }
          )
        }
      }
      
      // 4. Log request
      logSecurityEvent('API_REQUEST', ip, { method, url })
      
      // 5. Execute the handler
      const response = await handler(request)
      
      // 6. Add security headers
      addSecurityHeaders(response.headers)
      
      return response
      
    } catch (error) {
      // Log security-related errors
      logSecurityEvent('API_ERROR', ip, { 
        method, 
        url, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Internal server error' 
        },
        { status: 500 }
      )
    }
  }
}

/**
 * CORS middleware for API routes
 */
export function withCORS(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 })
      
      response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      response.headers.set('Access-Control-Max-Age', '86400')
      
      return response
    }
    
    // Execute handler
    const response = await handler(request)
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    
    return response
  }
}

/**
 * Combined security and CORS middleware
 */
export function withSecurityAndCORS(handler: (request: NextRequest) => Promise<NextResponse>) {
  return withSecurity(withCORS(handler))
}

/**
 * Input validation middleware
 */
export function withInputValidation(
  handler: (request: NextRequest) => Promise<NextResponse>,
  validationType: 'product' | 'update' | 'filter'
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    if (request.method === 'POST') {
      try {
        const body = await request.json()
        const { validateInput } = await import('./security')
        
        const validation = validateInput(body, validationType)
        
        if (!validation.valid) {
          const ip = getClientIP(request)
          logSecurityEvent('VALIDATION_FAILED', ip, { 
            errors: validation.errors,
            body: JSON.stringify(body).substring(0, 200) 
          })
          
          return NextResponse.json(
            { 
              success: false, 
              error: 'Invalid input data',
              details: validation.errors 
            },
            { status: 400 }
          )
        }
        
        // Create a new request with validated body
        const newRequest = new NextRequest(request.url, {
          method: request.method,
          headers: request.headers,
          body: JSON.stringify(body)
        })
        
        return handler(newRequest)
        
      } catch (error) {
        const ip = getClientIP(request)
        logSecurityEvent('JSON_PARSE_ERROR', ip, { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid JSON payload' 
          },
          { status: 400 }
        )
      }
    }
    
    return handler(request)
  }
}

/**
 * Authentication middleware (for future implementation)
 */
export function withAuth(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // For now, just pass through
    // In the future, you can implement JWT or session-based authentication
    
    const authHeader = request.headers.get('authorization')
    
    if (authHeader) {
      // TODO: Implement authentication logic
      // - Verify JWT token
      // - Check user permissions
      // - Add user context to request
    }
    
    return handler(request)
  }
}

/**
 * Complete security middleware stack
 */
export function secureEndpoint(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: {
    validationType?: 'product' | 'update' | 'filter'
    requireAuth?: boolean
  } = {}
) {
  let securedHandler = handler
  
  // Apply middleware in reverse order (last applied runs first)
  if (options.requireAuth) {
    securedHandler = withAuth(securedHandler)
  }
  
  if (options.validationType) {
    securedHandler = withInputValidation(securedHandler, options.validationType)
  }
  
  securedHandler = withSecurityAndCORS(securedHandler)
  
  return securedHandler
}
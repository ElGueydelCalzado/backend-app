/**
 * ENTERPRISE API GATEWAY
 * 
 * Features:
 * - Rate limiting with Redis-backed counters
 * - Authentication and authorization
 * - Request routing and load balancing
 * - Comprehensive logging and monitoring
 * - Circuit breaker pattern for fault tolerance
 * - Request/response transformation
 * - Multi-tenant API management
 */

import { performanceMonitor } from '@/lib/performance-monitor'
import { securityMonitor } from '@/lib/monitoring'
import { rateLimiter } from '@/lib/rate-limiting'

interface APIRoute {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  handler: string
  rateLimit?: {
    requests: number
    window: number // seconds
    skipSuccessfulRequests?: boolean
  }
  auth?: {
    required: boolean
    roles?: string[]
    scopes?: string[]
  }
  cache?: {
    ttl: number // seconds
    keyGenerator?: (req: any) => string
  }
  transformation?: {
    request?: (data: any) => any
    response?: (data: any) => any
  }
  circuitBreaker?: {
    failureThreshold: number
    resetTimeout: number
  }
}

interface GatewayConfig {
  routes: APIRoute[]
  globalRateLimit?: {
    requests: number
    window: number
  }
  cors?: {
    origin: string[]
    methods: string[]
    headers: string[]
  }
  logging?: {
    level: 'debug' | 'info' | 'warn' | 'error'
    includeBody: boolean
    includeHeaders: boolean
  }
}

interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
  failureCount: number
  lastFailureTime: number
  nextAttemptTime: number
}

export class APIGateway {
  private routes: Map<string, APIRoute> = new Map()
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map()
  private responseCache: Map<string, { data: any; expires: number }> = new Map()
  private config: GatewayConfig

  constructor(config: GatewayConfig) {
    this.config = config
    this.initializeRoutes()
    console.log('🌐 API Gateway initialized with', config.routes.length, 'routes')
  }

  /**
   * Initialize routes
   */
  private initializeRoutes(): void {
    for (const route of this.config.routes) {
      const key = `${route.method}:${route.path}`
      this.routes.set(key, route)
      
      // Initialize circuit breaker
      if (route.circuitBreaker) {
        this.circuitBreakers.set(key, {
          state: 'CLOSED',
          failureCount: 0,
          lastFailureTime: 0,
          nextAttemptTime: 0
        })
      }
    }
  }

  /**
   * Process incoming request
   */
  async processRequest(req: {
    method: string
    path: string
    headers: Record<string, string>
    body?: any
    query?: Record<string, string>
    user?: any
    ip: string
  }): Promise<{
    status: number
    headers: Record<string, string>
    body: any
  }> {
    const startTime = Date.now()
    const requestId = this.generateRequestId()
    
    try {
      // Log incoming request
      this.logRequest(requestId, req)

      // CORS preflight
      if (req.method === 'OPTIONS') {
        return this.handleCorsPreflightRequest()
      }

      // Find matching route
      const route = this.findRoute(req.method, req.path)
      if (!route) {
        return this.createErrorResponse(404, 'Route not found')
      }

      // Check circuit breaker
      const circuitBreakerKey = `${req.method}:${route.path}`
      if (!(await this.checkCircuitBreaker(circuitBreakerKey))) {
        return this.createErrorResponse(503, 'Service temporarily unavailable')
      }

      // Apply global rate limiting
      if (this.config.globalRateLimit) {
        const globalLimitResult = await this.checkRateLimit(
          `global:${req.ip}`,
          this.config.globalRateLimit.requests,
          this.config.globalRateLimit.window
        )
        
        if (!globalLimitResult.allowed) {
          return this.createRateLimitResponse(globalLimitResult)
        }
      }

      // Apply route-specific rate limiting
      if (route.rateLimit) {
        const routeLimitKey = `route:${circuitBreakerKey}:${req.ip}`
        const routeLimitResult = await this.checkRateLimit(
          routeLimitKey,
          route.rateLimit.requests,
          route.rateLimit.window
        )
        
        if (!routeLimitResult.allowed) {
          return this.createRateLimitResponse(routeLimitResult)
        }
      }

      // Authentication and authorization
      if (route.auth?.required) {
        const authResult = await this.authenticateRequest(req, route.auth)
        if (!authResult.success) {
          return this.createErrorResponse(401, authResult.error || 'Unauthorized')
        }
        req.user = authResult.user
      }

      // Check cache
      if (route.cache && req.method === 'GET') {
        const cacheKey = route.cache.keyGenerator ? 
          route.cache.keyGenerator(req) : 
          `${circuitBreakerKey}:${JSON.stringify(req.query)}`
        
        const cachedResponse = this.getFromCache(cacheKey)
        if (cachedResponse) {
          this.logResponse(requestId, { status: 200, cached: true }, Date.now() - startTime)
          return {
            status: 200,
            headers: this.getCorsHeaders(),
            body: cachedResponse
          }
        }
      }

      // Transform request
      let transformedBody = req.body
      if (route.transformation?.request) {
        transformedBody = route.transformation.request(req.body)
      }

      // Execute handler
      const handlerResult = await this.executeHandler(route.handler, {
        ...req,
        body: transformedBody
      })

      // Record circuit breaker success
      this.recordCircuitBreakerSuccess(circuitBreakerKey)

      // Transform response
      let responseBody = handlerResult.body
      if (route.transformation?.response) {
        responseBody = route.transformation.response(handlerResult.body)
      }

      // Cache response
      if (route.cache && req.method === 'GET' && handlerResult.status === 200) {
        const cacheKey = route.cache.keyGenerator ? 
          route.cache.keyGenerator(req) : 
          `${circuitBreakerKey}:${JSON.stringify(req.query)}`
        
        this.setCache(cacheKey, responseBody, route.cache.ttl)
      }

      const responseTime = Date.now() - startTime
      this.logResponse(requestId, handlerResult, responseTime)
      
      // Record performance metrics
      performanceMonitor.recordRequest(responseTime, handlerResult.status >= 400)

      return {
        status: handlerResult.status,
        headers: {
          ...handlerResult.headers,
          ...this.getCorsHeaders(),
          'X-Request-ID': requestId,
          'X-Response-Time': `${responseTime}ms`
        },
        body: responseBody
      }

    } catch (error) {
      const responseTime = Date.now() - startTime
      
      // Record circuit breaker failure
      const route = this.findRoute(req.method, req.path)
      if (route) {
        this.recordCircuitBreakerFailure(`${req.method}:${route.path}`)
      }

      // Log error
      console.error(`❌ API Gateway error for request ${requestId}:`, error)
      securityMonitor.logEvent({
        type: 'error',
        ip: req.ip,
        endpoint: req.path,
        details: { error: error instanceof Error ? error.message : 'Unknown error', requestId }
      })

      // Record performance metrics
      performanceMonitor.recordRequest(responseTime, true)

      return this.createErrorResponse(500, 'Internal server error')
    }
  }

  /**
   * Find matching route
   */
  private findRoute(method: string, path: string): APIRoute | null {
    // Direct match
    const directKey = `${method}:${path}`
    if (this.routes.has(directKey)) {
      return this.routes.get(directKey)!
    }

    // Pattern matching for dynamic routes
    for (const [routeKey, route] of this.routes) {
      if (routeKey.startsWith(`${method}:`)) {
        const routePath = routeKey.substring(method.length + 1)
        if (this.matchPath(routePath, path)) {
          return route
        }
      }
    }

    return null
  }

  /**
   * Match path with parameters
   */
  private matchPath(pattern: string, path: string): boolean {
    const patternParts = pattern.split('/')
    const pathParts = path.split('/')

    if (patternParts.length !== pathParts.length) {
      return false
    }

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i]
      const pathPart = pathParts[i]

      if (patternPart.startsWith(':')) {
        // Dynamic parameter, matches any value
        continue
      }

      if (patternPart !== pathPart) {
        return false
      }
    }

    return true
  }

  /**
   * Check rate limit
   */
  private async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    try {
      return await rateLimiter.checkLimit(key, limit, windowSeconds)
    } catch (error) {
      console.error('❌ Rate limiting error:', error)
      // Fail open - allow request if rate limiter is unavailable
      return { allowed: true, remaining: limit, resetTime: Date.now() + windowSeconds * 1000 }
    }
  }

  /**
   * Check circuit breaker state
   */
  private async checkCircuitBreaker(key: string): Promise<boolean> {
    const circuitBreaker = this.circuitBreakers.get(key)
    if (!circuitBreaker) return true

    const now = Date.now()

    switch (circuitBreaker.state) {
      case 'CLOSED':
        return true

      case 'OPEN':
        if (now >= circuitBreaker.nextAttemptTime) {
          circuitBreaker.state = 'HALF_OPEN'
          return true
        }
        return false

      case 'HALF_OPEN':
        return true

      default:
        return true
    }
  }

  /**
   * Record circuit breaker success
   */
  private recordCircuitBreakerSuccess(key: string): void {
    const circuitBreaker = this.circuitBreakers.get(key)
    if (!circuitBreaker) return

    if (circuitBreaker.state === 'HALF_OPEN') {
      circuitBreaker.state = 'CLOSED'
      circuitBreaker.failureCount = 0
    }
  }

  /**
   * Record circuit breaker failure
   */
  private recordCircuitBreakerFailure(key: string): void {
    const circuitBreaker = this.circuitBreakers.get(key)
    if (!circuitBreaker) return

    const route = this.routes.get(key)
    if (!route?.circuitBreaker) return

    circuitBreaker.failureCount++
    circuitBreaker.lastFailureTime = Date.now()

    if (circuitBreaker.failureCount >= route.circuitBreaker.failureThreshold) {
      circuitBreaker.state = 'OPEN'
      circuitBreaker.nextAttemptTime = Date.now() + route.circuitBreaker.resetTimeout * 1000
    }
  }

  /**
   * Authenticate request
   */
  private async authenticateRequest(
    req: any,
    authConfig: NonNullable<APIRoute['auth']>
  ): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const authHeader = req.headers.authorization
      if (!authHeader) {
        return { success: false, error: 'Missing authorization header' }
      }

      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        
        // Validate JWT token (implement your JWT validation logic)
        const user = await this.validateJWTToken(token)
        if (!user) {
          return { success: false, error: 'Invalid token' }
        }

        // Check roles
        if (authConfig.roles && authConfig.roles.length > 0) {
          const hasRequiredRole = authConfig.roles.some(role => user.roles?.includes(role))
          if (!hasRequiredRole) {
            return { success: false, error: 'Insufficient permissions' }
          }
        }

        // Check scopes
        if (authConfig.scopes && authConfig.scopes.length > 0) {
          const hasRequiredScope = authConfig.scopes.some(scope => user.scopes?.includes(scope))
          if (!hasRequiredScope) {
            return { success: false, error: 'Insufficient scopes' }
          }
        }

        return { success: true, user }
      }

      return { success: false, error: 'Unsupported authentication method' }
    } catch (error) {
      return { success: false, error: 'Authentication failed' }
    }
  }

  /**
   * Validate JWT token (placeholder - implement with your JWT library)
   */
  private async validateJWTToken(token: string): Promise<any> {
    // Implement JWT validation logic
    // This is a placeholder - replace with actual JWT verification
    try {
      // Mock validation for now
      if (token === 'valid-token') {
        return {
          id: 'user-123',
          email: 'user@example.com',
          roles: ['user'],
          scopes: ['read', 'write']
        }
      }
      return null
    } catch (error) {
      return null
    }
  }

  /**
   * Execute handler
   */
  private async executeHandler(
    handlerName: string,
    req: any
  ): Promise<{ status: number; headers: Record<string, string>; body: any }> {
    // This is where you would route to your actual API handlers
    // For now, we'll simulate different responses based on the handler name
    
    switch (handlerName) {
      case 'marketplace.sync':
        return {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: { success: true, message: 'Marketplace sync initiated' }
        }
      
      case 'inventory.list':
        return {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: { success: true, data: [], total: 0 }
        }
      
      case 'payments.process':
        return {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: { success: true, payment_id: 'pay_123' }
        }
      
      default:
        return {
          status: 501,
          headers: { 'Content-Type': 'application/json' },
          body: { success: false, error: 'Handler not implemented' }
        }
    }
  }

  /**
   * Cache operations
   */
  private getFromCache(key: string): any | null {
    const cached = this.responseCache.get(key)
    if (cached && cached.expires > Date.now()) {
      return cached.data
    }
    this.responseCache.delete(key)
    return null
  }

  private setCache(key: string, data: any, ttlSeconds: number): void {
    this.responseCache.set(key, {
      data,
      expires: Date.now() + ttlSeconds * 1000
    })
  }

  /**
   * Response helpers
   */
  private createErrorResponse(status: number, message: string): {
    status: number
    headers: Record<string, string>
    body: any
  } {
    return {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...this.getCorsHeaders()
      },
      body: {
        success: false,
        error: message,
        timestamp: new Date().toISOString()
      }
    }
  }

  private createRateLimitResponse(limitResult: { remaining: number; resetTime: number }): {
    status: number
    headers: Record<string, string>
    body: any
  } {
    return {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': limitResult.remaining.toString(),
        'X-RateLimit-Reset': limitResult.resetTime.toString(),
        'Retry-After': Math.ceil((limitResult.resetTime - Date.now()) / 1000).toString(),
        ...this.getCorsHeaders()
      },
      body: {
        success: false,
        error: 'Rate limit exceeded',
        remaining: limitResult.remaining,
        resetTime: limitResult.resetTime
      }
    }
  }

  private handleCorsPreflightRequest(): {
    status: number
    headers: Record<string, string>
    body: any
  } {
    return {
      status: 200,
      headers: this.getCorsHeaders(),
      body: null
    }
  }

  private getCorsHeaders(): Record<string, string> {
    if (!this.config.cors) return {}

    return {
      'Access-Control-Allow-Origin': this.config.cors.origin.join(', '),
      'Access-Control-Allow-Methods': this.config.cors.methods.join(', '),
      'Access-Control-Allow-Headers': this.config.cors.headers.join(', '),
      'Access-Control-Max-Age': '86400'
    }
  }

  /**
   * Logging
   */
  private logRequest(requestId: string, req: any): void {
    if (this.config.logging?.level === 'debug' || this.config.logging?.level === 'info') {
      const logData: any = {
        requestId,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      }

      if (this.config.logging?.includeHeaders) {
        logData.headers = req.headers
      }

      if (this.config.logging?.includeBody && req.body) {
        logData.body = req.body
      }

      console.log('📥 API Gateway Request:', JSON.stringify(logData))
    }
  }

  private logResponse(requestId: string, response: any, responseTime: number): void {
    if (this.config.logging?.level === 'debug' || this.config.logging?.level === 'info') {
      const logData: any = {
        requestId,
        status: response.status,
        responseTime: `${responseTime}ms`,
        cached: response.cached || false,
        timestamp: new Date().toISOString()
      }

      if (this.config.logging?.includeHeaders && response.headers) {
        logData.headers = response.headers
      }

      if (this.config.logging?.includeBody && response.body) {
        logData.body = response.body
      }

      console.log('📤 API Gateway Response:', JSON.stringify(logData))
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get gateway health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'error'
    routes: number
    circuitBreakers: {
      open: number
      halfOpen: number
      closed: number
    }
    cache: {
      size: number
    }
  } {
    const circuitBreakerStats = {
      open: 0,
      halfOpen: 0,
      closed: 0
    }

    for (const cb of this.circuitBreakers.values()) {
      switch (cb.state) {
        case 'OPEN':
          circuitBreakerStats.open++
          break
        case 'HALF_OPEN':
          circuitBreakerStats.halfOpen++
          break
        case 'CLOSED':
          circuitBreakerStats.closed++
          break
      }
    }

    const status = circuitBreakerStats.open > 0 ? 'error' :
                   circuitBreakerStats.halfOpen > 0 ? 'warning' : 'healthy'

    return {
      status,
      routes: this.routes.size,
      circuitBreakers: circuitBreakerStats,
      cache: {
        size: this.responseCache.size
      }
    }
  }
}

// Export factory function
export function createAPIGateway(config: GatewayConfig): APIGateway {
  return new APIGateway(config)
}

// Default configuration for EGDC marketplace integrations
export const defaultGatewayConfig: GatewayConfig = {
  routes: [
    {
      path: '/api/marketplace/sync',
      method: 'POST',
      handler: 'marketplace.sync',
      rateLimit: { requests: 10, window: 60 },
      auth: { required: true, roles: ['admin', 'manager'] },
      circuitBreaker: { failureThreshold: 5, resetTimeout: 30 }
    },
    {
      path: '/api/inventory',
      method: 'GET',
      handler: 'inventory.list',
      rateLimit: { requests: 100, window: 60 },
      auth: { required: true },
      cache: { ttl: 300 }
    },
    {
      path: '/api/payments/process',
      method: 'POST',
      handler: 'payments.process',
      rateLimit: { requests: 20, window: 60 },
      auth: { required: true, scopes: ['payments:write'] },
      circuitBreaker: { failureThreshold: 3, resetTimeout: 60 }
    }
  ],
  globalRateLimit: { requests: 1000, window: 60 },
  cors: {
    origin: ['http://localhost:3000', 'https://egdc.vercel.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers: ['Authorization', 'Content-Type', 'X-Requested-With']
  },
  logging: {
    level: 'info',
    includeBody: false,
    includeHeaders: false
  }
}
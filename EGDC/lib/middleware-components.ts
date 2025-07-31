/**
 * SCALABILITY: Refactored Middleware Architecture Components
 * Target: <10ms middleware processing time (down from 300+ line monolithic middleware)
 * 
 * Phase 2 Implementation: Middleware Architecture Optimization
 * Split monolithic middleware into focused, cacheable components
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { tenantCache, getTenantFromCache } from './tenant-redis-cache'
import { performanceMonitor, recordRequest } from './performance-monitor'

export interface MiddlewareContext {
  tenant?: string
  tenantId?: string
  isAuthenticated: boolean
  token?: any
  hostname: string
  pathname: string
  startTime: number
}

export interface MiddlewareResult {
  action: 'continue' | 'redirect' | 'rewrite'
  response?: NextResponse
  context?: MiddlewareContext
  headers?: Record<string, string>
  processingTime: number
}

/**
 * SCALABILITY: Fast Tenant Resolution Component
 * Target: <5ms tenant resolution with cache-first strategy
 */
export class TenantResolver {
  private static cache = new Map<string, { tenant: string | null; expires: number }>()
  private static readonly CACHE_TTL = 30000 // 30 seconds in-memory cache
  
  static async resolve(hostname: string, pathname: string): Promise<{
    tenant: string | null
    tenantId: string | null
    isValidTenant: boolean
    processingTime: number
  }> {
    const startTime = Date.now()
    const cacheKey = `${hostname}:${pathname}`
    
    try {
      // Level 1: In-memory cache (fastest)
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() < cached.expires) {
        return {
          tenant: cached.tenant,
          tenantId: cached.tenant ? `${cached.tenant}-id` : null,
          isValidTenant: !!cached.tenant,
          processingTime: Date.now() - startTime
        }
      }
      
      // Level 2: Extract from path
      const tenant = this.extractTenantFromPath(pathname)
      
      if (tenant) {
        // Level 3: Validate with Redis cache
        const tenantData = await getTenantFromCache(tenant)
        
        if (tenantData) {
          // Cache successful resolution
          this.cache.set(cacheKey, { tenant, expires: Date.now() + this.CACHE_TTL })
          
          return {
            tenant,
            tenantId: tenantData.tenant_id,
            isValidTenant: true,
            processingTime: Date.now() - startTime
          }
        }
      }
      
      // Cache negative result to avoid repeated lookups
      this.cache.set(cacheKey, { tenant: null, expires: Date.now() + this.CACHE_TTL })
      
      return {
        tenant: null,
        tenantId: null,
        isValidTenant: false,
        processingTime: Date.now() - startTime
      }
      
    } catch (error) {
      console.error('❌ Error in tenant resolution:', error)
      return {
        tenant: null,
        tenantId: null,
        isValidTenant: false,
        processingTime: Date.now() - startTime
      }
    }
  }
  
  private static extractTenantFromPath(pathname: string): string | null {
    if (!pathname || typeof pathname !== 'string') return null
    
    const pathParts = pathname.split('/').filter(Boolean)
    if (pathParts.length === 0) return null
    
    const tenantCandidate = pathParts[0].toLowerCase()
    
    // Quick validation - basic tenant naming rules
    if (tenantCandidate.length < 2 || tenantCandidate.length > 50) return null
    if (!/^[a-z0-9-]+$/.test(tenantCandidate)) return null
    
    return tenantCandidate
  }
  
  static clearCache(): void {
    this.cache.clear()
  }
  
  static getCacheStats(): { size: number; hitRate: number } {
    // This would need to be implemented with hit/miss tracking
    return { size: this.cache.size, hitRate: 0 }
  }
}

/**
 * SCALABILITY: Optimized Authentication Component
 * Target: <5ms authentication check with token caching
 */
export class AuthenticationManager {
  private static tokenCache = new Map<string, { token: any; expires: number }>()
  private static readonly TOKEN_CACHE_TTL = 60000 // 1 minute cache
  
  static async authenticate(request: NextRequest): Promise<{
    isAuthenticated: boolean
    token: any
    processingTime: number
  }> {
    const startTime = Date.now()
    
    try {
      // Check cache first for recently authenticated tokens
      const cacheKey = this.getTokenCacheKey(request)
      const cached = this.tokenCache.get(cacheKey)
      
      if (cached && Date.now() < cached.expires) {
        return {
          isAuthenticated: !!cached.token,
          token: cached.token,
          processingTime: Date.now() - startTime
        }
      }
      
      // Get token with optimized cookie handling
      const token = await this.getOptimizedToken(request)
      
      // Cache the result
      this.tokenCache.set(cacheKey, {
        token,
        expires: Date.now() + this.TOKEN_CACHE_TTL
      })
      
      return {
        isAuthenticated: !!token,
        token,
        processingTime: Date.now() - startTime
      }
      
    } catch (error) {
      console.error('❌ Error in authentication:', error)
      return {
        isAuthenticated: false,
        token: null,
        processingTime: Date.now() - startTime
      }
    }
  }
  
  private static async getOptimizedToken(request: NextRequest): Promise<any> {
    const isProduction = process.env.NODE_ENV === 'production'
    
    // Try primary cookie name first
    let token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: 'next-auth.session-token',
      secureCookie: isProduction
    })
    
    // Fallback for production secure cookies
    if (!token && isProduction) {
      token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
        cookieName: '__Secure-next-auth.session-token',
        secureCookie: true
      })
    }
    
    // Development fallback
    if (!token && !isProduction) {
      token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
        secureCookie: false
      })
    }
    
    return token
  }
  
  private static getTokenCacheKey(request: NextRequest): string {
    // Create a cache key based on relevant cookie data
    const cookies = request.headers.get('cookie') || ''
    const sessionCookie = cookies.split(';').find(c => c.includes('next-auth.session-token'))
    return sessionCookie ? sessionCookie.split('=')[1]?.substring(0, 20) || 'no-token' : 'no-token'
  }
  
  static clearCache(): void {
    this.tokenCache.clear()
  }
}

/**
 * SCALABILITY: Request Router Component
 * Fast routing decisions based on domain and path patterns
 */
export class RequestRouter {
  private static routeCache = new Map<string, { route: string; expires: number }>()
  private static readonly ROUTE_CACHE_TTL = 300000 // 5 minutes
  
  static determineRoute(hostname: string, pathname: string): {
    route: 'app_domain' | 'main_domain' | 'unknown'
    isAppDomain: boolean
    processingTime: number
  } {
    const startTime = Date.now()
    const cacheKey = hostname
    
    // Check cache first
    const cached = this.routeCache.get(cacheKey)
    if (cached && Date.now() < cached.expires) {
      return {
        route: cached.route as any,
        isAppDomain: cached.route === 'app_domain',
        processingTime: Date.now() - startTime
      }
    }
    
    const cleanHostname = hostname.trim().toLowerCase()
    
    let route: 'app_domain' | 'main_domain' | 'unknown'
    
    if (cleanHostname === 'app.lospapatos.com' || 
        cleanHostname.includes('localhost') || 
        cleanHostname.includes('127.0.0.1')) {
      route = 'app_domain'
    } else if (cleanHostname === 'lospapatos.com' || 
               cleanHostname.includes('lospapatos.com')) {
      route = 'main_domain'
    } else {
      route = 'unknown'
    }
    
    // Cache the result
    this.routeCache.set(cacheKey, { route, expires: Date.now() + this.ROUTE_CACHE_TTL })
    
    return {
      route,
      isAppDomain: route === 'app_domain',
      processingTime: Date.now() - startTime
    }
  }
  
  static clearCache(): void {
    this.routeCache.clear()
  }
}

/**
 * SCALABILITY: Security Headers Component
 * Pre-built security headers for fast application
 */
export class SecurityHeadersManager {
  private static readonly SECURITY_HEADERS = {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' vercel.live; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob: vercel.com; " +
      "connect-src 'self' *.vercel.app *.google.com; " +
      "font-src 'self'; " +
      "frame-src 'self' vercel.live; " +
      "media-src 'self' blob:",
    'Permissions-Policy': 
      'geolocation=(), microphone=(), camera=(self), payment=(), usb=(), magnetometer=(), gyroscope=()'
  }
  
  static applyHeaders(response: NextResponse): NextResponse {
    for (const [header, value] of Object.entries(this.SECURITY_HEADERS)) {
      response.headers.set(header, value)
    }
    return response
  }
  
  static createSecureResponse(): NextResponse {
    const response = NextResponse.next()
    return this.applyHeaders(response)
  }
  
  static createRedirectWithHeaders(url: string | URL): NextResponse {
    const response = NextResponse.redirect(url)
    return this.applyHeaders(response)
  }
}

/**
 * SCALABILITY: Optimized Middleware Orchestrator
 * Coordinates all components with minimal overhead
 */
export class MiddlewareOrchestrator {
  static async process(request: NextRequest): Promise<MiddlewareResult> {
    const startTime = Date.now()
    const url = request.nextUrl.clone()
    const hostname = request.headers.get('host') || request.nextUrl.hostname
    
    try {
      // Step 1: Fast route determination
      const routeInfo = RequestRouter.determineRoute(hostname, url.pathname)
      
      // Step 2: Quick tenant resolution
      const tenantInfo = await TenantResolver.resolve(hostname, url.pathname)
      
      // Record tenant resolution performance
      if (tenantInfo.tenant) {
        performanceMonitor.recordTenantResolution(tenantInfo.tenant, tenantInfo.processingTime)
      }
      
      // Step 3: Handle different route types
      if (routeInfo.route === 'main_domain') {
        // Redirect main domain to app login
        const baseUrl = this.getBaseUrl(hostname)
        return {
          action: 'redirect',
          response: SecurityHeadersManager.createRedirectWithHeaders(`${baseUrl}/login`),
          processingTime: Date.now() - startTime
        }
      }
      
      if (!routeInfo.isAppDomain) {
        // Unknown domain - continue with security headers
        return {
          action: 'continue',
          response: SecurityHeadersManager.createSecureResponse(),
          processingTime: Date.now() - startTime
        }
      }
      
      // Step 4: Handle app domain routes
      if (url.pathname === '/login') {
        return await this.handleLoginRoute(request, hostname, startTime)
      }
      
      if (tenantInfo.isValidTenant) {
        return await this.handleTenantRoute(request, hostname, tenantInfo, startTime)
      }
      
      if (url.pathname === '/dashboard') {
        // Generic dashboard - let component handle routing
        const response = SecurityHeadersManager.createSecureResponse()
        response.headers.set('x-dashboard-mode', 'tenant-routing')
        
        return {
          action: 'continue',
          response,
          processingTime: Date.now() - startTime
        }
      }
      
      // Step 5: Fallback for app domain without tenant
      const baseUrl = this.getBaseUrl(hostname)
      return {
        action: 'redirect',
        response: SecurityHeadersManager.createRedirectWithHeaders(`${baseUrl}/login`),
        processingTime: Date.now() - startTime
      }
      
    } catch (error) {
      console.error('❌ Error in middleware orchestrator:', error)
      
      // Fallback response
      return {
        action: 'continue',
        response: SecurityHeadersManager.createSecureResponse(),
        processingTime: Date.now() - startTime
      }
    }
  }
  
  private static async handleLoginRoute(
    request: NextRequest,
    hostname: string,
    startTime: number
  ): Promise<MiddlewareResult> {
    const authInfo = await AuthenticationManager.authenticate(request)
    
    if (authInfo.isAuthenticated && authInfo.token?.tenant_subdomain) {
      const baseUrl = this.getBaseUrl(hostname)
      const tenantUrl = `${baseUrl}/${authInfo.token.tenant_subdomain}/dashboard`
      
      return {
        action: 'redirect',
        response: SecurityHeadersManager.createRedirectWithHeaders(tenantUrl),
        processingTime: Date.now() - startTime
      }
    }
    
    return {
      action: 'continue',
      response: SecurityHeadersManager.createSecureResponse(),
      processingTime: Date.now() - startTime
    }
  }
  
  private static async handleTenantRoute(
    request: NextRequest,
    hostname: string,
    tenantInfo: { tenant: string; tenantId: string | null },
    startTime: number
  ): Promise<MiddlewareResult> {
    const url = request.nextUrl.clone()
    
    // Skip auth for API auth routes
    if (url.pathname.startsWith('/api/auth')) {
      return {
        action: 'continue',
        response: SecurityHeadersManager.createSecureResponse(),
        processingTime: Date.now() - startTime
      }
    }
    
    const authInfo = await AuthenticationManager.authenticate(request)
    
    if (!authInfo.isAuthenticated) {
      const baseUrl = this.getBaseUrl(hostname)
      const loginUrl = new URL(`${baseUrl}/login`)
      loginUrl.searchParams.set('callbackUrl', `${baseUrl}/${tenantInfo.tenant}/dashboard`)
      
      return {
        action: 'redirect',
        response: SecurityHeadersManager.createRedirectWithHeaders(loginUrl),
        processingTime: Date.now() - startTime
      }
    }
    
    // Grant access with tenant context
    const response = SecurityHeadersManager.createSecureResponse()
    response.headers.set('x-tenant-path', tenantInfo.tenant)
    if (tenantInfo.tenantId) {
      response.headers.set('x-tenant-id', tenantInfo.tenantId)
    }
    
    return {
      action: 'continue',
      response,
      context: {
        tenant: tenantInfo.tenant,
        tenantId: tenantInfo.tenantId || undefined,
        isAuthenticated: true,
        token: authInfo.token,
        hostname,
        pathname: url.pathname,
        startTime
      },
      processingTime: Date.now() - startTime
    }
  }
  
  private static getBaseUrl(hostname: string): string {
    if (process.env.NODE_ENV === 'production') {
      return 'https://app.lospapatos.com'
    }
    return `http://${hostname}`
  }
}

/**
 * SCALABILITY: Middleware Analytics Component
 * Track performance and identify optimization opportunities
 */
export class MiddlewareAnalytics {
  private static metrics = {
    totalRequests: 0,
    processingTimes: [] as number[],
    routeStats: new Map<string, { count: number; totalTime: number }>(),
    errorCount: 0
  }
  
  static recordRequest(result: MiddlewareResult, route: string): void {
    this.metrics.totalRequests++
    this.metrics.processingTimes.push(result.processingTime)
    
    // Update route statistics
    const routeStat = this.metrics.routeStats.get(route) || { count: 0, totalTime: 0 }
    routeStat.count++
    routeStat.totalTime += result.processingTime
    this.metrics.routeStats.set(route, routeStat)
    
    // Keep only recent processing times
    if (this.metrics.processingTimes.length > 10000) {
      this.metrics.processingTimes = this.metrics.processingTimes.slice(-5000)
    }
    
    // Record in global performance monitor
    recordRequest(result.processingTime, false)
    
    // Alert on slow middleware
    if (result.processingTime > 50) {
      console.warn(`⚠️ Slow middleware processing: ${result.processingTime}ms for route ${route}`)
    }
  }
  
  static getStats(): {
    totalRequests: number
    averageProcessingTime: number
    p95ProcessingTime: number
    routeBreakdown: Array<{ route: string; count: number; averageTime: number }>
    errorRate: number
  } {
    const times = this.metrics.processingTimes
    const sortedTimes = [...times].sort((a, b) => a - b)
    
    const routeBreakdown = Array.from(this.metrics.routeStats.entries()).map(([route, stats]) => ({
      route,
      count: stats.count,
      averageTime: stats.totalTime / stats.count
    }))
    
    return {
      totalRequests: this.metrics.totalRequests,
      averageProcessingTime: times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0,
      p95ProcessingTime: sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0,
      routeBreakdown,
      errorRate: this.metrics.errorCount / this.metrics.totalRequests || 0
    }
  }
  
  static clearStats(): void {
    this.metrics.totalRequests = 0
    this.metrics.processingTimes.length = 0
    this.metrics.routeStats.clear()
    this.metrics.errorCount = 0
  }
}
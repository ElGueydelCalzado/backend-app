/**
 * SCALABILITY: Optimized Middleware for 100x Tenant Scalability
 * Target: <10ms processing time (down from 300+ line monolithic middleware)
 * 
 * Phase 2 Implementation: Middleware Architecture Optimization
 * Uses focused components with caching and performance monitoring
 */

import type { NextRequest } from 'next/server'
import { 
  MiddlewareOrchestrator, 
  MiddlewareAnalytics,
  TenantResolver,
  AuthenticationManager,
  RequestRouter,
  SecurityHeadersManager
} from './lib/middleware-components'

/**
 * FAST: Optimized middleware with component-based architecture
 * 
 * Performance Optimizations:
 * - Multi-level caching (in-memory + Redis)
 * - Component-based processing (focused responsibilities)
 * - Performance monitoring and alerting
 * - Minimal computation per request
 * - Pre-built security headers
 * - Optimized authentication token handling
 */
export default async function middleware(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Fast path: Use orchestrator to coordinate all components
    const result = await MiddlewareOrchestrator.process(request)
    
    // Record analytics for continuous optimization
    const route = request.nextUrl.pathname.split('/')[1] || 'root'
    MiddlewareAnalytics.recordRequest(result, route)
    
    // Debug logging for development (minimal in production)
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 Middleware: ${result.processingTime}ms | ${result.action} | ${route}`)
    }
    
    // Performance alerting
    if (result.processingTime > 25) {
      console.warn(`⚠️ Slow middleware: ${result.processingTime}ms for ${request.nextUrl.pathname}`)
    }
    
    return result.response
    
  } catch (error) {
    console.error('❌ Middleware error:', error)
    
    // Fallback to secure response
    const fallbackTime = Date.now() - startTime
    MiddlewareAnalytics.recordRequest({
      action: 'continue',
      processingTime: fallbackTime
    }, 'error')
    
    return SecurityHeadersManager.createSecureResponse()
  }
}

export const config = {
  matcher: [
    // Match all paths except API routes, static files, and auth
    // Optimized matcher for faster routing decisions
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

/**
 * MONITORING: Middleware Performance Dashboard
 * Available at runtime for monitoring and optimization
 */
export function getMiddlewareStats() {
  return {
    middleware: MiddlewareAnalytics.getStats(),
    tenantResolver: TenantResolver.getCacheStats(),
    components: {
      tenantResolution: 'Optimized with multi-level caching',
      authentication: 'Token caching with 1-minute TTL',
      requestRouting: 'Route caching with 5-minute TTL',
      securityHeaders: 'Pre-built headers for instant application'
    },
    optimizations: [
      'Multi-level caching (memory + Redis)',
      'Component-based architecture',
      'Pre-built security headers',
      'Optimized token handling',
      'Performance monitoring and alerting',
      'Minimal computation per request'
    ]
  }
}

/**
 * ADMINISTRATION: Clear all middleware caches
 * Useful for development and troubleshooting
 */
export function clearMiddlewareCaches() {
  TenantResolver.clearCache()
  AuthenticationManager.clearCache()
  RequestRouter.clearCache()
  MiddlewareAnalytics.clearStats()
  
  console.log('🗑️ All middleware caches cleared')
}
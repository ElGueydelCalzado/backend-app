#!/bin/bash

# EGDC Security Hardening Script
# This script implements production-ready security measures

echo "🔐 Implementing EGDC Security Hardening..."

PROJECT_ID="egdc-test"
INSTANCE_NAME="egdc-inventory-db"
REGION="us-central1"

echo "1️⃣ Configuring database security..."

# Remove open IP access and add specific ranges
echo "🌐 Updating database network access..."

# Get current IP for development access
CURRENT_IP=$(curl -s ifconfig.me 2>/dev/null || echo "UNKNOWN")
echo "📍 Current IP detected: $CURRENT_IP"

echo "⚠️  Manual steps required:"
echo ""
echo "🗄️ Google Cloud SQL Security:"
echo "  1. Go to: https://console.cloud.google.com/sql/instances/$INSTANCE_NAME/connections"
echo "  2. Remove: 0.0.0.0/0 (all IPs)"
echo "  3. Add authorized networks:"
echo "     - Name: Development"
echo "     - Network: $CURRENT_IP/32"
echo "     - Name: Vercel-US-East"
echo "     - Network: 76.76.19.0/24"
echo "     - Name: Vercel-US-West"  
echo "     - Network: 76.76.21.0/24"
echo ""
echo "🔒 SSL Configuration:"
echo "  1. Go to: Connections → SSL"
echo "  2. Ensure 'Require SSL' is enabled"
echo "  3. Download client certificates if needed"
echo ""
echo "🔑 User Security:"
echo "  1. Go to: Users tab"
echo "  2. Verify strong passwords are set"
echo "  3. Consider creating read-only users for reporting"

echo ""
echo "2️⃣ Application security measures..."

# Create security headers middleware
cat > ../middleware.ts << 'EOF'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Security headers
  const response = NextResponse.next()
  
  // HSTS - Force HTTPS
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // XSS Protection
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Content Security Policy
  response.headers.set('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' vercel.live; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob: vercel.com; " +
    "connect-src 'self' *.vercel.app *.google.com; " +
    "font-src 'self'"
  )
  
  // Permissions Policy
  response.headers.set('Permissions-Policy', 
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()'
  )
  
  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
EOF

echo "✅ Created security middleware"

# Create environment validation
cat > ../lib/env-validation.ts << 'EOF'
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
EOF

echo "✅ Created environment validation"

# Create rate limiting configuration
cat > ../lib/rate-limiting.ts << 'EOF'
// Enhanced rate limiting for production

import { NextRequest } from 'next/server'

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  skipSuccessfulRequests?: boolean
}

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function createRateLimit(config: RateLimitConfig) {
  return function rateLimit(request: NextRequest): boolean {
    const ip = getClientIP(request)
    const now = Date.now()
    const key = `${ip}:${request.nextUrl.pathname}`
    
    // Clean expired entries
    for (const [k, v] of rateLimitMap.entries()) {
      if (now > v.resetTime) {
        rateLimitMap.delete(k)
      }
    }
    
    const current = rateLimitMap.get(key)
    
    if (!current) {
      rateLimitMap.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      })
      return true
    }
    
    if (now > current.resetTime) {
      rateLimitMap.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      })
      return true
    }
    
    if (current.count >= config.maxRequests) {
      return false
    }
    
    current.count++
    return true
  }
}

function getClientIP(request: NextRequest): string {
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

// Pre-configured rate limits
export const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100 // 100 requests per window
})

export const strictRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10 // 10 requests per minute
})
EOF

echo "✅ Created enhanced rate limiting"

echo ""
echo "3️⃣ Monitoring and logging setup..."

# Create monitoring configuration
cat > ../lib/monitoring.ts << 'EOF'
// Production monitoring and logging

interface SecurityEvent {
  type: 'rate_limit' | 'auth_failure' | 'suspicious_activity' | 'error'
  ip: string
  userAgent?: string
  endpoint?: string
  details?: any
  timestamp: Date
}

class SecurityMonitor {
  private events: SecurityEvent[] = []
  
  logEvent(event: Omit<SecurityEvent, 'timestamp'>) {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date()
    }
    
    this.events.push(securityEvent)
    
    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔒 Security Event:', securityEvent)
    }
    
    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(securityEvent)
    }
    
    // Keep only last 1000 events in memory
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000)
    }
  }
  
  private async sendToMonitoring(event: SecurityEvent) {
    try {
      // Send to your monitoring service (Sentry, DataDog, etc.)
      // Example with console for now
      console.error('[SECURITY]', JSON.stringify(event))
    } catch (error) {
      console.error('Failed to send security event to monitoring:', error)
    }
  }
  
  getRecentEvents(hours: number = 24): SecurityEvent[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
    return this.events.filter(event => event.timestamp > cutoff)
  }
  
  getEventStats(hours: number = 24) {
    const events = this.getRecentEvents(hours)
    const stats = {
      total: events.length,
      byType: {} as Record<string, number>,
      topIPs: {} as Record<string, number>
    }
    
    events.forEach(event => {
      stats.byType[event.type] = (stats.byType[event.type] || 0) + 1
      stats.topIPs[event.ip] = (stats.topIPs[event.ip] || 0) + 1
    })
    
    return stats
  }
}

export const securityMonitor = new SecurityMonitor()

// Helper function to log security events
export function logSecurityEvent(
  type: SecurityEvent['type'],
  ip: string,
  details?: any
) {
  securityMonitor.logEvent({
    type,
    ip,
    details
  })
}
EOF

echo "✅ Created security monitoring"

echo ""
echo "🎯 Security hardening summary:"
echo "  ✅ Security headers middleware"
echo "  ✅ Environment validation"
echo "  ✅ Enhanced rate limiting"
echo "  ✅ Security monitoring and logging"
echo ""
echo "📋 Manual steps required:"
echo "  1. Update Google Cloud SQL network settings"
echo "  2. Enable SSL requirements"
echo "  3. Deploy security updates to Vercel"
echo ""
echo "🔐 Your EGDC system will be production-ready!"
/**
 * INTEGRATION HEALTH API ENDPOINT
 * 
 * Provides real-time health status for all marketplace and payment integrations
 * Used by the Integration Health Dashboard for monitoring and alerting
 */

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/postgres-tenant-safe'
import { createMercadoLibreIntegration } from '@/lib/marketplace-integrations/mercadolibre'
import { createShopifyIntegration } from '@/lib/marketplace-integrations/shopify'
import { createStripeIntegration } from '@/lib/payment-gateways/stripe-integration'
import { createPayPalIntegration } from '@/lib/payment-gateways/paypal-integration'
import { createOXXOIntegration } from '@/lib/payment-gateways/oxxo-integration'
import { enterpriseAPM } from '@/lib/monitoring/enterprise-apm'
import { performanceMonitor } from '@/lib/performance-monitor'

interface IntegrationHealth {
  id: string
  name: string
  platform: string
  status: 'healthy' | 'warning' | 'critical' | 'offline'
  lastSync: string
  syncSuccess: number
  errorCount: number
  responseTime: number
  uptime: number
  rateLimitRemaining: number
  nextSync: string
  details: any
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const pool = await connectToDatabase()
    const tenantId = request.headers.get('x-tenant-id') || 'default'
    
    // Get all active integrations for the tenant
    const integrationsResult = await pool.query(`
      SELECT 
        id, name, platform, status, client_id, client_secret, access_token,
        refresh_token, store_url, seller_id, webhook_secret, last_sync_at,
        sync_errors_count, sync_success_rate, published_products_count,
        created_at, updated_at
      FROM marketplaces 
      WHERE tenant_id = $1 AND status != 'inactive'
      ORDER BY platform, name
    `, [tenantId])

    const integrations = integrationsResult.rows
    const healthStatuses: IntegrationHealth[] = []

    // Check health for each integration
    for (const integration of integrations) {
      try {
        const health = await checkIntegrationHealth(integration)
        healthStatuses.push(health)
      } catch (error) {
        console.error(`Error checking health for ${integration.name}:`, error)
        
        // Add as offline if health check fails
        healthStatuses.push({
          id: integration.id,
          name: integration.name,
          platform: integration.platform,
          status: 'offline',
          lastSync: integration.last_sync_at || 'Never',
          syncSuccess: integration.sync_success_rate || 0,
          errorCount: integration.sync_errors_count || 0,
          responseTime: 0,
          uptime: 0,
          rateLimitRemaining: 0,
          nextSync: 'Unknown',
          details: { error: error instanceof Error ? error.message : 'Health check failed' }
        })
      }
    }

    // Record performance metrics
    performanceMonitor.recordRequest(Date.now() - startTime, false)
    
    // Record business metrics
    enterpriseAPM.recordBusinessMetric('active_integrations', healthStatuses.length)
    enterpriseAPM.recordBusinessMetric('healthy_integrations', healthStatuses.filter(h => h.status === 'healthy').length)
    enterpriseAPM.recordBusinessMetric('critical_integrations', healthStatuses.filter(h => h.status === 'critical').length)

    return NextResponse.json({
      success: true,
      data: healthStatuses,
      metadata: {
        totalIntegrations: healthStatuses.length,
        healthyCount: healthStatuses.filter(h => h.status === 'healthy').length,
        warningCount: healthStatuses.filter(h => h.status === 'warning').length,
        criticalCount: healthStatuses.filter(h => h.status === 'critical').length,
        offlineCount: healthStatuses.filter(h => h.status === 'offline').length,
        lastUpdated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error fetching integration health:', error)
    
    performanceMonitor.recordRequest(Date.now() - startTime, true)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch integration health'
    }, { status: 500 })
  }
}

/**
 * Check health for a specific integration
 */
async function checkIntegrationHealth(integration: any): Promise<IntegrationHealth> {
  const baseHealth: Omit<IntegrationHealth, 'status' | 'details'> = {
    id: integration.id,
    name: integration.name,
    platform: integration.platform,
    lastSync: integration.last_sync_at ? new Date(integration.last_sync_at).toLocaleString() : 'Never',
    syncSuccess: integration.sync_success_rate || 0,
    errorCount: integration.sync_errors_count || 0,
    responseTime: 0,
    uptime: 0,
    rateLimitRemaining: 0,
    nextSync: 'Calculating...'
  }

  try {
    switch (integration.platform) {
      case 'mercadolibre':
        return await checkMercadoLibreHealth(integration, baseHealth)
      
      case 'shopify':
        return await checkShopifyHealth(integration, baseHealth)
      
      case 'stripe':
        return await checkStripeHealth(integration, baseHealth)
      
      case 'paypal':
        return await checkPayPalHealth(integration, baseHealth)
      
      case 'oxxo':
        return await checkOXXOHealth(integration, baseHealth)
      
      default:
        return {
          ...baseHealth,
          status: 'offline',
          details: { error: `Unsupported platform: ${integration.platform}` }
        }
    }
  } catch (error) {
    return {
      ...baseHealth,
      status: 'critical',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

/**
 * Check MercadoLibre integration health
 */
async function checkMercadoLibreHealth(
  integration: any, 
  baseHealth: Omit<IntegrationHealth, 'status' | 'details'>
): Promise<IntegrationHealth> {
  if (!integration.client_id || !integration.access_token || !integration.seller_id) {
    return {
      ...baseHealth,
      status: 'critical',
      details: { error: 'Missing credentials' }
    }
  }

  const mlIntegration = createMercadoLibreIntegration({
    clientId: integration.client_id,
    clientSecret: integration.client_secret,
    accessToken: integration.access_token,
    refreshToken: integration.refresh_token,
    sellerId: integration.seller_id
  })

  const startTime = Date.now()
  const connectionTest = await mlIntegration.testConnection()
  const responseTime = Date.now() - startTime
  
  const healthStatus = mlIntegration.getHealthStatus()
  
  let status: 'healthy' | 'warning' | 'critical' | 'offline' = 'healthy'
  
  if (!connectionTest.success) {
    status = 'critical'
  } else if (healthStatus.rateLimitRemaining < 100 || responseTime > 2000) {
    status = 'warning'
  }

  return {
    ...baseHealth,
    status,
    responseTime,
    uptime: connectionTest.success ? 100 : 0,
    rateLimitRemaining: healthStatus.rateLimitRemaining,
    nextSync: calculateNextSync(integration.platform),
    details: {
      connectionTest,
      healthStatus,
      user: connectionTest.user
    }
  }
}

/**
 * Check Shopify integration health
 */
async function checkShopifyHealth(
  integration: any,
  baseHealth: Omit<IntegrationHealth, 'status' | 'details'>
): Promise<IntegrationHealth> {
  if (!integration.store_url || !integration.access_token) {
    return {
      ...baseHealth,
      status: 'critical',
      details: { error: 'Missing store URL or access token' }
    }
  }

  const shopifyIntegration = createShopifyIntegration({
    storeUrl: integration.store_url,
    accessToken: integration.access_token,
    apiVersion: '2024-01',
    webhookSecret: integration.webhook_secret
  })

  const startTime = Date.now()
  const connectionTest = await shopifyIntegration.testConnection()
  const responseTime = Date.now() - startTime
  
  const healthStatus = shopifyIntegration.getHealthStatus()
  
  let status: 'healthy' | 'warning' | 'critical' | 'offline' = 'healthy'
  
  if (!connectionTest.success) {
    status = 'critical'
  } else if (healthStatus.rateLimitRemaining < 10 || responseTime > 2000) {
    status = 'warning'
  }

  return {
    ...baseHealth,
    status,
    responseTime,
    uptime: connectionTest.success ? 100 : 0,
    rateLimitRemaining: healthStatus.rateLimitRemaining,
    nextSync: calculateNextSync(integration.platform),
    details: {
      connectionTest,
      healthStatus,
      shop: connectionTest.shop
    }
  }
}

/**
 * Check Stripe integration health
 */
async function checkStripeHealth(
  integration: any,
  baseHealth: Omit<IntegrationHealth, 'status' | 'details'>
): Promise<IntegrationHealth> {
  if (!integration.client_id || !integration.access_token) {
    return {
      ...baseHealth,
      status: 'critical',
      details: { error: 'Missing Stripe credentials' }
    }
  }

  const stripeIntegration = createStripeIntegration({
    publishableKey: integration.client_id,
    secretKey: integration.access_token,
    webhookSecret: integration.webhook_secret
  })

  const startTime = Date.now()
  const connectionTest = await stripeIntegration.testConnection()
  const responseTime = Date.now() - startTime
  
  const healthStatus = stripeIntegration.getHealthStatus()
  
  let status: 'healthy' | 'warning' | 'critical' | 'offline' = 'healthy'
  
  if (!connectionTest.success) {
    status = 'critical'
  } else if (healthStatus.requestsToday > 8000 || responseTime > 1000) {
    status = 'warning'
  }

  return {
    ...baseHealth,
    status,
    responseTime,
    uptime: connectionTest.success ? 100 : 0,
    rateLimitRemaining: 10000 - healthStatus.requestsToday, // Stripe daily limit
    nextSync: 'Real-time',
    details: {
      connectionTest,
      healthStatus,
      account: connectionTest.account
    }
  }
}

/**
 * Check PayPal integration health
 */
async function checkPayPalHealth(
  integration: any,
  baseHealth: Omit<IntegrationHealth, 'status' | 'details'>
): Promise<IntegrationHealth> {
  if (!integration.client_id || !integration.client_secret) {
    return {
      ...baseHealth,
      status: 'critical',
      details: { error: 'Missing PayPal credentials' }
    }
  }

  const paypalIntegration = createPayPalIntegration({
    clientId: integration.client_id,
    clientSecret: integration.client_secret,
    sandbox: integration.sandbox || false,
    webhookId: integration.webhook_secret
  })

  const startTime = Date.now()
  const connectionTest = await paypalIntegration.testConnection()
  const responseTime = Date.now() - startTime
  
  const healthStatus = paypalIntegration.getHealthStatus()
  
  let status: 'healthy' | 'warning' | 'critical' | 'offline' = 'healthy'
  
  if (!connectionTest.success) {
    status = 'critical'
  } else if (!healthStatus.tokenValid || responseTime > 2000) {
    status = 'warning'
  }

  return {
    ...baseHealth,
    status,
    responseTime,
    uptime: connectionTest.success ? 100 : 0,
    rateLimitRemaining: 10000 - healthStatus.requestsToday,
    nextSync: 'Real-time',
    details: {
      connectionTest,
      healthStatus,
      environment: healthStatus.environment
    }
  }
}

/**
 * Check OXXO integration health
 */
async function checkOXXOHealth(
  integration: any,
  baseHealth: Omit<IntegrationHealth, 'status' | 'details'>
): Promise<IntegrationHealth> {
  if (!integration.client_id || !integration.client_secret) {
    return {
      ...baseHealth,
      status: 'critical',
      details: { error: 'Missing OXXO/Conekta credentials' }
    }
  }

  const oxxoIntegration = createOXXOIntegration({
    privateKey: integration.client_secret,
    publicKey: integration.client_id,
    webhookSecret: integration.webhook_secret,
    sandbox: integration.sandbox || false
  })

  const startTime = Date.now()
  const connectionTest = await oxxoIntegration.testConnection()
  const responseTime = Date.now() - startTime
  
  const healthStatus = oxxoIntegration.getHealthStatus()
  
  let status: 'healthy' | 'warning' | 'critical' | 'offline' = 'healthy'
  
  if (!connectionTest.success) {
    status = 'critical'
  } else if (healthStatus.requestsToday > 8000 || responseTime > 2000) {
    status = 'warning'
  }

  return {
    ...baseHealth,
    status,
    responseTime,
    uptime: connectionTest.success ? 100 : 0,
    rateLimitRemaining: 10000 - healthStatus.requestsToday,
    nextSync: 'Payment-based',
    details: {
      connectionTest,
      healthStatus,
      paymentMethod: healthStatus.paymentMethod
    }
  }
}

/**
 * Calculate next sync time based on platform
 */
function calculateNextSync(platform: string): string {
  const now = new Date()
  let nextSync = new Date(now)

  switch (platform) {
    case 'mercadolibre':
    case 'shopify':
      // Sync every 15 minutes
      nextSync.setMinutes(now.getMinutes() + 15)
      break
    case 'stripe':
    case 'paypal':
    case 'oxxo':
      return 'Real-time'
    default:
      nextSync.setHours(now.getHours() + 1)
  }

  return nextSync.toLocaleString()
}
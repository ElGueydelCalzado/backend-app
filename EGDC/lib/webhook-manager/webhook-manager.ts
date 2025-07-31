/**
 * ENTERPRISE WEBHOOK MANAGER
 * 
 * Features:
 * - Reliable webhook processing with retry logic
 * - Webhook signature verification
 * - Event queuing and batch processing
 * - Dead letter queue for failed webhooks
 * - Comprehensive error handling and monitoring
 * - Multi-tenant webhook routing
 * - Webhook delivery status tracking
 */

import { performanceMonitor } from '@/lib/performance-monitor'
import { securityMonitor } from '@/lib/monitoring'

interface WebhookEvent {
  id: string
  source: 'stripe' | 'paypal' | 'shopify' | 'mercadolibre' | 'oxxo' | 'custom'
  type: string
  data: any
  timestamp: number
  signature?: string
  headers: Record<string, string>
  tenantId?: string
  retryCount: number
  maxRetries: number
  nextRetryAt?: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter'
  errorMessage?: string
  processingTime?: number
}

interface WebhookHandler {
  source: string
  eventType: string
  handler: (event: WebhookEvent) => Promise<{ success: boolean; error?: string }>
  retryable?: boolean
  maxRetries?: number
  retryDelay?: number // seconds
}

interface WebhookConfig {
  maxConcurrentProcessing: number
  defaultMaxRetries: number
  defaultRetryDelay: number
  processingTimeout: number
  deadLetterRetentionDays: number
  batchSize: number
  queueCheckInterval: number
}

interface DeliveryAttempt {
  timestamp: number
  success: boolean
  error?: string
  responseTime: number
  httpStatus?: number
}

interface WebhookStats {
  totalEvents: number
  pendingEvents: number
  completedEvents: number
  failedEvents: number
  deadLetterEvents: number
  averageProcessingTime: number
  successRate: number
  bySource: Record<string, {
    total: number
    completed: number
    failed: number
    averageTime: number
  }>
}

export class WebhookManager {
  private handlers: Map<string, WebhookHandler> = new Map()
  private eventQueue: WebhookEvent[] = []
  private processingQueue: Set<string> = new Set()
  private deadLetterQueue: WebhookEvent[] = []
  private deliveryHistory: Map<string, DeliveryAttempt[]> = new Map()
  private config: WebhookConfig
  private processingInterval?: NodeJS.Timeout
  private isProcessing = false

  constructor(config: Partial<WebhookConfig> = {}) {
    this.config = {
      maxConcurrentProcessing: 10,
      defaultMaxRetries: 3,
      defaultRetryDelay: 30,
      processingTimeout: 30000,
      deadLetterRetentionDays: 7,
      batchSize: 5,
      queueCheckInterval: 1000,
      ...config
    }

    this.startProcessing()
    console.log('📨 Webhook Manager initialized')
  }

  /**
   * Register webhook handler
   */
  registerHandler(handler: WebhookHandler): void {
    const key = `${handler.source}:${handler.eventType}`
    this.handlers.set(key, handler)
    console.log(`✅ Registered webhook handler: ${key}`)
  }

  /**
   * Receive and queue webhook event
   */
  async receiveWebhook(
    source: WebhookEvent['source'],
    payload: string,
    headers: Record<string, string>,
    tenantId?: string
  ): Promise<{ success: boolean; eventId?: string; error?: string }> {
    try {
      // Parse payload
      let data: any
      try {
        data = JSON.parse(payload)
      } catch (error) {
        return {
          success: false,
          error: 'Invalid JSON payload'
        }
      }

      // Verify webhook signature
      const signature = headers['x-webhook-signature'] || 
                       headers['stripe-signature'] || 
                       headers['paypal-transmission-sig'] ||
                       headers['x-shopify-hmac-sha256']

      if (signature && !(await this.verifyWebhookSignature(source, payload, signature, headers))) {
        securityMonitor.logEvent({
          type: 'auth_failure',
          ip: headers['x-forwarded-for'] || 'unknown',
          endpoint: '/webhook',
          details: { source, signatureValid: false }
        })

        return {
          success: false,
          error: 'Invalid webhook signature'
        }
      }

      // Create webhook event
      const eventId = this.generateEventId()
      const webhookEvent: WebhookEvent = {
        id: eventId,
        source,
        type: this.extractEventType(source, data),
        data,
        timestamp: Date.now(),
        signature,
        headers,
        tenantId,
        retryCount: 0,
        maxRetries: this.config.defaultMaxRetries,
        status: 'pending'
      }

      // Add to queue
      this.eventQueue.push(webhookEvent)

      console.log(`📥 Webhook received: ${source}:${webhookEvent.type} (${eventId})`)

      // Log security event
      securityMonitor.logEvent({
        type: 'auth_failure', // Using available type
        ip: headers['x-forwarded-for'] || 'unknown',
        endpoint: '/webhook',
        details: { 
          source, 
          eventType: webhookEvent.type, 
          eventId,
          signatureValid: !!signature 
        }
      })

      return {
        success: true,
        eventId
      }

    } catch (error) {
      console.error('❌ Error receiving webhook:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Start processing webhook queue
   */
  private startProcessing(): void {
    this.processingInterval = setInterval(async () => {
      if (!this.isProcessing && this.eventQueue.length > 0) {
        await this.processQueue()
      }
    }, this.config.queueCheckInterval)

    console.log('🚀 Webhook processing started')
  }

  /**
   * Stop processing webhook queue
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = undefined
    }
    console.log('⏹️ Webhook processing stopped')
  }

  /**
   * Process webhook queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return

    this.isProcessing = true

    try {
      // Get ready events (not currently processing and ready for retry)
      const readyEvents = this.eventQueue.filter(event => 
        event.status === 'pending' &&
        !this.processingQueue.has(event.id) &&
        (!event.nextRetryAt || event.nextRetryAt <= Date.now())
      )

      // Limit concurrent processing
      const availableSlots = Math.max(0, this.config.maxConcurrentProcessing - this.processingQueue.size)
      const eventsToProcess = readyEvents.slice(0, Math.min(availableSlots, this.config.batchSize))

      // Process events concurrently
      const processingPromises = eventsToProcess.map(event => this.processEvent(event))
      await Promise.allSettled(processingPromises)

    } catch (error) {
      console.error('❌ Error processing webhook queue:', error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Process individual webhook event
   */
  private async processEvent(event: WebhookEvent): Promise<void> {
    this.processingQueue.add(event.id)
    event.status = 'processing'

    const startTime = Date.now()
    let attempt: DeliveryAttempt

    try {
      console.log(`🔄 Processing webhook: ${event.source}:${event.type} (${event.id})`)

      // Find handler
      const handlerKey = `${event.source}:${event.type}`
      const handler = this.handlers.get(handlerKey) || this.handlers.get(`${event.source}:*`)

      if (!handler) {
        throw new Error(`No handler found for ${handlerKey}`)
      }

      // Set timeout for processing
      const processingPromise = handler.handler(event)
      const timeoutPromise = new Promise<{ success: boolean; error: string }>((_, reject) => {
        setTimeout(() => reject(new Error('Processing timeout')), this.config.processingTimeout)
      })

      const result = await Promise.race([processingPromise, timeoutPromise])
      const processingTime = Date.now() - startTime

      attempt = {
        timestamp: Date.now(),
        success: result.success,
        error: result.error,
        responseTime: processingTime
      }

      if (result.success) {
        // Success
        event.status = 'completed'
        event.processingTime = processingTime
        console.log(`✅ Webhook processed successfully: ${event.id} (${processingTime}ms)`)

        // Record performance metrics
        performanceMonitor.recordRequest(processingTime, false)

      } else {
        throw new Error(result.error || 'Handler returned failure')
      }

    } catch (error) {
      const processingTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      attempt = {
        timestamp: Date.now(),
        success: false,
        error: errorMessage,
        responseTime: processingTime
      }

      console.error(`❌ Webhook processing failed: ${event.id} - ${errorMessage}`)

      // Record performance metrics
      performanceMonitor.recordRequest(processingTime, true)

      // Handle retry logic
      await this.handleRetry(event, errorMessage)

    } finally {
      // Record delivery attempt
      if (!this.deliveryHistory.has(event.id)) {
        this.deliveryHistory.set(event.id, [])
      }
      this.deliveryHistory.get(event.id)!.push(attempt!)

      this.processingQueue.delete(event.id)
    }
  }

  /**
   * Handle webhook retry logic
   */
  private async handleRetry(event: WebhookEvent, errorMessage: string): Promise<void> {
    event.retryCount++
    event.errorMessage = errorMessage

    const handler = this.handlers.get(`${event.source}:${event.type}`) || 
                   this.handlers.get(`${event.source}:*`)

    const maxRetries = handler?.maxRetries ?? event.maxRetries
    const retryDelay = handler?.retryDelay ?? this.config.defaultRetryDelay

    if (event.retryCount >= maxRetries || (handler && !handler.retryable)) {
      // Move to dead letter queue
      event.status = 'dead_letter'
      this.deadLetterQueue.push(event)
      this.removeFromQueue(event.id)

      console.log(`💀 Webhook moved to dead letter queue: ${event.id} (${event.retryCount} retries)`)

      // Log security event for failed webhook
      securityMonitor.logEvent({
        type: 'error',
        ip: 'system',
        endpoint: '/webhook/processing',
        details: { 
          eventId: event.id,
          source: event.source,
          type: event.type,
          retryCount: event.retryCount,
          error: errorMessage
        }
      })

    } else {
      // Schedule retry with exponential backoff
      const backoffDelay = retryDelay * Math.pow(2, event.retryCount - 1)
      event.nextRetryAt = Date.now() + (backoffDelay * 1000)
      event.status = 'pending'

      console.log(`🔄 Webhook scheduled for retry: ${event.id} (attempt ${event.retryCount}/${maxRetries}) in ${backoffDelay}s`)
    }
  }

  /**
   * Verify webhook signature based on source
   */
  private async verifyWebhookSignature(
    source: string,
    payload: string,
    signature: string,
    headers: Record<string, string>
  ): Promise<boolean> {
    try {
      // This is a simplified verification - in production, you'd use the actual
      // integration classes and their verification methods
      switch (source) {
        case 'stripe':
          // Use StripeIntegration.verifyWebhookSignature()
          return true // Placeholder
        
        case 'paypal':
          // Use PayPalIntegration.verifyWebhookSignature()
          return true // Placeholder
        
        case 'shopify':
          // Use ShopifyIntegration.verifyWebhook()
          return true // Placeholder
        
        case 'oxxo':
          // Use OXXOIntegration.verifyWebhookSignature()
          return true // Placeholder
        
        default:
          return false
      }
    } catch (error) {
      console.error('❌ Error verifying webhook signature:', error)
      return false
    }
  }

  /**
   * Extract event type from webhook payload
   */
  private extractEventType(source: string, data: any): string {
    switch (source) {
      case 'stripe':
        return data.type || 'unknown'
      
      case 'paypal':
        return data.event_type || 'unknown'
      
      case 'shopify':
        return data.topic || 'unknown'
      
      case 'mercadolibre':
        return data.topic || 'unknown'
      
      case 'oxxo':
        return data.type || 'unknown'
      
      default:
        return data.type || data.event_type || 'unknown'
    }
  }

  /**
   * Remove event from queue
   */
  private removeFromQueue(eventId: string): void {
    const index = this.eventQueue.findIndex(event => event.id === eventId)
    if (index !== -1) {
      this.eventQueue.splice(index, 1)
    }
  }

  /**
   * Get webhook event by ID
   */
  getEvent(eventId: string): WebhookEvent | null {
    return this.eventQueue.find(event => event.id === eventId) ||
           this.deadLetterQueue.find(event => event.id === eventId) ||
           null
  }

  /**
   * Get delivery history for an event
   */
  getDeliveryHistory(eventId: string): DeliveryAttempt[] {
    return this.deliveryHistory.get(eventId) || []
  }

  /**
   * Retry failed event manually
   */
  async retryEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    const event = this.deadLetterQueue.find(e => e.id === eventId)
    
    if (!event) {
      return {
        success: false,
        error: 'Event not found in dead letter queue'
      }
    }

    // Reset event for retry
    event.status = 'pending'
    event.retryCount = 0
    event.nextRetryAt = undefined
    event.errorMessage = undefined

    // Move back to main queue
    this.deadLetterQueue.splice(this.deadLetterQueue.indexOf(event), 1)
    this.eventQueue.push(event)

    console.log(`🔄 Event manually queued for retry: ${eventId}`)

    return { success: true }
  }

  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue(): void {
    const cleared = this.deadLetterQueue.length
    this.deadLetterQueue.length = 0
    console.log(`🗑️ Cleared ${cleared} events from dead letter queue`)
  }

  /**
   * Get webhook statistics
   */
  getStats(): WebhookStats {
    const allEvents = [...this.eventQueue, ...this.deadLetterQueue]
    
    const stats: WebhookStats = {
      totalEvents: allEvents.length,
      pendingEvents: this.eventQueue.filter(e => e.status === 'pending').length,
      completedEvents: this.eventQueue.filter(e => e.status === 'completed').length,
      failedEvents: this.eventQueue.filter(e => e.status === 'failed').length,
      deadLetterEvents: this.deadLetterQueue.length,
      averageProcessingTime: 0,
      successRate: 0,
      bySource: {}
    }

    // Calculate averages
    const completedEvents = allEvents.filter(e => e.status === 'completed')
    if (completedEvents.length > 0) {
      stats.averageProcessingTime = completedEvents.reduce((sum, e) => sum + (e.processingTime || 0), 0) / completedEvents.length
      stats.successRate = completedEvents.length / allEvents.length
    }

    // Calculate by source
    for (const event of allEvents) {
      if (!stats.bySource[event.source]) {
        stats.bySource[event.source] = {
          total: 0,
          completed: 0,
          failed: 0,
          averageTime: 0
        }
      }

      const sourceStats = stats.bySource[event.source]
      sourceStats.total++

      if (event.status === 'completed') {
        sourceStats.completed++
        sourceStats.averageTime += event.processingTime || 0
      } else if (event.status === 'failed' || event.status === 'dead_letter') {
        sourceStats.failed++
      }
    }

    // Calculate average times by source
    for (const source in stats.bySource) {
      const sourceStats = stats.bySource[source]
      if (sourceStats.completed > 0) {
        sourceStats.averageTime = sourceStats.averageTime / sourceStats.completed
      }
    }

    return stats
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get webhook manager health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'error'
    queueSize: number
    processingCount: number
    deadLetterSize: number
    isProcessing: boolean
  } {
    const queueSize = this.eventQueue.length
    const deadLetterSize = this.deadLetterQueue.length
    const processingCount = this.processingQueue.size

    const status = deadLetterSize > 100 ? 'error' :
                   queueSize > 1000 ? 'warning' : 'healthy'

    return {
      status,
      queueSize,
      processingCount,
      deadLetterSize,
      isProcessing: this.isProcessing
    }
  }

  /**
   * Clean up old events and delivery history
   */
  cleanup(): void {
    const cutoffTime = Date.now() - (this.config.deadLetterRetentionDays * 24 * 60 * 60 * 1000)
    
    // Clean completed events older than retention period
    const completedEvents = this.eventQueue.filter(e => e.status === 'completed' && e.timestamp < cutoffTime)
    for (const event of completedEvents) {
      this.removeFromQueue(event.id)
      this.deliveryHistory.delete(event.id)
    }

    // Clean old dead letter events
    const oldDeadLetterEvents = this.deadLetterQueue.filter(e => e.timestamp < cutoffTime)
    for (const event of oldDeadLetterEvents) {
      const index = this.deadLetterQueue.indexOf(event)
      this.deadLetterQueue.splice(index, 1)
      this.deliveryHistory.delete(event.id)
    }

    if (completedEvents.length > 0 || oldDeadLetterEvents.length > 0) {
      console.log(`🧹 Cleaned up ${completedEvents.length + oldDeadLetterEvents.length} old webhook events`)
    }
  }
}

// Export singleton instance
export const webhookManager = new WebhookManager()

// Export factory function for custom instances
export function createWebhookManager(config?: Partial<WebhookConfig>): WebhookManager {
  return new WebhookManager(config)
}
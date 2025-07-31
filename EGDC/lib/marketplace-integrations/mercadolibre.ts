/**
 * ENTERPRISE MARKETPLACE INTEGRATION: MercadoLibre API
 * 
 * Features:
 * - Real-time inventory synchronization
 * - Automated listing creation and updates
 * - Order management and fulfillment tracking
 * - Pricing synchronization with automated rules
 * - Comprehensive error handling and retry logic
 * - Rate limiting and API quota management
 */

import { performanceMonitor } from '@/lib/performance-monitor'
import { securityMonitor } from '@/lib/monitoring'

interface MercadoLibreCredentials {
  clientId: string
  clientSecret: string
  accessToken: string
  refreshToken: string
  sellerId: string
}

interface MercadoLibreProduct {
  id: string
  title: string
  price: number
  available_quantity: number
  condition: 'new' | 'used'
  listing_type_id: string
  category_id: string
  currency_id: string
  pictures: Array<{
    url: string
    secure_url: string
  }>
  attributes: Array<{
    id: string
    name: string
    value_name: string
  }>
  shipping: {
    mode: string
    free_shipping: boolean
  }
  warranty: string
  status: 'active' | 'paused' | 'closed'
}

interface MercadoLibreOrder {
  id: number
  status: string
  date_created: string
  order_items: Array<{
    item: {
      id: string
      title: string
      variation_id?: string
    }
    quantity: number
    unit_price: number
  }>
  buyer: {
    id: number
    nickname: string
    email?: string
  }
  shipping: {
    id: number
    status: string
    tracking_number?: string
    estimated_delivery_time: {
      date: string
    }
  }
  payments: Array<{
    id: number
    status: string
    transaction_amount: number
  }>
}

interface SyncResult {
  success: boolean
  processed: number
  errors: Array<{
    productId: string
    error: string
  }>
  metrics: {
    duration: number
    apiCalls: number
    rateLimitRemaining: number
  }
}

export class MercadoLibreIntegration {
  private readonly baseUrl = 'https://api.mercadolibre.com'
  private credentials: MercadoLibreCredentials
  private rateLimitRemaining = 10000 // Default rate limit
  private rateLimitReset = Date.now() + 3600000 // 1 hour from now
  private requestQueue: Array<() => Promise<any>> = []
  private isProcessingQueue = false

  constructor(credentials: MercadoLibreCredentials) {
    this.credentials = credentials
    console.log('🛍️ MercadoLibre Integration initialized')
  }

  /**
   * Test API connection and validate credentials
   */
  async testConnection(): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const response = await this.makeRequest('/users/me', 'GET')
      
      if (response.success && response.data) {
        console.log('✅ MercadoLibre connection successful')
        return {
          success: true,
          user: {
            id: response.data.id,
            nickname: response.data.nickname,
            country_id: response.data.country_id,
            site_id: response.data.site_id
          }
        }
      }
      
      return {
        success: false,
        error: 'Invalid response from MercadoLibre API'
      }
    } catch (error) {
      console.error('❌ MercadoLibre connection failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      }
    }
  }

  /**
   * Sync all products to MercadoLibre
   */
  async syncProducts(products: any[]): Promise<SyncResult> {
    const startTime = Date.now()
    let apiCalls = 0
    const errors: Array<{ productId: string; error: string }> = []
    let processed = 0

    console.log(`🔄 Starting MercadoLibre sync for ${products.length} products`)

    for (const product of products) {
      try {
        await this.syncSingleProduct(product)
        processed++
        apiCalls++
      } catch (error) {
        errors.push({
          productId: product.id || product.sku,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        console.error(`❌ Failed to sync product ${product.sku}:`, error)
      }

      // Rate limiting check
      if (this.rateLimitRemaining <= 100) {
        console.log('⏳ Rate limit approaching, pausing sync...')
        await this.waitForRateLimit()
      }
    }

    const duration = Date.now() - startTime
    const result: SyncResult = {
      success: errors.length === 0,
      processed,
      errors,
      metrics: {
        duration,
        apiCalls,
        rateLimitRemaining: this.rateLimitRemaining
      }
    }

    // Record performance metrics
    performanceMonitor.recordRequest(duration, errors.length > 0)

    console.log(`✅ MercadoLibre sync completed: ${processed}/${products.length} products, ${errors.length} errors`)
    return result
  }

  /**
   * Sync a single product to MercadoLibre
   */
  private async syncSingleProduct(product: any): Promise<void> {
    // Check if product already exists on MercadoLibre
    const existingListing = await this.findExistingListing(product.sku)

    if (existingListing) {
      await this.updateListing(existingListing.id, product)
    } else {
      await this.createListing(product)
    }
  }

  /**
   * Find existing listing by SKU
   */
  private async findExistingListing(sku: string): Promise<MercadoLibreProduct | null> {
    try {
      const response = await this.makeRequest(`/users/${this.credentials.sellerId}/items/search?seller_custom_field=${sku}`, 'GET')
      
      if (response.success && response.data.results && response.data.results.length > 0) {
        return response.data.results[0]
      }
      
      return null
    } catch (error) {
      console.error(`Error finding listing for SKU ${sku}:`, error)
      return null
    }
  }

  /**
   * Create new listing on MercadoLibre
   */
  private async createListing(product: any): Promise<void> {
    const listingData = this.buildListingData(product)
    
    const response = await this.makeRequest('/items', 'POST', listingData)
    
    if (response.success) {
      console.log(`✅ Created MercadoLibre listing for ${product.sku}: ${response.data.id}`)
      
      // Store the MercadoLibre item ID in our database
      await this.storeMercadoLibreId(product.id, response.data.id)
    } else {
      throw new Error(`Failed to create listing: ${response.error}`)
    }
  }

  /**
   * Update existing listing on MercadoLibre
   */
  private async updateListing(itemId: string, product: any): Promise<void> {
    const updateData = {
      price: this.calculatePrice(product),
      available_quantity: product.inventory_total || 0,
      status: product.inventory_total > 0 ? 'active' : 'paused'
    }

    const response = await this.makeRequest(`/items/${itemId}`, 'PUT', updateData)
    
    if (response.success) {
      console.log(`✅ Updated MercadoLibre listing for ${product.sku}`)
    } else {
      throw new Error(`Failed to update listing: ${response.error}`)
    }
  }

  /**
   * Build listing data for MercadoLibre
   */
  private buildListingData(product: any): Partial<MercadoLibreProduct> {
    return {
      title: this.buildTitle(product),
      price: this.calculatePrice(product),
      available_quantity: product.inventory_total || 0,
      condition: 'new',
      listing_type_id: 'gold_special', // Premium listing
      category_id: this.mapCategory(product.categoria),
      currency_id: 'MXN',
      pictures: product.google_drive ? [{ url: product.google_drive, secure_url: product.google_drive }] : [],
      attributes: this.buildAttributes(product),
      shipping: {
        mode: 'me2',
        free_shipping: false
      },
      warranty: '30 días de garantía del vendedor',
      status: product.inventory_total > 0 ? 'active' : 'paused'
    }
  }

  /**
   * Build product title for MercadoLibre
   */
  private buildTitle(product: any): string {
    const parts = [
      product.marca,
      product.modelo,
      product.color,
      `Talla ${product.talla}`,
      product.categoria
    ].filter(Boolean)
    
    return parts.join(' ').substring(0, 60) // MercadoLibre title limit
  }

  /**
   * Calculate price using MercadoLibre modifier
   */
  private calculatePrice(product: any): number {
    return product.precio_meli || (product.costo * (product.meli_modifier || 2.0))
  }

  /**
   * Map product category to MercadoLibre category
   */
  private mapCategory(categoria: string): string {
    const categoryMap: Record<string, string> = {
      'Calzado Deportivo': 'MLA109027', // Zapatillas
      'Calzado Casual': 'MLA109025', // Zapatos
      'Calzado Formal': 'MLA109025', // Zapatos
      'Sandalias': 'MLA109026', // Sandalias
      'Botas': 'MLA109024' // Botas
    }
    
    return categoryMap[categoria] || 'MLA109025' // Default to Zapatos
  }

  /**
   * Build product attributes for MercadoLibre
   */
  private buildAttributes(product: any): Array<{ id: string; value_name: string }> {
    const attributes = []
    
    if (product.marca) {
      attributes.push({ id: 'BRAND', value_name: product.marca })
    }
    
    if (product.color) {
      attributes.push({ id: 'COLOR', value_name: product.color })
    }
    
    if (product.talla) {
      attributes.push({ id: 'SIZE', value_name: product.talla })
    }
    
    if (product.modelo) {
      attributes.push({ id: 'MODEL', value_name: product.modelo })
    }
    
    return attributes
  }

  /**
   * Fetch orders from MercadoLibre
   */
  async fetchOrders(dateFrom?: Date, dateTo?: Date): Promise<MercadoLibreOrder[]> {
    try {
      let url = `/orders/search/recent?seller=${this.credentials.sellerId}`
      
      if (dateFrom) {
        url += `&order.date_created.from=${dateFrom.toISOString()}`
      }
      
      if (dateTo) {
        url += `&order.date_created.to=${dateTo.toISOString()}`
      }

      const response = await this.makeRequest(url, 'GET')
      
      if (response.success && response.data.results) {
        console.log(`📦 Fetched ${response.data.results.length} orders from MercadoLibre`)
        return response.data.results
      }
      
      return []
    } catch (error) {
      console.error('❌ Failed to fetch MercadoLibre orders:', error)
      return []
    }
  }

  /**
   * Update order status/tracking
   */
  async updateOrderTracking(orderId: number, trackingNumber: string): Promise<boolean> {
    try {
      const response = await this.makeRequest(`/orders/${orderId}/tracking`, 'PUT', {
        tracking_number: trackingNumber
      })
      
      if (response.success) {
        console.log(`✅ Updated tracking for order ${orderId}: ${trackingNumber}`)
        return true
      }
      
      return false
    } catch (error) {
      console.error(`❌ Failed to update tracking for order ${orderId}:`, error)
      return false
    }
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.credentials.clientId,
          client_secret: this.credentials.clientSecret,
          refresh_token: this.credentials.refreshToken
        })
      })

      if (response.ok) {
        const data = await response.json()
        this.credentials.accessToken = data.access_token
        
        if (data.refresh_token) {
          this.credentials.refreshToken = data.refresh_token
        }
        
        console.log('🔄 MercadoLibre access token refreshed')
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ Failed to refresh MercadoLibre token:', error)
      return false
    }
  }

  /**
   * Make authenticated request to MercadoLibre API
   */
  private async makeRequest(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const url = `${this.baseUrl}${endpoint}`
    
    try {
      // Check rate limiting
      if (this.rateLimitRemaining <= 0) {
        await this.waitForRateLimit()
      }

      const options: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }

      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data)
      }

      const response = await fetch(url, options)
      
      // Update rate limiting info from headers
      this.updateRateLimitInfo(response)

      if (response.status === 401) {
        // Token expired, try to refresh
        const refreshed = await this.refreshAccessToken()
        if (refreshed) {
          // Retry the request with new token
          options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${this.credentials.accessToken}`
          }
          const retryResponse = await fetch(url, options)
          this.updateRateLimitInfo(retryResponse)
          
          if (retryResponse.ok) {
            const retryData = await retryResponse.json()
            return { success: true, data: retryData }
          }
        }
        
        return { success: false, error: 'Authentication failed' }
      }

      if (response.ok) {
        const responseData = await response.json()
        return { success: true, data: responseData }
      } else {
        const errorData = await response.json().catch(() => ({ message: response.statusText }))
        return { 
          success: false, 
          error: errorData.message || `HTTP ${response.status}: ${response.statusText}` 
        }
      }
    } catch (error) {
      securityMonitor.logEvent({
        type: 'error',
        ip: 'system',
        endpoint: endpoint,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      })
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      }
    }
  }

  /**
   * Update rate limit information from response headers
   */
  private updateRateLimitInfo(response: Response): void {
    const remaining = response.headers.get('X-RateLimit-Remaining')
    const reset = response.headers.get('X-RateLimit-Reset')
    
    if (remaining) {
      this.rateLimitRemaining = parseInt(remaining, 10)
    }
    
    if (reset) {
      this.rateLimitReset = parseInt(reset, 10) * 1000 // Convert to milliseconds
    }
  }

  /**
   * Wait for rate limit to reset
   */
  private async waitForRateLimit(): Promise<void> {
    const waitTime = Math.max(0, this.rateLimitReset - Date.now())
    if (waitTime > 0) {
      console.log(`⏳ Waiting ${Math.ceil(waitTime / 1000)}s for MercadoLibre rate limit reset`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }

  /**
   * Store MercadoLibre item ID in database (to be implemented with database integration)
   */
  private async storeMercadoLibreId(productId: string, mercadolibreId: string): Promise<void> {
    // This would integrate with your database to store the mapping
    console.log(`💾 Store mapping: Product ${productId} -> MercadoLibre ${mercadolibreId}`)
  }

  /**
   * Get integration health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'error'
    rateLimitRemaining: number
    rateLimitReset: Date
    queueSize: number
  } {
    const status = this.rateLimitRemaining > 1000 ? 'healthy' : 
                   this.rateLimitRemaining > 100 ? 'warning' : 'error'
    
    return {
      status,
      rateLimitRemaining: this.rateLimitRemaining,
      rateLimitReset: new Date(this.rateLimitReset),
      queueSize: this.requestQueue.length
    }
  }
}

// Export factory function for creating MercadoLibre integration instances
export function createMercadoLibreIntegration(credentials: MercadoLibreCredentials): MercadoLibreIntegration {
  return new MercadoLibreIntegration(credentials)
}
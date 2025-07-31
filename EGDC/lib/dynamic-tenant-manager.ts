/**
 * SCALABILITY: Dynamic Tenant Management System
 * Eliminates hard-coded tenant limits and enables unlimited tenant scaling
 * 
 * Phase 2 Implementation: Dynamic Tenant Management
 * Replaces static TENANT_CONFIG with database-driven tenant resolution
 */

import { tenantConnectionManager } from './tenant-connection-manager'
import { tenantCache, TenantCacheData, cacheTenant } from './tenant-redis-cache'
import { performanceMonitor } from './performance-monitor'

export interface TenantConfiguration {
  tenant_id: string
  name: string
  subdomain: string
  email: string
  plan: 'starter' | 'professional' | 'enterprise'
  status: 'active' | 'suspended' | 'inactive'
  settings: {
    max_users: number
    max_products: number
    features: string[]
    custom_domain?: string
    logo_url?: string
    theme_config?: Record<string, any>
  }
  created_at: string
  updated_at: string
}

export interface TenantUser {
  id: string
  tenant_id: string
  email: string
  name: string
  role: 'owner' | 'admin' | 'manager' | 'employee'
  status: 'active' | 'inactive'
  permissions: string[]
  last_login?: string
  created_at: string
}

export interface TenantCreationRequest {
  name: string
  subdomain: string
  email: string
  owner_name: string
  plan?: 'starter' | 'professional' | 'enterprise'
  settings?: Partial<TenantConfiguration['settings']>
}

export interface TenantStats {
  totalTenants: number
  activeTenants: number
  tenantsByPlan: Record<string, number>
  recentlyCreated: number
  averageUsers: number
  totalUsers: number
}

/**
 * SCALABILITY: Advanced Dynamic Tenant Manager
 * 
 * Features:
 * - Unlimited tenant creation and management
 * - Database-driven tenant resolution with caching
 * - Tenant provisioning automation
 * - Multi-level caching for sub-5ms resolution
 * - Tenant lifecycle management
 * - Usage analytics and capacity planning
 * - Automatic tenant cleanup and optimization
 */
export class DynamicTenantManager {
  private tenantCache = new Map<string, { config: TenantConfiguration; expires: number }>()
  private userCache = new Map<string, { users: TenantUser[]; expires: number }>()
  private readonly CACHE_TTL = 300000 // 5 minutes
  
  // Plan configurations for scalable tenant management
  private readonly PLAN_LIMITS = {
    starter: {
      max_users: 5,
      max_products: 1000,
      features: ['basic_inventory', 'basic_analytics']
    },
    professional: {
      max_users: 25,
      max_products: 10000,
      features: ['advanced_inventory', 'advanced_analytics', 'custom_reports', 'api_access']
    },
    enterprise: {
      max_users: 100,
      max_products: 100000,
      features: ['all_features', 'custom_integrations', 'priority_support', 'white_label']
    }
  }
  
  /**
   * FAST: Get tenant configuration with multi-level caching
   * Target: <5ms resolution time
   */
  async getTenantConfig(tenantSlug: string): Promise<TenantConfiguration | null> {
    const startTime = Date.now()
    
    try {
      // Level 1: In-memory cache (fastest)
      const cached = this.tenantCache.get(tenantSlug)
      if (cached && Date.now() < cached.expires) {
        performanceMonitor.recordTenantResolution(tenantSlug, Date.now() - startTime)
        return cached.config
      }
      
      // Level 2: Redis cache
      const redisCached = await tenantCache.getTenant(tenantSlug)
      if (redisCached) {
        const config = await this.hydrateTenantConfig(redisCached)
        
        // Cache in memory for next request
        this.tenantCache.set(tenantSlug, {
          config,
          expires: Date.now() + this.CACHE_TTL
        })
        
        performanceMonitor.recordTenantResolution(tenantSlug, Date.now() - startTime)
        return config
      }
      
      // Level 3: Database lookup
      const config = await this.fetchTenantFromDatabase(tenantSlug)
      if (config) {
        // Cache at all levels
        await this.cacheTenantConfig(config)
        
        performanceMonitor.recordTenantResolution(tenantSlug, Date.now() - startTime)
        return config
      }
      
      performanceMonitor.recordTenantResolution(tenantSlug, Date.now() - startTime)
      return null
      
    } catch (error) {
      console.error(`❌ Error getting tenant config for ${tenantSlug}:`, error)
      performanceMonitor.recordTenantResolution(tenantSlug, Date.now() - startTime)
      return null
    }
  }
  
  /**
   * PROVISIONING: Create new tenant with full setup
   */
  async createTenant(request: TenantCreationRequest): Promise<{
    success: boolean
    tenant?: TenantConfiguration
    user?: TenantUser
    error?: string
  }> {
    const startTime = Date.now()
    
    try {
      // Validate tenant slug availability
      const existing = await this.getTenantConfig(request.subdomain)
      if (existing) {
        return { success: false, error: 'Tenant subdomain already exists' }
      }
      
      // Generate tenant ID
      const tenantId = this.generateTenantId()
      
      // Prepare tenant configuration
      const planLimits = this.PLAN_LIMITS[request.plan || 'starter']
      const tenantConfig: TenantConfiguration = {
        tenant_id: tenantId,
        name: request.name,
        subdomain: request.subdomain,
        email: request.email,
        plan: request.plan || 'starter',
        status: 'active',
        settings: {
          ...planLimits,
          ...request.settings
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      // Create tenant in database with transaction
      const createQueries = [
        {
          query: `INSERT INTO tenants (id, name, subdomain, email, plan, status, settings, created_at, updated_at)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                  RETURNING *`,
          params: [
            tenantId,
            tenantConfig.name,
            tenantConfig.subdomain,
            tenantConfig.email,
            tenantConfig.plan,
            tenantConfig.status,
            JSON.stringify(tenantConfig.settings),
            tenantConfig.created_at,
            tenantConfig.updated_at
          ]
        }
      ]
      
      const results = await tenantConnectionManager.batchExecuteWithTenant('system', createQueries)
      
      // Create owner user
      const ownerUser: TenantUser = {
        id: this.generateUserId(),
        tenant_id: tenantId,
        email: request.email,
        name: request.owner_name,
        role: 'owner',
        status: 'active',
        permissions: ['all'],
        created_at: new Date().toISOString()
      }
      
      const userQueries = [
        {
          query: `INSERT INTO users (id, tenant_id, email, name, role, status, permissions, created_at)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                  RETURNING *`,
          params: [
            ownerUser.id,
            ownerUser.tenant_id,
            ownerUser.email,
            ownerUser.name,
            ownerUser.role,
            ownerUser.status,
            JSON.stringify(ownerUser.permissions),
            ownerUser.created_at
          ]
        }
      ]
      
      await tenantConnectionManager.batchExecuteWithTenant('system', userQueries)
      
      // Initialize tenant-specific resources
      await this.initializeTenantResources(tenantId)
      
      // Cache the new tenant configuration
      await this.cacheTenantConfig(tenantConfig)
      
      console.log(`✅ Created tenant: ${request.subdomain} (${Date.now() - startTime}ms)`)
      
      return {
        success: true,
        tenant: tenantConfig,
        user: ownerUser
      }
      
    } catch (error) {
      console.error('❌ Error creating tenant:', error)
      return {
        success: false,
        error: `Failed to create tenant: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
  
  /**
   * MANAGEMENT: Update tenant configuration
   */
  async updateTenant(tenantSlug: string, updates: Partial<TenantConfiguration>): Promise<{
    success: boolean
    tenant?: TenantConfiguration
    error?: string
  }> {
    try {
      const currentConfig = await this.getTenantConfig(tenantSlug)
      if (!currentConfig) {
        return { success: false, error: 'Tenant not found' }
      }
      
      // Prepare update query
      const updateFields = Object.keys(updates).filter(key => key !== 'tenant_id')
      if (updateFields.length === 0) {
        return { success: false, error: 'No valid fields to update' }
      }
      
      const setClause = updateFields.map((field, index) => {
        if (field === 'settings') {
          return `settings = $${index + 2}`
        }
        return `${field} = $${index + 2}`
      }).join(', ')
      
      const values = updateFields.map(field => {
        if (field === 'settings' && typeof updates[field as keyof TenantConfiguration] === 'object') {
          return JSON.stringify(updates[field as keyof TenantConfiguration])
        }
        return updates[field as keyof TenantConfiguration]
      })
      
      const result = await tenantConnectionManager.executeWithTenant<TenantConfiguration>(
        'system',
        `UPDATE tenants 
         SET ${setClause}, updated_at = NOW()
         WHERE subdomain = $1
         RETURNING *`,
        [tenantSlug, ...values]
      )
      
      if (result.length === 0) {
        return { success: false, error: 'Failed to update tenant' }
      }
      
      const updatedConfig = await this.hydrateTenantConfig(result[0] as any)
      
      // Update all caches
      await this.cacheTenantConfig(updatedConfig)
      
      console.log(`✅ Updated tenant: ${tenantSlug}`)
      
      return { success: true, tenant: updatedConfig }
      
    } catch (error) {
      console.error(`❌ Error updating tenant ${tenantSlug}:`, error)
      return {
        success: false,
        error: `Failed to update tenant: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
  
  /**
   * USER MANAGEMENT: Get tenant users
   */
  async getTenantUsers(tenantId: string): Promise<TenantUser[]> {
    try {
      // Check cache first
      const cached = this.userCache.get(tenantId)
      if (cached && Date.now() < cached.expires) {
        return cached.users
      }
      
      const users = await tenantConnectionManager.executeWithTenant<TenantUser>(
        tenantId,
        `SELECT 
          id, tenant_id, email, name, role, status,
          permissions, last_login, created_at
         FROM users 
         WHERE tenant_id = $1 AND status = 'active'
         ORDER BY role ASC, name ASC`,
        [tenantId]
      )
      
      // Parse permissions JSON
      const parsedUsers = users.map(user => ({
        ...user,
        permissions: typeof user.permissions === 'string' ? 
          JSON.parse(user.permissions) : user.permissions
      }))
      
      // Cache the result
      this.userCache.set(tenantId, {
        users: parsedUsers,
        expires: Date.now() + this.CACHE_TTL
      })
      
      return parsedUsers
      
    } catch (error) {
      console.error(`❌ Error getting tenant users for ${tenantId}:`, error)
      return []
    }
  }
  
  /**
   * ANALYTICS: Get comprehensive tenant statistics
   */
  async getTenantStats(): Promise<TenantStats> {
    try {
      const result = await tenantConnectionManager.executeWithTenant(
        'system',
        `WITH tenant_stats AS (
          SELECT 
            COUNT(*) as total_tenants,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_tenants,
            COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as recently_created
          FROM tenants
        ),
        plan_stats AS (
          SELECT plan, COUNT(*) as count
          FROM tenants
          WHERE status = 'active'
          GROUP BY plan
        ),
        user_stats AS (
          SELECT 
            COUNT(*) as total_users,
            COUNT(DISTINCT tenant_id) as tenants_with_users
          FROM users
          WHERE status = 'active'
        )
        SELECT 
          ts.total_tenants,
          ts.active_tenants,
          ts.recently_created,
          us.total_users,
          CASE WHEN us.tenants_with_users > 0 
               THEN us.total_users::float / us.tenants_with_users 
               ELSE 0 END as average_users,
          json_object_agg(ps.plan, ps.count) as plans
        FROM tenant_stats ts
        CROSS JOIN user_stats us
        LEFT JOIN plan_stats ps ON true
        GROUP BY ts.total_tenants, ts.active_tenants, ts.recently_created, us.total_users`,
        []
      )
      
      if (result.length === 0) {
        return {
          totalTenants: 0,
          activeTenants: 0,
          tenantsByPlan: {},
          recentlyCreated: 0,
          averageUsers: 0,
          totalUsers: 0
        }
      }
      
      const stats = result[0]
      
      return {
        totalTenants: parseInt(stats.total_tenants),
        activeTenants: parseInt(stats.active_tenants),
        tenantsByPlan: stats.plans || {},
        recentlyCreated: parseInt(stats.recently_created),
        averageUsers: parseFloat(stats.average_users),
        totalUsers: parseInt(stats.total_users)
      }
      
    } catch (error) {
      console.error('❌ Error getting tenant stats:', error)
      return {
        totalTenants: 0,
        activeTenants: 0,
        tenantsByPlan: {},
        recentlyCreated: 0,
        averageUsers: 0,
        totalUsers: 0
      }
    }
  }
  
  /**
   * PROVISIONING: Initialize tenant-specific resources
   */
  private async initializeTenantResources(tenantId: string): Promise<void> {
    try {
      // Create tenant-specific database schema if needed
      const initQueries = [
        // Add any tenant-specific initialization queries here
        {
          query: `INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, created_at)
                  VALUES ($1, 'initialized', 'true', NOW())`,
          params: [tenantId]
        }
      ]
      
      await tenantConnectionManager.batchExecuteWithTenant(tenantId, initQueries)
      
      console.log(`✅ Initialized resources for tenant: ${tenantId}`)
      
    } catch (error) {
      console.error(`❌ Error initializing tenant resources for ${tenantId}:`, error)
      throw error
    }
  }
  
  /**
   * Helper methods
   */
  private async fetchTenantFromDatabase(tenantSlug: string): Promise<TenantConfiguration | null> {
    try {
      const result = await tenantConnectionManager.executeWithTenant<any>(
        'system',
        `SELECT 
          id as tenant_id, name, subdomain, email, plan, status,
          settings, created_at, updated_at
         FROM tenants 
         WHERE subdomain = $1 AND status = 'active'`,
        [tenantSlug]
      )
      
      if (result.length === 0) return null
      
      return this.hydrateTenantConfig(result[0])
      
    } catch (error) {
      console.error(`❌ Error fetching tenant ${tenantSlug} from database:`, error)
      return null
    }
  }
  
  private async hydrateTenantConfig(data: any): Promise<TenantConfiguration> {
    return {
      tenant_id: data.tenant_id,
      name: data.name,
      subdomain: data.subdomain,
      email: data.email,
      plan: data.plan,
      status: data.status,
      settings: typeof data.settings === 'string' ? JSON.parse(data.settings) : data.settings,
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  }
  
  private async cacheTenantConfig(config: TenantConfiguration): Promise<void> {
    // Cache in memory
    this.tenantCache.set(config.subdomain, {
      config,
      expires: Date.now() + this.CACHE_TTL
    })
    
    // Cache in Redis
    const cacheData: TenantCacheData = {
      tenant_id: config.tenant_id,
      name: config.name,
      subdomain: config.subdomain,
      email: config.email,
      plan: config.plan,
      status: config.status,
      created_at: config.created_at
    }
    
    await cacheTenant(config.subdomain, cacheData)
  }
  
  private generateTenantId(): string {
    return `tenant_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }
  
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }
  
  /**
   * MAINTENANCE: Clear caches
   */
  clearCaches(): void {
    this.tenantCache.clear()
    this.userCache.clear()
    console.log('🗑️ Dynamic tenant manager caches cleared')
  }
  
  /**
   * HEALTH CHECK: Verify tenant management system health
   */
  async healthCheck(): Promise<{
    healthy: boolean
    stats: TenantStats
    cacheStatus: { memory: number; redis: boolean }
    issues: string[]
  }> {
    const issues: string[] = []
    
    try {
      const stats = await this.getTenantStats()
      
      // Check for system health indicators
      if (stats.totalTenants === 0) {
        issues.push('No tenants in system')
      }
      
      if (stats.activeTenants / stats.totalTenants < 0.8) {
        issues.push('Low tenant activation rate')
      }
      
      // Test Redis connectivity (simplified check)
      let redisHealthy = true
      try {
        await tenantCache.getTenant('health-check-test')
      } catch (error) {
        redisHealthy = false
        issues.push('Redis cache connectivity issues')
      }
      
      return {
        healthy: issues.length === 0,
        stats,
        cacheStatus: {
          memory: this.tenantCache.size,
          redis: redisHealthy
        },
        issues
      }
      
    } catch (error) {
      return {
        healthy: false,
        stats: {
          totalTenants: 0,
          activeTenants: 0,
          tenantsByPlan: {},
          recentlyCreated: 0,
          averageUsers: 0,
          totalUsers: 0
        },
        cacheStatus: {
          memory: 0,
          redis: false
        },
        issues: ['System health check failed']
      }
    }
  }
}

// Create singleton instance
export const dynamicTenantManager = new DynamicTenantManager()

// Export convenience functions
export const getTenantConfig = (tenantSlug: string) =>
  dynamicTenantManager.getTenantConfig(tenantSlug)

export const createTenant = (request: TenantCreationRequest) =>
  dynamicTenantManager.createTenant(request)

export const getTenantUsers = (tenantId: string) =>
  dynamicTenantManager.getTenantUsers(tenantId)

export const getTenantStats = () =>
  dynamicTenantManager.getTenantStats()
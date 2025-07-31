/**
 * Enterprise Role-Based Access Control (RBAC) System
 * Granular permissions management for multi-tenant SaaS
 */

import { Pool } from 'pg'
import { createSecureDatabaseConfig } from './database-config'
import { enterpriseAuditLogger } from './enterprise-audit'

// RBAC Configuration
export const RBAC_CONFIG = {
  DEFAULT_ROLES: {
    'super_admin': {
      name: 'Super Administrator',
      description: 'Full system access across all tenants',
      level: 1000,
      system_role: true
    },
    'tenant_admin': {
      name: 'Tenant Administrator', 
      description: 'Full access within tenant',
      level: 900,
      system_role: false
    },
    'manager': {
      name: 'Manager',
      description: 'Management access with team oversight',
      level: 700,
      system_role: false
    },
    'analyst': {
      name: 'Analyst',
      description: 'Read-only access with reporting capabilities',
      level: 500,
      system_role: false
    },
    'operator': {
      name: 'Operator',
      description: 'Operational access for daily tasks',
      level: 400,
      system_role: false
    },
    'viewer': {
      name: 'Viewer',
      description: 'Read-only access to basic features',
      level: 200,
      system_role: false
    }
  },
  RESOURCES: [
    'users', 'tenants', 'inventory', 'products', 'orders', 'suppliers',
    'warehouses', 'reports', 'settings', 'integrations', 'backups',
    'audit_logs', 'billing', 'api_keys', 'webhooks', 'notifications'
  ] as const,
  ACTIONS: [
    'create', 'read', 'update', 'delete', 'export', 'import',
    'approve', 'reject', 'assign', 'unassign', 'configure', 'execute'
  ] as const,
  CONTEXTS: [
    'own', 'team', 'tenant', 'system'
  ] as const
} as const

export type Resource = typeof RBAC_CONFIG.RESOURCES[number]
export type Action = typeof RBAC_CONFIG.ACTIONS[number]
export type Context = typeof RBAC_CONFIG.CONTEXTS[number]

interface Permission {
  id: string
  resource: Resource
  action: Action
  context: Context
  conditions?: Record<string, any>
  createdAt: Date
}

interface Role {
  id: string
  name: string
  description: string
  level: number
  tenantId?: string // null for system roles
  permissions: Permission[]
  isSystemRole: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface UserRole {
  id: string
  userId: string
  roleId: string
  tenantId: string
  assignedBy: string
  assignedAt: Date
  expiresAt?: Date
  isActive: boolean
  conditions?: Record<string, any>
}

interface AccessRequest {
  userId: string
  tenantId: string
  resource: Resource
  action: Action
  context: Context
  targetId?: string
  conditions?: Record<string, any>
}

interface AccessResult {
  granted: boolean
  reason: string
  appliedRoles: string[]
  appliedPermissions: string[]
  context: Context
  conditions?: Record<string, any>
}

class EnterpriseRBACManager {
  private pool: Pool
  private permissionCache: Map<string, Permission[]> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  constructor() {
    this.pool = new Pool(createSecureDatabaseConfig())
    this.initializeSystemRoles()
  }

  /**
   * Check if user has permission to perform action
   */
  async checkPermission(request: AccessRequest): Promise<AccessResult> {
    const { userId, tenantId, resource, action, context, targetId, conditions } = request

    try {
      // Get user's effective permissions
      const userPermissions = await this.getUserPermissions(userId, tenantId)
      
      // Find matching permissions
      const matchingPermissions = userPermissions.filter(permission => 
        permission.resource === resource &&
        permission.action === action &&
        this.contextMatches(permission.context, context) &&
        this.conditionsMatch(permission.conditions, conditions)
      )

      if (matchingPermissions.length === 0) {
        await enterpriseAuditLogger.logSecurityEvent(
          'access_denied',
          'authorization',
          'medium',
          `Access denied: ${action} ${resource}`,
          { resource, action, context, reason: 'no_matching_permissions' },
          { userId, tenantId }
        )

        return {
          granted: false,
          reason: 'No matching permissions found',
          appliedRoles: [],
          appliedPermissions: [],
          context
        }
      }

      // Check additional context-specific conditions
      const contextCheck = await this.checkContextualAccess(
        userId, tenantId, resource, action, context, targetId
      )

      if (!contextCheck.allowed) {
        await enterpriseAuditLogger.logSecurityEvent(
          'access_denied',
          'authorization',
          'medium',
          `Access denied: ${action} ${resource} - ${contextCheck.reason}`,
          { resource, action, context, reason: contextCheck.reason },
          { userId, tenantId }
        )

        return {
          granted: false,
          reason: contextCheck.reason,
          appliedRoles: [],
          appliedPermissions: [],
          context
        }
      }

      // Access granted
      const userRoles = await this.getUserRoles(userId, tenantId)
      
      await enterpriseAuditLogger.logSecurityEvent(
        'access_granted',
        'authorization',
        'low',
        `Access granted: ${action} ${resource}`,
        { resource, action, context, targetId },
        { userId, tenantId }
      )

      return {
        granted: true,
        reason: 'Permission granted',
        appliedRoles: userRoles.map(r => r.roleId),
        appliedPermissions: matchingPermissions.map(p => p.id),
        context,
        conditions: matchingPermissions[0]?.conditions
      }

    } catch (error) {
      console.error('[RBAC] Permission check failed:', error)
      
      await enterpriseAuditLogger.logSecurityEvent(
        'access_error',
        'authorization',
        'high',
        `Permission check error: ${action} ${resource}`,
        { resource, action, context, error: error.message },
        { userId, tenantId }
      )

      return {
        granted: false,
        reason: 'Permission check failed',
        appliedRoles: [],
        appliedPermissions: [],
        context
      }
    }
  }

  /**
   * Assign role to user
   */
  async assignRole(
    userId: string,
    roleId: string,
    tenantId: string,
    assignedBy: string,
    expiresAt?: Date,
    conditions?: Record<string, any>
  ): Promise<boolean> {
    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')

      // Check if role exists and is active
      const roleCheck = await client.query(`
        SELECT id, name, is_system_role FROM roles 
        WHERE id = $1 AND is_active = true AND (tenant_id = $2 OR is_system_role = true)
      `, [roleId, tenantId])

      if (roleCheck.rows.length === 0) {
        throw new Error('Role not found or inactive')
      }

      const role = roleCheck.rows[0]

      // Check if user already has this role
      const existingAssignment = await client.query(`
        SELECT id FROM user_roles 
        WHERE user_id = $1 AND role_id = $2 AND tenant_id = $3 AND is_active = true
      `, [userId, roleId, tenantId])

      if (existingAssignment.rows.length > 0) {
        throw new Error('User already has this role')
      }

      // Create role assignment
      const assignmentId = crypto.randomUUID()
      await client.query(`
        INSERT INTO user_roles (
          id, user_id, role_id, tenant_id, assigned_by, assigned_at, 
          expires_at, is_active, conditions
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, true, $7)
      `, [assignmentId, userId, roleId, tenantId, assignedBy, expiresAt, JSON.stringify(conditions)])

      await client.query('COMMIT')

      // Clear permission cache for user
      this.clearUserPermissionCache(userId, tenantId)

      await enterpriseAuditLogger.logSecurityEvent(
        'role_assigned',
        'authorization',
        'medium',
        `Role assigned: ${role.name}`,
        { 
          roleId, 
          roleName: role.name,
          assignedTo: userId,
          assignedBy,
          expiresAt,
          conditions
        },
        { userId: assignedBy, tenantId }
      )

      return true

    } catch (error) {
      await client.query('ROLLBACK')
      console.error('[RBAC] Role assignment failed:', error)
      
      await enterpriseAuditLogger.logSecurityEvent(
        'role_assignment_failed',
        'authorization',
        'high',
        'Role assignment failed',
        { roleId, assignedTo: userId, assignedBy, error: error.message },
        { userId: assignedBy, tenantId }
      )

      return false
    } finally {
      client.release()
    }
  }

  /**
   * Revoke role from user
   */
  async revokeRole(
    userId: string,
    roleId: string,
    tenantId: string,
    revokedBy: string,
    reason?: string
  ): Promise<boolean> {
    const client = await this.pool.connect()
    
    try {
      const result = await client.query(`
        UPDATE user_roles 
        SET is_active = false, revoked_at = NOW(), revoked_by = $4, revoke_reason = $5
        WHERE user_id = $1 AND role_id = $2 AND tenant_id = $3 AND is_active = true
      `, [userId, roleId, tenantId, revokedBy, reason])

      if (result.rowCount === 0) {
        return false
      }

      // Clear permission cache for user
      this.clearUserPermissionCache(userId, tenantId)

      await enterpriseAuditLogger.logSecurityEvent(
        'role_revoked',
        'authorization',
        'medium',
        'Role revoked',
        { roleId, revokedFrom: userId, revokedBy, reason },
        { userId: revokedBy, tenantId }
      )

      return true

    } catch (error) {
      console.error('[RBAC] Role revocation failed:', error)
      return false
    } finally {
      client.release()
    }
  }

  /**
   * Create custom role
   */
  async createRole(
    name: string,
    description: string,
    level: number,
    tenantId: string,
    permissions: Array<{
      resource: Resource
      action: Action
      context: Context
      conditions?: Record<string, any>
    }>,
    createdBy: string
  ): Promise<string | null> {
    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')

      // Create role
      const roleId = crypto.randomUUID()
      await client.query(`
        INSERT INTO roles (
          id, name, description, level, tenant_id, is_system_role, 
          is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, false, true, NOW(), NOW())
      `, [roleId, name, description, level, tenantId])

      // Create permissions
      for (const permission of permissions) {
        const permissionId = crypto.randomUUID()
        await client.query(`
          INSERT INTO permissions (
            id, resource, action, context, conditions, created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())
        `, [
          permissionId,
          permission.resource,
          permission.action,
          permission.context,
          JSON.stringify(permission.conditions)
        ])

        // Link permission to role
        await client.query(`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ($1, $2)
        `, [roleId, permissionId])
      }

      await client.query('COMMIT')

      await enterpriseAuditLogger.logSecurityEvent(
        'role_created',
        'configuration_change',
        'medium',
        'Custom role created',
        { 
          roleId,
          name,
          description,
          level,
          permissionCount: permissions.length,
          permissions
        },
        { userId: createdBy, tenantId }
      )

      return roleId

    } catch (error) {
      await client.query('ROLLBACK')
      console.error('[RBAC] Role creation failed:', error)
      return null
    } finally {
      client.release()
    }
  }

  /**
   * Get user's effective permissions
   */
  async getUserPermissions(userId: string, tenantId: string): Promise<Permission[]> {
    const cacheKey = `permissions:${userId}:${tenantId}`
    const cached = this.permissionCache.get(cacheKey)
    
    if (cached) {
      return cached
    }

    const client = await this.pool.connect()
    
    try {
      const result = await client.query(`
        SELECT DISTINCT p.id, p.resource, p.action, p.context, p.conditions, p.created_at
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN roles r ON rp.role_id = r.id
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = $1 AND ur.tenant_id = $2 
        AND ur.is_active = true AND r.is_active = true
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      `, [userId, tenantId])

      const permissions: Permission[] = result.rows.map(row => ({
        id: row.id,
        resource: row.resource,
        action: row.action,
        context: row.context,
        conditions: row.conditions,
        createdAt: row.created_at
      }))

      // Cache for 5 minutes
      this.permissionCache.set(cacheKey, permissions)
      setTimeout(() => this.permissionCache.delete(cacheKey), this.CACHE_TTL)

      return permissions

    } finally {
      client.release()
    }
  }

  /**
   * Get user's roles
   */
  async getUserRoles(userId: string, tenantId: string): Promise<UserRole[]> {
    const client = await this.pool.connect()
    
    try {
      const result = await client.query(`
        SELECT ur.*, r.name as role_name
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1 AND ur.tenant_id = $2 
        AND ur.is_active = true
        ORDER BY r.level DESC
      `, [userId, tenantId])

      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        roleId: row.role_id,
        tenantId: row.tenant_id,
        assignedBy: row.assigned_by,
        assignedAt: row.assigned_at,
        expiresAt: row.expires_at,
        isActive: row.is_active,
        conditions: row.conditions
      }))

    } finally {
      client.release()
    }
  }

  /**
   * Get all roles for tenant
   */
  async getTenantRoles(tenantId: string): Promise<Role[]> {
    const client = await this.pool.connect()
    
    try {
      const result = await client.query(`
        SELECT r.*, 
               COUNT(ur.id) as user_count,
               COUNT(p.id) as permission_count
        FROM roles r
        LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.is_active = true
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        WHERE (r.tenant_id = $1 OR r.is_system_role = true) AND r.is_active = true
        GROUP BY r.id
        ORDER BY r.level DESC
      `, [tenantId])

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        level: row.level,
        tenantId: row.tenant_id,
        permissions: [], // Would need separate query to populate
        isSystemRole: row.is_system_role,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))

    } finally {
      client.release()
    }
  }

  // Private helper methods

  private contextMatches(permissionContext: Context, requestContext: Context): boolean {
    // System context matches everything
    if (permissionContext === 'system') return true
    
    // Exact match
    if (permissionContext === requestContext) return true
    
    // Hierarchical matching
    const hierarchy = ['own', 'team', 'tenant', 'system']
    const permissionLevel = hierarchy.indexOf(permissionContext)
    const requestLevel = hierarchy.indexOf(requestContext)
    
    return permissionLevel >= requestLevel
  }

  private conditionsMatch(
    permissionConditions?: Record<string, any>,
    requestConditions?: Record<string, any>
  ): boolean {
    if (!permissionConditions) return true
    if (!requestConditions) return false

    // Check if all permission conditions are satisfied
    for (const [key, value] of Object.entries(permissionConditions)) {
      if (requestConditions[key] !== value) {
        return false
      }
    }

    return true
  }

  private async checkContextualAccess(
    userId: string,
    tenantId: string,
    resource: Resource,
    action: Action,
    context: Context,
    targetId?: string
  ): Promise<{ allowed: boolean; reason: string }> {
    // Additional context-specific checks
    switch (context) {
      case 'own':
        if (resource === 'users' && targetId !== userId) {
          return { allowed: false, reason: 'Can only access own user data' }
        }
        break

      case 'team':
        // Check if user is manager of the team/department
        // Implementation would check team membership
        break

      case 'tenant':
        // Check if user belongs to the tenant
        const client = await this.pool.connect()
        try {
          const result = await client.query(`
            SELECT 1 FROM users WHERE id = $1 AND tenant_id = $2
          `, [userId, tenantId])
          
          if (result.rows.length === 0) {
            return { allowed: false, reason: 'User does not belong to tenant' }
          }
        } finally {
          client.release()
        }
        break

      case 'system':
        // System-level access requires system role
        const userRoles = await this.getUserRoles(userId, tenantId)
        const hasSystemRole = userRoles.some(role => 
          RBAC_CONFIG.DEFAULT_ROLES[role.roleId as keyof typeof RBAC_CONFIG.DEFAULT_ROLES]?.system_role
        )
        
        if (!hasSystemRole) {
          return { allowed: false, reason: 'System access requires system role' }
        }
        break
    }

    return { allowed: true, reason: 'Context check passed' }
  }

  private clearUserPermissionCache(userId: string, tenantId: string): void {
    const cacheKey = `permissions:${userId}:${tenantId}`
    this.permissionCache.delete(cacheKey)
  }

  private async initializeSystemRoles(): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      // Check if system roles already exist
      const existingRoles = await client.query(`
        SELECT name FROM roles WHERE is_system_role = true
      `)
      
      const existingRoleNames = existingRoles.rows.map(row => row.name)
      
      // Create missing system roles
      for (const [roleKey, roleData] of Object.entries(RBAC_CONFIG.DEFAULT_ROLES)) {
        if (!existingRoleNames.includes(roleData.name)) {
          const roleId = crypto.randomUUID()
          await client.query(`
            INSERT INTO roles (
              id, name, description, level, tenant_id, is_system_role, 
              is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, NULL, $5, true, NOW(), NOW())
          `, [
            roleId,
            roleData.name,
            roleData.description,
            roleData.level,
            roleData.system_role
          ])
          
          console.log(`[RBAC] Created system role: ${roleData.name}`)
        }
      }
    } catch (error) {
      console.error('[RBAC] Failed to initialize system roles:', error)
    } finally {
      client.release()
    }
  }
}

// Export singleton instance
export const enterpriseRBACManager = new EnterpriseRBACManager()

// Middleware function for route protection
export function requirePermission(
  resource: Resource,
  action: Action,
  context: Context = 'tenant'
) {
  return async (userId: string, tenantId: string, targetId?: string) => {
    const result = await enterpriseRBACManager.checkPermission({
      userId,
      tenantId,
      resource,
      action,
      context,
      targetId
    })

    if (!result.granted) {
      throw new Error(`Access denied: ${result.reason}`)
    }

    return result
  }
}

// Database schema for RBAC tables
export const RBAC_SCHEMA = `
-- Roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  level INTEGER NOT NULL,
  tenant_id UUID, -- NULL for system roles
  is_system_role BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX idx_roles_tenant_id (tenant_id),
  INDEX idx_roles_level (level),
  INDEX idx_roles_system_role (is_system_role),
  UNIQUE INDEX idx_roles_name_tenant (name, tenant_id)
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  context VARCHAR(100) NOT NULL,
  conditions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX idx_permissions_resource (resource),
  INDEX idx_permissions_action (action),
  INDEX idx_permissions_context (context)
);

-- Role permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- User roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  role_id UUID NOT NULL REFERENCES roles(id),
  tenant_id UUID NOT NULL,
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID,
  revoke_reason TEXT,
  conditions JSONB,
  INDEX idx_user_roles_user_id (user_id),
  INDEX idx_user_roles_role_id (role_id),
  INDEX idx_user_roles_tenant_id (tenant_id),
  INDEX idx_user_roles_active (is_active),
  INDEX idx_user_roles_expires_at (expires_at)
);
`;
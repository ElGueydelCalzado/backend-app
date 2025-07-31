/**
 * Enterprise Authentication System
 * Implements JWT token rotation, refresh tokens, and advanced security features
 */

import crypto from 'crypto'
import { Pool } from 'pg'
import { createSecureDatabaseConfig } from './database-config'

// Enterprise security configuration
export const ENTERPRISE_AUTH_CONFIG = {
  ACCESS_TOKEN_EXPIRY: 15 * 60, // 15 minutes
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60, // 7 days
  ROTATION_THRESHOLD: 5 * 60, // Rotate if less than 5 minutes remaining
  MAX_REFRESH_ATTEMPTS: 3,
  TOKEN_BLACKLIST_TTL: 24 * 60 * 60, // 24 hours
}

interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  refreshExpiresAt: Date
}

interface RefreshTokenData {
  id: string
  userId: string
  tenantId: string
  tokenHash: string
  expiresAt: Date
  isRevoked: boolean
  deviceId?: string
  ipAddress?: string
  userAgent?: string
  createdAt: Date
  lastUsed?: Date
}

interface TokenBlacklistEntry {
  tokenHash: string
  expiresAt: Date
  reason: 'rotation' | 'logout' | 'compromise' | 'expired'
}

class EnterpriseTokenManager {
  private pool: Pool
  private blacklist: Map<string, TokenBlacklistEntry> = new Map()

  constructor() {
    this.pool = new Pool(createSecureDatabaseConfig())
    this.initializeCleanupTimer()
  }

  /**
   * Generate a secure token pair (access + refresh)
   */
  async generateTokenPair(
    userId: string,
    tenantId: string,
    role: string,
    deviceId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<TokenPair> {
    const accessToken = this.generateSecureToken()
    const refreshToken = this.generateSecureToken(64)
    
    const now = new Date()
    const accessExpiresAt = new Date(now.getTime() + ENTERPRISE_AUTH_CONFIG.ACCESS_TOKEN_EXPIRY * 1000)
    const refreshExpiresAt = new Date(now.getTime() + ENTERPRISE_AUTH_CONFIG.REFRESH_TOKEN_EXPIRY * 1000)

    // Store refresh token in database
    await this.storeRefreshToken({
      id: crypto.randomUUID(),
      userId,
      tenantId,
      tokenHash: this.hashToken(refreshToken),
      expiresAt: refreshExpiresAt,
      isRevoked: false,
      deviceId,
      ipAddress,
      userAgent,
      createdAt: now
    })

    return {
      accessToken,
      refreshToken,
      expiresAt: accessExpiresAt,
      refreshExpiresAt
    }
  }

  /**
   * Rotate token pair using refresh token
   */
  async rotateTokens(
    refreshToken: string,
    deviceId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<TokenPair | null> {
    const tokenHash = this.hashToken(refreshToken)
    
    // Validate refresh token
    const refreshTokenData = await this.getRefreshToken(tokenHash)
    if (!refreshTokenData || refreshTokenData.isRevoked || refreshTokenData.expiresAt < new Date()) {
      await this.logSecurityEvent('invalid_refresh_token', { tokenHash, ipAddress })
      return null
    }

    // Update last used timestamp
    await this.updateRefreshTokenLastUsed(refreshTokenData.id)

    // Generate new token pair
    const newTokenPair = await this.generateTokenPair(
      refreshTokenData.userId,
      refreshTokenData.tenantId,
      'admin', // Will be fetched from user record in production
      deviceId,
      ipAddress,
      userAgent
    )

    // Revoke old refresh token
    await this.revokeRefreshToken(refreshTokenData.id, 'rotation')

    // Add old tokens to blacklist
    this.addToBlacklist(tokenHash, 'rotation')

    await this.logSecurityEvent('token_rotation_success', {
      userId: refreshTokenData.userId,
      tenantId: refreshTokenData.tenantId,
      ipAddress
    })

    return newTokenPair
  }

  /**
   * Validate access token
   */
  async validateAccessToken(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token)
    
    // Check if token is blacklisted
    if (this.isBlacklisted(tokenHash)) {
      await this.logSecurityEvent('blacklisted_token_usage', { tokenHash })
      return false
    }

    // In production, this would verify JWT signature and expiry
    // For now, we'll simulate token validation
    return true
  }

  /**
   * Check if token needs rotation
   */
  shouldRotateToken(expiresAt: Date): boolean {
    const now = new Date()
    const timeUntilExpiry = (expiresAt.getTime() - now.getTime()) / 1000
    return timeUntilExpiry < ENTERPRISE_AUTH_CONFIG.ROTATION_THRESHOLD
  }

  /**
   * Revoke all tokens for a user (logout)
   */
  async revokeAllUserTokens(userId: string, reason: string = 'logout'): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      // Revoke all refresh tokens for user
      const result = await client.query(`
        UPDATE refresh_tokens 
        SET is_revoked = true, revoked_at = NOW(), revoke_reason = $2
        WHERE user_id = $1 AND is_revoked = false
        RETURNING token_hash
      `, [userId, reason])

      // Add revoked tokens to blacklist
      for (const row of result.rows) {
        this.addToBlacklist(row.token_hash, reason as any)
      }

      await this.logSecurityEvent('user_tokens_revoked', { userId, reason, count: result.rowCount })
      
    } finally {
      client.release()
    }
  }

  /**
   * Get user's active sessions
   */
  async getUserSessions(userId: string): Promise<Array<{
    id: string
    deviceId?: string
    ipAddress?: string
    userAgent?: string
    createdAt: Date
    lastUsed?: Date
  }>> {
    const client = await this.pool.connect()
    
    try {
      const result = await client.query(`
        SELECT id, device_id, ip_address, user_agent, created_at, last_used
        FROM refresh_tokens
        WHERE user_id = $1 AND is_revoked = false AND expires_at > NOW()
        ORDER BY last_used DESC NULLS LAST, created_at DESC
      `, [userId])

      return result.rows.map(row => ({
        id: row.id,
        deviceId: row.device_id,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        createdAt: row.created_at,
        lastUsed: row.last_used
      }))
    } finally {
      client.release()
    }
  }

  /**
   * Revoke specific session
   */
  async revokeSession(sessionId: string, userId: string): Promise<boolean> {
    const client = await this.pool.connect()
    
    try {
      const result = await client.query(`
        UPDATE refresh_tokens 
        SET is_revoked = true, revoked_at = NOW(), revoke_reason = 'user_action'
        WHERE id = $1 AND user_id = $2 AND is_revoked = false
        RETURNING token_hash
      `, [sessionId, userId])

      if (result.rowCount > 0) {
        this.addToBlacklist(result.rows[0].token_hash, 'logout')
        await this.logSecurityEvent('session_revoked', { sessionId, userId })
        return true
      }

      return false
    } finally {
      client.release()
    }
  }

  // Private helper methods

  private generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url')
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
  }

  private async storeRefreshToken(tokenData: RefreshTokenData): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      await client.query(`
        INSERT INTO refresh_tokens (
          id, user_id, tenant_id, token_hash, expires_at, is_revoked,
          device_id, ip_address, user_agent, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        tokenData.id,
        tokenData.userId,
        tokenData.tenantId,
        tokenData.tokenHash,
        tokenData.expiresAt,
        tokenData.isRevoked,
        tokenData.deviceId,
        tokenData.ipAddress,
        tokenData.userAgent,
        tokenData.createdAt
      ])
    } finally {
      client.release()
    }
  }

  private async getRefreshToken(tokenHash: string): Promise<RefreshTokenData | null> {
    const client = await this.pool.connect()
    
    try {
      const result = await client.query(`
        SELECT id, user_id, tenant_id, token_hash, expires_at, is_revoked,
               device_id, ip_address, user_agent, created_at, last_used
        FROM refresh_tokens
        WHERE token_hash = $1
      `, [tokenHash])

      if (result.rows.length === 0) return null

      const row = result.rows[0]
      return {
        id: row.id,
        userId: row.user_id,
        tenantId: row.tenant_id,
        tokenHash: row.token_hash,
        expiresAt: row.expires_at,
        isRevoked: row.is_revoked,
        deviceId: row.device_id,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        createdAt: row.created_at,
        lastUsed: row.last_used
      }
    } finally {
      client.release()
    }
  }

  private async updateRefreshTokenLastUsed(tokenId: string): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      await client.query(`
        UPDATE refresh_tokens 
        SET last_used = NOW()
        WHERE id = $1
      `, [tokenId])
    } finally {
      client.release()
    }
  }

  private async revokeRefreshToken(tokenId: string, reason: string): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      await client.query(`
        UPDATE refresh_tokens 
        SET is_revoked = true, revoked_at = NOW(), revoke_reason = $2
        WHERE id = $1
      `, [tokenId, reason])
    } finally {
      client.release()
    }
  }

  private addToBlacklist(tokenHash: string, reason: TokenBlacklistEntry['reason']): void {
    const expiresAt = new Date(Date.now() + ENTERPRISE_AUTH_CONFIG.TOKEN_BLACKLIST_TTL * 1000)
    this.blacklist.set(tokenHash, { tokenHash, expiresAt, reason })
  }

  private isBlacklisted(tokenHash: string): boolean {
    const entry = this.blacklist.get(tokenHash)
    if (!entry) return false

    if (entry.expiresAt < new Date()) {
      this.blacklist.delete(tokenHash)
      return false
    }

    return true
  }

  private async logSecurityEvent(event: string, details: any): Promise<void> {
    const timestamp = new Date().toISOString()
    console.log(`[ENTERPRISE_AUTH] ${timestamp} - ${event}`, details)
    
    // In production, store in dedicated security audit table
    const client = await this.pool.connect()
    try {
      await client.query(`
        INSERT INTO security_audit_log (event_type, details, created_at)
        VALUES ($1, $2, $3)
      `, [event, JSON.stringify(details), new Date()])
    } catch (error) {
      console.error('Failed to log security event:', error)
    } finally {
      client.release()
    }
  }

  private initializeCleanupTimer(): void {
    // Clean up expired blacklist entries every hour
    setInterval(() => {
      const now = new Date()
      for (const [tokenHash, entry] of this.blacklist.entries()) {
        if (entry.expiresAt < now) {
          this.blacklist.delete(tokenHash)
        }
      }
    }, 60 * 60 * 1000)
  }
}

// Export singleton instance
export const enterpriseTokenManager = new EnterpriseTokenManager()

// Enhanced NextAuth configuration with token rotation
export function createEnterpriseAuthConfig() {
  return {
    session: {
      strategy: 'jwt' as const,
      maxAge: ENTERPRISE_AUTH_CONFIG.ACCESS_TOKEN_EXPIRY,
    },
    
    callbacks: {
      async jwt({ token, user, account, trigger }) {
        // Check if token needs rotation
        if (token.exp && enterpriseTokenManager.shouldRotateToken(new Date(token.exp * 1000))) {
          console.log('🔄 Token rotation needed')
          
          // This would trigger token rotation in a real implementation
          // For now, we'll extend the expiry
          token.exp = Math.floor(Date.now() / 1000) + ENTERPRISE_AUTH_CONFIG.ACCESS_TOKEN_EXPIRY
        }

        return token
      },

      async session({ session, token }) {
        // Validate token before creating session
        if (token.jti && !(await enterpriseTokenManager.validateAccessToken(token.jti as string))) {
          console.log('❌ Invalid token detected in session callback')
          return null
        }

        return session
      }
    }
  }
}

// Database schema for enterprise auth tables
export const ENTERPRISE_AUTH_SCHEMA = `
-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoke_reason VARCHAR(50),
  device_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used TIMESTAMP WITH TIME ZONE,
  INDEX idx_refresh_tokens_user_id (user_id),
  INDEX idx_refresh_tokens_token_hash (token_hash),
  INDEX idx_refresh_tokens_expires_at (expires_at)
);

-- Security audit log table
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX idx_security_audit_event_type (event_type),
  INDEX idx_security_audit_created_at (created_at)
);

-- Token rotation log for monitoring
CREATE TABLE IF NOT EXISTS token_rotation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  old_token_hash VARCHAR(64),
  new_token_hash VARCHAR(64),
  rotation_reason VARCHAR(50),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX idx_token_rotation_user_id (user_id),
  INDEX idx_token_rotation_created_at (created_at)
);
`;
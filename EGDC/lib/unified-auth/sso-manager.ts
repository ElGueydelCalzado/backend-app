import { Pool } from 'pg'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

interface UnifiedUser {
  id: string
  email: string
  firstName: string
  lastName: string
  roles: UserRole[]
  platforms: PlatformAccess[]
  preferences: UserPreferences
  profile: UserProfile
  security: SecuritySettings
  isActive: boolean
  lastLogin: Date
  createdAt: Date
}

interface UserRole {
  platform: string
  role: string
  permissions: string[]
  grantedAt: Date
  grantedBy: string
}

interface PlatformAccess {
  platform: 'business_hub' | 'consumer_store' | 'affiliate_portal' | 'analytics_dashboard'
  accessLevel: 'full' | 'limited' | 'read_only'
  tenantId?: string
  lastAccessed?: Date
  isEnabled: boolean
}

interface UserPreferences {
  language: string
  timezone: string
  currency: string
  notifications: NotificationSettings
  theme: 'light' | 'dark' | 'auto'
  dashboard: DashboardPreferences
}

interface NotificationSettings {
  email: boolean
  sms: boolean
  push: boolean
  marketing: boolean
  orderUpdates: boolean
  loyaltyRewards: boolean
  affiliateEarnings: boolean
}

interface DashboardPreferences {
  defaultView: string
  widgets: string[]
  layout: 'grid' | 'list'
  refreshInterval: number
}

interface UserProfile {
  avatarUrl?: string
  phone?: string
  address?: Address
  company?: string
  website?: string
  bio?: string
  socialLinks?: SocialLinks
  bankAccount?: BankAccount
}

interface Address {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

interface SocialLinks {
  linkedin?: string
  twitter?: string
  instagram?: string
  facebook?: string
}

interface BankAccount {
  accountName: string
  bankName: string
  accountNumber: string
  routingNumber?: string
  swiftCode?: string
}

interface SecuritySettings {
  twoFactorEnabled: boolean
  passwordLastChanged: Date
  loginAttempts: number
  lockedUntil?: Date
  trustedDevices: TrustedDevice[]
  apiKeys: ApiKey[]
}

interface TrustedDevice {
  id: string
  name: string
  deviceFingerprint: string
  lastUsed: Date
  isActive: boolean
}

interface ApiKey {
  id: string
  name: string
  key: string
  permissions: string[]
  lastUsed?: Date
  expiresAt?: Date
  isActive: boolean
}

interface SSOToken {
  userId: string
  platforms: string[]
  sessionId: string
  issuedAt: Date
  expiresAt: Date
  refreshToken?: string
}

interface LoginAttempt {
  userId?: string
  email: string
  ipAddress: string
  userAgent: string
  success: boolean
  platform: string
  timestamp: Date
  failureReason?: string
}

export class UnifiedSSOManager {
  private pool: Pool
  private jwtSecret: string
  private refreshSecret: string

  constructor(pool: Pool) {
    this.pool = pool
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret'
    this.refreshSecret = process.env.REFRESH_SECRET || 'fallback-refresh-secret'
  }

  public async initialize(): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      // Create unified user tables
      await client.query(`
        CREATE TABLE IF NOT EXISTS unified_users (
          id VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          first_name VARCHAR(255) NOT NULL,
          last_name VARCHAR(255) NOT NULL,
          is_active BOOLEAN DEFAULT true,
          is_verified BOOLEAN DEFAULT false,
          verification_token VARCHAR(255),
          password_reset_token VARCHAR(255),
          password_reset_expires TIMESTAMP WITH TIME ZONE,
          last_login TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS user_roles (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL REFERENCES unified_users(id) ON DELETE CASCADE,
          platform VARCHAR(100) NOT NULL,
          role VARCHAR(100) NOT NULL,
          permissions JSONB DEFAULT '[]',
          tenant_id VARCHAR(255),
          granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          granted_by VARCHAR(255),
          is_active BOOLEAN DEFAULT true
        )
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS platform_access (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL REFERENCES unified_users(id) ON DELETE CASCADE,
          platform VARCHAR(100) NOT NULL,
          access_level VARCHAR(50) NOT NULL,
          tenant_id VARCHAR(255),
          last_accessed TIMESTAMP WITH TIME ZONE,
          is_enabled BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          user_id VARCHAR(255) PRIMARY KEY REFERENCES unified_users(id) ON DELETE CASCADE,
          language VARCHAR(10) DEFAULT 'es',
          timezone VARCHAR(100) DEFAULT 'America/Mexico_City',
          currency VARCHAR(10) DEFAULT 'MXN',
          theme VARCHAR(20) DEFAULT 'light',
          notifications JSONB DEFAULT '{}',
          dashboard JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS user_profiles (
          user_id VARCHAR(255) PRIMARY KEY REFERENCES unified_users(id) ON DELETE CASCADE,
          avatar_url VARCHAR(500),
          phone VARCHAR(50),
          address JSONB,
          company VARCHAR(255),
          website VARCHAR(500),
          bio TEXT,
          social_links JSONB,
          bank_account JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS user_security (
          user_id VARCHAR(255) PRIMARY KEY REFERENCES unified_users(id) ON DELETE CASCADE,
          two_factor_enabled BOOLEAN DEFAULT false,
          two_factor_secret VARCHAR(255),
          password_last_changed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          login_attempts INTEGER DEFAULT 0,
          locked_until TIMESTAMP WITH TIME ZONE,
          trusted_devices JSONB DEFAULT '[]',
          api_keys JSONB DEFAULT '[]',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS sso_sessions (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL REFERENCES unified_users(id) ON DELETE CASCADE,
          session_token VARCHAR(500) NOT NULL,
          refresh_token VARCHAR(500),
          platforms JSONB NOT NULL,
          ip_address INET,
          user_agent TEXT,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS login_attempts (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) REFERENCES unified_users(id),
          email VARCHAR(255) NOT NULL,
          ip_address INET,
          user_agent TEXT,
          platform VARCHAR(100) NOT NULL,
          success BOOLEAN NOT NULL,
          failure_reason VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS user_activity_log (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL REFERENCES unified_users(id),
          platform VARCHAR(100) NOT NULL,
          action VARCHAR(100) NOT NULL,
          resource VARCHAR(255),
          details JSONB,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_unified_users_email ON unified_users(email);
        CREATE INDEX IF NOT EXISTS idx_user_roles_user_platform ON user_roles(user_id, platform);
        CREATE INDEX IF NOT EXISTS idx_platform_access_user_platform ON platform_access(user_id, platform);
        CREATE INDEX IF NOT EXISTS idx_sso_sessions_user_id ON sso_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sso_sessions_token ON sso_sessions(session_token);
        CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
        CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at);
        CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_log(user_id);
      `)

    } finally {
      client.release()
    }
  }

  public async createUser(userData: {
    email: string
    password: string
    firstName: string
    lastName: string
    platforms: string[]
    role?: string
    tenantId?: string
  }): Promise<UnifiedUser> {
    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')

      const userId = `user_${crypto.randomBytes(16).toString('hex')}`
      const passwordHash = await this.hashPassword(userData.password)
      const verificationToken = crypto.randomBytes(32).toString('hex')

      // Create user
      await client.query(`
        INSERT INTO unified_users (
          id, email, password_hash, first_name, last_name, verification_token
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [userId, userData.email, passwordHash, userData.firstName, userData.lastName, verificationToken])

      // Set up platform access
      for (const platform of userData.platforms) {
        await client.query(`
          INSERT INTO platform_access (user_id, platform, access_level, tenant_id)
          VALUES ($1, $2, $3, $4)
        `, [userId, platform, 'full', userData.tenantId])

        // Set default role
        const defaultRole = this.getDefaultRoleForPlatform(platform)
        await client.query(`
          INSERT INTO user_roles (user_id, platform, role, permissions, tenant_id)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          userId, 
          platform, 
          userData.role || defaultRole.role, 
          JSON.stringify(defaultRole.permissions),
          userData.tenantId
        ])
      }

      // Create default preferences
      await client.query(`
        INSERT INTO user_preferences (user_id, notifications, dashboard)
        VALUES ($1, $2, $3)
      `, [
        userId,
        JSON.stringify({
          email: true,
          sms: false,
          push: true,
          marketing: false,
          orderUpdates: true,
          loyaltyRewards: true,
          affiliateEarnings: true
        }),
        JSON.stringify({
          defaultView: 'overview',
          widgets: ['sales', 'inventory', 'customers'],
          layout: 'grid',
          refreshInterval: 300
        })
      ])

      // Create profile
      await client.query(`
        INSERT INTO user_profiles (user_id) VALUES ($1)
      `, [userId])

      // Create security settings
      await client.query(`
        INSERT INTO user_security (user_id) VALUES ($1)
      `, [userId])

      await client.query('COMMIT')

      return await this.getUserById(userId)

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  public async authenticateUser(
    email: string,
    password: string,
    platform: string,
    loginContext: {
      ipAddress: string
      userAgent: string
    }
  ): Promise<{ user: UnifiedUser; tokens: SSOToken } | null> {
    const client = await this.pool.connect()
    
    try {
      // Log login attempt
      const loginAttempt: LoginAttempt = {
        email,
        ipAddress: loginContext.ipAddress,
        userAgent: loginContext.userAgent,
        platform,
        success: false,
        timestamp: new Date()
      }

      // Get user
      const userResult = await client.query(`
        SELECT u.*, us.login_attempts, us.locked_until
        FROM unified_users u
        LEFT JOIN user_security us ON u.id = us.user_id
        WHERE u.email = $1 AND u.is_active = true
      `, [email])

      if (userResult.rows.length === 0) {
        loginAttempt.failureReason = 'User not found'
        await this.logLoginAttempt(client, loginAttempt)
        return null
      }

      const userData = userResult.rows[0]
      loginAttempt.userId = userData.id

      // Check if account is locked
      if (userData.locked_until && new Date(userData.locked_until) > new Date()) {
        loginAttempt.failureReason = 'Account locked'
        await this.logLoginAttempt(client, loginAttempt)
        return null
      }

      // Check password
      const passwordValid = await this.verifyPassword(password, userData.password_hash)
      if (!passwordValid) {
        loginAttempt.failureReason = 'Invalid password'
        await this.logLoginAttempt(client, loginAttempt)
        
        // Increment login attempts
        await this.incrementLoginAttempts(client, userData.id)
        return null
      }

      // Check platform access
      const accessResult = await client.query(`
        SELECT * FROM platform_access 
        WHERE user_id = $1 AND platform = $2 AND is_enabled = true
      `, [userData.id, platform])

      if (accessResult.rows.length === 0) {
        loginAttempt.failureReason = 'Platform access denied'
        await this.logLoginAttempt(client, loginAttempt)
        return null
      }

      // Success - reset login attempts and update last login
      await client.query(`
        UPDATE user_security 
        SET login_attempts = 0, locked_until = NULL 
        WHERE user_id = $1
      `, [userData.id])

      await client.query(`
        UPDATE unified_users 
        SET last_login = NOW() 
        WHERE id = $1
      `, [userData.id])

      // Update platform last accessed
      await client.query(`
        UPDATE platform_access 
        SET last_accessed = NOW() 
        WHERE user_id = $1 AND platform = $2
      `, [userData.id, platform])

      loginAttempt.success = true
      await this.logLoginAttempt(client, loginAttempt)

      // Get full user object
      const user = await this.getUserById(userData.id)

      // Create SSO session
      const tokens = await this.createSSOSession(client, user, [platform], loginContext)

      // Log user activity
      await this.logUserActivity(client, userData.id, platform, 'login', null, {
        ipAddress: loginContext.ipAddress,
        userAgent: loginContext.userAgent
      })

      return { user, tokens }

    } finally {
      client.release()
    }
  }

  public async createSSOSession(
    client: any,
    user: UnifiedUser,
    platforms: string[],
    context: { ipAddress: string; userAgent: string }
  ): Promise<SSOToken> {
    const sessionId = crypto.randomBytes(32).toString('hex')
    const sessionToken = jwt.sign(
      {
        userId: user.id,
        sessionId,
        platforms,
        iat: Math.floor(Date.now() / 1000)
      },
      this.jwtSecret,
      { expiresIn: '8h' }
    )

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        sessionId,
        type: 'refresh'
      },
      this.refreshSecret,
      { expiresIn: '30d' }
    )

    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours

    await client.query(`
      INSERT INTO sso_sessions (
        id, user_id, session_token, refresh_token, platforms,
        ip_address, user_agent, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      sessionId,
      user.id,
      sessionToken,
      refreshToken,
      JSON.stringify(platforms),
      context.ipAddress,
      context.userAgent,
      expiresAt
    ])

    return {
      userId: user.id,
      platforms,
      sessionId,
      issuedAt: new Date(),
      expiresAt,
      refreshToken
    }
  }

  public async validateSSOToken(token: string): Promise<{ user: UnifiedUser; platforms: string[] } | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any
      
      // Check if session is still active
      const sessionResult = await this.pool.query(`
        SELECT s.*, u.is_active
        FROM sso_sessions s
        JOIN unified_users u ON s.user_id = u.id
        WHERE s.id = $1 AND s.is_active = true AND s.expires_at > NOW()
      `, [decoded.sessionId])

      if (sessionResult.rows.length === 0) {
        return null
      }

      const sessionData = sessionResult.rows[0]
      if (!sessionData.is_active) {
        return null
      }

      const user = await this.getUserById(decoded.userId)
      const platforms = JSON.parse(sessionData.platforms)

      return { user, platforms }

    } catch (error) {
      return null
    }
  }

  public async refreshSSOToken(refreshToken: string): Promise<SSOToken | null> {
    const client = await this.pool.connect()
    
    try {
      const decoded = jwt.verify(refreshToken, this.refreshSecret) as any
      
      if (decoded.type !== 'refresh') {
        return null
      }

      // Get session
      const sessionResult = await client.query(`
        SELECT * FROM sso_sessions 
        WHERE id = $1 AND user_id = $2 AND is_active = true
      `, [decoded.sessionId, decoded.userId])

      if (sessionResult.rows.length === 0) {
        return null
      }

      const sessionData = sessionResult.rows[0]
      const user = await this.getUserById(decoded.userId)
      const platforms = JSON.parse(sessionData.platforms)

      // Create new session token
      const newSessionToken = jwt.sign(
        {
          userId: user.id,
          sessionId: decoded.sessionId,
          platforms,
          iat: Math.floor(Date.now() / 1000)
        },
        this.jwtSecret,
        { expiresIn: '8h' }
      )

      const newExpiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000)

      // Update session
      await client.query(`
        UPDATE sso_sessions 
        SET session_token = $1, expires_at = $2
        WHERE id = $3
      `, [newSessionToken, newExpiresAt, decoded.sessionId])

      return {
        userId: user.id,
        platforms,
        sessionId: decoded.sessionId,
        issuedAt: new Date(),
        expiresAt: newExpiresAt,
        refreshToken
      }

    } catch (error) {
      return null
    } finally {
      client.release()
    }
  }

  public async addPlatformAccess(
    userId: string,
    platform: string,
    accessLevel: string,
    role: string,
    tenantId?: string
  ): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')

      // Add platform access
      await client.query(`
        INSERT INTO platform_access (user_id, platform, access_level, tenant_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, platform) 
        DO UPDATE SET 
          access_level = EXCLUDED.access_level,
          tenant_id = EXCLUDED.tenant_id,
          is_enabled = true
      `, [userId, platform, accessLevel, tenantId])

      // Add role
      const defaultRole = this.getDefaultRoleForPlatform(platform)
      await client.query(`
        INSERT INTO user_roles (user_id, platform, role, permissions, tenant_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, platform)
        DO UPDATE SET
          role = EXCLUDED.role,
          permissions = EXCLUDED.permissions,
          tenant_id = EXCLUDED.tenant_id,
          is_active = true
      `, [
        userId, 
        platform, 
        role || defaultRole.role, 
        JSON.stringify(defaultRole.permissions),
        tenantId
      ])

      await client.query('COMMIT')

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  public async getUserById(userId: string): Promise<UnifiedUser> {
    const client = await this.pool.connect()
    
    try {
      const [userResult, rolesResult, accessResult, prefsResult, profileResult, securityResult] = await Promise.all([
        client.query('SELECT * FROM unified_users WHERE id = $1', [userId]),
        client.query('SELECT * FROM user_roles WHERE user_id = $1 AND is_active = true', [userId]),
        client.query('SELECT * FROM platform_access WHERE user_id = $1 AND is_enabled = true', [userId]),
        client.query('SELECT * FROM user_preferences WHERE user_id = $1', [userId]),
        client.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]),
        client.query('SELECT * FROM user_security WHERE user_id = $1', [userId])
      ])

      if (userResult.rows.length === 0) {
        throw new Error('User not found')
      }

      const userData = userResult.rows[0]
      const rolesData = rolesResult.rows
      const accessData = accessResult.rows
      const prefsData = prefsResult.rows[0] || {}
      const profileData = profileResult.rows[0] || {}
      const securityData = securityResult.rows[0] || {}

      return {
        id: userData.id,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        roles: rolesData.map((role: any) => ({
          platform: role.platform,
          role: role.role,
          permissions: role.permissions || [],
          grantedAt: new Date(role.granted_at),
          grantedBy: role.granted_by
        })),
        platforms: accessData.map((access: any) => ({
          platform: access.platform,
          accessLevel: access.access_level,
          tenantId: access.tenant_id,
          lastAccessed: access.last_accessed,
          isEnabled: access.is_enabled
        })),
        preferences: {
          language: prefsData.language || 'es',
          timezone: prefsData.timezone || 'America/Mexico_City',
          currency: prefsData.currency || 'MXN',
          theme: prefsData.theme || 'light',
          notifications: prefsData.notifications || {},
          dashboard: prefsData.dashboard || {}
        },
        profile: {
          avatarUrl: profileData.avatar_url,
          phone: profileData.phone,
          address: profileData.address,
          company: profileData.company,
          website: profileData.website,
          bio: profileData.bio,
          socialLinks: profileData.social_links,
          bankAccount: profileData.bank_account
        },
        security: {
          twoFactorEnabled: securityData.two_factor_enabled || false,
          passwordLastChanged: new Date(securityData.password_last_changed),
          loginAttempts: securityData.login_attempts || 0,
          lockedUntil: securityData.locked_until,
          trustedDevices: securityData.trusted_devices || [],
          apiKeys: securityData.api_keys || []
        },
        isActive: userData.is_active,
        lastLogin: userData.last_login,
        createdAt: new Date(userData.created_at)
      }

    } finally {
      client.release()
    }
  }

  public async logUserActivity(
    client: any,
    userId: string,
    platform: string,
    action: string,
    resource?: string,
    details?: any
  ): Promise<void> {
    await client.query(`
      INSERT INTO user_activity_log (
        user_id, platform, action, resource, details,
        ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      userId,
      platform,
      action,
      resource,
      JSON.stringify(details),
      details?.ipAddress,
      details?.userAgent
    ])
  }

  public async revokeSSOSession(sessionId: string): Promise<void> {
    await this.pool.query(`
      UPDATE sso_sessions 
      SET is_active = false 
      WHERE id = $1
    `, [sessionId])
  }

  public async revokeAllUserSessions(userId: string): Promise<void> {
    await this.pool.query(`
      UPDATE sso_sessions 
      SET is_active = false 
      WHERE user_id = $1
    `, [userId])
  }

  private async hashPassword(password: string): Promise<string> {
    const bcrypt = require('bcrypt')
    return await bcrypt.hash(password, 12)
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = require('bcrypt')
    return await bcrypt.compare(password, hash)
  }

  private async logLoginAttempt(client: any, attempt: LoginAttempt): Promise<void> {
    await client.query(`
      INSERT INTO login_attempts (
        user_id, email, ip_address, user_agent, platform,
        success, failure_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      attempt.userId,
      attempt.email,
      attempt.ipAddress,
      attempt.userAgent,
      attempt.platform,
      attempt.success,
      attempt.failureReason
    ])
  }

  private async incrementLoginAttempts(client: any, userId: string): Promise<void> {
    const result = await client.query(`
      UPDATE user_security 
      SET login_attempts = login_attempts + 1
      WHERE user_id = $1
      RETURNING login_attempts
    `, [userId])

    const attempts = result.rows[0]?.login_attempts || 0

    // Lock account after 5 failed attempts for 30 minutes
    if (attempts >= 5) {
      const lockUntil = new Date(Date.now() + 30 * 60 * 1000)
      await client.query(`
        UPDATE user_security 
        SET locked_until = $1 
        WHERE user_id = $2
      `, [lockUntil, userId])
    }
  }

  private getDefaultRoleForPlatform(platform: string): { role: string; permissions: string[] } {
    const defaultRoles: { [key: string]: { role: string; permissions: string[] } } = {
      'business_hub': {
        role: 'user',
        permissions: ['read:products', 'write:products', 'read:orders', 'read:analytics']
      },
      'consumer_store': {
        role: 'customer',
        permissions: ['read:products', 'write:cart', 'read:orders', 'write:reviews']
      },
      'affiliate_portal': {
        role: 'affiliate',
        permissions: ['read:stats', 'write:links', 'read:commissions', 'write:profile']
      },
      'analytics_dashboard': {
        role: 'viewer',
        permissions: ['read:analytics', 'read:reports']
      }
    }

    return defaultRoles[platform] || { role: 'user', permissions: ['read:basic'] }
  }

  public async getUserSessions(userId: string): Promise<any[]> {
    const result = await this.pool.query(`
      SELECT 
        id, platforms, ip_address, user_agent,
        expires_at, is_active, created_at
      FROM sso_sessions 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [userId])

    return result.rows.map(session => ({
      ...session,
      platforms: JSON.parse(session.platforms)
    }))
  }

  public async getLoginHistory(userId: string, limit: number = 50): Promise<LoginAttempt[]> {
    const result = await this.pool.query(`
      SELECT * FROM login_attempts 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `, [userId, limit])

    return result.rows.map(attempt => ({
      userId: attempt.user_id,
      email: attempt.email,
      ipAddress: attempt.ip_address,
      userAgent: attempt.user_agent,
      platform: attempt.platform,
      success: attempt.success,
      timestamp: new Date(attempt.created_at),
      failureReason: attempt.failure_reason
    }))
  }

  public async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      const updateFields = []
      const params = [userId]
      let paramIndex = 2

      if (preferences.language) {
        updateFields.push(`language = $${paramIndex}`)
        params.push(preferences.language)
        paramIndex++
      }

      if (preferences.timezone) {
        updateFields.push(`timezone = $${paramIndex}`)
        params.push(preferences.timezone)
        paramIndex++
      }

      if (preferences.currency) {
        updateFields.push(`currency = $${paramIndex}`)
        params.push(preferences.currency)
        paramIndex++
      }

      if (preferences.theme) {
        updateFields.push(`theme = $${paramIndex}`)
        params.push(preferences.theme)
        paramIndex++
      }

      if (preferences.notifications) {
        updateFields.push(`notifications = $${paramIndex}`)
        params.push(JSON.stringify(preferences.notifications))
        paramIndex++
      }

      if (preferences.dashboard) {
        updateFields.push(`dashboard = $${paramIndex}`)
        params.push(JSON.stringify(preferences.dashboard))
        paramIndex++
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = NOW()')
        
        const query = `
          UPDATE user_preferences 
          SET ${updateFields.join(', ')} 
          WHERE user_id = $1
        `

        await client.query(query, params)
      }

    } finally {
      client.release()
    }
  }
}

export const unifiedSSOSchema = `
  -- This schema is included in the UnifiedSSOManager.initialize() method
  -- Run this method to create all necessary SSO tables and structures
`
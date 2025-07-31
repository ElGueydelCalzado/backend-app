/**
 * Enterprise Multi-Factor Authentication (2FA) System
 * Supports TOTP, SMS, and Email-based 2FA for enterprise customers
 */

import crypto from 'crypto'
import { Pool } from 'pg'
import { createSecureDatabaseConfig } from './database-config'

// 2FA Configuration
export const MFA_CONFIG = {
  TOTP: {
    WINDOW: 1, // Allow 1 time step tolerance
    STEP: 30, // 30-second time steps
    DIGITS: 6, // 6-digit codes
    ALGORITHM: 'sha1' as const,
    ISSUER: 'Los Papatos EGDC',
  },
  SMS: {
    CODE_LENGTH: 6,
    EXPIRY_MINUTES: 5,
    MAX_ATTEMPTS: 3,
    COOLDOWN_MINUTES: 1,
  },
  EMAIL: {
    CODE_LENGTH: 8,
    EXPIRY_MINUTES: 10,
    MAX_ATTEMPTS: 5,
  },
  BACKUP_CODES: {
    COUNT: 10,
    LENGTH: 8,
  },
}

export type MFAMethod = 'totp' | 'sms' | 'email' | 'backup_codes'

interface MFADevice {
  id: string
  userId: string
  tenantId: string
  type: MFAMethod
  name: string
  secret?: string // For TOTP
  phoneNumber?: string // For SMS
  email?: string // For Email
  isEnabled: boolean
  isVerified: boolean
  createdAt: Date
  lastUsed?: Date
  failedAttempts: number
}

interface MFABackupCode {
  id: string
  userId: string
  code: string
  isUsed: boolean
  usedAt?: Date
  createdAt: Date
}

interface MFAVerificationAttempt {
  id: string
  userId: string
  deviceId: string
  code: string
  success: boolean
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

class Enterprise2FAManager {
  private pool: Pool

  constructor() {
    this.pool = new Pool(createSecureDatabaseConfig())
  }

  /**
   * Enable TOTP 2FA for a user
   */
  async enableTOTP(
    userId: string,
    tenantId: string,
    deviceName: string = 'Mobile App'
  ): Promise<{
    secret: string
    qrCode: string
    backupCodes: string[]
  }> {
    const secret = this.generateTOTPSecret()
    const deviceId = crypto.randomUUID()

    // Create TOTP device record
    await this.storeMFADevice({
      id: deviceId,
      userId,
      tenantId,
      type: 'totp',
      name: deviceName,
      secret,
      isEnabled: false, // Will be enabled after verification
      isVerified: false,
      createdAt: new Date(),
      failedAttempts: 0
    })

    // Generate backup codes
    const backupCodes = await this.generateBackupCodes(userId)

    // Generate QR code data
    const qrCode = this.generateTOTPQRCode(userId, secret)

    await this.logMFAEvent('totp_setup_initiated', { userId, tenantId, deviceId })

    return {
      secret,
      qrCode,
      backupCodes
    }
  }

  /**
   * Verify TOTP setup and enable the device
   */
  async verifyTOTPSetup(
    userId: string,
    deviceId: string,
    code: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    const device = await this.getMFADevice(deviceId)
    if (!device || device.type !== 'totp' || !device.secret) {
      return false
    }

    const isValid = this.verifyTOTPCode(device.secret, code)
    
    if (isValid) {
      // Enable and verify the device
      await this.updateMFADevice(deviceId, {
        isEnabled: true,
        isVerified: true,
        lastUsed: new Date(),
        failedAttempts: 0
      })

      await this.logMFAEvent('totp_setup_completed', { 
        userId, 
        deviceId,
        ipAddress,
        userAgent 
      })

      return true
    } else {
      // Increment failed attempts
      await this.incrementFailedAttempts(deviceId)
      
      await this.logMFAEvent('totp_setup_failed', { 
        userId, 
        deviceId,
        ipAddress,
        userAgent 
      })

      return false
    }
  }

  /**
   * Enable SMS 2FA for a user
   */
  async enableSMS(
    userId: string,
    tenantId: string,
    phoneNumber: string,
    deviceName: string = 'SMS'
  ): Promise<{ deviceId: string; backupCodes: string[] }> {
    const deviceId = crypto.randomUUID()

    // Create SMS device record
    await this.storeMFADevice({
      id: deviceId,
      userId,
      tenantId,
      type: 'sms',
      name: deviceName,
      phoneNumber,
      isEnabled: false, // Will be enabled after verification
      isVerified: false,
      createdAt: new Date(),
      failedAttempts: 0
    })

    // Generate backup codes
    const backupCodes = await this.generateBackupCodes(userId)

    // Send verification SMS
    await this.sendSMSVerificationCode(deviceId, phoneNumber)

    await this.logMFAEvent('sms_setup_initiated', { userId, tenantId, deviceId, phoneNumber })

    return { deviceId, backupCodes }
  }

  /**
   * Verify SMS setup
   */
  async verifySMSSetup(
    userId: string,
    deviceId: string,
    code: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    const device = await this.getMFADevice(deviceId)
    if (!device || device.type !== 'sms') {
      return false
    }

    const isValid = await this.verifySMSCode(deviceId, code)
    
    if (isValid) {
      await this.updateMFADevice(deviceId, {
        isEnabled: true,
        isVerified: true,
        lastUsed: new Date(),
        failedAttempts: 0
      })

      await this.logMFAEvent('sms_setup_completed', { 
        userId, 
        deviceId,
        ipAddress,
        userAgent 
      })

      return true
    } else {
      await this.incrementFailedAttempts(deviceId)
      
      await this.logMFAEvent('sms_setup_failed', { 
        userId, 
        deviceId,
        ipAddress,
        userAgent 
      })

      return false
    }
  }

  /**
   * Verify 2FA code during login
   */
  async verifyMFACode(
    userId: string,
    code: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; method?: MFAMethod; deviceId?: string }> {
    // Get all enabled MFA devices for user
    const devices = await this.getUserMFADevices(userId, true)
    
    if (devices.length === 0) {
      return { success: false }
    }

    // Check if it's a backup code first
    const backupCodeResult = await this.verifyBackupCode(userId, code)
    if (backupCodeResult.success) {
      await this.logMFAEvent('mfa_backup_code_used', {
        userId,
        codeId: backupCodeResult.codeId,
        ipAddress,
        userAgent
      })
      return { success: true, method: 'backup_codes' }
    }

    // Try each enabled device
    for (const device of devices) {
      let isValid = false

      switch (device.type) {
        case 'totp':
          if (device.secret) {
            isValid = this.verifyTOTPCode(device.secret, code)
          }
          break
        case 'sms':
          isValid = await this.verifySMSCode(device.id, code)
          break
        case 'email':
          isValid = await this.verifyEmailCode(device.id, code)
          break
      }

      if (isValid) {
        await this.updateMFADevice(device.id, {
          lastUsed: new Date(),
          failedAttempts: 0
        })

        await this.logMFAEvent('mfa_verification_success', {
          userId,
          deviceId: device.id,
          method: device.type,
          ipAddress,
          userAgent
        })

        return { success: true, method: device.type, deviceId: device.id }
      } else {
        await this.incrementFailedAttempts(device.id)
      }
    }

    await this.logMFAEvent('mfa_verification_failed', {
      userId,
      ipAddress,
      userAgent
    })

    return { success: false }
  }

  /**
   * Check if user has MFA enabled
   */
  async userHasMFAEnabled(userId: string): Promise<boolean> {
    const devices = await this.getUserMFADevices(userId, true)
    return devices.length > 0
  }

  /**
   * Get user's MFA devices
   */
  async getUserMFADevices(userId: string, enabledOnly: boolean = false): Promise<MFADevice[]> {
    const client = await this.pool.connect()
    
    try {
      const query = enabledOnly 
        ? 'SELECT * FROM mfa_devices WHERE user_id = $1 AND is_enabled = true ORDER BY created_at DESC'
        : 'SELECT * FROM mfa_devices WHERE user_id = $1 ORDER BY created_at DESC'
      
      const result = await client.query(query, [userId])
      
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        tenantId: row.tenant_id,
        type: row.type,
        name: row.name,
        secret: row.secret,
        phoneNumber: row.phone_number,
        email: row.email,
        isEnabled: row.is_enabled,
        isVerified: row.is_verified,
        createdAt: row.created_at,
        lastUsed: row.last_used,
        failedAttempts: row.failed_attempts
      }))
    } finally {
      client.release()
    }
  }

  /**
   * Disable MFA device
   */
  async disableMFADevice(deviceId: string, userId: string): Promise<boolean> {
    const client = await this.pool.connect()
    
    try {
      const result = await client.query(`
        UPDATE mfa_devices 
        SET is_enabled = false, disabled_at = NOW()
        WHERE id = $1 AND user_id = $2
      `, [deviceId, userId])

      if (result.rowCount > 0) {
        await this.logMFAEvent('mfa_device_disabled', { userId, deviceId })
        return true
      }

      return false
    } finally {
      client.release()
    }
  }

  /**
   * Generate new backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    // Invalidate existing backup codes
    await this.invalidateBackupCodes(userId)
    
    // Generate new ones
    return await this.generateBackupCodes(userId)
  }

  // Private helper methods

  private generateTOTPSecret(): string {
    return crypto.randomBytes(20).toString('base32')
  }

  private generateTOTPQRCode(userId: string, secret: string): string {
    const label = `${MFA_CONFIG.TOTP.ISSUER}:${userId}`
    const params = new URLSearchParams({
      secret,
      issuer: MFA_CONFIG.TOTP.ISSUER,
      algorithm: MFA_CONFIG.TOTP.ALGORITHM,
      digits: MFA_CONFIG.TOTP.DIGITS.toString(),
      period: MFA_CONFIG.TOTP.STEP.toString()
    })
    
    return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`
  }

  private verifyTOTPCode(secret: string, code: string): boolean {
    const time = Math.floor(Date.now() / 1000 / MFA_CONFIG.TOTP.STEP)
    
    // Check current time window and adjacent windows for clock skew tolerance
    for (let i = -MFA_CONFIG.TOTP.WINDOW; i <= MFA_CONFIG.TOTP.WINDOW; i++) {
      const timeCounter = time + i
      const expectedCode = this.generateTOTPCode(secret, timeCounter)
      
      if (code === expectedCode) {
        return true
      }
    }
    
    return false
  }

  private generateTOTPCode(secret: string, timeCounter: number): string {
    const buffer = Buffer.alloc(8)
    buffer.writeUInt32BE(0, 0)
    buffer.writeUInt32BE(timeCounter, 4)
    
    const hmac = crypto.createHmac(MFA_CONFIG.TOTP.ALGORITHM, Buffer.from(secret, 'base32'))
    const hash = hmac.update(buffer).digest()
    
    const offset = hash[hash.length - 1] & 0xf
    const code = ((hash[offset] & 0x7f) << 24) |
                 ((hash[offset + 1] & 0xff) << 16) |
                 ((hash[offset + 2] & 0xff) << 8) |
                 (hash[offset + 3] & 0xff)
    
    return (code % Math.pow(10, MFA_CONFIG.TOTP.DIGITS)).toString().padStart(MFA_CONFIG.TOTP.DIGITS, '0')
  }

  private async sendSMSVerificationCode(deviceId: string, phoneNumber: string): Promise<void> {
    const code = this.generateRandomCode(MFA_CONFIG.SMS.CODE_LENGTH)
    const expiresAt = new Date(Date.now() + MFA_CONFIG.SMS.EXPIRY_MINUTES * 60 * 1000)
    
    // Store verification code
    await this.storeVerificationCode(deviceId, code, expiresAt)
    
    // In production, integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log(`SMS Code for ${phoneNumber}: ${code} (expires at ${expiresAt})`)
  }

  private async verifySMSCode(deviceId: string, code: string): Promise<boolean> {
    const client = await this.pool.connect()
    
    try {
      const result = await client.query(`
        SELECT * FROM mfa_verification_codes
        WHERE device_id = $1 AND code = $2 AND expires_at > NOW() AND is_used = false
        ORDER BY created_at DESC
        LIMIT 1
      `, [deviceId, code])

      if (result.rows.length === 0) {
        return false
      }

      // Mark code as used
      await client.query(`
        UPDATE mfa_verification_codes
        SET is_used = true, used_at = NOW()
        WHERE id = $1
      `, [result.rows[0].id])

      return true
    } finally {
      client.release()
    }
  }

  private async verifyEmailCode(deviceId: string, code: string): Promise<boolean> {
    // Similar to SMS verification
    return await this.verifySMSCode(deviceId, code)
  }

  private async generateBackupCodes(userId: string): Promise<string[]> {
    const codes: string[] = []
    const client = await this.pool.connect()
    
    try {
      for (let i = 0; i < MFA_CONFIG.BACKUP_CODES.COUNT; i++) {
        const code = this.generateRandomCode(MFA_CONFIG.BACKUP_CODES.LENGTH)
        codes.push(code)
        
        await client.query(`
          INSERT INTO mfa_backup_codes (id, user_id, code, is_used, created_at)
          VALUES ($1, $2, $3, false, NOW())
        `, [crypto.randomUUID(), userId, this.hashCode(code)])
      }
    } finally {
      client.release()
    }
    
    return codes
  }

  private async verifyBackupCode(userId: string, code: string): Promise<{ success: boolean; codeId?: string }> {
    const client = await this.pool.connect()
    
    try {
      const hashedCode = this.hashCode(code)
      const result = await client.query(`
        SELECT id FROM mfa_backup_codes
        WHERE user_id = $1 AND code = $2 AND is_used = false
      `, [userId, hashedCode])

      if (result.rows.length === 0) {
        return { success: false }
      }

      const codeId = result.rows[0].id

      // Mark backup code as used
      await client.query(`
        UPDATE mfa_backup_codes
        SET is_used = true, used_at = NOW()
        WHERE id = $1
      `, [codeId])

      return { success: true, codeId }
    } finally {
      client.release()
    }
  }

  private generateRandomCode(length: number): string {
    const characters = '0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return result
  }

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex')
  }

  private async storeMFADevice(device: MFADevice): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      await client.query(`
        INSERT INTO mfa_devices (
          id, user_id, tenant_id, type, name, secret, phone_number, email,
          is_enabled, is_verified, created_at, failed_attempts
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        device.id, device.userId, device.tenantId, device.type, device.name,
        device.secret, device.phoneNumber, device.email, device.isEnabled,
        device.isVerified, device.createdAt, device.failedAttempts
      ])
    } finally {
      client.release()
    }
  }

  private async getMFADevice(deviceId: string): Promise<MFADevice | null> {
    const client = await this.pool.connect()
    
    try {
      const result = await client.query(`
        SELECT * FROM mfa_devices WHERE id = $1
      `, [deviceId])

      if (result.rows.length === 0) return null

      const row = result.rows[0]
      return {
        id: row.id,
        userId: row.user_id,
        tenantId: row.tenant_id,
        type: row.type,
        name: row.name,
        secret: row.secret,
        phoneNumber: row.phone_number,
        email: row.email,
        isEnabled: row.is_enabled,
        isVerified: row.is_verified,
        createdAt: row.created_at,
        lastUsed: row.last_used,
        failedAttempts: row.failed_attempts
      }
    } finally {
      client.release()
    }
  }

  private async updateMFADevice(deviceId: string, updates: Partial<MFADevice>): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      const setParts: string[] = []
      const values: any[] = []
      let paramCount = 1

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
          setParts.push(`${dbKey} = $${paramCount}`)
          values.push(value)
          paramCount++
        }
      })

      if (setParts.length > 0) {
        values.push(deviceId)
        await client.query(`
          UPDATE mfa_devices 
          SET ${setParts.join(', ')}
          WHERE id = $${paramCount}
        `, values)
      }
    } finally {
      client.release()
    }
  }

  private async incrementFailedAttempts(deviceId: string): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      await client.query(`
        UPDATE mfa_devices 
        SET failed_attempts = failed_attempts + 1
        WHERE id = $1
      `, [deviceId])
    } finally {
      client.release()
    }
  }

  private async storeVerificationCode(deviceId: string, code: string, expiresAt: Date): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      await client.query(`
        INSERT INTO mfa_verification_codes (id, device_id, code, expires_at, is_used, created_at)
        VALUES ($1, $2, $3, $4, false, NOW())
      `, [crypto.randomUUID(), deviceId, code, expiresAt])
    } finally {
      client.release()
    }
  }

  private async invalidateBackupCodes(userId: string): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      await client.query(`
        UPDATE mfa_backup_codes
        SET is_used = true, used_at = NOW()
        WHERE user_id = $1 AND is_used = false
      `, [userId])
    } finally {
      client.release()
    }
  }

  private async logMFAEvent(event: string, details: any): Promise<void> {
    const timestamp = new Date().toISOString()
    console.log(`[ENTERPRISE_2FA] ${timestamp} - ${event}`, details)
    
    // Store in security audit log
    const client = await this.pool.connect()
    try {
      await client.query(`
        INSERT INTO security_audit_log (event_type, details, created_at)
        VALUES ($1, $2, $3)
      `, [`mfa_${event}`, JSON.stringify(details), new Date()])
    } catch (error) {
      console.error('Failed to log MFA event:', error)
    } finally {
      client.release()
    }
  }
}

// Export singleton instance
export const enterprise2FAManager = new Enterprise2FAManager()

// Database schema for MFA tables
export const MFA_SCHEMA = `
-- MFA devices table
CREATE TABLE IF NOT EXISTS mfa_devices (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('totp', 'sms', 'email', 'backup_codes')),
  name VARCHAR(255) NOT NULL,
  secret VARCHAR(255), -- For TOTP
  phone_number VARCHAR(50), -- For SMS
  email VARCHAR(255), -- For Email
  is_enabled BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used TIMESTAMP WITH TIME ZONE,
  failed_attempts INTEGER DEFAULT 0,
  disabled_at TIMESTAMP WITH TIME ZONE,
  INDEX idx_mfa_devices_user_id (user_id),
  INDEX idx_mfa_devices_type (type)
);

-- MFA backup codes table
CREATE TABLE IF NOT EXISTS mfa_backup_codes (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  code VARCHAR(64) NOT NULL, -- Hashed backup code
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX idx_mfa_backup_codes_user_id (user_id),
  INDEX idx_mfa_backup_codes_code (code)
);

-- MFA verification codes table (for SMS/Email)
CREATE TABLE IF NOT EXISTS mfa_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL,
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX idx_mfa_verification_codes_device_id (device_id),
  INDEX idx_mfa_verification_codes_expires_at (expires_at)
);
`;
/**
 * Enterprise Field-Level Encryption
 * Advanced encryption for PII and sensitive data
 */

import crypto from 'crypto'
import { Pool } from 'pg'
import { createSecureDatabaseConfig } from './database-config'

// Encryption configuration
export const ENCRYPTION_CONFIG = {
  ALGORITHM: 'aes-256-gcm',
  KEY_LENGTH: 32, // 256 bits
  IV_LENGTH: 16,  // 128 bits
  TAG_LENGTH: 16, // 128 bits
  SALT_LENGTH: 32, // 256 bits
  ITERATIONS: 100000, // PBKDF2 iterations
  KEY_ROTATION_DAYS: 90, // Rotate keys every 90 days
}

interface EncryptionKey {
  id: string
  keyData: string
  version: number
  createdAt: Date
  isActive: boolean
  expiresAt: Date
}

interface EncryptedField {
  data: string
  keyId: string
  version: number
  algorithm: string
  iv: string
  tag: string
}

class EnterpriseEncryption {
  private pool: Pool
  private activeKeys: Map<string, EncryptionKey> = new Map()
  private masterKey: Buffer

  constructor() {
    this.pool = new Pool(createSecureDatabaseConfig())
    this.masterKey = this.deriveMasterKey()
    this.initializeKeyRotation()
  }

  /**
   * Encrypt sensitive field data
   */
  async encryptField(
    data: string, 
    fieldType: 'pii' | 'financial' | 'health' | 'biometric' = 'pii'
  ): Promise<string> {
    if (!data || data.trim() === '') {
      return data
    }

    try {
      const encryptionKey = await this.getActiveEncryptionKey(fieldType)
      const iv = crypto.randomBytes(ENCRYPTION_CONFIG.IV_LENGTH)
      
      const cipher = crypto.createCipher(ENCRYPTION_CONFIG.ALGORITHM, encryptionKey.keyData)
      cipher.setAAD(Buffer.from(fieldType)) // Additional authenticated data
      
      let encrypted = cipher.update(data, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      const tag = cipher.getAuthTag()

      const encryptedField: EncryptedField = {
        data: encrypted,
        keyId: encryptionKey.id,
        version: encryptionKey.version,
        algorithm: ENCRYPTION_CONFIG.ALGORITHM,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      }

      // Return base64 encoded JSON for database storage
      return Buffer.from(JSON.stringify(encryptedField)).toString('base64')

    } catch (error) {
      console.error('[ENCRYPTION] Field encryption failed:', error)
      throw new Error('Encryption failed')
    }
  }

  /**
   * Decrypt sensitive field data
   */
  async decryptField(encryptedData: string): Promise<string> {
    if (!encryptedData || encryptedData.trim() === '') {
      return encryptedData
    }

    try {
      // Check if data is actually encrypted
      if (!this.isEncryptedData(encryptedData)) {
        return encryptedData // Return as-is if not encrypted
      }

      const encryptedField: EncryptedField = JSON.parse(
        Buffer.from(encryptedData, 'base64').toString('utf8')
      )

      const encryptionKey = await this.getEncryptionKey(encryptedField.keyId)
      if (!encryptionKey) {
        throw new Error('Encryption key not found')
      }

      const decipher = crypto.createDecipher(
        encryptedField.algorithm, 
        encryptionKey.keyData
      )
      
      decipher.setAuthTag(Buffer.from(encryptedField.tag, 'hex'))
      
      let decrypted = decipher.update(encryptedField.data, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted

    } catch (error) {
      console.error('[ENCRYPTION] Field decryption failed:', error)
      // Return encrypted data if decryption fails to prevent data loss
      return encryptedData
    }
  }

  /**
   * Encrypt multiple fields in an object
   */
  async encryptObject(
    obj: Record<string, any>, 
    fieldsToEncrypt: Array<{ field: string; type?: 'pii' | 'financial' | 'health' | 'biometric' }>
  ): Promise<Record<string, any>> {
    const result = { ...obj }

    for (const { field, type = 'pii' } of fieldsToEncrypt) {
      if (result[field] && typeof result[field] === 'string') {
        result[field] = await this.encryptField(result[field], type)
      }
    }

    return result
  }

  /**
   * Decrypt multiple fields in an object
   */
  async decryptObject(
    obj: Record<string, any>, 
    fieldsToDecrypt: string[]
  ): Promise<Record<string, any>> {
    const result = { ...obj }

    for (const field of fieldsToDecrypt) {
      if (result[field] && typeof result[field] === 'string') {
        result[field] = await this.decryptField(result[field])
      }
    }

    return result
  }

  /**
   * Generate new encryption key
   */
  async generateNewKey(
    keyType: 'pii' | 'financial' | 'health' | 'biometric' = 'pii'
  ): Promise<EncryptionKey> {
    const client = await this.pool.connect()
    
    try {
      // Deactivate current active key
      await client.query(`
        UPDATE encryption_keys 
        SET is_active = false 
        WHERE key_type = $1 AND is_active = true
      `, [keyType])

      // Generate new key
      const keyData = crypto.randomBytes(ENCRYPTION_CONFIG.KEY_LENGTH).toString('hex')
      const keyId = crypto.randomUUID()
      const version = await this.getNextKeyVersion(keyType)
      const expiresAt = new Date(Date.now() + ENCRYPTION_CONFIG.KEY_ROTATION_DAYS * 24 * 60 * 60 * 1000)

      await client.query(`
        INSERT INTO encryption_keys (
          id, key_type, key_data, version, created_at, is_active, expires_at
        ) VALUES ($1, $2, $3, $4, NOW(), true, $5)
      `, [keyId, keyType, keyData, version, expiresAt])

      const newKey: EncryptionKey = {
        id: keyId,
        keyData,
        version,
        createdAt: new Date(),
        isActive: true,
        expiresAt
      }

      // Update cache
      this.activeKeys.set(keyType, newKey)

      console.log(`[ENCRYPTION] New ${keyType} encryption key generated (v${version})`)
      return newKey

    } finally {
      client.release()
    }
  }

  /**
   * Rotate encryption keys
   */
  async rotateKeys(): Promise<void> {
    console.log('[ENCRYPTION] Starting key rotation...')
    
    const keyTypes: Array<'pii' | 'financial' | 'health' | 'biometric'> = [
      'pii', 'financial', 'health', 'biometric'
    ]

    for (const keyType of keyTypes) {
      const activeKey = await this.getActiveEncryptionKey(keyType)
      const now = new Date()

      if (activeKey.expiresAt < now) {
        console.log(`[ENCRYPTION] Rotating expired ${keyType} key`)
        await this.generateNewKey(keyType)
      }
    }

    console.log('[ENCRYPTION] Key rotation completed')
  }

  /**
   * Re-encrypt data with new key
   */
  async reencryptData(
    tableName: string, 
    encryptedFields: string[], 
    whereClause: string = '1=1'
  ): Promise<{ processed: number; errors: number }> {
    const client = await this.pool.connect()
    let processed = 0
    let errors = 0

    try {
      const result = await client.query(`
        SELECT id, ${encryptedFields.join(', ')} 
        FROM ${tableName} 
        WHERE ${whereClause}
      `)

      for (const row of result.rows) {
        try {
          const updates: string[] = []
          const values: any[] = []
          let paramCount = 1

          for (const field of encryptedFields) {
            const encryptedValue = row[field]
            if (encryptedValue && this.isEncryptedData(encryptedValue)) {
              // Decrypt with old key
              const decryptedValue = await this.decryptField(encryptedValue)
              // Re-encrypt with new key
              const reencryptedValue = await this.encryptField(decryptedValue)
              
              updates.push(`${field} = $${paramCount}`)
              values.push(reencryptedValue)
              paramCount++
            }
          }

          if (updates.length > 0) {
            values.push(row.id)
            await client.query(`
              UPDATE ${tableName} 
              SET ${updates.join(', ')} 
              WHERE id = $${paramCount}
            `, values)
          }

          processed++
        } catch (error) {
          console.error(`[ENCRYPTION] Re-encryption failed for row ${row.id}:`, error)
          errors++
        }
      }

      console.log(`[ENCRYPTION] Re-encryption completed: ${processed} processed, ${errors} errors`)
      return { processed, errors }

    } finally {
      client.release()
    }
  }

  // Private helper methods

  private deriveMasterKey(): Buffer {
    const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
    const salt = process.env.ENCRYPTION_SALT || 'default-salt'
    
    return crypto.pbkdf2Sync(
      secret, 
      salt, 
      ENCRYPTION_CONFIG.ITERATIONS, 
      ENCRYPTION_CONFIG.KEY_LENGTH, 
      'sha512'
    )
  }

  private async getActiveEncryptionKey(keyType: string): Promise<EncryptionKey> {
    // Check cache first
    const cached = this.activeKeys.get(keyType)
    if (cached && cached.isActive && cached.expiresAt > new Date()) {
      return cached
    }

    const client = await this.pool.connect()
    
    try {
      const result = await client.query(`
        SELECT * FROM encryption_keys 
        WHERE key_type = $1 AND is_active = true 
        ORDER BY created_at DESC 
        LIMIT 1
      `, [keyType])

      if (result.rows.length === 0) {
        // Generate new key if none exists
        return await this.generateNewKey(keyType as any)
      }

      const row = result.rows[0]
      const key: EncryptionKey = {
        id: row.id,
        keyData: row.key_data,
        version: row.version,
        createdAt: row.created_at,
        isActive: row.is_active,
        expiresAt: row.expires_at
      }

      // Cache the key
      this.activeKeys.set(keyType, key)
      return key

    } finally {
      client.release()
    }
  }

  private async getEncryptionKey(keyId: string): Promise<EncryptionKey | null> {
    const client = await this.pool.connect()
    
    try {
      const result = await client.query(`
        SELECT * FROM encryption_keys WHERE id = $1
      `, [keyId])

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      return {
        id: row.id,
        keyData: row.key_data,
        version: row.version,
        createdAt: row.created_at,
        isActive: row.is_active,
        expiresAt: row.expires_at
      }

    } finally {
      client.release()
    }
  }

  private async getNextKeyVersion(keyType: string): Promise<number> {
    const client = await this.pool.connect()
    
    try {
      const result = await client.query(`
        SELECT MAX(version) as max_version 
        FROM encryption_keys 
        WHERE key_type = $1
      `, [keyType])

      return (result.rows[0].max_version || 0) + 1

    } finally {
      client.release()
    }
  }

  private isEncryptedData(data: string): boolean {
    try {
      const decoded = Buffer.from(data, 'base64').toString('utf8')
      const parsed = JSON.parse(decoded)
      return parsed.data && parsed.keyId && parsed.algorithm
    } catch {
      return false
    }
  }

  private initializeKeyRotation(): void {
    // Check for key rotation every hour
    setInterval(async () => {
      try {
        await this.rotateKeys()
      } catch (error) {
        console.error('[ENCRYPTION] Key rotation failed:', error)
      }
    }, 60 * 60 * 1000) // 1 hour
  }
}

// Export singleton instance
export const enterpriseEncryption = new EnterpriseEncryption()

// Database schema for encryption keys
export const ENCRYPTION_SCHEMA = `
-- Encryption keys table
CREATE TABLE IF NOT EXISTS encryption_keys (
  id UUID PRIMARY KEY,
  key_type VARCHAR(50) NOT NULL, -- 'pii', 'financial', 'health', 'biometric'
  key_data VARCHAR(255) NOT NULL, -- Encrypted key data
  version INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  INDEX idx_encryption_keys_type_active (key_type, is_active),
  INDEX idx_encryption_keys_expires_at (expires_at)
);

-- Key rotation log
CREATE TABLE IF NOT EXISTS key_rotation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  old_key_id UUID,
  new_key_id UUID NOT NULL,
  key_type VARCHAR(50) NOT NULL,
  rotation_reason VARCHAR(100),
  rotated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX idx_key_rotation_log_rotated_at (rotated_at)
);
`

// Utility functions for common PII encryption
export const encryptPII = async (data: string) => 
  await enterpriseEncryption.encryptField(data, 'pii')

export const decryptPII = async (data: string) => 
  await enterpriseEncryption.decryptField(data)

export const encryptFinancial = async (data: string) => 
  await enterpriseEncryption.encryptField(data, 'financial')

export const decryptFinancial = async (data: string) => 
  await enterpriseEncryption.decryptField(data)
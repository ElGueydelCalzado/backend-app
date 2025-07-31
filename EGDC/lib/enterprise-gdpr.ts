/**
 * Enterprise GDPR Compliance System
 * User consent management, data rights, and privacy controls
 */

import crypto from 'crypto'
import { Pool } from 'pg'
import { createSecureDatabaseConfig } from './database-config'
import { enterpriseAuditLogger } from './enterprise-audit'

// GDPR Configuration  
export const GDPR_CONFIG = {
  CONSENT_TYPES: {
    'functional': {
      name: 'Functional Cookies',
      required: true,
      description: 'Essential cookies for basic website functionality',
      category: 'necessary'
    },
    'analytics': {
      name: 'Analytics Cookies', 
      required: false,
      description: 'Help us understand how you use our website',
      category: 'analytics'
    },
    'marketing': {
      name: 'Marketing Cookies',
      required: false,
      description: 'Used to deliver personalized advertisements',
      category: 'marketing'
    },
    'data_processing': {
      name: 'Data Processing',
      required: true,
      description: 'Processing of your personal data for service delivery',
      category: 'processing'
    },
    'data_sharing': {
      name: 'Data Sharing',
      required: false,
      description: 'Sharing data with trusted partners for enhanced services',
      category: 'sharing'
    },
    'email_marketing': {
      name: 'Email Marketing',
      required: false,
      description: 'Receive marketing emails and newsletters',
      category: 'communication'
    }
  } as const,
  DATA_CATEGORIES: [
    'identity', // Name, email, ID numbers
    'contact', // Address, phone, email
    'demographic', // Age, gender, preferences
    'financial', // Payment info, transaction history
    'technical', // IP address, browser data, cookies
    'behavioral', // Usage patterns, preferences
    'professional', // Job title, company, industry
    'health', // Any health-related data
    'biometric', // Fingerprints, face recognition
    'location', // GPS coordinates, addresses
    'social', // Social media profiles, connections
    'content', // User-generated content, messages
  ] as const,
  RETENTION_PERIODS: {
    'users': 2555, // 7 years
    'transactions': 2555, // 7 years for financial records
    'analytics': 365, // 1 year
    'logs': 90, // 3 months
    'marketing': 1095, // 3 years
    'support': 730, // 2 years
  },
  LAWFUL_BASES: [
    'consent',
    'contract',
    'legal_obligation',
    'vital_interests',
    'public_task',
    'legitimate_interests'
  ] as const
} as const

export type ConsentType = keyof typeof GDPR_CONFIG.CONSENT_TYPES
export type DataCategory = typeof GDPR_CONFIG.DATA_CATEGORIES[number]
export type LawfulBasis = typeof GDPR_CONFIG.LAWFUL_BASES[number]

interface ConsentRecord {
  id: string
  userId: string
  tenantId: string
  consentType: ConsentType
  granted: boolean
  lawfulBasis: LawfulBasis
  purpose: string
  dataCategories: DataCategory[]
  grantedAt?: Date
  withdrawnAt?: Date
  expiresAt?: Date
  ipAddress?: string
  userAgent?: string
  version: string // Privacy policy version
  isActive: boolean
}

interface DataProcessingActivity {
  id: string
  tenantId: string
  activityName: string
  purpose: string
  lawfulBasis: LawfulBasis
  dataCategories: DataCategory[]
  dataSubjects: string[] // e.g., 'customers', 'employees'
  recipients: string[] // Who data is shared with
  retentionPeriod: number // days
  securityMeasures: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface DataSubjectRequest {
  id: string
  userId: string
  tenantId: string
  requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection'
  status: 'pending' | 'in_progress' | 'completed' | 'rejected'
  reason?: string
  requestedAt: Date
  processedAt?: Date
  processedBy?: string
  completedAt?: Date
  responseData?: Record<string, any>
  rejectionReason?: string
}

interface PrivacyPolicyVersion {
  id: string
  version: string
  content: string
  effectiveDate: Date
  changes: string[]
  isActive: boolean
  createdAt: Date
}

class EnterpriseGDPRManager {
  private pool: Pool

  constructor() {
    this.pool = new Pool(createSecureDatabaseConfig())
  }

  /**
   * Record user consent
   */
  async recordConsent(
    userId: string,
    tenantId: string,
    consentType: ConsentType,
    granted: boolean,
    lawfulBasis: LawfulBasis,
    purpose: string,
    dataCategories: DataCategory[],
    policyVersion: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    const client = await this.pool.connect()
    
    try {
      // Deactivate previous consent records for this type
      await client.query(`
        UPDATE consent_records 
        SET is_active = false, withdrawn_at = NOW()
        WHERE user_id = $1 AND tenant_id = $2 AND consent_type = $3 AND is_active = true
      `, [userId, tenantId, consentType])

      // Create new consent record
      const consentId = crypto.randomUUID()
      const now = new Date()
      const expiresAt = granted ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) : null // 1 year

      await client.query(`
        INSERT INTO consent_records (
          id, user_id, tenant_id, consent_type, granted, lawful_basis,
          purpose, data_categories, granted_at, expires_at, ip_address,
          user_agent, version, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
      `, [
        consentId, userId, tenantId, consentType, granted, lawfulBasis,
        purpose, JSON.stringify(dataCategories), granted ? now : null,
        expiresAt, ipAddress, userAgent, policyVersion
      ])

      await enterpriseAuditLogger.logPrivacyEvent(
        granted ? 'consent_given' : 'consent_withdrawn',
        userId,
        tenantId,
        {
          consentType,
          lawfulBasis,
          purpose,
          dataCategories,
          policyVersion
        },
        ipAddress
      )

      console.log(`[GDPR] Consent ${granted ? 'granted' : 'withdrawn'}: ${consentType} for user ${userId}`)

      return consentId

    } catch (error) {
      console.error('[GDPR] Failed to record consent:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Get user's current consent status
   */
  async getUserConsent(userId: string, tenantId: string): Promise<ConsentRecord[]> {
    const client = await this.pool.connect()
    
    try {
      const result = await client.query(`
        SELECT * FROM consent_records
        WHERE user_id = $1 AND tenant_id = $2 AND is_active = true
        ORDER BY granted_at DESC
      `, [userId, tenantId])

      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        tenantId: row.tenant_id,
        consentType: row.consent_type,
        granted: row.granted,
        lawfulBasis: row.lawful_basis,
        purpose: row.purpose,
        dataCategories: JSON.parse(row.data_categories || '[]'),
        grantedAt: row.granted_at,
        withdrawnAt: row.withdrawn_at,
        expiresAt: row.expires_at,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        version: row.version,
        isActive: row.is_active
      }))

    } finally {
      client.release()
    }
  }

  /**
   * Process data subject request (Article 15-22)
   */
  async processDataSubjectRequest(
    userId: string,
    tenantId: string,
    requestType: DataSubjectRequest['requestType'],
    reason?: string
  ): Promise<string> {
    const client = await this.pool.connect()
    
    try {
      const requestId = crypto.randomUUID()
      
      await client.query(`
        INSERT INTO data_subject_requests (
          id, user_id, tenant_id, request_type, status, reason, requested_at
        ) VALUES ($1, $2, $3, $4, 'pending', $5, NOW())
      `, [requestId, userId, tenantId, requestType, reason])

      await enterpriseAuditLogger.logPrivacyEvent(
        'data_request',
        userId,
        tenantId,
        { requestType, reason, requestId }
      )

      // Auto-process certain request types
      if (requestType === 'access') {
        await this.processDataAccessRequest(requestId)
      } else if (requestType === 'portability') {
        await this.processDataPortabilityRequest(requestId)
      }

      console.log(`[GDPR] Data subject request created: ${requestType} for user ${userId}`)

      return requestId

    } catch (error) {
      console.error('[GDPR] Failed to create data subject request:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Process data access request (Article 15)
   */
  private async processDataAccessRequest(requestId: string): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      // Get request details
      const requestResult = await client.query(`
        SELECT * FROM data_subject_requests WHERE id = $1
      `, [requestId])

      if (requestResult.rows.length === 0) return

      const request = requestResult.rows[0]
      const { user_id: userId, tenant_id: tenantId } = request

      // Collect all user data
      const userData = await this.collectUserData(userId, tenantId)

      // Update request status
      await client.query(`
        UPDATE data_subject_requests
        SET status = 'completed', processed_at = NOW(), completed_at = NOW(),
            response_data = $2
        WHERE id = $1
      `, [requestId, JSON.stringify(userData)])

      await enterpriseAuditLogger.logPrivacyEvent(
        'data_export',
        userId,
        tenantId,
        { requestId, dataCategories: Object.keys(userData) }
      )

      console.log(`[GDPR] Data access request completed for user ${userId}`)

    } catch (error) {
      console.error('[GDPR] Failed to process data access request:', error)
      
      // Mark request as rejected
      await client.query(`
        UPDATE data_subject_requests
        SET status = 'rejected', processed_at = NOW(), rejection_reason = $2
        WHERE id = $1
      `, [requestId, error.message])
    } finally {
      client.release()
    }
  }

  /**
   * Process data erasure request (Article 17 - Right to be forgotten)
   */
  async processDataErasureRequest(
    requestId: string,
    processedBy: string,
    approved: boolean,
    reason?: string
  ): Promise<boolean> {
    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')

      // Get request details
      const requestResult = await client.query(`
        SELECT * FROM data_subject_requests WHERE id = $1
      `, [requestId])

      if (requestResult.rows.length === 0) {
        throw new Error('Request not found')
      }

      const request = requestResult.rows[0]
      const { user_id: userId, tenant_id: tenantId } = request

      if (!approved) {
        // Mark request as rejected
        await client.query(`
          UPDATE data_subject_requests
          SET status = 'rejected', processed_at = NOW(), processed_by = $2, rejection_reason = $3
          WHERE id = $1
        `, [requestId, processedBy, reason])

        await client.query('COMMIT')
        return false
      }

      // Check if user has active contracts or legal obligations
      const legalCheck = await this.checkLegalObligations(userId, tenantId)
      if (legalCheck.hasObligations) {
        await client.query(`
          UPDATE data_subject_requests
          SET status = 'rejected', processed_at = NOW(), processed_by = $2, 
              rejection_reason = $3
          WHERE id = $1
        `, [requestId, processedBy, `Cannot erase data due to legal obligations: ${legalCheck.reasons.join(', ')}`])

        await client.query('COMMIT')
        return false
      }

      // Perform data erasure
      await this.performDataErasure(userId, tenantId, client)

      // Mark request as completed
      await client.query(`
        UPDATE data_subject_requests
        SET status = 'completed', processed_at = NOW(), processed_by = $2, completed_at = NOW()
        WHERE id = $1
      `, [requestId, processedBy])

      await client.query('COMMIT')

      await enterpriseAuditLogger.logPrivacyEvent(
        'data_deletion',
        userId,
        tenantId,
        { requestId, processedBy, approved }
      )

      console.log(`[GDPR] Data erasure completed for user ${userId}`)

      return true

    } catch (error) {
      await client.query('ROLLBACK')
      console.error('[GDPR] Failed to process data erasure request:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Check data retention compliance
   */
  async checkRetentionCompliance(tenantId: string): Promise<{
    expiredData: Array<{
      table: string
      category: string
      count: number
      oldestRecord: Date
    }>
    recommendedActions: string[]
  }> {
    const client = await this.pool.connect()
    
    try {
      const expiredData: any[] = []
      const recommendedActions: string[] = []

      // Check each data category against retention periods
      for (const [category, retentionDays] of Object.entries(GDPR_CONFIG.RETENTION_PERIODS)) {
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

        // Check relevant tables based on category
        const tables = this.getTablesForCategory(category)
        
        for (const table of tables) {
          const result = await client.query(`
            SELECT COUNT(*) as count, MIN(created_at) as oldest
            FROM ${table}
            WHERE tenant_id = $1 AND created_at < $2
          `, [tenantId, cutoffDate])

          const count = parseInt(result.rows[0].count)
          if (count > 0) {
            expiredData.push({
              table,
              category,
              count,
              oldestRecord: result.rows[0].oldest
            })

            recommendedActions.push(
              `Review and consider deleting ${count} expired ${category} records from ${table}`
            )
          }
        }
      }

      return { expiredData, recommendedActions }

    } finally {
      client.release()
    }
  }

  /**
   * Update privacy policy and notify users
   */
  async updatePrivacyPolicy(
    tenantId: string,
    version: string,
    content: string,
    changes: string[],
    effectiveDate: Date,
    updatedBy: string
  ): Promise<string> {
    const client = await this.pool.connect()
    
    try {
      // Deactivate previous version
      await client.query(`
        UPDATE privacy_policy_versions 
        SET is_active = false 
        WHERE tenant_id = $1 AND is_active = true
      `, [tenantId])

      // Create new version
      const policyId = crypto.randomUUID()
      await client.query(`
        INSERT INTO privacy_policy_versions (
          id, tenant_id, version, content, effective_date, changes, 
          is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
      `, [policyId, tenantId, version, content, effectiveDate, JSON.stringify(changes)])

      // Log the update
      await enterpriseAuditLogger.logPrivacyEvent(
        'privacy_policy_update',
        updatedBy,
        tenantId,
        {
          policyId,
          version,
          changes,
          effectiveDate
        }
      )

      // In production, this would trigger email notifications to users
      console.log(`[GDPR] Privacy policy updated to version ${version} for tenant ${tenantId}`)

      return policyId

    } catch (error) {
      console.error('[GDPR] Failed to update privacy policy:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Generate GDPR compliance report
   */
  async generateComplianceReport(tenantId: string): Promise<{
    consentStatus: Record<ConsentType, { granted: number; withdrawn: number }>
    dataSubjectRequests: Record<string, number>
    retentionCompliance: any
    privacyPolicyVersion: string
    lastUpdated: Date
  }> {
    const client = await this.pool.connect()
    
    try {
      // Consent status
      const consentResult = await client.query(`
        SELECT consent_type, granted, COUNT(*) as count
        FROM consent_records
        WHERE tenant_id = $1 AND is_active = true
        GROUP BY consent_type, granted
      `, [tenantId])

      const consentStatus: any = {}
      for (const consentType of Object.keys(GDPR_CONFIG.CONSENT_TYPES)) {
        consentStatus[consentType] = { granted: 0, withdrawn: 0 }
      }

      consentResult.rows.forEach(row => {
        const key = row.granted ? 'granted' : 'withdrawn'
        consentStatus[row.consent_type][key] = parseInt(row.count)
      })

      // Data subject requests
      const requestsResult = await client.query(`
        SELECT request_type, COUNT(*) as count
        FROM data_subject_requests
        WHERE tenant_id = $1
        GROUP BY request_type
      `, [tenantId])

      const dataSubjectRequests: Record<string, number> = {}
      requestsResult.rows.forEach(row => {
        dataSubjectRequests[row.request_type] = parseInt(row.count)
      })

      // Retention compliance
      const retentionCompliance = await this.checkRetentionCompliance(tenantId)

      // Current privacy policy version
      const policyResult = await client.query(`
        SELECT version, created_at
        FROM privacy_policy_versions
        WHERE tenant_id = $1 AND is_active = true
        ORDER BY created_at DESC
        LIMIT 1
      `, [tenantId])

      const privacyPolicyVersion = policyResult.rows[0]?.version || 'N/A'
      const lastUpdated = policyResult.rows[0]?.created_at || new Date()

      return {
        consentStatus,
        dataSubjectRequests,
        retentionCompliance,
        privacyPolicyVersion,
        lastUpdated
      }

    } finally {
      client.release()
    }
  }

  // Private helper methods

  private async collectUserData(userId: string, tenantId: string): Promise<Record<string, any>> {
    const client = await this.pool.connect()
    
    try {
      const userData: Record<string, any> = {}

      // User profile data
      const userResult = await client.query(`
        SELECT * FROM users WHERE id = $1 AND tenant_id = $2
      `, [userId, tenantId])
      userData.profile = userResult.rows[0] || {}

      // Consent records
      const consentResult = await client.query(`
        SELECT * FROM consent_records WHERE user_id = $1 AND tenant_id = $2
      `, [userId, tenantId])
      userData.consents = consentResult.rows

      // Activity logs (limited for privacy)
      const activityResult = await client.query(`
        SELECT event_type, timestamp FROM audit_events 
        WHERE user_id = $1 AND tenant_id = $2 
        ORDER BY timestamp DESC LIMIT 100
      `, [userId, tenantId])
      userData.recentActivity = activityResult.rows

      // Other data categories can be added here
      // userData.inventory = ...
      // userData.orders = ...

      return userData

    } finally {
      client.release()
    }
  }

  private async checkLegalObligations(userId: string, tenantId: string): Promise<{
    hasObligations: boolean
    reasons: string[]
  }> {
    const client = await this.pool.connect()
    const reasons: string[] = []
    
    try {
      // Check for active contracts
      const contractsResult = await client.query(`
        SELECT COUNT(*) as count FROM contracts 
        WHERE user_id = $1 AND tenant_id = $2 AND status = 'active'
      `, [userId, tenantId])

      if (parseInt(contractsResult.rows[0].count) > 0) {
        reasons.push('Active contracts exist')
      }

      // Check for financial obligations
      const financialResult = await client.query(`
        SELECT COUNT(*) as count FROM transactions 
        WHERE user_id = $1 AND tenant_id = $2 AND status = 'pending'
      `, [userId, tenantId])

      if (parseInt(financialResult.rows[0].count) > 0) {
        reasons.push('Pending financial transactions')
      }

      // Check for legal requirements (e.g., tax records)
      const taxResult = await client.query(`
        SELECT COUNT(*) as count FROM tax_records 
        WHERE user_id = $1 AND tenant_id = $2 
        AND created_at > NOW() - INTERVAL '7 years'
      `, [userId, tenantId])

      if (parseInt(taxResult.rows[0].count) > 0) {
        reasons.push('Tax records must be retained for 7 years')
      }

      return {
        hasObligations: reasons.length > 0,
        reasons
      }

    } finally {
      client.release()
    }
  }

  private async performDataErasure(userId: string, tenantId: string, client: any): Promise<void> {
    // Anonymize user data instead of deleting to maintain referential integrity
    await client.query(`
      UPDATE users 
      SET 
        name = 'Deleted User',
        email = $3,
        phone = NULL,
        address = NULL,
        date_of_birth = NULL,
        status = 'deleted',
        deleted_at = NOW()
      WHERE id = $1 AND tenant_id = $2
    `, [userId, tenantId, `deleted_${userId}@gdpr-erasure.local`])

    // Delete or anonymize related data
    const tablesToClean = [
      'consent_records',
      'user_preferences',
      'notification_settings',
      'session_logs'
    ]

    for (const table of tablesToClean) {
      await client.query(`
        DELETE FROM ${table} WHERE user_id = $1 AND tenant_id = $2
      `, [userId, tenantId])
    }

    // Anonymize audit logs (keep for compliance but remove PII)
    await client.query(`
      UPDATE audit_events 
      SET details = jsonb_set(details, '{user_email}', '"[REDACTED]"')
      WHERE user_id = $1 AND tenant_id = $2
    `, [userId, tenantId])
  }

  private async processDataPortabilityRequest(requestId: string): Promise<void> {
    // Implementation for data portability (Article 20)
    // Export user data in machine-readable format
    const client = await this.pool.connect()
    
    try {
      const requestResult = await client.query(`
        SELECT * FROM data_subject_requests WHERE id = $1
      `, [requestId])

      const request = requestResult.rows[0]
      const { user_id: userId, tenant_id: tenantId } = request

      const userData = await this.collectUserData(userId, tenantId)
      
      // Format data for portability (JSON, CSV, etc.)
      const portableData = {
        format: 'JSON',
        exportDate: new Date().toISOString(),
        data: userData
      }

      await client.query(`
        UPDATE data_subject_requests
        SET status = 'completed', processed_at = NOW(), completed_at = NOW(),
            response_data = $2
        WHERE id = $1
      `, [requestId, JSON.stringify(portableData)])

      console.log(`[GDPR] Data portability request completed for user ${userId}`)

    } finally {
      client.release()
    }
  }

  private getTablesForCategory(category: string): string[] {
    const tableMap: Record<string, string[]> = {
      'users': ['users', 'user_profiles', 'user_preferences'],
      'transactions': ['transactions', 'payments', 'invoices'],
      'analytics': ['analytics_events', 'page_views', 'user_sessions'],
      'logs': ['audit_events', 'error_logs', 'access_logs'],
      'marketing': ['email_campaigns', 'marketing_consents', 'newsletter_subscriptions'],
      'support': ['support_tickets', 'chat_messages', 'feedback']
    }

    return tableMap[category] || []
  }
}

// Export singleton instance
export const enterpriseGDPRManager = new EnterpriseGDPRManager()

// Database schema for GDPR tables
export const GDPR_SCHEMA = `
-- Consent records table
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  consent_type VARCHAR(50) NOT NULL,
  granted BOOLEAN NOT NULL,
  lawful_basis VARCHAR(50) NOT NULL,
  purpose TEXT NOT NULL,
  data_categories JSONB NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE,
  withdrawn_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT,
  version VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  INDEX idx_consent_records_user_id (user_id),
  INDEX idx_consent_records_tenant_id (tenant_id),
  INDEX idx_consent_records_type (consent_type),
  INDEX idx_consent_records_active (is_active)
);

-- Data subject requests table
CREATE TABLE IF NOT EXISTS data_subject_requests (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  request_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reason TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID,
  completed_at TIMESTAMP WITH TIME ZONE,
  response_data JSONB,
  rejection_reason TEXT,
  INDEX idx_data_subject_requests_user_id (user_id),
  INDEX idx_data_subject_requests_tenant_id (tenant_id),
  INDEX idx_data_subject_requests_type (request_type),
  INDEX idx_data_subject_requests_status (status)
);

-- Data processing activities table
CREATE TABLE IF NOT EXISTS data_processing_activities (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  activity_name VARCHAR(255) NOT NULL,
  purpose TEXT NOT NULL,
  lawful_basis VARCHAR(50) NOT NULL,
  data_categories JSONB NOT NULL,
  data_subjects JSONB NOT NULL,
  recipients JSONB NOT NULL,
  retention_period INTEGER NOT NULL,
  security_measures JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX idx_data_processing_activities_tenant_id (tenant_id)
);

-- Privacy policy versions table
CREATE TABLE IF NOT EXISTS privacy_policy_versions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  version VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
  changes JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX idx_privacy_policy_versions_tenant_id (tenant_id),
  INDEX idx_privacy_policy_versions_version (version),
  INDEX idx_privacy_policy_versions_active (is_active)
);

-- Data retention log table
CREATE TABLE IF NOT EXISTS data_retention_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  data_category VARCHAR(50) NOT NULL,
  records_deleted INTEGER NOT NULL,
  retention_period INTEGER NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_by UUID,
  INDEX idx_data_retention_log_tenant_id (tenant_id),
  INDEX idx_data_retention_log_deleted_at (deleted_at)
);
`;
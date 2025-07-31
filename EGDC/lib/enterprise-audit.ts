/**
 * Enterprise Security Audit and Logging System
 * Comprehensive security event tracking for SOC2 and GDPR compliance
 */

import crypto from 'crypto'
import { Pool } from 'pg'
import { createSecureDatabaseConfig } from './database-config'

// Audit configuration
export const AUDIT_CONFIG = {
  RETENTION: {
    SECURITY_EVENTS: 90, // days
    USER_ACTIONS: 365, // days
    SYSTEM_EVENTS: 30, // days
    COMPLIANCE_EVENTS: 2555, // 7 years for GDPR/SOC2
  },
  RISK_LEVELS: ['low', 'medium', 'high', 'critical'] as const,
  CATEGORIES: [
    'authentication',
    'authorization', 
    'data_access',
    'data_modification',
    'system_access',
    'configuration_change',
    'privacy',
    'compliance',
    'security_incident'
  ] as const,
}

export type RiskLevel = typeof AUDIT_CONFIG.RISK_LEVELS[number]
export type AuditCategory = typeof AUDIT_CONFIG.CATEGORIES[number]

interface AuditEvent {
  id: string
  eventType: string
  category: AuditCategory
  riskLevel: RiskLevel
  userId?: string
  tenantId?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  resource?: string
  action: string
  details: Record<string, any>
  timestamp: Date
  correlationId?: string
  complianceFlags?: string[]
}

interface ComplianceReport {
  reportId: string
  reportType: 'soc2' | 'gdpr' | 'security_review' | 'custom'
  startDate: Date
  endDate: Date
  events: AuditEvent[]
  summary: {
    totalEvents: number
    criticalEvents: number
    highRiskEvents: number
    failedLogins: number
    dataAccess: number
    configChanges: number
  }
  generatedAt: Date
  generatedBy: string
}

class EnterpriseAuditLogger {
  private pool: Pool
  private eventBuffer: AuditEvent[] = []
  private readonly BUFFER_SIZE = 100
  private readonly FLUSH_INTERVAL = 5000 // 5 seconds

  constructor() {
    this.pool = new Pool(createSecureDatabaseConfig())
    this.startPeriodicFlush()
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    eventType: string,
    category: AuditCategory,
    riskLevel: RiskLevel,
    action: string,
    details: Record<string, any>,
    context?: {
      userId?: string
      tenantId?: string
      sessionId?: string
      ipAddress?: string
      userAgent?: string
      resource?: string
      correlationId?: string
    }
  ): Promise<string> {
    const eventId = crypto.randomUUID()
    
    const event: AuditEvent = {
      id: eventId,
      eventType,
      category,
      riskLevel,
      action,
      details: this.sanitizeDetails(details),
      timestamp: new Date(),
      userId: context?.userId,
      tenantId: context?.tenantId,
      sessionId: context?.sessionId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      resource: context?.resource,
      correlationId: context?.correlationId || this.generateCorrelationId(),
      complianceFlags: this.determineComplianceFlags(category, riskLevel, eventType)
    }

    // Add to buffer for batch processing
    this.eventBuffer.push(event)

    // Immediate flush for critical events
    if (riskLevel === 'critical') {
      await this.flushEvents()
    }

    // Flush if buffer is full
    if (this.eventBuffer.length >= this.BUFFER_SIZE) {
      await this.flushEvents()
    }

    console.log(`[AUDIT] ${riskLevel.toUpperCase()} ${category} - ${eventType}:`, {
      eventId,
      action,
      userId: context?.userId,
      correlationId: event.correlationId
    })

    return eventId
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(
    eventType: 'login_attempt' | 'login_success' | 'login_failure' | 'logout' | 'session_expired' | 'password_change' | 'mfa_challenge' | 'mfa_success' | 'mfa_failure',
    userId: string,
    tenantId: string,
    details: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    const riskLevel: RiskLevel = eventType.includes('failure') ? 'high' : 
                                eventType.includes('success') ? 'low' : 'medium'
    
    return this.logSecurityEvent(
      eventType,
      'authentication',
      riskLevel,
      eventType.replace('_', ' '),
      details,
      { userId, tenantId, ipAddress, userAgent }
    )
  }

  /**
   * Log data access events
   */
  async logDataAccess(
    action: 'read' | 'create' | 'update' | 'delete' | 'export' | 'import',
    resource: string,
    userId: string,
    tenantId: string,
    details: Record<string, any>,
    ipAddress?: string
  ): Promise<string> {
    const riskLevel: RiskLevel = action === 'delete' || action === 'export' ? 'high' : 
                                action === 'create' || action === 'update' ? 'medium' : 'low'

    return this.logSecurityEvent(
      `data_${action}`,
      'data_access',
      riskLevel,
      `${action} ${resource}`,
      details,
      { userId, tenantId, resource, ipAddress }
    )
  }

  /**
   * Log privacy-related events for GDPR compliance
   */
  async logPrivacyEvent(
    eventType: 'data_request' | 'data_export' | 'data_deletion' | 'consent_given' | 'consent_withdrawn' | 'privacy_policy_update',
    userId: string,
    tenantId: string,
    details: Record<string, any>,
    ipAddress?: string
  ): Promise<string> {
    return this.logSecurityEvent(
      eventType,
      'privacy',
      'medium',
      eventType.replace('_', ' '),
      { ...details, gdpr_compliance: true },
      { userId, tenantId, ipAddress }
    )
  }

  /**
   * Log system configuration changes
   */
  async logConfigChange(
    component: string,
    action: 'create' | 'update' | 'delete',
    userId: string,
    tenantId: string,
    changes: Record<string, any>,
    ipAddress?: string
  ): Promise<string> {
    return this.logSecurityEvent(
      'config_change',
      'configuration_change',
      'high',
      `${action} ${component} configuration`,
      {
        component,
        changes: this.sanitizeConfigChanges(changes),
        timestamp: new Date().toISOString()
      },
      { userId, tenantId, resource: component, ipAddress }
    )
  }

  /**
   * Log security incidents
   */
  async logSecurityIncident(
    incidentType: 'suspicious_activity' | 'brute_force' | 'data_breach' | 'unauthorized_access' | 'malware_detected',
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: Record<string, any>,
    affectedUsers?: string[],
    ipAddress?: string
  ): Promise<string> {
    const eventId = await this.logSecurityEvent(
      incidentType,
      'security_incident',
      severity,
      `Security incident: ${incidentType}`,
      {
        ...details,
        affected_users: affectedUsers,
        incident_id: crypto.randomUUID(),
        requires_notification: severity === 'high' || severity === 'critical'
      },
      { ipAddress }
    )

    // Immediate alert for critical incidents
    if (severity === 'critical') {
      await this.triggerSecurityAlert(incidentType, details, eventId)
    }

    return eventId
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    reportType: ComplianceReport['reportType'],
    startDate: Date,
    endDate: Date,
    tenantId?: string,
    generatedBy?: string
  ): Promise<ComplianceReport> {
    const client = await this.pool.connect()
    
    try {
      let query = `
        SELECT * FROM audit_events 
        WHERE timestamp >= $1 AND timestamp <= $2
      `
      const params: any[] = [startDate, endDate]
      
      if (tenantId) {
        query += ` AND tenant_id = $3`
        params.push(tenantId)
      }
      
      query += ` ORDER BY timestamp DESC`
      
      const result = await client.query(query, params)
      
      const events: AuditEvent[] = result.rows.map(row => ({
        id: row.id,
        eventType: row.event_type,
        category: row.category,
        riskLevel: row.risk_level,
        userId: row.user_id,
        tenantId: row.tenant_id,
        sessionId: row.session_id,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        resource: row.resource,
        action: row.action,
        details: row.details,
        timestamp: row.timestamp,
        correlationId: row.correlation_id,
        complianceFlags: row.compliance_flags
      }))

      const summary = this.generateReportSummary(events)
      
      const report: ComplianceReport = {
        reportId: crypto.randomUUID(),
        reportType,
        startDate,
        endDate,
        events,
        summary,
        generatedAt: new Date(),
        generatedBy: generatedBy || 'system'
      }

      // Store report metadata
      await this.storeReportMetadata(report)
      
      return report
    } finally {
      client.release()
    }
  }

  /**
   * Search audit events
   */
  async searchEvents(filters: {
    userId?: string
    tenantId?: string
    category?: AuditCategory
    riskLevel?: RiskLevel
    eventType?: string
    startDate?: Date
    endDate?: Date
    ipAddress?: string
    limit?: number
    offset?: number
  }): Promise<{ events: AuditEvent[]; total: number }> {
    const client = await this.pool.connect()
    
    try {
      const conditions: string[] = []
      const params: any[] = []
      let paramCount = 1

      if (filters.userId) {
        conditions.push(`user_id = $${paramCount}`)
        params.push(filters.userId)
        paramCount++
      }

      if (filters.tenantId) {
        conditions.push(`tenant_id = $${paramCount}`)
        params.push(filters.tenantId)
        paramCount++
      }

      if (filters.category) {
        conditions.push(`category = $${paramCount}`)
        params.push(filters.category)
        paramCount++
      }

      if (filters.riskLevel) {
        conditions.push(`risk_level = $${paramCount}`)
        params.push(filters.riskLevel)
        paramCount++
      }

      if (filters.eventType) {
        conditions.push(`event_type = $${paramCount}`)
        params.push(filters.eventType)
        paramCount++
      }

      if (filters.startDate) {
        conditions.push(`timestamp >= $${paramCount}`)
        params.push(filters.startDate)
        paramCount++
      }

      if (filters.endDate) {
        conditions.push(`timestamp <= $${paramCount}`)
        params.push(filters.endDate)
        paramCount++
      }

      if (filters.ipAddress) {
        conditions.push(`ip_address = $${paramCount}`)
        params.push(filters.ipAddress)
        paramCount++
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      
      // Get total count
      const countResult = await client.query(`
        SELECT COUNT(*) as total FROM audit_events ${whereClause}
      `, params)
      
      const total = parseInt(countResult.rows[0].total)

      // Get events with pagination
      const limit = filters.limit || 100
      const offset = filters.offset || 0
      
      const eventsResult = await client.query(`
        SELECT * FROM audit_events ${whereClause}
        ORDER BY timestamp DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `, [...params, limit, offset])

      const events: AuditEvent[] = eventsResult.rows.map(row => ({
        id: row.id,
        eventType: row.event_type,
        category: row.category,
        riskLevel: row.risk_level,
        userId: row.user_id,
        tenantId: row.tenant_id,
        sessionId: row.session_id,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        resource: row.resource,
        action: row.action,
        details: row.details,
        timestamp: row.timestamp,
        correlationId: row.correlation_id,
        complianceFlags: row.compliance_flags
      }))

      return { events, total }
    } finally {
      client.release()
    }
  }

  /**
   * Clean up old audit events based on retention policy
   */
  async cleanupOldEvents(): Promise<{ deleted: number; categories: Record<string, number> }> {
    const client = await this.pool.connect()
    const results: Record<string, number> = {}
    let totalDeleted = 0

    try {
      // Clean up by category with different retention periods
      for (const [category, days] of Object.entries({
        'security_incident': AUDIT_CONFIG.RETENTION.COMPLIANCE_EVENTS,
        'privacy': AUDIT_CONFIG.RETENTION.COMPLIANCE_EVENTS,
        'authentication': AUDIT_CONFIG.RETENTION.SECURITY_EVENTS,
        'authorization': AUDIT_CONFIG.RETENTION.SECURITY_EVENTS,
        'data_access': AUDIT_CONFIG.RETENTION.USER_ACTIONS,
        'data_modification': AUDIT_CONFIG.RETENTION.USER_ACTIONS,
        'configuration_change': AUDIT_CONFIG.RETENTION.SECURITY_EVENTS,
        'system_access': AUDIT_CONFIG.RETENTION.SYSTEM_EVENTS,
        'compliance': AUDIT_CONFIG.RETENTION.COMPLIANCE_EVENTS
      })) {
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        
        const result = await client.query(`
          DELETE FROM audit_events 
          WHERE category = $1 AND timestamp < $2
        `, [category, cutoffDate])

        results[category] = result.rowCount || 0
        totalDeleted += results[category]
      }

      console.log(`[AUDIT] Cleanup completed: deleted ${totalDeleted} events`, results)
      
      return { deleted: totalDeleted, categories: results }
    } finally {
      client.release()
    }
  }

  // Private helper methods

  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const sanitized = { ...details }
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'secret', 'token', 'api_key', 'private_key', 'ssn', 'credit_card']
    
    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj
      
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject)
      }
      
      const result: any = {}
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase()
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          result[key] = '[REDACTED]'
        } else if (typeof value === 'object') {
          result[key] = sanitizeObject(value)
        } else {
          result[key] = value
        }
      }
      return result
    }
    
    return sanitizeObject(sanitized)
  }

  private sanitizeConfigChanges(changes: Record<string, any>): Record<string, any> {
    const sanitized = { ...changes }
    
    // Redact sensitive configuration values
    const sensitiveConfigKeys = ['database_url', 'secret_key', 'api_secret', 'private_key']
    
    for (const key of Object.keys(sanitized)) {
      if (sensitiveConfigKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]'
      }
    }
    
    return sanitized
  }

  private determineComplianceFlags(category: AuditCategory, riskLevel: RiskLevel, eventType: string): string[] {
    const flags: string[] = []
    
    // GDPR flags
    if (category === 'privacy' || eventType.includes('data_') || eventType.includes('consent')) {
      flags.push('gdpr_relevant')
    }
    
    // SOC2 flags
    if (['authentication', 'authorization', 'data_access', 'configuration_change'].includes(category)) {
      flags.push('soc2_relevant')
    }
    
    // High-risk events
    if (riskLevel === 'high' || riskLevel === 'critical') {
      flags.push('high_risk')
    }
    
    // Security incidents
    if (category === 'security_incident') {
      flags.push('security_incident', 'requires_review')
    }
    
    return flags
  }

  private generateCorrelationId(): string {
    return crypto.randomBytes(8).toString('hex')
  }

  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return

    const eventsToFlush = [...this.eventBuffer]
    this.eventBuffer = []

    const client = await this.pool.connect()
    
    try {
      for (const event of eventsToFlush) {
        await client.query(`
          INSERT INTO audit_events (
            id, event_type, category, risk_level, user_id, tenant_id, session_id,
            ip_address, user_agent, resource, action, details, timestamp,
            correlation_id, compliance_flags
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `, [
          event.id, event.eventType, event.category, event.riskLevel,
          event.userId, event.tenantId, event.sessionId, event.ipAddress,
          event.userAgent, event.resource, event.action, JSON.stringify(event.details),
          event.timestamp, event.correlationId, event.complianceFlags
        ])
      }
      
      console.log(`[AUDIT] Flushed ${eventsToFlush.length} events to database`)
    } catch (error) {
      console.error('[AUDIT] Failed to flush events:', error)
      // Re-add failed events to buffer
      this.eventBuffer.unshift(...eventsToFlush)
    } finally {
      client.release()
    }
  }

  private startPeriodicFlush(): void {
    setInterval(() => {
      this.flushEvents().catch(error => {
        console.error('[AUDIT] Periodic flush failed:', error)
      })
    }, this.FLUSH_INTERVAL)
  }

  private generateReportSummary(events: AuditEvent[]): ComplianceReport['summary'] {
    return {
      totalEvents: events.length,
      criticalEvents: events.filter(e => e.riskLevel === 'critical').length,
      highRiskEvents: events.filter(e => e.riskLevel === 'high').length,
      failedLogins: events.filter(e => e.eventType.includes('login_failure')).length,
      dataAccess: events.filter(e => e.category === 'data_access').length,
      configChanges: events.filter(e => e.category === 'configuration_change').length
    }
  }

  private async storeReportMetadata(report: ComplianceReport): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      await client.query(`
        INSERT INTO audit_reports (
          id, report_type, start_date, end_date, event_count, 
          generated_at, generated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        report.reportId, report.reportType, report.startDate, report.endDate,
        report.events.length, report.generatedAt, report.generatedBy
      ])
    } finally {
      client.release()
    }
  }

  private async triggerSecurityAlert(incidentType: string, details: any, eventId: string): Promise<void> {
    console.log(`🚨 CRITICAL SECURITY ALERT: ${incidentType}`, { eventId, details })
    
    // In production, this would trigger:
    // - Email/SMS alerts to security team
    // - Slack/Teams notifications
    // - Integration with SIEM systems
    // - Automated response procedures
  }
}

// Export singleton instance
export const enterpriseAuditLogger = new EnterpriseAuditLogger()

// Database schema for audit tables
export const AUDIT_SCHEMA = `
-- Main audit events table
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  risk_level VARCHAR(20) NOT NULL,
  user_id UUID,
  tenant_id UUID,
  session_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  resource VARCHAR(255),
  action VARCHAR(255) NOT NULL,
  details JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  correlation_id VARCHAR(16),
  compliance_flags TEXT[],
  INDEX idx_audit_events_timestamp (timestamp),
  INDEX idx_audit_events_user_id (user_id),
  INDEX idx_audit_events_tenant_id (tenant_id),
  INDEX idx_audit_events_category (category),
  INDEX idx_audit_events_risk_level (risk_level),
  INDEX idx_audit_events_event_type (event_type),
  INDEX idx_audit_events_compliance_flags USING GIN (compliance_flags)
);

-- Audit report metadata table
CREATE TABLE IF NOT EXISTS audit_reports (
  id UUID PRIMARY KEY,
  report_type VARCHAR(50) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  event_count INTEGER NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generated_by VARCHAR(255),
  INDEX idx_audit_reports_type (report_type),
  INDEX idx_audit_reports_generated_at (generated_at)
);

-- Security alert log table
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  event_id UUID REFERENCES audit_events(id),
  details JSONB NOT NULL,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by VARCHAR(255),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX idx_security_alerts_type (alert_type),
  INDEX idx_security_alerts_severity (severity),
  INDEX idx_security_alerts_acknowledged (acknowledged)
);
`;
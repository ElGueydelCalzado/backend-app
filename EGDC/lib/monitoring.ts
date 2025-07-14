// Production monitoring and logging

interface SecurityEvent {
  type: 'rate_limit' | 'auth_failure' | 'suspicious_activity' | 'error'
  ip: string
  userAgent?: string
  endpoint?: string
  details?: any
  timestamp: Date
}

class SecurityMonitor {
  private events: SecurityEvent[] = []
  
  logEvent(event: Omit<SecurityEvent, 'timestamp'>) {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date()
    }
    
    this.events.push(securityEvent)
    
    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔒 Security Event:', securityEvent)
    }
    
    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(securityEvent)
    }
    
    // Keep only last 1000 events in memory
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000)
    }
  }
  
  private async sendToMonitoring(event: SecurityEvent) {
    try {
      // Send to your monitoring service (Sentry, DataDog, etc.)
      // Example with console for now
      console.error('[SECURITY]', JSON.stringify(event))
    } catch (error) {
      console.error('Failed to send security event to monitoring:', error)
    }
  }
  
  getRecentEvents(hours: number = 24): SecurityEvent[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
    return this.events.filter(event => event.timestamp > cutoff)
  }
  
  getEventStats(hours: number = 24) {
    const events = this.getRecentEvents(hours)
    const stats = {
      total: events.length,
      byType: {} as Record<string, number>,
      topIPs: {} as Record<string, number>
    }
    
    events.forEach(event => {
      stats.byType[event.type] = (stats.byType[event.type] || 0) + 1
      stats.topIPs[event.ip] = (stats.topIPs[event.ip] || 0) + 1
    })
    
    return stats
  }
}

export const securityMonitor = new SecurityMonitor()

// Helper function to log security events
export function logSecurityEvent(
  type: SecurityEvent['type'],
  ip: string,
  details?: any
) {
  securityMonitor.logEvent({
    type,
    ip,
    details
  })
}
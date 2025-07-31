import { Pool } from 'pg'

interface SyncJob {
  id: string
  name: string
  sourceSystem: string
  targetSystem: string
  dataType: 'products' | 'orders' | 'customers' | 'inventory' | 'pricing'
  syncType: 'full' | 'incremental' | 'real_time'
  frequency: number // minutes
  lastSync: Date | null
  nextSync: Date
  isActive: boolean
  config: SyncConfig
}

interface SyncConfig {
  mapping: FieldMapping[]
  filters: SyncFilter[]
  transformations: DataTransformation[]
  errorHandling: ErrorHandlingConfig
  validation: ValidationRule[]
}

interface FieldMapping {
  sourceField: string
  targetField: string
  transformation?: string
  required: boolean
  defaultValue?: any
}

interface SyncFilter {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in'
  value: any
}

interface DataTransformation {
  field: string
  type: 'format' | 'calculate' | 'lookup' | 'conditional'
  rule: string
  parameters?: any
}

interface ErrorHandlingConfig {
  onError: 'skip' | 'retry' | 'fail'
  maxRetries: number
  retryDelay: number // seconds
  notifyOnError: boolean
}

interface ValidationRule {
  field: string
  type: 'required' | 'format' | 'range' | 'unique' | 'custom'
  rule: string | RegExp
  message: string
}

interface SyncResult {
  jobId: string
  status: 'success' | 'error' | 'partial'
  recordsProcessed: number
  recordsSuccess: number
  recordsError: number
  errors: SyncError[]
  duration: number
  startTime: Date
  endTime: Date
}

interface SyncError {
  recordId: string | number
  field?: string
  error: string
  errorCode: string
  severity: 'warning' | 'error' | 'critical'
}

interface DataSource {
  id: string
  name: string
  type: 'database' | 'api' | 'file' | 'webhook'
  connection: ConnectionConfig
  schema: DataSchema
}

interface ConnectionConfig {
  host?: string
  port?: number
  database?: string
  username?: string
  password?: string
  apiKey?: string
  apiUrl?: string
  timeout?: number
  ssl?: boolean
}

interface DataSchema {
  tableName?: string
  endpoint?: string
  fields: SchemaField[]
}

interface SchemaField {
  name: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'json'
  required: boolean
  maxLength?: number
  format?: string
}

export class CrossPlatformSyncEngine {
  private pool: Pool
  private dataSources: Map<string, DataSource> = new Map()
  private activeSyncJobs: Map<string, NodeJS.Timer> = new Map()

  constructor(pool: Pool) {
    this.pool = pool
  }

  public async initialize(): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      // Create sync tables
      await client.query(`
        CREATE TABLE IF NOT EXISTS sync_jobs (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          source_system VARCHAR(100) NOT NULL,
          target_system VARCHAR(100) NOT NULL,
          data_type VARCHAR(50) NOT NULL,
          sync_type VARCHAR(20) NOT NULL,
          frequency_minutes INTEGER NOT NULL,
          last_sync TIMESTAMP WITH TIME ZONE,
          next_sync TIMESTAMP WITH TIME ZONE NOT NULL,
          is_active BOOLEAN DEFAULT true,
          config JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS sync_logs (
          id SERIAL PRIMARY KEY,
          job_id VARCHAR(255) NOT NULL REFERENCES sync_jobs(id),
          status VARCHAR(20) NOT NULL,
          records_processed INTEGER DEFAULT 0,
          records_success INTEGER DEFAULT 0,
          records_error INTEGER DEFAULT 0,
          errors JSONB,
          duration_seconds INTEGER,
          started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          completed_at TIMESTAMP WITH TIME ZONE
        )
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS data_sources (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          connection_config JSONB NOT NULL,
          schema_config JSONB NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS sync_conflicts (
          id SERIAL PRIMARY KEY,
          job_id VARCHAR(255) NOT NULL,
          record_id VARCHAR(255) NOT NULL,
          field_name VARCHAR(100) NOT NULL,
          source_value TEXT,
          target_value TEXT,
          conflict_type VARCHAR(50) NOT NULL,
          resolution VARCHAR(50),
          resolved_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_sync_jobs_next_sync ON sync_jobs(next_sync);
        CREATE INDEX IF NOT EXISTS idx_sync_jobs_active ON sync_jobs(is_active);
        CREATE INDEX IF NOT EXISTS idx_sync_logs_job_id ON sync_logs(job_id);
        CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON sync_logs(started_at);
        CREATE INDEX IF NOT EXISTS idx_sync_conflicts_job_id ON sync_conflicts(job_id);
      `)

      // Initialize default data sources
      await this.initializeDefaultDataSources(client)

    } finally {
      client.release()
    }
  }

  private async initializeDefaultDataSources(client: any): Promise<void> {
    const defaultSources = [
      {
        id: 'internal_db',
        name: 'Base de datos interna',
        type: 'database',
        connection_config: {
          host: 'localhost',
          database: 'egdc',
          schema: 'public'
        },
        schema_config: {
          tables: {
            products: {
              fields: [
                { name: 'id', type: 'number', required: true },
                { name: 'categoria', type: 'string', required: false },
                { name: 'marca', type: 'string', required: false },
                { name: 'modelo', type: 'string', required: false },
                { name: 'precio_shopify', type: 'number', required: false },
                { name: 'inventory_total', type: 'number', required: false }
              ]
            }
          }
        }
      },
      {
        id: 'consumer_platform',
        name: 'Plataforma de consumidor',
        type: 'api',
        connection_config: {
          apiUrl: 'https://lospapatos.com/api',
          timeout: 30000
        },
        schema_config: {
          endpoints: {
            products: {
              endpoint: '/consumer/products',
              fields: [
                { name: 'id', type: 'number', required: true },
                { name: 'name', type: 'string', required: true },
                { name: 'price', type: 'number', required: true },
                { name: 'inventory', type: 'number', required: true }
              ]
            }
          }
        }
      },
      {
        id: 'affiliate_system',
        name: 'Sistema de afiliados',
        type: 'database',
        connection_config: {
          host: 'localhost',
          database: 'egdc',
          schema: 'public'
        },
        schema_config: {
          tables: {
            affiliates: {
              fields: [
                { name: 'id', type: 'string', required: true },
                { name: 'email', type: 'string', required: true },
                { name: 'total_commissions', type: 'number', required: false }
              ]
            }
          }
        }
      }
    ]

    for (const source of defaultSources) {
      await client.query(`
        INSERT INTO data_sources (id, name, type, connection_config, schema_config)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `, [
        source.id,
        source.name,
        source.type,
        JSON.stringify(source.connection_config),
        JSON.stringify(source.schema_config)
      ])
    }
  }

  public async createSyncJob(jobData: {
    name: string
    sourceSystem: string
    targetSystem: string
    dataType: string
    syncType: string
    frequency: number
    config: SyncConfig
  }): Promise<string> {
    const jobId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const nextSync = new Date(Date.now() + jobData.frequency * 60 * 1000)

    await this.pool.query(`
      INSERT INTO sync_jobs (
        id, name, source_system, target_system, data_type, 
        sync_type, frequency_minutes, next_sync, config
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      jobId,
      jobData.name,
      jobData.sourceSystem,
      jobData.targetSystem,
      jobData.dataType,
      jobData.syncType,
      jobData.frequency,
      nextSync,
      JSON.stringify(jobData.config)
    ])

    // Schedule the job if it's active
    await this.scheduleJob(jobId)

    return jobId
  }

  public async executeSyncJob(jobId: string): Promise<SyncResult> {
    const startTime = new Date()
    
    try {
      // Get job details
      const jobResult = await this.pool.query(
        'SELECT * FROM sync_jobs WHERE id = $1 AND is_active = true',
        [jobId]
      )

      if (jobResult.rows.length === 0) {
        throw new Error('Sync job not found or inactive')
      }

      const job = jobResult.rows[0]
      const config: SyncConfig = job.config

      // Create sync log entry
      const logResult = await this.pool.query(`
        INSERT INTO sync_logs (job_id, status, started_at)
        VALUES ($1, 'running', $2)
        RETURNING id
      `, [jobId, startTime])

      const logId = logResult.rows[0].id

      // Execute the sync based on data type
      let syncResult: SyncResult

      switch (job.data_type) {
        case 'products':
          syncResult = await this.syncProducts(job, config)
          break
        case 'orders':
          syncResult = await this.syncOrders(job, config)
          break
        case 'customers':
          syncResult = await this.syncCustomers(job, config)
          break
        case 'inventory':
          syncResult = await this.syncInventory(job, config)
          break
        case 'pricing':
          syncResult = await this.syncPricing(job, config)
          break
        default:
          throw new Error(`Unsupported data type: ${job.data_type}`)
      }

      // Update sync log
      await this.pool.query(`
        UPDATE sync_logs 
        SET 
          status = $1,
          records_processed = $2,
          records_success = $3,
          records_error = $4,
          errors = $5,
          duration_seconds = $6,
          completed_at = NOW()
        WHERE id = $7
      `, [
        syncResult.status,
        syncResult.recordsProcessed,
        syncResult.recordsSuccess,
        syncResult.recordsError,
        JSON.stringify(syncResult.errors),
        syncResult.duration,
        logId
      ])

      // Update job's last sync time
      const nextSync = new Date(Date.now() + job.frequency_minutes * 60 * 1000)
      await this.pool.query(`
        UPDATE sync_jobs 
        SET last_sync = NOW(), next_sync = $1 
        WHERE id = $2
      `, [nextSync, jobId])

      return syncResult

    } catch (error) {
      const endTime = new Date()
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

      // Log the error
      await this.pool.query(`
        INSERT INTO sync_logs (
          job_id, status, records_processed, records_success, 
          records_error, errors, duration_seconds, started_at, completed_at
        ) VALUES ($1, 'error', 0, 0, 0, $2, $3, $4, $5)
      `, [
        jobId,
        JSON.stringify([{ error: error instanceof Error ? error.message : 'Unknown error', errorCode: 'SYNC_FAILED', severity: 'critical' }]),
        duration,
        startTime,
        endTime
      ])

      throw error
    }
  }

  private async syncProducts(job: any, config: SyncConfig): Promise<SyncResult> {
    const startTime = new Date()
    let recordsProcessed = 0
    let recordsSuccess = 0
    let recordsError = 0
    const errors: SyncError[] = []

    try {
      // Get source data
      const sourceData = await this.getSourceData(job.source_system, 'products', config)
      
      for (const record of sourceData) {
        recordsProcessed++
        
        try {
          // Validate record
          const validationErrors = this.validateRecord(record, config.validation)
          if (validationErrors.length > 0) {
            errors.push(...validationErrors.map(error => ({
              recordId: record.id || recordsProcessed,
              error: error.message,
              errorCode: 'VALIDATION_FAILED',
              severity: 'error' as const
            })))
            recordsError++
            continue
          }

          // Transform record
          const transformedRecord = await this.transformRecord(record, config)

          // Check for conflicts
          const conflicts = await this.detectConflicts(job.id, transformedRecord, job.target_system)
          
          if (conflicts.length > 0) {
            // Handle conflicts based on configuration
            for (const conflict of conflicts) {
              await this.handleConflict(job.id, conflict)
            }
          }

          // Insert/update in target system
          await this.writeToTargetSystem(job.target_system, 'products', transformedRecord)
          recordsSuccess++

        } catch (error) {
          recordsError++
          errors.push({
            recordId: record.id || recordsProcessed,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorCode: 'PROCESSING_FAILED',
            severity: 'error'
          })
        }
      }

      const endTime = new Date()
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

      return {
        jobId: job.id,
        status: recordsError === 0 ? 'success' : (recordsSuccess > 0 ? 'partial' : 'error'),
        recordsProcessed,
        recordsSuccess,
        recordsError,
        errors,
        duration,
        startTime,
        endTime
      }

    } catch (error) {
      const endTime = new Date()
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

      return {
        jobId: job.id,
        status: 'error',
        recordsProcessed,
        recordsSuccess,
        recordsError: recordsProcessed,
        errors: [{
          recordId: 'ALL',
          error: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'SYNC_FAILED',
          severity: 'critical'
        }],
        duration,
        startTime,
        endTime
      }
    }
  }

  private async syncOrders(job: any, config: SyncConfig): Promise<SyncResult> {
    // Similar implementation for orders
    return this.genericSync(job, config, 'orders')
  }

  private async syncCustomers(job: any, config: SyncConfig): Promise<SyncResult> {
    // Similar implementation for customers
    return this.genericSync(job, config, 'customers')
  }

  private async syncInventory(job: any, config: SyncConfig): Promise<SyncResult> {
    // Similar implementation for inventory
    return this.genericSync(job, config, 'inventory')
  }

  private async syncPricing(job: any, config: SyncConfig): Promise<SyncResult> {
    // Similar implementation for pricing
    return this.genericSync(job, config, 'pricing')
  }

  private async genericSync(job: any, config: SyncConfig, dataType: string): Promise<SyncResult> {
    // Generic sync implementation that can be used for different data types
    const startTime = new Date()
    let recordsProcessed = 0
    let recordsSuccess = 0
    let recordsError = 0
    const errors: SyncError[] = []

    try {
      const sourceData = await this.getSourceData(job.source_system, dataType, config)
      
      for (const record of sourceData) {
        recordsProcessed++
        
        try {
          const validationErrors = this.validateRecord(record, config.validation)
          if (validationErrors.length > 0) {
            errors.push(...validationErrors.map(error => ({
              recordId: record.id || recordsProcessed,
              error: error.message,
              errorCode: 'VALIDATION_FAILED',
              severity: 'error' as const
            })))
            recordsError++
            continue
          }

          const transformedRecord = await this.transformRecord(record, config)
          await this.writeToTargetSystem(job.target_system, dataType, transformedRecord)
          recordsSuccess++

        } catch (error) {
          recordsError++
          errors.push({
            recordId: record.id || recordsProcessed,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorCode: 'PROCESSING_FAILED',
            severity: 'error'
          })
        }
      }

      const endTime = new Date()
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

      return {
        jobId: job.id,
        status: recordsError === 0 ? 'success' : (recordsSuccess > 0 ? 'partial' : 'error'),
        recordsProcessed,
        recordsSuccess,
        recordsError,
        errors,
        duration,
        startTime,
        endTime
      }

    } catch (error) {
      const endTime = new Date()
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

      return {
        jobId: job.id,
        status: 'error',
        recordsProcessed,
        recordsSuccess,
        recordsError: recordsProcessed,
        errors: [{
          recordId: 'ALL',
          error: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'SYNC_FAILED',
          severity: 'critical'
        }],
        duration,
        startTime,
        endTime
      }
    }
  }

  private async getSourceData(sourceSystem: string, dataType: string, config: SyncConfig): Promise<any[]> {
    // Implementation would depend on the source system type
    if (sourceSystem === 'internal_db') {
      return await this.getDataFromDatabase(dataType, config)
    } else if (sourceSystem === 'consumer_platform') {
      return await this.getDataFromAPI(dataType, config)
    }
    
    throw new Error(`Unsupported source system: ${sourceSystem}`)
  }

  private async getDataFromDatabase(dataType: string, config: SyncConfig): Promise<any[]> {
    const tableName = this.getTableNameForDataType(dataType)
    const filters = config.filters || []
    
    let query = `SELECT * FROM ${tableName}`
    const params: any[] = []
    
    if (filters.length > 0) {
      const whereClause = filters.map((filter, index) => {
        params.push(filter.value)
        return `${filter.field} ${this.getSQLOperator(filter.operator)} $${index + 1}`
      }).join(' AND ')
      
      query += ` WHERE ${whereClause}`
    }

    const result = await this.pool.query(query, params)
    return result.rows
  }

  private async getDataFromAPI(dataType: string, config: SyncConfig): Promise<any[]> {
    // Implementation for API data source
    // This would make HTTP requests to external APIs
    return []
  }

  private validateRecord(record: any, validationRules: ValidationRule[]): Array<{ message: string }> {
    const errors: Array<{ message: string }> = []

    for (const rule of validationRules) {
      const value = record[rule.field]

      switch (rule.type) {
        case 'required':
          if (value === null || value === undefined || value === '') {
            errors.push({ message: rule.message || `${rule.field} is required` })
          }
          break

        case 'format':
          if (value && rule.rule instanceof RegExp && !rule.rule.test(value)) {
            errors.push({ message: rule.message || `${rule.field} format is invalid` })
          }
          break

        case 'range':
          if (typeof value === 'number' && typeof rule.rule === 'string') {
            const [min, max] = rule.rule.split('-').map(Number)
            if (value < min || value > max) {
              errors.push({ message: rule.message || `${rule.field} must be between ${min} and ${max}` })
            }
          }
          break
      }
    }

    return errors
  }

  private async transformRecord(record: any, config: SyncConfig): Promise<any> {
    const transformed: any = {}

    // Apply field mappings
    for (const mapping of config.mapping) {
      let value = record[mapping.sourceField]

      // Apply transformations
      if (mapping.transformation) {
        value = await this.applyTransformation(value, mapping.transformation)
      }

      // Use default value if field is empty and default is provided
      if ((value === null || value === undefined) && mapping.defaultValue !== undefined) {
        value = mapping.defaultValue
      }

      transformed[mapping.targetField] = value
    }

    // Apply additional transformations
    for (const transformation of config.transformations) {
      if (transformed[transformation.field] !== undefined) {
        transformed[transformation.field] = await this.applyTransformation(
          transformed[transformation.field],
          transformation.rule,
          transformation.parameters
        )
      }
    }

    return transformed
  }

  private async applyTransformation(value: any, rule: string, parameters?: any): Promise<any> {
    switch (rule) {
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value

      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value

      case 'trim':
        return typeof value === 'string' ? value.trim() : value

      case 'currency_format':
        return typeof value === 'number' ? parseFloat(value.toFixed(2)) : value

      case 'date_format':
        return value ? new Date(value).toISOString() : value

      default:
        return value
    }
  }

  private async detectConflicts(jobId: string, record: any, targetSystem: string): Promise<any[]> {
    // Implementation to detect data conflicts
    // This would compare incoming data with existing data in target system
    return []
  }

  private async handleConflict(jobId: string, conflict: any): Promise<void> {
    // Implementation to handle data conflicts
    // Could log conflict, apply resolution rules, or require manual intervention
    await this.pool.query(`
      INSERT INTO sync_conflicts (
        job_id, record_id, field_name, source_value, 
        target_value, conflict_type
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      jobId,
      conflict.recordId,
      conflict.fieldName,
      conflict.sourceValue,
      conflict.targetValue,
      conflict.type
    ])
  }

  private async writeToTargetSystem(targetSystem: string, dataType: string, record: any): Promise<void> {
    if (targetSystem === 'internal_db') {
      await this.writeToDatabase(dataType, record)
    } else if (targetSystem === 'consumer_platform') {
      await this.writeToAPI(dataType, record)
    } else {
      throw new Error(`Unsupported target system: ${targetSystem}`)
    }
  }

  private async writeToDatabase(dataType: string, record: any): Promise<void> {
    const tableName = this.getTableNameForDataType(dataType)
    const fields = Object.keys(record)
    const values = Object.values(record)
    const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ')

    const query = `
      INSERT INTO ${tableName} (${fields.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT (id) DO UPDATE SET
      ${fields.map((field, index) => 
        field !== 'id' ? `${field} = $${index + 1}` : null
      ).filter(Boolean).join(', ')}
    `

    await this.pool.query(query, values)
  }

  private async writeToAPI(dataType: string, record: any): Promise<void> {
    // Implementation for writing to API endpoints
    // This would make HTTP POST/PUT requests to external APIs
  }

  private getTableNameForDataType(dataType: string): string {
    const tableMap: { [key: string]: string } = {
      'products': 'products',
      'orders': 'consumer_orders',
      'customers': 'loyalty_customers',
      'inventory': 'products',
      'pricing': 'products'
    }

    return tableMap[dataType] || dataType
  }

  private getSQLOperator(operator: string): string {
    const operatorMap: { [key: string]: string } = {
      'equals': '=',
      'not_equals': '!=',
      'greater_than': '>',
      'less_than': '<',
      'contains': 'ILIKE',
      'in': 'IN'
    }

    return operatorMap[operator] || '='
  }

  public async scheduleJob(jobId: string): Promise<void> {
    const jobResult = await this.pool.query(
      'SELECT * FROM sync_jobs WHERE id = $1 AND is_active = true',
      [jobId]
    )

    if (jobResult.rows.length === 0) return

    const job = jobResult.rows[0]
    const intervalMs = job.frequency_minutes * 60 * 1000

    // Clear existing interval if any
    if (this.activeSyncJobs.has(jobId)) {
      clearInterval(this.activeSyncJobs.get(jobId)!)
    }

    // Schedule new interval
    const interval = setInterval(async () => {
      try {
        await this.executeSyncJob(jobId)
      } catch (error) {
        console.error(`Error executing sync job ${jobId}:`, error)
      }
    }, intervalMs)

    this.activeSyncJobs.set(jobId, interval)
  }

  public async getSyncJobStatus(jobId: string): Promise<any> {
    const [jobResult, logsResult] = await Promise.all([
      this.pool.query('SELECT * FROM sync_jobs WHERE id = $1', [jobId]),
      this.pool.query(`
        SELECT * FROM sync_logs 
        WHERE job_id = $1 
        ORDER BY started_at DESC 
        LIMIT 10
      `, [jobId])
    ])

    if (jobResult.rows.length === 0) {
      throw new Error('Sync job not found')
    }

    return {
      job: jobResult.rows[0],
      recentLogs: logsResult.rows
    }
  }

  public async getAllSyncJobs(): Promise<any[]> {
    const result = await this.pool.query(`
      SELECT 
        sj.*,
        COUNT(sl.id) as total_runs,
        MAX(sl.completed_at) as last_completed
      FROM sync_jobs sj
      LEFT JOIN sync_logs sl ON sj.id = sl.job_id
      GROUP BY sj.id
      ORDER BY sj.created_at DESC
    `)

    return result.rows
  }

  public startScheduler(): void {
    // Start all active sync jobs
    this.pool.query(`
      SELECT id FROM sync_jobs 
      WHERE is_active = true AND next_sync <= NOW()
    `).then(result => {
      for (const job of result.rows) {
        this.scheduleJob(job.id)
      }
    })
  }

  public stopScheduler(): void {
    // Stop all scheduled jobs
    for (const [jobId, interval] of this.activeSyncJobs.entries()) {
      clearInterval(interval)
      this.activeSyncJobs.delete(jobId)
    }
  }
}

export const crossPlatformSyncSchema = `
  -- This schema is included in the CrossPlatformSyncEngine.initialize() method
  -- Run this method to create all necessary tables and indexes
`
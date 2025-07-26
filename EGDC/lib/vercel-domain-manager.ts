// VERCEL DOMAIN MANAGEMENT FOR PATH-BASED ARCHITECTURE
// Manages the single app.lospapatos.com domain for multi-tenant path-based routing

interface VercelDomainResponse {
  name: string
  apexName: string
  projectId: string
  redirect?: string
  redirectStatusCode?: number
  gitBranch?: string
  createdAt: number
  updatedAt: number
  verified: boolean
  verification: any[]
}

interface VercelError {
  error: {
    code: string
    message: string
  }
}

export class VercelDomainManager {
  private readonly apiToken: string
  private readonly teamId?: string
  private readonly projectId: string

  constructor() {
    this.apiToken = process.env.VERCEL_API_TOKEN!
    this.teamId = process.env.VERCEL_TEAM_ID // Optional for team accounts
    this.projectId = process.env.VERCEL_PROJECT_ID!
  }

  /**
   * Ensure app.lospapatos.com domain exists in Vercel project
   * In path-based architecture, we only need one domain
   */
  async ensureAppDomain(): Promise<{ success: boolean; error?: string }> {
    const domain = 'app.lospapatos.com'
    
    console.log('🌐 Ensuring app domain exists in Vercel:', domain)

    try {
      const url = this.teamId 
        ? `https://api.vercel.com/v10/projects/${this.projectId}/domains?teamId=${this.teamId}`
        : `https://api.vercel.com/v10/projects/${this.projectId}/domains`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: domain,
        })
      })

      const data = await response.json()

      if (!response.ok) {
        const error = data as VercelError
        
        // Domain already exists is OK
        if (error.error?.code === 'domain_already_in_use') {
          console.log('✅ Domain already exists in Vercel:', domain)
          return { success: true }
        }
        
        console.error('❌ Vercel API error:', error.error)
        return { 
          success: false, 
          error: error.error?.message || 'Failed to add domain' 
        }
      }

      const domainResponse = data as VercelDomainResponse
      
      console.log('✅ App domain confirmed in Vercel:', domain)
      console.log('📋 Domain details:', {
        name: domainResponse.name,
        verified: domainResponse.verified,
        createdAt: new Date(domainResponse.createdAt)
      })

      return { success: true }

    } catch (error) {
      console.error('❌ Error adding domain to Vercel:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Remove a domain from Vercel project (legacy subdomain cleanup)
   */
  async removeLegacySubdomain(subdomain: string): Promise<{ success: boolean; error?: string }> {
    const domain = `${subdomain}.lospapatos.com`
    
    console.log('🗑️ Removing legacy subdomain from Vercel:', domain)

    try {
      const url = this.teamId 
        ? `https://api.vercel.com/v9/projects/${this.projectId}/domains/${domain}?teamId=${this.teamId}`
        : `https://api.vercel.com/v9/projects/${this.projectId}/domains/${domain}`

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        }
      })

      if (!response.ok) {
        const error = await response.json() as VercelError
        console.error('❌ Error removing domain:', error.error)
        return { 
          success: false, 
          error: error.error?.message || 'Failed to remove domain' 
        }
      }

      console.log('✅ Domain removed from Vercel:', domain)
      return { success: true }

    } catch (error) {
      console.error('❌ Error removing domain from Vercel:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * List all domains for the project
   */
  async listDomains(): Promise<VercelDomainResponse[]> {
    try {
      const url = this.teamId 
        ? `https://api.vercel.com/v9/projects/${this.projectId}/domains?teamId=${this.teamId}`
        : `https://api.vercel.com/v9/projects/${this.projectId}/domains`

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        }
      })

      if (!response.ok) {
        throw new Error(`Vercel API error: ${response.status}`)
      }

      const data = await response.json()
      return data.domains || []

    } catch (error) {
      console.error('❌ Error listing domains:', error)
      return []
    }
  }

  /**
   * Check if app domain exists in Vercel
   */
  async appDomainExists(): Promise<boolean> {
    const domain = 'app.lospapatos.com'
    const domains = await this.listDomains()
    return domains.some(d => d.name === domain)
  }

  /**
   * Check if legacy subdomain exists (for cleanup purposes)
   */
  async legacySubdomainExists(subdomain: string): Promise<boolean> {
    const domain = `${subdomain}.lospapatos.com`
    const domains = await this.listDomains()
    return domains.some(d => d.name === domain)
  }

  /**
   * Get app domain verification status
   */
  async getAppDomainStatus(): Promise<{
    exists: boolean
    verified: boolean
    ssl: boolean
  }> {
    const domain = 'app.lospapatos.com'
    const domains = await this.listDomains()
    const domainInfo = domains.find(d => d.name === domain)

    if (!domainInfo) {
      return { exists: false, verified: false, ssl: false }
    }

    return {
      exists: true,
      verified: domainInfo.verified,
      ssl: domainInfo.verified // SSL is automatically provisioned when verified
    }
  }

  /**
   * Get legacy subdomain status (for migration/cleanup)
   */
  async getLegacySubdomainStatus(subdomain: string): Promise<{
    exists: boolean
    verified: boolean
    ssl: boolean
  }> {
    const domain = `${subdomain}.lospapatos.com`
    const domains = await this.listDomains()
    const domainInfo = domains.find(d => d.name === domain)

    if (!domainInfo) {
      return { exists: false, verified: false, ssl: false }
    }

    return {
      exists: true,
      verified: domainInfo.verified,
      ssl: domainInfo.verified // SSL is automatically provisioned when verified
    }
  }
}

// Helper function to ensure app domain exists for path-based architecture
export async function ensureAppDomainExists(): Promise<boolean> {
  if (!process.env.VERCEL_API_TOKEN || !process.env.VERCEL_PROJECT_ID) {
    console.warn('⚠️ Vercel API credentials not configured, skipping domain check')
    return true // Don't fail due to missing API config
  }

  try {
    const domainManager = new VercelDomainManager()
    
    // Check if app domain already exists
    const exists = await domainManager.appDomainExists()
    if (exists) {
      console.log('✅ App domain already exists in Vercel: app.lospapatos.com')
      return true
    }

    // Ensure app domain exists in Vercel
    const result = await domainManager.ensureAppDomain()
    
    if (!result.success) {
      console.error('❌ Failed to ensure app domain in Vercel:', result.error)
      return false
    }

    console.log('🎉 Successfully ensured app domain exists in Vercel: app.lospapatos.com')
    return true

  } catch (error) {
    console.error('❌ Error in ensureAppDomainExists:', error)
    return false
  }
}

// Legacy function for cleaning up old subdomain-based domains
export async function cleanupLegacySubdomain(subdomain: string): Promise<boolean> {
  if (!process.env.VERCEL_API_TOKEN || !process.env.VERCEL_PROJECT_ID) {
    console.warn('⚠️ Vercel API credentials not configured, skipping cleanup')
    return true
  }

  try {
    const domainManager = new VercelDomainManager()
    
    // Check if legacy domain exists
    const exists = await domainManager.legacySubdomainExists(subdomain)
    if (!exists) {
      console.log('✅ Legacy subdomain does not exist:', subdomain)
      return true
    }

    // Remove legacy subdomain
    const result = await domainManager.removeLegacySubdomain(subdomain)
    
    if (!result.success) {
      console.error('❌ Failed to remove legacy subdomain:', result.error)
      return false
    }

    console.log('🎉 Successfully cleaned up legacy subdomain:', subdomain)
    return true

  } catch (error) {
    console.error('❌ Error in cleanupLegacySubdomain:', error)
    return false
  }
}

// Helper function to check app domain status
export async function checkAppDomainStatus() {
  try {
    const domainManager = new VercelDomainManager()
    return await domainManager.getAppDomainStatus()
  } catch (error) {
    console.error('❌ Error checking app domain status:', error)
    return { exists: false, verified: false, ssl: false }
  }
}

// Helper function to check legacy subdomain status (for migration purposes)
export async function checkLegacySubdomainStatus(subdomain: string) {
  try {
    const domainManager = new VercelDomainManager()
    return await domainManager.getLegacySubdomainStatus(subdomain)
  } catch (error) {
    console.error('❌ Error checking legacy subdomain status:', error)
    return { exists: false, verified: false, ssl: false }
  }
}
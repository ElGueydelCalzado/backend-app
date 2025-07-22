// AUTOMATED VERCEL DOMAIN MANAGEMENT
// Automatically add new supplier subdomains to Vercel when they register

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
   * Add a new domain to Vercel project
   */
  async addDomain(subdomain: string): Promise<{ success: boolean; error?: string }> {
    const domain = `${subdomain}.lospapatos.com`
    
    console.log('🌐 Adding domain to Vercel:', domain)

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
      
      console.log('✅ Domain added to Vercel:', domain)
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
   * Remove a domain from Vercel project
   */
  async removeDomain(subdomain: string): Promise<{ success: boolean; error?: string }> {
    const domain = `${subdomain}.lospapatos.com`
    
    console.log('🗑️ Removing domain from Vercel:', domain)

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
   * Check if domain is already added to Vercel
   */
  async domainExists(subdomain: string): Promise<boolean> {
    const domain = `${subdomain}.lospapatos.com`
    const domains = await this.listDomains()
    return domains.some(d => d.name === domain)
  }

  /**
   * Get domain verification status
   */
  async getDomainStatus(subdomain: string): Promise<{
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

// Helper function to add domain when supplier registers
export async function addSupplierDomain(subdomain: string): Promise<boolean> {
  if (!process.env.VERCEL_API_TOKEN || !process.env.VERCEL_PROJECT_ID) {
    console.warn('⚠️ Vercel API credentials not configured, skipping domain addition')
    return true // Don't fail supplier registration due to missing API config
  }

  try {
    const domainManager = new VercelDomainManager()
    
    // Check if domain already exists
    const exists = await domainManager.domainExists(subdomain)
    if (exists) {
      console.log('✅ Domain already exists in Vercel:', subdomain)
      return true
    }

    // Add domain to Vercel
    const result = await domainManager.addDomain(subdomain)
    
    if (!result.success) {
      console.error('❌ Failed to add domain to Vercel:', result.error)
      // Don't fail supplier registration due to Vercel domain issues
      return true
    }

    console.log('🎉 Successfully added supplier domain to Vercel:', subdomain)
    return true

  } catch (error) {
    console.error('❌ Error in addSupplierDomain:', error)
    // Don't fail supplier registration due to domain management issues
    return true
  }
}

// Helper function to check domain status
export async function checkDomainStatus(subdomain: string) {
  try {
    const domainManager = new VercelDomainManager()
    return await domainManager.getDomainStatus(subdomain)
  } catch (error) {
    console.error('❌ Error checking domain status:', error)
    return { exists: false, verified: false, ssl: false }
  }
}
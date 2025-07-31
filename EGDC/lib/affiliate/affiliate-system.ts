import { Pool } from 'pg'
import crypto from 'crypto'

interface Affiliate {
  id: string
  email: string
  firstName: string
  lastName: string
  companyName?: string
  website?: string
  socialMedia?: {
    instagram?: string
    tiktok?: string
    youtube?: string
    facebook?: string
  }
  phone?: string
  address?: string
  status: AffiliateStatus
  tier: AffiliateTier
  commissionRate: number
  paymentMethod: PaymentMethod
  taxInfo?: TaxInfo
  referralCode: string
  totalEarnings: number
  totalCommissions: number
  totalClicks: number
  totalConversions: number
  conversionRate: number
  joinDate: Date
  lastPayment?: Date
  bankAccount?: BankAccount
}

interface AffiliateClick {
  id: number
  affiliateId: string
  productId?: number
  referralCode: string
  clickSource: string
  ipAddress: string
  userAgent: string
  country?: string
  city?: string
  clickedAt: Date
  convertedAt?: Date
  orderId?: number
  commissionEarned?: number
}

interface AffiliateCommission {
  id: number
  affiliateId: string
  orderId: number
  customerId: string
  productIds: number[]
  orderTotal: number
  commissionRate: number
  commissionAmount: number
  status: CommissionStatus
  createdAt: Date
  paidAt?: Date
  paymentBatchId?: string
}

interface AffiliatePayout {
  id: string
  affiliateId: string
  amount: number
  currency: string
  status: PayoutStatus
  paymentMethod: PaymentMethod
  paymentReference?: string
  taxWithheld?: number
  fees?: number
  netAmount: number
  requestedAt: Date
  processedAt?: Date
  completedAt?: Date
  commissionIds: number[]
}

interface AffiliateLink {
  id: string
  affiliateId: string
  productId?: number
  categoryId?: string
  linkType: LinkType
  originalUrl: string
  shortUrl: string
  customAlias?: string
  title: string
  description?: string
  isActive: boolean
  clickCount: number
  conversionCount: number
  lastClicked?: Date
  createdAt: Date
  expiresAt?: Date
}

type AffiliateStatus = 'pending' | 'active' | 'suspended' | 'rejected' | 'inactive'
type AffiliateTier = 'starter' | 'bronze' | 'silver' | 'gold' | 'platinum'
type CommissionStatus = 'pending' | 'approved' | 'paid' | 'cancelled'
type PayoutStatus = 'requested' | 'processing' | 'completed' | 'failed' | 'cancelled'
type PaymentMethod = 'bank_transfer' | 'paypal' | 'stripe' | 'cash'
type LinkType = 'product' | 'category' | 'homepage' | 'custom'

interface TaxInfo {
  taxId?: string
  businessName?: string
  taxCountry: string
  vatNumber?: string
  isBusinessEntity: boolean
}

interface BankAccount {
  accountName: string
  bankName: string
  accountNumber: string
  routingNumber?: string
  swiftCode?: string
  iban?: string
}

interface CommissionRule {
  id: string
  name: string
  conditions: CommissionCondition[]
  commissionType: 'percentage' | 'fixed' | 'tiered'
  value: number | TieredCommission[]
  isActive: boolean
  validFrom: Date
  validUntil?: Date
  priority: number
}

interface CommissionCondition {
  type: 'product_category' | 'order_total' | 'affiliate_tier' | 'customer_type' | 'product_brand'
  operator: 'equals' | 'greater_than' | 'less_than' | 'in_range' | 'includes'
  value: any
}

interface TieredCommission {
  minAmount: number
  maxAmount?: number
  commissionRate: number
}

export class AffiliateSystem {
  private pool: Pool
  private baseUrl: string
  private secretKey: string

  constructor(pool: Pool, baseUrl: string = 'https://lospapatos.com', secretKey?: string) {
    this.pool = pool
    this.baseUrl = baseUrl
    this.secretKey = secretKey || process.env.AFFILIATE_SECRET_KEY || 'fallback-secret-key'
  }

  public async initializeAffiliateSystem(): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      // Create affiliate tables
      await client.query(`
        CREATE TABLE IF NOT EXISTS affiliates (
          id VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          first_name VARCHAR(255) NOT NULL,
          last_name VARCHAR(255) NOT NULL,
          company_name VARCHAR(255),
          website VARCHAR(500),
          social_media JSONB,
          phone VARCHAR(50),
          address TEXT,
          status VARCHAR(20) DEFAULT 'pending',
          tier VARCHAR(20) DEFAULT 'starter',
          commission_rate DECIMAL(5,2) DEFAULT 5.00,
          payment_method VARCHAR(20) DEFAULT 'bank_transfer',
          tax_info JSONB,
          referral_code VARCHAR(50) UNIQUE NOT NULL,
          total_earnings DECIMAL(12,2) DEFAULT 0,
          total_commissions DECIMAL(12,2) DEFAULT 0,
          total_clicks INTEGER DEFAULT 0,
          total_conversions INTEGER DEFAULT 0,
          conversion_rate DECIMAL(5,2) DEFAULT 0,
          join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_payment TIMESTAMP WITH TIME ZONE,
          bank_account JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS affiliate_clicks (
          id SERIAL PRIMARY KEY,
          affiliate_id VARCHAR(255) NOT NULL REFERENCES affiliates(id),
          product_id INTEGER REFERENCES products(id),
          referral_code VARCHAR(50) NOT NULL,
          click_source VARCHAR(255),
          ip_address INET,
          user_agent TEXT,
          country VARCHAR(2),
          city VARCHAR(100),
          clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          converted_at TIMESTAMP WITH TIME ZONE,
          order_id INTEGER,
          commission_earned DECIMAL(10,2)
        )
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS affiliate_commissions (
          id SERIAL PRIMARY KEY,
          affiliate_id VARCHAR(255) NOT NULL REFERENCES affiliates(id),
          order_id INTEGER NOT NULL,
          customer_id VARCHAR(255),
          product_ids INTEGER[],
          order_total DECIMAL(10,2) NOT NULL,
          commission_rate DECIMAL(5,2) NOT NULL,
          commission_amount DECIMAL(10,2) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          paid_at TIMESTAMP WITH TIME ZONE,
          payment_batch_id VARCHAR(255)
        )
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS affiliate_payouts (
          id VARCHAR(255) PRIMARY KEY,
          affiliate_id VARCHAR(255) NOT NULL REFERENCES affiliates(id),
          amount DECIMAL(12,2) NOT NULL,
          currency VARCHAR(3) DEFAULT 'MXN',
          status VARCHAR(20) DEFAULT 'requested',
          payment_method VARCHAR(20) NOT NULL,
          payment_reference VARCHAR(255),
          tax_withheld DECIMAL(10,2) DEFAULT 0,
          fees DECIMAL(10,2) DEFAULT 0,
          net_amount DECIMAL(12,2) NOT NULL,
          requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          processed_at TIMESTAMP WITH TIME ZONE,
          completed_at TIMESTAMP WITH TIME ZONE,
          commission_ids INTEGER[]
        )
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS affiliate_links (
          id VARCHAR(255) PRIMARY KEY,
          affiliate_id VARCHAR(255) NOT NULL REFERENCES affiliates(id),
          product_id INTEGER REFERENCES products(id),
          category_id VARCHAR(255),
          link_type VARCHAR(20) NOT NULL,
          original_url TEXT NOT NULL,
          short_url VARCHAR(500) NOT NULL,
          custom_alias VARCHAR(100),
          title VARCHAR(500) NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT true,
          click_count INTEGER DEFAULT 0,
          conversion_count INTEGER DEFAULT 0,
          last_clicked TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          expires_at TIMESTAMP WITH TIME ZONE
        )
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS commission_rules (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          conditions JSONB,
          commission_type VARCHAR(20) NOT NULL,
          commission_value JSONB NOT NULL,
          is_active BOOLEAN DEFAULT true,
          valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          valid_until TIMESTAMP WITH TIME ZONE,
          priority INTEGER DEFAULT 0
        )
      `)

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_affiliates_email ON affiliates(email);
        CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code ON affiliates(referral_code);
        CREATE INDEX IF NOT EXISTS idx_affiliates_status ON affiliates(status);
        CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate_id ON affiliate_clicks(affiliate_id);
        CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_referral_code ON affiliate_clicks(referral_code);
        CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_clicked_at ON affiliate_clicks(clicked_at);
        CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate_id ON affiliate_commissions(affiliate_id);
        CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_status ON affiliate_commissions(status);
        CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate_id ON affiliate_payouts(affiliate_id);
        CREATE INDEX IF NOT EXISTS idx_affiliate_links_affiliate_id ON affiliate_links(affiliate_id);
      `)

      // Initialize default commission rules
      await this.initializeDefaultCommissionRules(client)

    } finally {
      client.release()
    }
  }

  private async initializeDefaultCommissionRules(client: any): Promise<void> {
    const defaultRules = [
      {
        id: 'default_commission',
        name: 'Comisión base',
        conditions: [],
        commission_type: 'percentage',
        commission_value: { rate: 5 },
        priority: 0
      },
      {
        id: 'premium_brands_boost',
        name: 'Boost para marcas premium',
        conditions: [
          {
            type: 'product_brand',
            operator: 'includes',
            value: ['Nike', 'Adidas', 'Jordan']
          }
        ],
        commission_type: 'percentage',
        commission_value: { rate: 8 },
        priority: 1
      },
      {
        id: 'high_value_orders',
        name: 'Órdenes de alto valor',
        conditions: [
          {
            type: 'order_total',
            operator: 'greater_than',
            value: 5000
          }
        ],
        commission_type: 'percentage',
        commission_value: { rate: 10 },
        priority: 2
      },
      {
        id: 'gold_tier_bonus',
        name: 'Bonus tier Oro',
        conditions: [
          {
            type: 'affiliate_tier',
            operator: 'includes',
            value: ['gold', 'platinum']
          }
        ],
        commission_type: 'percentage',
        commission_value: { rate: 12 },
        priority: 3
      }
    ]

    for (const rule of defaultRules) {
      await client.query(`
        INSERT INTO commission_rules (
          id, name, conditions, commission_type, commission_value, priority
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING
      `, [
        rule.id,
        rule.name,
        JSON.stringify(rule.conditions),
        rule.commission_type,
        JSON.stringify(rule.commission_value),
        rule.priority
      ])
    }
  }

  public async registerAffiliate(affiliateData: {
    email: string
    firstName: string
    lastName: string
    companyName?: string
    website?: string
    socialMedia?: any
    phone?: string
    address?: string
  }): Promise<Affiliate> {
    const client = await this.pool.connect()
    
    try {
      const affiliateId = `aff_${crypto.randomBytes(8).toString('hex')}`
      const referralCode = await this.generateUniqueReferralCode(affiliateData.firstName, affiliateData.lastName)

      await client.query(`
        INSERT INTO affiliates (
          id, email, first_name, last_name, company_name, website, 
          social_media, phone, address, referral_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        affiliateId,
        affiliateData.email,
        affiliateData.firstName,
        affiliateData.lastName,
        affiliateData.companyName,
        affiliateData.website,
        JSON.stringify(affiliateData.socialMedia),
        affiliateData.phone,
        affiliateData.address,
        referralCode
      ])

      return await this.getAffiliate(affiliateId)

    } finally {
      client.release()
    }
  }

  private async generateUniqueReferralCode(firstName: string, lastName: string): Promise<string> {
    const baseCode = `${firstName.slice(0, 3)}${lastName.slice(0, 3)}`.toUpperCase()
    let referralCode = baseCode
    let counter = 1

    while (true) {
      const existingCode = await this.pool.query(
        'SELECT id FROM affiliates WHERE referral_code = $1',
        [referralCode]
      )

      if (existingCode.rows.length === 0) {
        break
      }

      referralCode = `${baseCode}${counter}`
      counter++
    }

    return referralCode
  }

  public async trackClick(
    referralCode: string,
    productId: number | null,
    clickData: {
      source: string
      ipAddress: string
      userAgent: string
      country?: string
      city?: string
    }
  ): Promise<number> {
    const client = await this.pool.connect()
    
    try {
      // Find affiliate by referral code
      const affiliateResult = await client.query(
        'SELECT id FROM affiliates WHERE referral_code = $1 AND status = $2',
        [referralCode, 'active']
      )

      if (affiliateResult.rows.length === 0) {
        throw new Error('Invalid or inactive referral code')
      }

      const affiliateId = affiliateResult.rows[0].id

      // Insert click record
      const clickResult = await client.query(`
        INSERT INTO affiliate_clicks (
          affiliate_id, product_id, referral_code, click_source, 
          ip_address, user_agent, country, city
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        affiliateId,
        productId,
        referralCode,
        clickData.source,
        clickData.ipAddress,
        clickData.userAgent,
        clickData.country,
        clickData.city
      ])

      // Update affiliate click count
      await client.query(
        'UPDATE affiliates SET total_clicks = total_clicks + 1 WHERE id = $1',
        [affiliateId]
      )

      // Update link click count if it's from a tracked link
      if (clickData.source.startsWith('link_')) {
        const linkId = clickData.source.replace('link_', '')
        await client.query(`
          UPDATE affiliate_links 
          SET click_count = click_count + 1, last_clicked = NOW() 
          WHERE id = $1
        `, [linkId])
      }

      return clickResult.rows[0].id

    } finally {
      client.release()
    }
  }

  public async processCommission(
    orderId: number,
    orderData: {
      customerId: string
      items: Array<{ productId: number; price: number; quantity: number }>
      total: number
    },
    referralCode?: string
  ): Promise<number | null> {
    if (!referralCode) return null

    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')

      // Find affiliate by referral code
      const affiliateResult = await client.query(
        'SELECT * FROM affiliates WHERE referral_code = $1 AND status = $2',
        [referralCode, 'active']
      )

      if (affiliateResult.rows.length === 0) {
        await client.query('ROLLBACK')
        return null
      }

      const affiliate = affiliateResult.rows[0]

      // Calculate commission based on rules
      const commissionRate = await this.calculateCommissionRate(
        affiliate,
        orderData.items,
        orderData.total
      )

      const commissionAmount = (orderData.total * commissionRate) / 100

      // Create commission record
      const commissionResult = await client.query(`
        INSERT INTO affiliate_commissions (
          affiliate_id, order_id, customer_id, product_ids, 
          order_total, commission_rate, commission_amount
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        affiliate.id,
        orderId,
        orderData.customerId,
        orderData.items.map(item => item.productId),
        orderData.total,
        commissionRate,
        commissionAmount
      ])

      const commissionId = commissionResult.rows[0].id

      // Update affiliate stats
      await client.query(`
        UPDATE affiliates 
        SET 
          total_conversions = total_conversions + 1,
          total_commissions = total_commissions + $1,
          conversion_rate = CASE 
            WHEN total_clicks > 0 THEN (total_conversions::decimal / total_clicks) * 100 
            ELSE 0 
          END
        WHERE id = $2
      `, [commissionAmount, affiliate.id])

      // Update click record if exists
      await client.query(`
        UPDATE affiliate_clicks 
        SET 
          converted_at = NOW(),
          order_id = $1,
          commission_earned = $2
        WHERE affiliate_id = $3 
        AND referral_code = $4 
        AND converted_at IS NULL
        AND clicked_at > NOW() - INTERVAL '30 days'
        ORDER BY clicked_at DESC
        LIMIT 1
      `, [orderId, commissionAmount, affiliate.id, referralCode])

      // Check for tier upgrade
      await this.checkTierUpgrade(client, affiliate.id)

      await client.query('COMMIT')

      return commissionId

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  private async calculateCommissionRate(
    affiliate: any,
    items: Array<{ productId: number; price: number; quantity: number }>,
    orderTotal: number
  ): Promise<number> {
    // Get active commission rules
    const rulesResult = await this.pool.query(`
      SELECT * FROM commission_rules 
      WHERE is_active = true 
      AND (valid_until IS NULL OR valid_until > NOW())
      ORDER BY priority DESC
    `)

    let highestRate = affiliate.commission_rate || 5 // Default rate

    // Get product details for rule evaluation
    const productIds = items.map(item => item.productId)
    const productsResult = await this.pool.query(`
      SELECT id, categoria, marca FROM products WHERE id = ANY($1::int[])
    `, [productIds])

    const productsMap = new Map()
    productsResult.rows.forEach((product: any) => {
      productsMap.set(product.id, product)
    })

    // Evaluate each rule
    for (const rule of rulesResult.rows) {
      const conditions = rule.conditions || []
      const meetsConditions = this.evaluateCommissionConditions(
        conditions,
        affiliate,
        items,
        productsMap,
        orderTotal
      )

      if (meetsConditions) {
        const ruleValue = rule.commission_value
        if (rule.commission_type === 'percentage') {
          highestRate = Math.max(highestRate, ruleValue.rate)
        }
      }
    }

    return highestRate
  }

  private evaluateCommissionConditions(
    conditions: any[],
    affiliate: any,
    items: any[],
    productsMap: Map<number, any>,
    orderTotal: number
  ): boolean {
    if (conditions.length === 0) return true

    return conditions.every(condition => {
      switch (condition.type) {
        case 'affiliate_tier':
          return condition.value.includes(affiliate.tier)
        
        case 'order_total':
          if (condition.operator === 'greater_than') {
            return orderTotal > condition.value
          }
          if (condition.operator === 'less_than') {
            return orderTotal < condition.value
          }
          break
        
        case 'product_brand':
          return items.some(item => {
            const product = productsMap.get(item.productId)
            return product && condition.value.includes(product.marca)
          })
        
        case 'product_category':
          return items.some(item => {
            const product = productsMap.get(item.productId)
            return product && condition.value.includes(product.categoria)
          })
      }
      
      return false
    })
  }

  private async checkTierUpgrade(client: any, affiliateId: string): Promise<void> {
    const result = await client.query(`
      SELECT total_conversions, total_commissions, tier
      FROM affiliates 
      WHERE id = $1
    `, [affiliateId])

    if (result.rows.length === 0) return

    const { total_conversions, total_commissions, tier } = result.rows[0]
    const newTier = this.calculateAffiliateTier(total_conversions, parseFloat(total_commissions))

    if (newTier !== tier) {
      await client.query(`
        UPDATE affiliates 
        SET 
          tier = $1,
          commission_rate = $2,
          updated_at = NOW()
        WHERE id = $3
      `, [newTier, this.getTierCommissionRate(newTier), affiliateId])
    }
  }

  private calculateAffiliateTier(conversions: number, commissions: number): AffiliateTier {
    if (conversions >= 100 && commissions >= 50000) return 'platinum'
    if (conversions >= 50 && commissions >= 20000) return 'gold'
    if (conversions >= 20 && commissions >= 8000) return 'silver'
    if (conversions >= 5 && commissions >= 2000) return 'bronze'
    return 'starter'
  }

  private getTierCommissionRate(tier: AffiliateTier): number {
    const rates = {
      starter: 5,
      bronze: 6,
      silver: 7,
      gold: 8,
      platinum: 10
    }
    return rates[tier] || 5
  }

  public async createAffiliateLink(
    affiliateId: string,
    linkData: {
      productId?: number
      categoryId?: string
      linkType: LinkType
      originalUrl: string
      title: string
      description?: string
      customAlias?: string
      expiresAt?: Date
    }
  ): Promise<AffiliateLink> {
    const linkId = `link_${crypto.randomBytes(8).toString('hex')}`
    const shortUrl = this.generateShortUrl(linkId, linkData.customAlias)

    await this.pool.query(`
      INSERT INTO affiliate_links (
        id, affiliate_id, product_id, category_id, link_type,
        original_url, short_url, custom_alias, title, description, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      linkId,
      affiliateId,
      linkData.productId,
      linkData.categoryId,
      linkData.linkType,
      linkData.originalUrl,
      shortUrl,
      linkData.customAlias,
      linkData.title,
      linkData.description,
      linkData.expiresAt
    ])

    return await this.getAffiliateLink(linkId)
  }

  private generateShortUrl(linkId: string, customAlias?: string): string {
    const path = customAlias || linkId.replace('link_', '')
    return `${this.baseUrl}/r/${path}`
  }

  public async requestPayout(
    affiliateId: string,
    amount: number,
    paymentMethod: PaymentMethod = 'bank_transfer'
  ): Promise<string> {
    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')

      // Get affiliate's pending commissions
      const commissionsResult = await client.query(`
        SELECT id, commission_amount 
        FROM affiliate_commissions 
        WHERE affiliate_id = $1 AND status = 'approved'
        ORDER BY created_at ASC
      `, [affiliateId])

      const availableAmount = commissionsResult.rows.reduce(
        (sum: number, commission: any) => sum + parseFloat(commission.commission_amount),
        0
      )

      if (amount > availableAmount) {
        throw new Error('Insufficient available commission balance')
      }

      // Create payout request
      const payoutId = `payout_${crypto.randomBytes(8).toString('hex')}`
      const fees = this.calculatePayoutFees(amount, paymentMethod)
      const netAmount = amount - fees

      await client.query(`
        INSERT INTO affiliate_payouts (
          id, affiliate_id, amount, payment_method, 
          fees, net_amount, commission_ids
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        payoutId,
        affiliateId,
        amount,
        paymentMethod,
        fees,
        netAmount,
        commissionsResult.rows.map((c: any) => c.id).slice(0, Math.ceil(amount / 100)) // Approximate
      ])

      // Mark commissions as paid
      let remainingAmount = amount
      for (const commission of commissionsResult.rows) {
        if (remainingAmount <= 0) break
        
        const commissionAmount = parseFloat(commission.commission_amount)
        if (remainingAmount >= commissionAmount) {
          await client.query(`
            UPDATE affiliate_commissions 
            SET status = 'paid', paid_at = NOW(), payment_batch_id = $1
            WHERE id = $2
          `, [payoutId, commission.id])
          
          remainingAmount -= commissionAmount
        }
      }

      await client.query('COMMIT')

      return payoutId

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  private calculatePayoutFees(amount: number, paymentMethod: PaymentMethod): number {
    const feeRates = {
      bank_transfer: 0.02, // 2%
      paypal: 0.035, // 3.5%
      stripe: 0.029, // 2.9%
      cash: 0 // No fees
    }

    return amount * (feeRates[paymentMethod] || 0.02)
  }

  public async getAffiliate(affiliateId: string): Promise<Affiliate> {
    const result = await this.pool.query(
      'SELECT * FROM affiliates WHERE id = $1',
      [affiliateId]
    )

    if (result.rows.length === 0) {
      throw new Error('Affiliate not found')
    }

    const affiliate = result.rows[0]
    return {
      id: affiliate.id,
      email: affiliate.email,
      firstName: affiliate.first_name,
      lastName: affiliate.last_name,
      companyName: affiliate.company_name,
      website: affiliate.website,
      socialMedia: affiliate.social_media,
      phone: affiliate.phone,
      address: affiliate.address,
      status: affiliate.status,
      tier: affiliate.tier,
      commissionRate: parseFloat(affiliate.commission_rate),
      paymentMethod: affiliate.payment_method,
      taxInfo: affiliate.tax_info,
      referralCode: affiliate.referral_code,
      totalEarnings: parseFloat(affiliate.total_earnings),
      totalCommissions: parseFloat(affiliate.total_commissions),
      totalClicks: affiliate.total_clicks,
      totalConversions: affiliate.total_conversions,
      conversionRate: parseFloat(affiliate.conversion_rate),
      joinDate: affiliate.join_date,
      lastPayment: affiliate.last_payment,
      bankAccount: affiliate.bank_account
    }
  }

  public async getAffiliateLink(linkId: string): Promise<AffiliateLink> {
    const result = await this.pool.query(
      'SELECT * FROM affiliate_links WHERE id = $1',
      [linkId]
    )

    if (result.rows.length === 0) {
      throw new Error('Affiliate link not found')
    }

    const link = result.rows[0]
    return {
      id: link.id,
      affiliateId: link.affiliate_id,
      productId: link.product_id,
      categoryId: link.category_id,
      linkType: link.link_type,
      originalUrl: link.original_url,
      shortUrl: link.short_url,
      customAlias: link.custom_alias,
      title: link.title,
      description: link.description,
      isActive: link.is_active,
      clickCount: link.click_count,
      conversionCount: link.conversion_count,
      lastClicked: link.last_clicked,
      createdAt: link.created_at,
      expiresAt: link.expires_at
    }
  }

  public async getAffiliateStats(
    affiliateId: string,
    period: '7d' | '30d' | '90d' | '1y' = '30d'
  ): Promise<{
    clicks: number
    conversions: number
    conversionRate: number
    commissions: number
    earnings: number
    topProducts: any[]
    clicksByDay: any[]
  }> {
    const periodDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    }

    const days = periodDays[period]

    const [clicksResult, commissionsResult, topProductsResult, dailyClicksResult] = await Promise.all([
      // Total clicks in period
      this.pool.query(`
        SELECT COUNT(*) as clicks
        FROM affiliate_clicks 
        WHERE affiliate_id = $1 
        AND clicked_at > NOW() - INTERVAL '${days} days'
      `, [affiliateId]),

      // Commissions in period
      this.pool.query(`
        SELECT 
          COUNT(*) as conversions,
          SUM(commission_amount) as earnings
        FROM affiliate_commissions 
        WHERE affiliate_id = $1 
        AND created_at > NOW() - INTERVAL '${days} days'
      `, [affiliateId]),

      // Top performing products
      this.pool.query(`
        SELECT 
          p.id,
          p.marca,
          p.modelo,
          p.precio_shopify,
          COUNT(ac.id) as clicks,
          COUNT(acm.id) as conversions,
          SUM(acm.commission_amount) as total_commission
        FROM products p
        LEFT JOIN affiliate_clicks ac ON p.id = ac.product_id 
          AND ac.affiliate_id = $1 
          AND ac.clicked_at > NOW() - INTERVAL '${days} days'
        LEFT JOIN affiliate_commissions acm ON EXISTS (
          SELECT 1 FROM unnest(acm.product_ids) AS pid WHERE pid = p.id
        ) AND acm.affiliate_id = $1 
          AND acm.created_at > NOW() - INTERVAL '${days} days'
        WHERE ac.id IS NOT NULL OR acm.id IS NOT NULL
        GROUP BY p.id, p.marca, p.modelo, p.precio_shopify
        ORDER BY total_commission DESC NULLS LAST, clicks DESC
        LIMIT 10
      `, [affiliateId]),

      // Daily clicks for chart
      this.pool.query(`
        SELECT 
          DATE(clicked_at) as date,
          COUNT(*) as clicks
        FROM affiliate_clicks 
        WHERE affiliate_id = $1 
        AND clicked_at > NOW() - INTERVAL '${days} days'
        GROUP BY DATE(clicked_at)
        ORDER BY date ASC
      `, [affiliateId])
    ])

    const clicks = parseInt(clicksResult.rows[0].clicks) || 0
    const conversions = parseInt(commissionsResult.rows[0].conversions) || 0
    const earnings = parseFloat(commissionsResult.rows[0].earnings) || 0

    return {
      clicks,
      conversions,
      conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
      commissions: conversions,
      earnings,
      topProducts: topProductsResult.rows,
      clicksByDay: dailyClicksResult.rows
    }
  }
}

export const affiliateSystemSchema = `
  -- This schema is included in the AffiliateSystem.initializeAffiliateSystem() method
  -- Run this method to create all necessary tables and indexes
`
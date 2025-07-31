import { Pool } from 'pg'

interface Customer {
  id: string
  email: string
  firstName: string
  lastName: string
  loyaltyTier: LoyaltyTier
  totalSpent: number
  totalPoints: number
  availablePoints: number
  joinDate: Date
}

interface LoyaltyTransaction {
  id: number
  customerId: string
  orderId?: number
  points: number
  type: 'earned' | 'redeemed' | 'expired' | 'bonus' | 'referral'
  description: string
  createdAt: Date
  expiresAt?: Date
}

interface Reward {
  id: string
  name: string
  description: string
  pointsCost: number
  rewardType: 'discount' | 'free_shipping' | 'product' | 'cashback'
  value: number
  isActive: boolean
  validUntil?: Date
  minimumTier?: LoyaltyTier
  usageLimit?: number
  currentUsage: number
}

interface LoyaltyRule {
  id: string
  name: string
  trigger: 'purchase' | 'signup' | 'birthday' | 'referral' | 'review' | 'social_share'
  conditions: LoyaltyCondition[]
  pointsAwarded: number
  isActive: boolean
}

interface LoyaltyCondition {
  type: 'minimum_amount' | 'product_category' | 'first_purchase' | 'tier_requirement'
  operator: 'equals' | 'greater_than' | 'less_than' | 'includes'
  value: any
}

type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum'

interface TierBenefits {
  tier: LoyaltyTier
  name: string
  minimumSpent: number
  pointsMultiplier: number
  benefits: string[]
  freeShippingThreshold: number
  birthdayBonus: number
}

export class LoyaltySystem {
  private pool: Pool
  private tiers: TierBenefits[] = [
    {
      tier: 'bronze',
      name: 'Bronce',
      minimumSpent: 0,
      pointsMultiplier: 1,
      benefits: ['1 punto por cada $10 gastados', 'Ofertas exclusivas por email'],
      freeShippingThreshold: 1000,
      birthdayBonus: 100
    },
    {
      tier: 'silver',
      name: 'Plata',
      minimumSpent: 5000,
      pointsMultiplier: 1.2,
      benefits: ['1.2 puntos por cada $10 gastados', 'Envío gratis desde $800', 'Acceso temprano a ofertas'],
      freeShippingThreshold: 800,
      birthdayBonus: 200
    },
    {
      tier: 'gold',
      name: 'Oro',
      minimumSpent: 15000,
      pointsMultiplier: 1.5,
      benefits: ['1.5 puntos por cada $10 gastados', 'Envío gratis desde $500', 'Descuentos exclusivos', 'Atención prioritaria'],
      freeShippingThreshold: 500,
      birthdayBonus: 300
    },
    {
      tier: 'platinum',
      name: 'Platino',
      minimumSpent: 30000,
      pointsMultiplier: 2,
      benefits: ['2 puntos por cada $10 gastados', 'Envío gratis en todas las compras', 'Descuentos VIP', 'Concierge personal'],
      freeShippingThreshold: 0,
      birthdayBonus: 500
    }
  ]

  private rules: LoyaltyRule[] = [
    {
      id: 'purchase_points',
      name: 'Puntos por compra',
      trigger: 'purchase',
      conditions: [],
      pointsAwarded: 10, // Base points per $100 spent
      isActive: true
    },
    {
      id: 'signup_bonus',
      name: 'Bono de registro',
      trigger: 'signup',
      conditions: [],
      pointsAwarded: 500,
      isActive: true
    },
    {
      id: 'first_purchase_bonus',
      name: 'Bono primera compra',
      trigger: 'purchase',
      conditions: [
        {
          type: 'first_purchase',
          operator: 'equals',
          value: true
        }
      ],
      pointsAwarded: 1000,
      isActive: true
    },
    {
      id: 'birthday_bonus',
      name: 'Bono de cumpleaños',
      trigger: 'birthday',
      conditions: [],
      pointsAwarded: 0, // Variable based on tier
      isActive: true
    },
    {
      id: 'referral_bonus',
      name: 'Bono por referido',
      trigger: 'referral',
      conditions: [],
      pointsAwarded: 2000,
      isActive: true
    },
    {
      id: 'review_bonus',
      name: 'Bono por reseña',
      trigger: 'review',
      conditions: [],
      pointsAwarded: 200,
      isActive: true
    }
  ]

  constructor(pool: Pool) {
    this.pool = pool
  }

  public async initializeLoyaltySystem(): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      // Create loyalty tables
      await client.query(`
        CREATE TABLE IF NOT EXISTS loyalty_customers (
          id VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          first_name VARCHAR(255),
          last_name VARCHAR(255),
          loyalty_tier VARCHAR(20) DEFAULT 'bronze',
          total_spent DECIMAL(10,2) DEFAULT 0,
          total_points INTEGER DEFAULT 0,
          available_points INTEGER DEFAULT 0,
          birthday DATE,
          join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_tier_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS loyalty_transactions (
          id SERIAL PRIMARY KEY,
          customer_id VARCHAR(255) NOT NULL REFERENCES loyalty_customers(id),
          order_id INTEGER,
          points INTEGER NOT NULL,
          transaction_type VARCHAR(20) NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          expires_at TIMESTAMP WITH TIME ZONE
        )
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS loyalty_rewards (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          points_cost INTEGER NOT NULL,
          reward_type VARCHAR(20) NOT NULL,
          reward_value DECIMAL(10,2),
          is_active BOOLEAN DEFAULT true,
          valid_until TIMESTAMP WITH TIME ZONE,
          minimum_tier VARCHAR(20),
          usage_limit INTEGER,
          current_usage INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS loyalty_redemptions (
          id SERIAL PRIMARY KEY,
          customer_id VARCHAR(255) NOT NULL REFERENCES loyalty_customers(id),
          reward_id VARCHAR(255) NOT NULL REFERENCES loyalty_rewards(id),
          points_used INTEGER NOT NULL,
          order_id INTEGER,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          expires_at TIMESTAMP WITH TIME ZONE
        )
      `)

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_loyalty_customers_email ON loyalty_customers(email);
        CREATE INDEX IF NOT EXISTS idx_loyalty_customers_tier ON loyalty_customers(loyalty_tier);
        CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer_id ON loyalty_transactions(customer_id);
        CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_type ON loyalty_transactions(transaction_type);
        CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_customer_id ON loyalty_redemptions(customer_id);
      `)

      // Initialize default rewards
      await this.initializeDefaultRewards(client)

    } finally {
      client.release()
    }
  }

  private async initializeDefaultRewards(client: any): Promise<void> {
    const defaultRewards = [
      {
        id: 'discount_5_percent',
        name: '5% de Descuento',
        description: 'Descuento del 5% en tu próxima compra',
        points_cost: 1000,
        reward_type: 'discount',
        reward_value: 5,
        minimum_tier: 'bronze'
      },
      {
        id: 'discount_10_percent',
        name: '10% de Descuento',
        description: 'Descuento del 10% en tu próxima compra',
        points_cost: 2000,
        reward_type: 'discount',
        reward_value: 10,
        minimum_tier: 'silver'
      },
      {
        id: 'free_shipping',
        name: 'Envío Gratis',
        description: 'Envío gratis en tu próxima compra',
        points_cost: 800,
        reward_type: 'free_shipping',
        reward_value: 1,
        minimum_tier: 'bronze'
      },
      {
        id: 'cashback_100',
        name: '$100 de Descuento',
        description: '$100 pesos de descuento en compras mayores a $1000',
        points_cost: 3000,
        reward_type: 'cashback',
        reward_value: 100,
        minimum_tier: 'gold'
      },
      {
        id: 'discount_15_percent_vip',
        name: '15% Descuento VIP',
        description: 'Descuento VIP del 15% sin restricciones',
        points_cost: 5000,
        reward_type: 'discount',
        reward_value: 15,
        minimum_tier: 'platinum'
      }
    ]

    for (const reward of defaultRewards) {
      await client.query(`
        INSERT INTO loyalty_rewards (
          id, name, description, points_cost, reward_type, 
          reward_value, minimum_tier, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        ON CONFLICT (id) DO NOTHING
      `, [
        reward.id,
        reward.name,
        reward.description,
        reward.points_cost,
        reward.reward_type,
        reward.reward_value,
        reward.minimum_tier
      ])
    }
  }

  public async registerCustomer(customerData: {
    id: string
    email: string
    firstName: string
    lastName: string
    birthday?: Date
  }): Promise<Customer> {
    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')

      // Insert customer
      await client.query(`
        INSERT INTO loyalty_customers (
          id, email, first_name, last_name, birthday
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `, [
        customerData.id,
        customerData.email,
        customerData.firstName,
        customerData.lastName,
        customerData.birthday
      ])

      // Award signup bonus
      await this.awardPoints(
        client,
        customerData.id,
        500,
        'bonus',
        'Bono de bienvenida por registrarse'
      )

      await client.query('COMMIT')

      return await this.getCustomerLoyaltyData(customerData.id)

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  public async processOrderPoints(
    customerId: string,
    orderData: {
      orderId: number
      totalAmount: number
      isFirstPurchase: boolean
    }
  ): Promise<number> {
    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')

      const customer = await this.getCustomerLoyaltyData(customerId)
      const tier = this.getTierBenefits(customer.loyaltyTier)
      
      // Calculate base points (1 point per $10 spent)
      const basePoints = Math.floor(orderData.totalAmount / 10)
      
      // Apply tier multiplier
      const pointsEarned = Math.floor(basePoints * tier.pointsMultiplier)

      // Award purchase points
      await this.awardPoints(
        client,
        customerId,
        pointsEarned,
        'earned',
        `Puntos por compra #${orderData.orderId}`,
        orderData.orderId
      )

      let totalPointsAwarded = pointsEarned

      // Award first purchase bonus
      if (orderData.isFirstPurchase) {
        await this.awardPoints(
          client,
          customerId,
          1000,
          'bonus',
          'Bono por primera compra',
          orderData.orderId
        )
        totalPointsAwarded += 1000
      }

      // Update customer's total spent
      await client.query(`
        UPDATE loyalty_customers 
        SET 
          total_spent = total_spent + $1,
          updated_at = NOW()
        WHERE id = $2
      `, [orderData.totalAmount, customerId])

      // Check for tier upgrade
      await this.checkTierUpgrade(client, customerId)

      await client.query('COMMIT')

      return totalPointsAwarded

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  private async awardPoints(
    client: any,
    customerId: string,
    points: number,
    type: string,
    description: string,
    orderId?: number
  ): Promise<void> {
    // Insert transaction
    await client.query(`
      INSERT INTO loyalty_transactions (
        customer_id, order_id, points, transaction_type, description, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      customerId,
      orderId,
      points,
      type,
      description,
      type === 'earned' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null // 1 year expiry for earned points
    ])

    // Update customer's available points
    await client.query(`
      UPDATE loyalty_customers 
      SET 
        available_points = available_points + $1,
        total_points = total_points + $1,
        updated_at = NOW()
      WHERE id = $2
    `, [points, customerId])
  }

  private async checkTierUpgrade(client: any, customerId: string): Promise<void> {
    const result = await client.query(`
      SELECT total_spent, loyalty_tier
      FROM loyalty_customers 
      WHERE id = $1
    `, [customerId])

    if (result.rows.length === 0) return

    const { total_spent, loyalty_tier } = result.rows[0]
    const newTier = this.calculateTier(total_spent)

    if (newTier !== loyalty_tier) {
      await client.query(`
        UPDATE loyalty_customers 
        SET 
          loyalty_tier = $1,
          last_tier_check = NOW(),
          updated_at = NOW()
        WHERE id = $2
      `, [newTier, customerId])

      // Award tier upgrade bonus
      const tierBenefits = this.getTierBenefits(newTier)
      await this.awardPoints(
        client,
        customerId,
        tierBenefits.birthdayBonus,
        'bonus',
        `Bono por subir a tier ${tierBenefits.name}`
      )
    }
  }

  private calculateTier(totalSpent: number): LoyaltyTier {
    if (totalSpent >= 30000) return 'platinum'
    if (totalSpent >= 15000) return 'gold'
    if (totalSpent >= 5000) return 'silver'
    return 'bronze'
  }

  private getTierBenefits(tier: LoyaltyTier): TierBenefits {
    return this.tiers.find(t => t.tier === tier) || this.tiers[0]
  }

  public async redeemReward(
    customerId: string,
    rewardId: string
  ): Promise<{ success: boolean; redemptionId?: number; error?: string }> {
    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')

      // Get customer data
      const customer = await this.getCustomerLoyaltyData(customerId)
      
      // Get reward data
      const rewardResult = await client.query(`
        SELECT * FROM loyalty_rewards 
        WHERE id = $1 AND is_active = true
      `, [rewardId])

      if (rewardResult.rows.length === 0) {
        return { success: false, error: 'Reward not found or inactive' }
      }

      const reward = rewardResult.rows[0]

      // Check if customer has enough points
      if (customer.availablePoints < reward.points_cost) {
        return { success: false, error: 'Insufficient points' }
      }

      // Check tier requirement
      if (reward.minimum_tier) {
        const customerTierLevel = this.getTierLevel(customer.loyaltyTier)
        const requiredTierLevel = this.getTierLevel(reward.minimum_tier)
        
        if (customerTierLevel < requiredTierLevel) {
          return { success: false, error: 'Tier requirement not met' }
        }
      }

      // Check usage limit
      if (reward.usage_limit && reward.current_usage >= reward.usage_limit) {
        return { success: false, error: 'Reward usage limit reached' }
      }

      // Create redemption
      const redemptionResult = await client.query(`
        INSERT INTO loyalty_redemptions (
          customer_id, reward_id, points_used, expires_at
        ) VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [
        customerId,
        rewardId,
        reward.points_cost,
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days expiry
      ])

      const redemptionId = redemptionResult.rows[0].id

      // Deduct points
      await client.query(`
        INSERT INTO loyalty_transactions (
          customer_id, points, transaction_type, description
        ) VALUES ($1, $2, 'redeemed', $3)
      `, [
        customerId,
        -reward.points_cost,
        `Canjeado: ${reward.name}`
      ])

      // Update customer's available points
      await client.query(`
        UPDATE loyalty_customers 
        SET 
          available_points = available_points - $1,
          updated_at = NOW()
        WHERE id = $2
      `, [reward.points_cost, customerId])

      // Update reward usage count
      await client.query(`
        UPDATE loyalty_rewards 
        SET current_usage = current_usage + 1
        WHERE id = $1
      `, [rewardId])

      await client.query('COMMIT')

      return { success: true, redemptionId }

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  private getTierLevel(tier: LoyaltyTier): number {
    const levels = { bronze: 1, silver: 2, gold: 3, platinum: 4 }
    return levels[tier] || 1
  }

  public async getCustomerLoyaltyData(customerId: string): Promise<Customer> {
    const result = await this.pool.query(`
      SELECT * FROM loyalty_customers WHERE id = $1
    `, [customerId])

    if (result.rows.length === 0) {
      throw new Error('Customer not found')
    }

    const customer = result.rows[0]
    return {
      id: customer.id,
      email: customer.email,
      firstName: customer.first_name,
      lastName: customer.last_name,
      loyaltyTier: customer.loyalty_tier,
      totalSpent: parseFloat(customer.total_spent),
      totalPoints: customer.total_points,
      availablePoints: customer.available_points,
      joinDate: customer.join_date
    }
  }

  public async getAvailableRewards(customerId: string): Promise<Reward[]> {
    const customer = await this.getCustomerLoyaltyData(customerId)
    const tierLevel = this.getTierLevel(customer.loyaltyTier)

    const result = await this.pool.query(`
      SELECT * FROM loyalty_rewards 
      WHERE is_active = true 
      AND (valid_until IS NULL OR valid_until > NOW())
      AND (usage_limit IS NULL OR current_usage < usage_limit)
      ORDER BY points_cost ASC
    `)

    return result.rows
      .filter((reward: any) => {
        if (reward.minimum_tier) {
          const requiredLevel = this.getTierLevel(reward.minimum_tier)
          return tierLevel >= requiredLevel
        }
        return true
      })
      .map((reward: any) => ({
        id: reward.id,
        name: reward.name,
        description: reward.description,
        pointsCost: reward.points_cost,
        rewardType: reward.reward_type,
        value: parseFloat(reward.reward_value),
        isActive: reward.is_active,
        validUntil: reward.valid_until,
        minimumTier: reward.minimum_tier,
        usageLimit: reward.usage_limit,
        currentUsage: reward.current_usage
      }))
  }

  public async getLoyaltyTransactionHistory(
    customerId: string,
    limit: number = 50
  ): Promise<LoyaltyTransaction[]> {
    const result = await this.pool.query(`
      SELECT * FROM loyalty_transactions 
      WHERE customer_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `, [customerId, limit])

    return result.rows.map((tx: any) => ({
      id: tx.id,
      customerId: tx.customer_id,
      orderId: tx.order_id,
      points: tx.points,
      type: tx.transaction_type,
      description: tx.description,
      createdAt: tx.created_at,
      expiresAt: tx.expires_at
    }))
  }

  public getTiersList(): TierBenefits[] {
    return [...this.tiers]
  }

  // Method to handle birthday bonuses (to be called by a scheduled job)
  public async processBirthdayBonuses(): Promise<number> {
    const today = new Date()
    const todayString = today.toISOString().slice(5, 10) // MM-DD format

    const result = await this.pool.query(`
      SELECT id, loyalty_tier, first_name
      FROM loyalty_customers 
      WHERE TO_CHAR(birthday, 'MM-DD') = $1
      AND NOT EXISTS (
        SELECT 1 FROM loyalty_transactions 
        WHERE customer_id = loyalty_customers.id 
        AND transaction_type = 'bonus' 
        AND description LIKE 'Bono de cumpleaños%'
        AND created_at::date = CURRENT_DATE
      )
    `, [todayString])

    let processedCount = 0

    for (const customer of result.rows) {
      const tierBenefits = this.getTierBenefits(customer.loyalty_tier)
      
      const client = await this.pool.connect()
      try {
        await this.awardPoints(
          client,
          customer.id,
          tierBenefits.birthdayBonus,
          'bonus',
          `Bono de cumpleaños - ¡Feliz cumpleaños ${customer.first_name}!`
        )
        processedCount++
      } finally {
        client.release()
      }
    }

    return processedCount
  }
}

export const loyaltySystemSchema = `
  -- This schema is included in the LoyaltySystem.initializeLoyaltySystem() method
  -- Run this method to create all necessary tables and indexes
`
interface PricingRule {
  id: string
  name: string
  priority: number
  conditions: PricingCondition[]
  action: PricingAction
  isActive: boolean
}

interface PricingCondition {
  type: 'category' | 'brand' | 'cost_range' | 'inventory_level' | 'season' | 'competitor_price' | 'demand'
  operator: 'equals' | 'greater_than' | 'less_than' | 'in_range' | 'includes'
  value: any
}

interface PricingAction {
  type: 'multiply' | 'add' | 'subtract' | 'set_fixed' | 'margin_percentage'
  value: number
  platform?: 'shopify' | 'meli' | 'shein' | 'all'
}

interface PricingContext {
  product: {
    id: number
    categoria: string | null
    marca: string | null
    costo: number | null
    inventory_total: number | null
  }
  market: {
    demand_score?: number
    competitor_prices?: { [platform: string]: number }
    seasonal_factor?: number
  }
  tenant_settings: {
    default_margins: { [platform: string]: number }
    minimum_profit_margin: number
    maximum_discount_percentage: number
  }
}

interface PricingResult {
  base_price: number
  platform_prices: {
    shopify: number
    meli: number
    shein: number
  }
  applied_rules: string[]
  profit_margins: {
    shopify: number
    meli: number
    shein: number
  }
  recommendations: string[]
}

export class DynamicPricingEngine {
  private rules: PricingRule[] = []
  
  constructor() {
    this.initializeDefaultRules()
  }

  private initializeDefaultRules(): void {
    this.rules = [
      // High inventory discount rule
      {
        id: 'high_inventory_discount',
        name: 'Descuento por alto inventario',
        priority: 1,
        conditions: [
          {
            type: 'inventory_level',
            operator: 'greater_than',
            value: 20
          }
        ],
        action: {
          type: 'multiply',
          value: 0.95, // 5% discount
          platform: 'all'
        },
        isActive: true
      },

      // Low inventory premium
      {
        id: 'low_inventory_premium',
        name: 'Premium por bajo inventario',
        priority: 2,
        conditions: [
          {
            type: 'inventory_level',
            operator: 'less_than',
            value: 5
          }
        ],
        action: {
          type: 'multiply',
          value: 1.05, // 5% premium
          platform: 'all'
        },
        isActive: true
      },

      // Premium brand markup
      {
        id: 'premium_brand_markup',
        name: 'Markup para marcas premium',
        priority: 3,
        conditions: [
          {
            type: 'brand',
            operator: 'includes',
            value: ['Nike', 'Adidas', 'Jordan', 'Puma']
          }
        ],
        action: {
          type: 'multiply',
          value: 1.1, // 10% premium
          platform: 'all'
        },
        isActive: true
      },

      // Platform-specific adjustments
      {
        id: 'meli_fee_adjustment',
        name: 'Ajuste por comisiones MercadoLibre',
        priority: 4,
        conditions: [],
        action: {
          type: 'multiply',
          value: 1.12, // 12% to cover ML fees
          platform: 'meli'
        },
        isActive: true
      },

      // Seasonal adjustments
      {
        id: 'seasonal_boost',
        name: 'Incremento estacional',
        priority: 5,
        conditions: [
          {
            type: 'season',
            operator: 'includes',
            value: ['winter', 'back_to_school']
          }
        ],
        action: {
          type: 'multiply',
          value: 1.08, // 8% seasonal increase
          platform: 'all'
        },
        isActive: true
      },

      // Cost-based minimum margin
      {
        id: 'minimum_margin_enforcement',
        name: 'Margen mínimo garantizado',
        priority: 10, // Highest priority
        conditions: [],
        action: {
          type: 'margin_percentage',
          value: 30, // Minimum 30% margin
          platform: 'all'
        },
        isActive: true
      }
    ]
  }

  public calculateDynamicPricing(context: PricingContext): PricingResult {
    const { product, market, tenant_settings } = context
    
    if (!product.costo || product.costo <= 0) {
      throw new Error('Product cost is required for pricing calculation')
    }

    // Start with base cost
    let basePrice = product.costo

    // Apply default margins by platform
    let platformPrices = {
      shopify: basePrice * (tenant_settings.default_margins.shopify || 1.8),
      meli: basePrice * (tenant_settings.default_margins.meli || 2.0),
      shein: basePrice * (tenant_settings.default_margins.shein || 1.5)
    }

    const appliedRules: string[] = []

    // Apply pricing rules in order of priority
    const activeRules = this.rules
      .filter(rule => rule.isActive)
      .sort((a, b) => b.priority - a.priority)

    for (const rule of activeRules) {
      if (this.evaluateConditions(rule.conditions, context)) {
        platformPrices = this.applyAction(platformPrices, rule.action, basePrice)
        appliedRules.push(rule.name)
      }
    }

    // Ensure minimum margins
    const minMargin = tenant_settings.minimum_profit_margin || 0.2
    Object.keys(platformPrices).forEach(platform => {
      const minPrice = basePrice * (1 + minMargin)
      if (platformPrices[platform as keyof typeof platformPrices] < minPrice) {
        platformPrices[platform as keyof typeof platformPrices] = minPrice
      }
    })

    // Round prices to nearest 5
    Object.keys(platformPrices).forEach(platform => {
      platformPrices[platform as keyof typeof platformPrices] = 
        Math.ceil(platformPrices[platform as keyof typeof platformPrices] / 5) * 5
    })

    // Calculate profit margins
    const profitMargins = {
      shopify: ((platformPrices.shopify - basePrice) / basePrice) * 100,
      meli: ((platformPrices.meli - basePrice) / basePrice) * 100,
      shein: ((platformPrices.shein - basePrice) / basePrice) * 100
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(context, platformPrices, profitMargins)

    return {
      base_price: basePrice,
      platform_prices: platformPrices,
      applied_rules: appliedRules,
      profit_margins: profitMargins,
      recommendations
    }
  }

  private evaluateConditions(conditions: PricingCondition[], context: PricingContext): boolean {
    if (conditions.length === 0) return true

    return conditions.every(condition => {
      switch (condition.type) {
        case 'category':
          return this.evaluateCondition(context.product.categoria, condition)
        
        case 'brand':
          return this.evaluateCondition(context.product.marca, condition)
        
        case 'cost_range':
          return this.evaluateCondition(context.product.costo, condition)
        
        case 'inventory_level':
          return this.evaluateCondition(context.product.inventory_total, condition)
        
        case 'season':
          const currentSeason = this.getCurrentSeason()
          return this.evaluateCondition(currentSeason, condition)
        
        case 'demand':
          return this.evaluateCondition(context.market.demand_score || 0, condition)
        
        default:
          return false
      }
    })
  }

  private evaluateCondition(value: any, condition: PricingCondition): boolean {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value
      
      case 'greater_than':
        return (value || 0) > condition.value
      
      case 'less_than':
        return (value || 0) < condition.value
      
      case 'in_range':
        const [min, max] = condition.value
        return (value || 0) >= min && (value || 0) <= max
      
      case 'includes':
        if (Array.isArray(condition.value)) {
          return condition.value.includes(value)
        }
        return false
      
      default:
        return false
    }
  }

  private applyAction(
    currentPrices: { shopify: number; meli: number; shein: number },
    action: PricingAction,
    baseCost: number
  ): { shopify: number; meli: number; shein: number } {
    const platforms = action.platform === 'all' 
      ? ['shopify', 'meli', 'shein'] 
      : [action.platform || 'shopify']

    const result = { ...currentPrices }

    platforms.forEach(platform => {
      const key = platform as keyof typeof result
      
      switch (action.type) {
        case 'multiply':
          result[key] = result[key] * action.value
          break
        
        case 'add':
          result[key] = result[key] + action.value
          break
        
        case 'subtract':
          result[key] = result[key] - action.value
          break
        
        case 'set_fixed':
          result[key] = action.value
          break
        
        case 'margin_percentage':
          const minPrice = baseCost * (1 + action.value / 100)
          if (result[key] < minPrice) {
            result[key] = minPrice
          }
          break
      }
    })

    return result
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth() + 1
    
    if (month >= 6 && month <= 8) return 'winter'
    if (month >= 9 && month <= 11) return 'spring'
    if (month >= 12 || month <= 2) return 'summer'
    if (month >= 3 && month <= 5) return 'fall'
    
    // August for back-to-school season
    if (month === 8) return 'back_to_school'
    
    return 'regular'
  }

  private generateRecommendations(
    context: PricingContext,
    prices: { shopify: number; meli: number; shein: number },
    margins: { shopify: number; meli: number; shein: number }
  ): string[] {
    const recommendations: string[] = []
    const { product, market } = context

    // Low inventory recommendation
    if ((product.inventory_total || 0) < 5) {
      recommendations.push('Considera aumentar el precio debido al bajo inventario')
    }

    // High inventory recommendation
    if ((product.inventory_total || 0) > 20) {
      recommendations.push('Considera una promoción para mover el inventario alto')
    }

    // Margin analysis
    const avgMargin = (margins.shopify + margins.meli + margins.shein) / 3
    if (avgMargin < 25) {
      recommendations.push('Los márgenes están por debajo del objetivo (25%)')
    }

    // Competitor price analysis
    if (market.competitor_prices) {
      const competitorAvg = Object.values(market.competitor_prices).reduce((a, b) => a + b, 0) / 
                           Object.values(market.competitor_prices).length
      const ourAvg = (prices.shopify + prices.meli + prices.shein) / 3
      
      if (ourAvg > competitorAvg * 1.1) {
        recommendations.push('Nuestros precios están 10% por encima de la competencia')
      } else if (ourAvg < competitorAvg * 0.9) {
        recommendations.push('Oportunidad de aumentar precios - estamos por debajo del mercado')
      }
    }

    // Seasonal recommendations
    const season = this.getCurrentSeason()
    if (season === 'winter' && product.categoria?.toLowerCase().includes('deportivo')) {
      recommendations.push('Temporada alta para calzado deportivo - considera incremento')
    }

    return recommendations
  }

  // Admin methods for rule management
  public addRule(rule: PricingRule): void {
    this.rules.push(rule)
  }

  public updateRule(ruleId: string, updates: Partial<PricingRule>): void {
    const index = this.rules.findIndex(rule => rule.id === ruleId)
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates }
    }
  }

  public removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId)
  }

  public getRules(): PricingRule[] {
    return [...this.rules]
  }

  public toggleRule(ruleId: string): void {
    const rule = this.rules.find(r => r.id === ruleId)
    if (rule) {
      rule.isActive = !rule.isActive
    }
  }
}

// Singleton instance
export const pricingEngine = new DynamicPricingEngine()
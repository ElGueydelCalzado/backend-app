import { Pool } from 'pg'

interface DimensionTable {
  name: string
  fields: DimensionField[]
  primaryKey: string
  naturalKey?: string[]
  slowlyChangingType: 1 | 2 | 3 | 6
}

interface DimensionField {
  name: string
  type: 'string' | 'number' | 'date' | 'boolean'
  isNaturalKey?: boolean
  isBusinessKey?: boolean
  trackHistory?: boolean
}

interface FactTable {
  name: string
  dimensions: string[]
  measures: MeasureField[]
  grainDescription: string
}

interface MeasureField {
  name: string
  type: 'additive' | 'semi_additive' | 'non_additive'
  aggregationType: 'sum' | 'avg' | 'count' | 'min' | 'max'
  dataType: 'integer' | 'decimal' | 'money'
}

interface ETLJob {
  id: string
  name: string
  sourceTable: string
  targetTable: string
  transformations: ETLTransformation[]
  schedule: string
  isActive: boolean
}

interface ETLTransformation {
  type: 'lookup' | 'calculate' | 'aggregate' | 'filter' | 'join'
  source: string
  target: string
  logic: string
  parameters?: any
}

export class DataWarehouseManager {
  private pool: Pool

  constructor(pool: Pool) {
    this.pool = pool
  }

  public async initializeDataWarehouse(): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      // Create warehouse schema
      await client.query('CREATE SCHEMA IF NOT EXISTS warehouse')

      // Create dimension tables
      await this.createDimensionTables(client)
      
      // Create fact tables
      await this.createFactTables(client)
      
      // Create aggregate tables
      await this.createAggregateTables(client)
      
      // Create ETL control tables
      await this.createETLControlTables(client)

    } finally {
      client.release()
    }
  }

  private async createDimensionTables(client: any): Promise<void> {
    // Date Dimension
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouse.dim_date (
        date_key INTEGER PRIMARY KEY,
        full_date DATE NOT NULL,
        day_of_week INTEGER,
        day_name VARCHAR(20),
        day_of_month INTEGER,
        day_of_year INTEGER,
        week_of_year INTEGER,
        month_number INTEGER,
        month_name VARCHAR(20),
        month_abbrev VARCHAR(10),
        quarter INTEGER,
        quarter_name VARCHAR(10),
        year INTEGER,
        is_weekend BOOLEAN,
        is_holiday BOOLEAN,
        fiscal_year INTEGER,
        fiscal_quarter INTEGER,
        fiscal_month INTEGER
      )
    `)

    // Product Dimension
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouse.dim_product (
        product_key SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL,
        categoria VARCHAR(100),
        marca VARCHAR(100),
        modelo VARCHAR(100),
        color VARCHAR(50),
        talla VARCHAR(20),
        sku VARCHAR(100),
        ean VARCHAR(50),
        cost_tier VARCHAR(20),
        price_tier VARCHAR(20),
        is_active BOOLEAN DEFAULT true,
        effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expiry_date TIMESTAMP WITH TIME ZONE DEFAULT '2999-12-31',
        current_flag BOOLEAN DEFAULT true,
        version INTEGER DEFAULT 1
      )
    `)

    // Customer Dimension
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouse.dim_customer (
        customer_key SERIAL PRIMARY KEY,
        customer_id VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        loyalty_tier VARCHAR(20),
        acquisition_channel VARCHAR(50),
        registration_date DATE,
        city VARCHAR(100),
        state VARCHAR(50),
        country VARCHAR(50),
        age_group VARCHAR(20),
        gender VARCHAR(10),
        is_active BOOLEAN DEFAULT true,
        effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expiry_date TIMESTAMP WITH TIME ZONE DEFAULT '2999-12-31',
        current_flag BOOLEAN DEFAULT true,
        version INTEGER DEFAULT 1
      )
    `)

    // Channel Dimension
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouse.dim_channel (
        channel_key SERIAL PRIMARY KEY,
        channel_id VARCHAR(50) NOT NULL,
        channel_name VARCHAR(100),
        channel_type VARCHAR(50),
        platform VARCHAR(50),
        is_mobile BOOLEAN,
        commission_rate DECIMAL(5,2),
        is_active BOOLEAN DEFAULT true
      )
    `)

    // Supplier Dimension
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouse.dim_supplier (
        supplier_key SERIAL PRIMARY KEY,
        supplier_id VARCHAR(255) NOT NULL,
        supplier_name VARCHAR(255),
        supplier_type VARCHAR(50),
        country VARCHAR(50),
        tier VARCHAR(20),
        reliability_score DECIMAL(3,2),
        is_active BOOLEAN DEFAULT true,
        effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expiry_date TIMESTAMP WITH TIME ZONE DEFAULT '2999-12-31',
        current_flag BOOLEAN DEFAULT true
      )
    `)

    // Affiliate Dimension
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouse.dim_affiliate (
        affiliate_key SERIAL PRIMARY KEY,
        affiliate_id VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        tier VARCHAR(20),
        commission_rate DECIMAL(5,2),
        referral_code VARCHAR(50),
        registration_date DATE,
        is_active BOOLEAN DEFAULT true,
        effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expiry_date TIMESTAMP WITH TIME ZONE DEFAULT '2999-12-31',
        current_flag BOOLEAN DEFAULT true
      )
    `)

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dim_date_full_date ON warehouse.dim_date(full_date);
      CREATE INDEX IF NOT EXISTS idx_dim_product_id ON warehouse.dim_product(product_id);
      CREATE INDEX IF NOT EXISTS idx_dim_product_current ON warehouse.dim_product(current_flag);
      CREATE INDEX IF NOT EXISTS idx_dim_customer_id ON warehouse.dim_customer(customer_id);
      CREATE INDEX IF NOT EXISTS idx_dim_customer_current ON warehouse.dim_customer(current_flag);
      CREATE INDEX IF NOT EXISTS idx_dim_channel_id ON warehouse.dim_channel(channel_id);
      CREATE INDEX IF NOT EXISTS idx_dim_supplier_id ON warehouse.dim_supplier(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_dim_affiliate_id ON warehouse.dim_affiliate(affiliate_id);
    `)
  }

  private async createFactTables(client: any): Promise<void> {
    // Sales Fact Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouse.fact_sales (
        sales_key SERIAL PRIMARY KEY,
        date_key INTEGER NOT NULL REFERENCES warehouse.dim_date(date_key),
        product_key INTEGER NOT NULL REFERENCES warehouse.dim_product(product_key),
        customer_key INTEGER NOT NULL REFERENCES warehouse.dim_customer(customer_key),
        channel_key INTEGER NOT NULL REFERENCES warehouse.dim_channel(channel_key),
        supplier_key INTEGER REFERENCES warehouse.dim_supplier(supplier_key),
        affiliate_key INTEGER REFERENCES warehouse.dim_affiliate(affiliate_key),
        
        -- Measures
        order_id INTEGER,
        quantity INTEGER,
        unit_price DECIMAL(10,2),
        unit_cost DECIMAL(10,2),
        discount_amount DECIMAL(10,2),
        tax_amount DECIMAL(10,2),
        shipping_amount DECIMAL(10,2),
        gross_revenue DECIMAL(10,2),
        net_revenue DECIMAL(10,2),
        gross_profit DECIMAL(10,2),
        commission_amount DECIMAL(10,2),
        
        -- Flags
        is_return BOOLEAN DEFAULT false,
        is_exchange BOOLEAN DEFAULT false,
        is_first_purchase BOOLEAN DEFAULT false,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // Inventory Fact Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouse.fact_inventory (
        inventory_key SERIAL PRIMARY KEY,
        date_key INTEGER NOT NULL REFERENCES warehouse.dim_date(date_key),
        product_key INTEGER NOT NULL REFERENCES warehouse.dim_product(product_key),
        supplier_key INTEGER REFERENCES warehouse.dim_supplier(supplier_key),
        
        -- Measures
        opening_balance INTEGER,
        receipts INTEGER,
        sales INTEGER,
        adjustments INTEGER,
        closing_balance INTEGER,
        stock_value DECIMAL(12,2),
        days_of_supply INTEGER,
        stockout_flag BOOLEAN DEFAULT false,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // Marketing Campaign Fact Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouse.fact_marketing (
        marketing_key SERIAL PRIMARY KEY,
        date_key INTEGER NOT NULL REFERENCES warehouse.dim_date(date_key),
        channel_key INTEGER NOT NULL REFERENCES warehouse.dim_channel(channel_key),
        affiliate_key INTEGER REFERENCES warehouse.dim_affiliate(affiliate_key),
        
        -- Measures
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        spend_amount DECIMAL(10,2) DEFAULT 0,
        revenue_attributed DECIMAL(10,2) DEFAULT 0,
        cost_per_click DECIMAL(6,2),
        cost_per_conversion DECIMAL(8,2),
        return_on_ad_spend DECIMAL(6,2),
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // Customer Behavior Fact Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouse.fact_customer_behavior (
        behavior_key SERIAL PRIMARY KEY,
        date_key INTEGER NOT NULL REFERENCES warehouse.dim_date(date_key),
        customer_key INTEGER NOT NULL REFERENCES warehouse.dim_customer(customer_key),
        channel_key INTEGER NOT NULL REFERENCES warehouse.dim_channel(channel_key),
        
        -- Measures
        page_views INTEGER DEFAULT 0,
        session_duration INTEGER DEFAULT 0, -- seconds
        bounce_rate DECIMAL(5,2),
        cart_additions INTEGER DEFAULT 0,
        cart_abandonments INTEGER DEFAULT 0,
        searches INTEGER DEFAULT 0,
        wishlist_additions INTEGER DEFAULT 0,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // Create fact table indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fact_sales_date ON warehouse.fact_sales(date_key);
      CREATE INDEX IF NOT EXISTS idx_fact_sales_product ON warehouse.fact_sales(product_key);
      CREATE INDEX IF NOT EXISTS idx_fact_sales_customer ON warehouse.fact_sales(customer_key);
      CREATE INDEX IF NOT EXISTS idx_fact_sales_channel ON warehouse.fact_sales(channel_key);
      CREATE INDEX IF NOT EXISTS idx_fact_sales_order ON warehouse.fact_sales(order_id);
      
      CREATE INDEX IF NOT EXISTS idx_fact_inventory_date ON warehouse.fact_inventory(date_key);
      CREATE INDEX IF NOT EXISTS idx_fact_inventory_product ON warehouse.fact_inventory(product_key);
      
      CREATE INDEX IF NOT EXISTS idx_fact_marketing_date ON warehouse.fact_marketing(date_key);
      CREATE INDEX IF NOT EXISTS idx_fact_marketing_channel ON warehouse.fact_marketing(channel_key);
      
      CREATE INDEX IF NOT EXISTS idx_fact_behavior_date ON warehouse.fact_customer_behavior(date_key);
      CREATE INDEX IF NOT EXISTS idx_fact_behavior_customer ON warehouse.fact_customer_behavior(customer_key);
    `)
  }

  private async createAggregateTables(client: any): Promise<void> {
    // Daily Sales Summary
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouse.agg_daily_sales (
        date_key INTEGER NOT NULL,
        channel_key INTEGER NOT NULL,
        total_orders INTEGER,
        total_quantity INTEGER,
        gross_revenue DECIMAL(12,2),
        net_revenue DECIMAL(12,2),
        gross_profit DECIMAL(12,2),
        avg_order_value DECIMAL(10,2),
        unique_customers INTEGER,
        new_customers INTEGER,
        returning_customers INTEGER,
        conversion_rate DECIMAL(5,2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (date_key, channel_key)
      )
    `)

    // Product Performance Summary
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouse.agg_product_performance (
        product_key INTEGER NOT NULL,
        date_key INTEGER NOT NULL,
        total_quantity INTEGER,
        total_revenue DECIMAL(12,2),
        total_profit DECIMAL(12,2),
        avg_selling_price DECIMAL(10,2),
        profit_margin DECIMAL(5,2),
        inventory_turns DECIMAL(6,2),
        stockout_days INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (product_key, date_key)
      )
    `)

    // Customer Lifetime Value
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouse.agg_customer_ltv (
        customer_key INTEGER NOT NULL PRIMARY KEY,
        first_purchase_date DATE,
        last_purchase_date DATE,
        total_orders INTEGER,
        total_revenue DECIMAL(12,2),
        avg_order_value DECIMAL(10,2),
        purchase_frequency DECIMAL(6,2),
        customer_lifespan INTEGER, -- days
        predicted_ltv DECIMAL(12,2),
        churn_probability DECIMAL(5,2),
        segment VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // Affiliate Performance Summary
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouse.agg_affiliate_performance (
        affiliate_key INTEGER NOT NULL,
        date_key INTEGER NOT NULL,
        clicks INTEGER,
        conversions INTEGER,
        conversion_rate DECIMAL(5,2),
        commission_earned DECIMAL(10,2),
        revenue_generated DECIMAL(12,2),
        unique_customers INTEGER,
        avg_order_value DECIMAL(10,2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (affiliate_key, date_key)
      )
    `)
  }

  private async createETLControlTables(client: any): Promise<void> {
    // ETL Job Control
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouse.etl_job_control (
        job_name VARCHAR(100) PRIMARY KEY,
        last_run_timestamp TIMESTAMP WITH TIME ZONE,
        last_success_timestamp TIMESTAMP WITH TIME ZONE,
        high_water_mark VARCHAR(100),
        status VARCHAR(20) DEFAULT 'ready',
        error_message TEXT,
        run_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // Data Quality Checks
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouse.data_quality_results (
        check_id SERIAL PRIMARY KEY,
        table_name VARCHAR(100) NOT NULL,
        check_type VARCHAR(50) NOT NULL,
        check_description TEXT,
        records_checked INTEGER,
        records_failed INTEGER,
        failure_rate DECIMAL(5,2),
        status VARCHAR(20),
        details JSONB,
        run_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // Initialize ETL jobs
    const etlJobs = [
      'load_dim_product',
      'load_dim_customer', 
      'load_dim_affiliate',
      'load_fact_sales',
      'load_fact_inventory',
      'load_fact_marketing',
      'refresh_aggregates'
    ]

    for (const job of etlJobs) {
      await client.query(`
        INSERT INTO warehouse.etl_job_control (job_name)
        VALUES ($1)
        ON CONFLICT (job_name) DO NOTHING
      `, [job])
    }
  }

  public async loadDimensionData(): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')

      // Load Date Dimension (if not already loaded)
      await this.loadDateDimension(client)
      
      // Load Product Dimension
      await this.loadProductDimension(client)
      
      // Load Customer Dimension
      await this.loadCustomerDimension(client)
      
      // Load Channel Dimension
      await this.loadChannelDimension(client)
      
      // Load Supplier Dimension
      await this.loadSupplierDimension(client)
      
      // Load Affiliate Dimension
      await this.loadAffiliateDimension(client)

      await client.query('COMMIT')

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  private async loadDateDimension(client: any): Promise<void> {
    // Check if date dimension is already populated
    const countResult = await client.query('SELECT COUNT(*) FROM warehouse.dim_date')
    if (parseInt(countResult.rows[0].count) > 0) return

    // Generate date records for 5 years (past 2 years + current + future 2 years)
    const startDate = new Date()
    startDate.setFullYear(startDate.getFullYear() - 2, 0, 1)
    
    const endDate = new Date()
    endDate.setFullYear(endDate.getFullYear() + 2, 11, 31)

    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const dateKey = parseInt(currentDate.toISOString().slice(0, 10).replace(/-/g, ''))
      const dayOfWeek = currentDate.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      
      await client.query(`
        INSERT INTO warehouse.dim_date (
          date_key, full_date, day_of_week, day_name, day_of_month,
          day_of_year, week_of_year, month_number, month_name, month_abbrev,
          quarter, quarter_name, year, is_weekend, is_holiday,
          fiscal_year, fiscal_quarter, fiscal_month
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      `, [
        dateKey,
        currentDate.toISOString().slice(0, 10),
        dayOfWeek,
        ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
        currentDate.getDate(),
        Math.ceil((currentDate.getTime() - new Date(currentDate.getFullYear(), 0, 1).getTime()) / (24 * 60 * 60 * 1000)),
        Math.ceil((currentDate.getTime() - new Date(currentDate.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)),
        currentDate.getMonth() + 1,
        ['January', 'February', 'March', 'April', 'May', 'June',
         'July', 'August', 'September', 'October', 'November', 'December'][currentDate.getMonth()],
        ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][currentDate.getMonth()],
        Math.ceil((currentDate.getMonth() + 1) / 3),
        `Q${Math.ceil((currentDate.getMonth() + 1) / 3)}`,
        currentDate.getFullYear(),
        isWeekend,
        false, // Holiday detection would be more complex
        currentDate.getFullYear(), // Assuming calendar year = fiscal year
        Math.ceil((currentDate.getMonth() + 1) / 3),
        currentDate.getMonth() + 1
      ])

      currentDate.setDate(currentDate.getDate() + 1)
    }
  }

  private async loadProductDimension(client: any): Promise<void> {
    // Load products from operational database
    await client.query(`
      INSERT INTO warehouse.dim_product (
        product_id, categoria, marca, modelo, color, talla, sku, ean,
        cost_tier, price_tier, is_active
      )
      SELECT 
        id,
        categoria,
        marca,
        modelo,
        color,
        talla,
        sku,
        ean,
        CASE 
          WHEN costo < 500 THEN 'Low'
          WHEN costo < 1500 THEN 'Medium'
          ELSE 'High'
        END as cost_tier,
        CASE 
          WHEN precio_shopify < 1000 THEN 'Budget'
          WHEN precio_shopify < 3000 THEN 'Mid-Range'
          ELSE 'Premium'
        END as price_tier,
        inventory_total > 0 as is_active
      FROM products
      ON CONFLICT (product_id) WHERE current_flag = true
      DO UPDATE SET
        categoria = EXCLUDED.categoria,
        marca = EXCLUDED.marca,
        modelo = EXCLUDED.modelo,
        color = EXCLUDED.color,
        talla = EXCLUDED.talla,
        sku = EXCLUDED.sku,
        ean = EXCLUDED.ean,
        cost_tier = EXCLUDED.cost_tier,
        price_tier = EXCLUDED.price_tier,
        is_active = EXCLUDED.is_active,
        version = warehouse.dim_product.version + 1
    `)

    // Update ETL control
    await this.updateETLControl(client, 'load_dim_product', 'success')
  }

  private async loadCustomerDimension(client: any): Promise<void> {
    // Load customers from loyalty system
    await client.query(`
      INSERT INTO warehouse.dim_customer (
        customer_id, email, first_name, last_name, loyalty_tier,
        registration_date, is_active
      )
      SELECT 
        id,
        email,
        first_name,
        last_name,
        loyalty_tier,
        join_date::date,
        true
      FROM loyalty_customers
      ON CONFLICT (customer_id) WHERE current_flag = true
      DO UPDATE SET
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        loyalty_tier = EXCLUDED.loyalty_tier,
        version = warehouse.dim_customer.version + 1
    `)

    await this.updateETLControl(client, 'load_dim_customer', 'success')
  }

  private async loadChannelDimension(client: any): Promise<void> {
    // Load predefined channels
    const channels = [
      { id: 'web_desktop', name: 'Web Desktop', type: 'direct', platform: 'web', is_mobile: false },
      { id: 'web_mobile', name: 'Web Mobile', type: 'direct', platform: 'web', is_mobile: true },
      { id: 'shopify', name: 'Shopify', type: 'marketplace', platform: 'shopify', is_mobile: false },
      { id: 'mercadolibre', name: 'MercadoLibre', type: 'marketplace', platform: 'mercadolibre', is_mobile: false },
      { id: 'shein', name: 'Shein', type: 'marketplace', platform: 'shein', is_mobile: false },
      { id: 'affiliate', name: 'Affiliate', type: 'affiliate', platform: 'various', is_mobile: false }
    ]

    for (const channel of channels) {
      await client.query(`
        INSERT INTO warehouse.dim_channel (
          channel_id, channel_name, channel_type, platform, is_mobile, is_active
        ) VALUES ($1, $2, $3, $4, $5, true)
        ON CONFLICT (channel_id)
        DO UPDATE SET
          channel_name = EXCLUDED.channel_name,
          channel_type = EXCLUDED.channel_type,
          platform = EXCLUDED.platform,
          is_mobile = EXCLUDED.is_mobile
      `, [channel.id, channel.name, channel.type, channel.platform, channel.is_mobile])
    }
  }

  private async loadSupplierDimension(client: any): Promise<void> {
    // Load suppliers from tenant data
    await client.query(`
      INSERT INTO warehouse.dim_supplier (
        supplier_id, supplier_name, supplier_type, tier, is_active
      )
      SELECT DISTINCT
        tenant_id,
        COALESCE(company_name, CONCAT(first_name, ' ', last_name)) as supplier_name,
        tenant_type,
        CASE 
          WHEN tenant_type = 'supplier' THEN 'Primary'
          ELSE 'Secondary'
        END as tier,
        status = 'active'
      FROM tenants
      WHERE tenant_type IN ('supplier', 'distributor')
      ON CONFLICT (supplier_id) WHERE current_flag = true
      DO UPDATE SET
        supplier_name = EXCLUDED.supplier_name,
        supplier_type = EXCLUDED.supplier_type,
        tier = EXCLUDED.tier,
        is_active = EXCLUDED.is_active,
        version = warehouse.dim_supplier.version + 1
    `)
  }

  private async loadAffiliateDimension(client: any): Promise<void> {
    // Load affiliates
    await client.query(`
      INSERT INTO warehouse.dim_affiliate (
        affiliate_id, email, first_name, last_name, tier,
        commission_rate, referral_code, registration_date, is_active
      )
      SELECT 
        id,
        email,
        first_name,
        last_name,
        tier,
        commission_rate,
        referral_code,
        join_date::date,
        status = 'active'
      FROM affiliates
      ON CONFLICT (affiliate_id) WHERE current_flag = true
      DO UPDATE SET
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        tier = EXCLUDED.tier,
        commission_rate = EXCLUDED.commission_rate,
        is_active = EXCLUDED.is_active,
        version = warehouse.dim_affiliate.version + 1
    `)

    await this.updateETLControl(client, 'load_dim_affiliate', 'success')
  }

  public async loadFactData(): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')

      // Load Sales Facts
      await this.loadSalesFacts(client)
      
      // Load Inventory Facts
      await this.loadInventoryFacts(client)
      
      // Load Marketing Facts
      await this.loadMarketingFacts(client)

      await client.query('COMMIT')

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  private async loadSalesFacts(client: any): Promise<void> {
    // Get last processed order ID
    const lastProcessedResult = await client.query(`
      SELECT COALESCE(MAX(order_id), 0) as last_order_id
      FROM warehouse.fact_sales
    `)
    const lastOrderId = lastProcessedResult.rows[0].last_order_id

    // Load new sales data
    await client.query(`
      INSERT INTO warehouse.fact_sales (
        date_key, product_key, customer_key, channel_key, supplier_key, affiliate_key,
        order_id, quantity, unit_price, unit_cost, discount_amount, tax_amount,
        shipping_amount, gross_revenue, net_revenue, gross_profit, commission_amount,
        is_return, is_exchange, is_first_purchase
      )
      SELECT 
        CAST(TO_CHAR(o.created_at, 'YYYYMMDD') AS INTEGER) as date_key,
        dp.product_key,
        dc.customer_key,
        dch.channel_key,
        ds.supplier_key,
        da.affiliate_key,
        o.id as order_id,
        oi.quantity,
        oi.unit_price,
        p.costo as unit_cost,
        0 as discount_amount, -- Would come from order discounts
        o.tax_amount,
        o.shipping_cost,
        oi.quantity * oi.unit_price as gross_revenue,
        oi.total_price as net_revenue,
        (oi.unit_price - p.costo) * oi.quantity as gross_profit,
        COALESCE(ac.commission_amount, 0) as commission_amount,
        false as is_return,
        false as is_exchange,
        (
          SELECT COUNT(*) = 1 
          FROM consumer_orders co2 
          WHERE co2.customer_email = o.customer_email
          AND co2.id <= o.id
        ) as is_first_purchase
      FROM consumer_orders o
      JOIN consumer_order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      JOIN warehouse.dim_product dp ON p.id = dp.product_id AND dp.current_flag = true
      LEFT JOIN warehouse.dim_customer dc ON o.customer_email = dc.email AND dc.current_flag = true
      LEFT JOIN warehouse.dim_channel dch ON 'web_desktop' = dch.channel_id -- Default channel
      LEFT JOIN warehouse.dim_supplier ds ON p.tenant_id = ds.supplier_id AND ds.current_flag = true
      LEFT JOIN affiliate_commissions ac ON o.id = ac.order_id
      LEFT JOIN warehouse.dim_affiliate da ON ac.affiliate_id = da.affiliate_id AND da.current_flag = true
      WHERE o.id > $1
      AND o.status IN ('confirmed', 'shipped', 'delivered')
    `, [lastOrderId])

    await this.updateETLControl(client, 'load_fact_sales', 'success')
  }

  private async loadInventoryFacts(client: any): Promise<void> {
    // Daily inventory snapshots
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateKey = parseInt(yesterday.toISOString().slice(0, 10).replace(/-/g, ''))

    await client.query(`
      INSERT INTO warehouse.fact_inventory (
        date_key, product_key, supplier_key, opening_balance,
        receipts, sales, adjustments, closing_balance, stock_value,
        days_of_supply, stockout_flag
      )
      SELECT 
        $1 as date_key,
        dp.product_key,
        ds.supplier_key,
        p.inventory_total as opening_balance,
        0 as receipts, -- Would track from purchase orders
        COALESCE(daily_sales.quantity, 0) as sales,
        0 as adjustments, -- Would track from inventory adjustments
        p.inventory_total as closing_balance,
        p.inventory_total * p.costo as stock_value,
        CASE 
          WHEN COALESCE(daily_sales.quantity, 0) > 0 
          THEN p.inventory_total / COALESCE(daily_sales.quantity, 1)
          ELSE 999
        END as days_of_supply,
        p.inventory_total = 0 as stockout_flag
      FROM products p
      JOIN warehouse.dim_product dp ON p.id = dp.product_id AND dp.current_flag = true
      LEFT JOIN warehouse.dim_supplier ds ON p.tenant_id = ds.supplier_id AND ds.current_flag = true
      LEFT JOIN (
        SELECT 
          oi.product_id,
          SUM(oi.quantity) as quantity
        FROM consumer_orders o
        JOIN consumer_order_items oi ON o.id = oi.order_id
        WHERE DATE(o.created_at) = $2
        GROUP BY oi.product_id
      ) daily_sales ON p.id = daily_sales.product_id
      ON CONFLICT (date_key, product_key, supplier_key)
      DO UPDATE SET
        closing_balance = EXCLUDED.closing_balance,
        stock_value = EXCLUDED.stock_value,
        days_of_supply = EXCLUDED.days_of_supply,
        stockout_flag = EXCLUDED.stockout_flag
    `, [dateKey, yesterday.toISOString().slice(0, 10)])

    await this.updateETLControl(client, 'load_fact_inventory', 'success')
  }

  private async loadMarketingFacts(client: any): Promise<void> {
    // Load affiliate marketing data
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateKey = parseInt(yesterday.toISOString().slice(0, 10).replace(/-/g, ''))

    await client.query(`
      INSERT INTO warehouse.fact_marketing (
        date_key, channel_key, affiliate_key, impressions, clicks,
        conversions, spend_amount, revenue_attributed, cost_per_click,
        cost_per_conversion, return_on_ad_spend
      )
      SELECT 
        $1 as date_key,
        dch.channel_key,
        da.affiliate_key,
        0 as impressions, -- Would integrate with ad platforms
        COALESCE(click_data.clicks, 0) as clicks,
        COALESCE(conversion_data.conversions, 0) as conversions,
        COALESCE(commission_data.total_commission, 0) as spend_amount,
        COALESCE(conversion_data.revenue, 0) as revenue_attributed,
        CASE 
          WHEN COALESCE(click_data.clicks, 0) > 0 
          THEN COALESCE(commission_data.total_commission, 0) / click_data.clicks
          ELSE 0
        END as cost_per_click,
        CASE 
          WHEN COALESCE(conversion_data.conversions, 0) > 0 
          THEN COALESCE(commission_data.total_commission, 0) / conversion_data.conversions
          ELSE 0
        END as cost_per_conversion,
        CASE 
          WHEN COALESCE(commission_data.total_commission, 0) > 0 
          THEN COALESCE(conversion_data.revenue, 0) / commission_data.total_commission
          ELSE 0
        END as return_on_ad_spend
      FROM warehouse.dim_affiliate da
      JOIN warehouse.dim_channel dch ON dch.channel_id = 'affiliate'
      LEFT JOIN (
        SELECT 
          affiliate_id,
          COUNT(*) as clicks
        FROM affiliate_clicks
        WHERE DATE(clicked_at) = $2
        GROUP BY affiliate_id
      ) click_data ON da.affiliate_id = click_data.affiliate_id
      LEFT JOIN (
        SELECT 
          ac.affiliate_id,
          COUNT(*) as conversions,
          SUM(ac.commission_amount) as total_commission
        FROM affiliate_commissions ac
        WHERE DATE(ac.created_at) = $2
        GROUP BY ac.affiliate_id
      ) commission_data ON da.affiliate_id = commission_data.affiliate_id
      LEFT JOIN (
        SELECT 
          ac.affiliate_id,
          COUNT(*) as conversions,
          SUM(o.total_amount) as revenue
        FROM affiliate_commissions ac
        JOIN consumer_orders o ON ac.order_id = o.id
        WHERE DATE(ac.created_at) = $2
        GROUP BY ac.affiliate_id
      ) conversion_data ON da.affiliate_id = conversion_data.affiliate_id
      WHERE da.current_flag = true
      ON CONFLICT (date_key, channel_key, affiliate_key)
      DO UPDATE SET
        clicks = EXCLUDED.clicks,
        conversions = EXCLUDED.conversions,
        spend_amount = EXCLUDED.spend_amount,
        revenue_attributed = EXCLUDED.revenue_attributed,
        cost_per_click = EXCLUDED.cost_per_click,
        cost_per_conversion = EXCLUDED.cost_per_conversion,
        return_on_ad_spend = EXCLUDED.return_on_ad_spend
    `, [dateKey, yesterday.toISOString().slice(0, 10)])

    await this.updateETLControl(client, 'load_fact_marketing', 'success')
  }

  private async updateETLControl(client: any, jobName: string, status: string, errorMessage?: string): Promise<void> {
    await client.query(`
      UPDATE warehouse.etl_job_control
      SET 
        last_run_timestamp = NOW(),
        last_success_timestamp = CASE WHEN $2 = 'success' THEN NOW() ELSE last_success_timestamp END,
        status = $2,
        error_message = $3,
        run_count = run_count + 1,
        success_count = success_count + CASE WHEN $2 = 'success' THEN 1 ELSE 0 END,
        updated_at = NOW()
      WHERE job_name = $1
    `, [jobName, status, errorMessage])
  }

  public async refreshAggregates(): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')

      // Refresh daily sales summary
      await this.refreshDailySales(client)
      
      // Refresh product performance
      await this.refreshProductPerformance(client)
      
      // Refresh customer LTV
      await this.refreshCustomerLTV(client)
      
      // Refresh affiliate performance
      await this.refreshAffiliatePerformance(client)

      await client.query('COMMIT')
      await this.updateETLControl(client, 'refresh_aggregates', 'success')

    } catch (error) {
      await client.query('ROLLBACK')
      await this.updateETLControl(client, 'refresh_aggregates', 'error', error instanceof Error ? error.message : 'Unknown error')
      throw error
    } finally {
      client.release()
    }
  }

  private async refreshDailySales(client: any): Promise<void> {
    await client.query(`
      INSERT INTO warehouse.agg_daily_sales (
        date_key, channel_key, total_orders, total_quantity,
        gross_revenue, net_revenue, gross_profit, avg_order_value,
        unique_customers, conversion_rate
      )
      SELECT 
        fs.date_key,
        fs.channel_key,
        COUNT(DISTINCT fs.order_id) as total_orders,
        SUM(fs.quantity) as total_quantity,
        SUM(fs.gross_revenue) as gross_revenue,
        SUM(fs.net_revenue) as net_revenue,
        SUM(fs.gross_profit) as gross_profit,
        AVG(order_totals.order_total) as avg_order_value,
        COUNT(DISTINCT fs.customer_key) as unique_customers,
        0 as conversion_rate -- Would need traffic data
      FROM warehouse.fact_sales fs
      JOIN (
        SELECT order_id, SUM(net_revenue) as order_total
        FROM warehouse.fact_sales
        GROUP BY order_id
      ) order_totals ON fs.order_id = order_totals.order_id
      WHERE fs.date_key >= CAST(TO_CHAR(CURRENT_DATE - INTERVAL '7 days', 'YYYYMMDD') AS INTEGER)
      GROUP BY fs.date_key, fs.channel_key
      ON CONFLICT (date_key, channel_key)
      DO UPDATE SET
        total_orders = EXCLUDED.total_orders,
        total_quantity = EXCLUDED.total_quantity,
        gross_revenue = EXCLUDED.gross_revenue,
        net_revenue = EXCLUDED.net_revenue,
        gross_profit = EXCLUDED.gross_profit,
        avg_order_value = EXCLUDED.avg_order_value,
        unique_customers = EXCLUDED.unique_customers
    `)
  }

  private async refreshProductPerformance(client: any): Promise<void> {
    await client.query(`
      INSERT INTO warehouse.agg_product_performance (
        product_key, date_key, total_quantity, total_revenue,
        total_profit, avg_selling_price, profit_margin
      )
      SELECT 
        fs.product_key,
        fs.date_key,
        SUM(fs.quantity) as total_quantity,
        SUM(fs.net_revenue) as total_revenue,
        SUM(fs.gross_profit) as total_profit,
        AVG(fs.unit_price) as avg_selling_price,
        CASE 
          WHEN SUM(fs.net_revenue) > 0 
          THEN (SUM(fs.gross_profit) / SUM(fs.net_revenue)) * 100
          ELSE 0
        END as profit_margin
      FROM warehouse.fact_sales fs
      WHERE fs.date_key >= CAST(TO_CHAR(CURRENT_DATE - INTERVAL '30 days', 'YYYYMMDD') AS INTEGER)
      GROUP BY fs.product_key, fs.date_key
      ON CONFLICT (product_key, date_key)
      DO UPDATE SET
        total_quantity = EXCLUDED.total_quantity,
        total_revenue = EXCLUDED.total_revenue,
        total_profit = EXCLUDED.total_profit,
        avg_selling_price = EXCLUDED.avg_selling_price,
        profit_margin = EXCLUDED.profit_margin
    `)
  }

  private async refreshCustomerLTV(client: any): Promise<void> {
    await client.query(`
      INSERT INTO warehouse.agg_customer_ltv (
        customer_key, first_purchase_date, last_purchase_date,
        total_orders, total_revenue, avg_order_value, purchase_frequency,
        customer_lifespan, predicted_ltv, segment
      )
      SELECT 
        fs.customer_key,
        MIN(dd.full_date) as first_purchase_date,
        MAX(dd.full_date) as last_purchase_date,
        COUNT(DISTINCT fs.order_id) as total_orders,
        SUM(fs.net_revenue) as total_revenue,
        AVG(order_totals.order_total) as avg_order_value,
        COUNT(DISTINCT fs.date_key)::decimal / 
        GREATEST(MAX(dd.full_date) - MIN(dd.full_date), 1) as purchase_frequency,
        MAX(dd.full_date) - MIN(dd.full_date) as customer_lifespan,
        SUM(fs.net_revenue) * 1.5 as predicted_ltv, -- Simple prediction
        CASE 
          WHEN SUM(fs.net_revenue) > 10000 THEN 'VIP'
          WHEN SUM(fs.net_revenue) > 5000 THEN 'High Value'
          WHEN SUM(fs.net_revenue) > 1000 THEN 'Regular'
          ELSE 'New'
        END as segment
      FROM warehouse.fact_sales fs
      JOIN warehouse.dim_date dd ON fs.date_key = dd.date_key
      JOIN (
        SELECT order_id, SUM(net_revenue) as order_total
        FROM warehouse.fact_sales
        GROUP BY order_id
      ) order_totals ON fs.order_id = order_totals.order_id
      WHERE fs.customer_key IS NOT NULL
      GROUP BY fs.customer_key
      ON CONFLICT (customer_key)
      DO UPDATE SET
        last_purchase_date = EXCLUDED.last_purchase_date,
        total_orders = EXCLUDED.total_orders,
        total_revenue = EXCLUDED.total_revenue,
        avg_order_value = EXCLUDED.avg_order_value,
        purchase_frequency = EXCLUDED.purchase_frequency,
        customer_lifespan = EXCLUDED.customer_lifespan,
        predicted_ltv = EXCLUDED.predicted_ltv,
        segment = EXCLUDED.segment,
        updated_at = NOW()
    `)
  }

  private async refreshAffiliatePerformance(client: any): Promise<void> {
    await client.query(`
      INSERT INTO warehouse.agg_affiliate_performance (
        affiliate_key, date_key, clicks, conversions, conversion_rate,
        commission_earned, revenue_generated, unique_customers, avg_order_value
      )
      SELECT 
        fm.affiliate_key,
        fm.date_key,
        fm.clicks,
        fm.conversions,
        CASE WHEN fm.clicks > 0 THEN (fm.conversions::decimal / fm.clicks) * 100 ELSE 0 END as conversion_rate,
        fm.spend_amount as commission_earned,
        fm.revenue_attributed as revenue_generated,
        COALESCE(customer_counts.unique_customers, 0) as unique_customers,
        COALESCE(avg_orders.avg_order_value, 0) as avg_order_value
      FROM warehouse.fact_marketing fm
      LEFT JOIN (
        SELECT 
          fs.affiliate_key,
          fs.date_key,
          COUNT(DISTINCT fs.customer_key) as unique_customers
        FROM warehouse.fact_sales fs
        WHERE fs.affiliate_key IS NOT NULL
        GROUP BY fs.affiliate_key, fs.date_key
      ) customer_counts ON fm.affiliate_key = customer_counts.affiliate_key 
                         AND fm.date_key = customer_counts.date_key
      LEFT JOIN (
        SELECT 
          fs.affiliate_key,
          fs.date_key,
          AVG(order_totals.order_total) as avg_order_value
        FROM warehouse.fact_sales fs
        JOIN (
          SELECT order_id, SUM(net_revenue) as order_total
          FROM warehouse.fact_sales
          GROUP BY order_id
        ) order_totals ON fs.order_id = order_totals.order_id
        WHERE fs.affiliate_key IS NOT NULL
        GROUP BY fs.affiliate_key, fs.date_key
      ) avg_orders ON fm.affiliate_key = avg_orders.affiliate_key 
                    AND fm.date_key = avg_orders.date_key
      WHERE fm.affiliate_key IS NOT NULL
      ON CONFLICT (affiliate_key, date_key)
      DO UPDATE SET
        clicks = EXCLUDED.clicks,
        conversions = EXCLUDED.conversions,
        conversion_rate = EXCLUDED.conversion_rate,
        commission_earned = EXCLUDED.commission_earned,
        revenue_generated = EXCLUDED.revenue_generated,
        unique_customers = EXCLUDED.unique_customers,
        avg_order_value = EXCLUDED.avg_order_value
    `)
  }

  public async runDataQualityChecks(): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      // Check for missing dimension keys in facts
      await this.checkMissingDimensionKeys(client)
      
      // Check for data consistency
      await this.checkDataConsistency(client)
      
      // Check for duplicate records
      await this.checkDuplicateRecords(client)

    } finally {
      client.release()
    }
  }

  private async checkMissingDimensionKeys(client: any): Promise<void> {
    // Check for sales records with missing product keys
    const missingProductsResult = await client.query(`
      SELECT COUNT(*) as missing_count
      FROM warehouse.fact_sales fs
      LEFT JOIN warehouse.dim_product dp ON fs.product_key = dp.product_key
      WHERE dp.product_key IS NULL
    `)

    await client.query(`
      INSERT INTO warehouse.data_quality_results (
        table_name, check_type, check_description, records_checked,
        records_failed, failure_rate, status
      ) VALUES (
        'fact_sales', 'referential_integrity', 'Missing product dimension keys',
        (SELECT COUNT(*) FROM warehouse.fact_sales),
        $1, $1::decimal / GREATEST((SELECT COUNT(*) FROM warehouse.fact_sales), 1) * 100,
        CASE WHEN $1 = 0 THEN 'PASS' ELSE 'FAIL' END
      )
    `, [parseInt(missingProductsResult.rows[0].missing_count)])
  }

  private async checkDataConsistency(client: any): Promise<void> {
    // Check for negative quantities or prices
    const negativeValuesResult = await client.query(`
      SELECT COUNT(*) as negative_count
      FROM warehouse.fact_sales
      WHERE quantity < 0 OR unit_price < 0 OR net_revenue < 0
    `)

    await client.query(`
      INSERT INTO warehouse.data_quality_results (
        table_name, check_type, check_description, records_checked,
        records_failed, failure_rate, status
      ) VALUES (
        'fact_sales', 'data_validation', 'Negative values in sales facts',
        (SELECT COUNT(*) FROM warehouse.fact_sales),
        $1, $1::decimal / GREATEST((SELECT COUNT(*) FROM warehouse.fact_sales), 1) * 100,
        CASE WHEN $1 = 0 THEN 'PASS' ELSE 'FAIL' END
      )
    `, [parseInt(negativeValuesResult.rows[0].negative_count)])
  }

  private async checkDuplicateRecords(client: any): Promise<void> {
    // Check for duplicate sales records
    const duplicatesResult = await client.query(`
      SELECT COUNT(*) - COUNT(DISTINCT (order_id, product_key)) as duplicate_count
      FROM warehouse.fact_sales
    `)

    await client.query(`
      INSERT INTO warehouse.data_quality_results (
        table_name, check_type, check_description, records_checked,
        records_failed, failure_rate, status
      ) VALUES (
        'fact_sales', 'uniqueness', 'Duplicate sales records',
        (SELECT COUNT(*) FROM warehouse.fact_sales),
        $1, $1::decimal / GREATEST((SELECT COUNT(*) FROM warehouse.fact_sales), 1) * 100,
        CASE WHEN $1 = 0 THEN 'PASS' ELSE 'FAIL' END
      )
    `, [parseInt(duplicatesResult.rows[0].duplicate_count)])
  }

  public async getWarehouseStatus(): Promise<any> {
    const client = await this.pool.connect()
    
    try {
      const [etlStatus, qualityResults, tableCounts] = await Promise.all([
        client.query('SELECT * FROM warehouse.etl_job_control ORDER BY job_name'),
        client.query(`
          SELECT * FROM warehouse.data_quality_results 
          WHERE run_timestamp > CURRENT_DATE - INTERVAL '7 days'
          ORDER BY run_timestamp DESC
        `),
        client.query(`
          SELECT 
            'dim_date' as table_name,
            COUNT(*) as record_count
          FROM warehouse.dim_date
          UNION ALL
          SELECT 'dim_product', COUNT(*) FROM warehouse.dim_product
          UNION ALL
          SELECT 'dim_customer', COUNT(*) FROM warehouse.dim_customer
          UNION ALL
          SELECT 'fact_sales', COUNT(*) FROM warehouse.fact_sales
          UNION ALL
          SELECT 'fact_inventory', COUNT(*) FROM warehouse.fact_inventory
          UNION ALL
          SELECT 'fact_marketing', COUNT(*) FROM warehouse.fact_marketing
        `)
      ])

      return {
        etlJobs: etlStatus.rows,
        qualityResults: qualityResults.rows,
        tableCounts: tableCounts.rows
      }

    } finally {
      client.release()
    }
  }
}

export const dataWarehouseSchema = `
  -- This schema is included in the DataWarehouseManager.initializeDataWarehouse() method
  -- Run this method to create all necessary warehouse tables and structures
`
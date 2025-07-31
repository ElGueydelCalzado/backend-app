import { Pool } from 'pg'

interface OrderItem {
  productId: number
  quantity: number
  price: number
}

interface Order {
  id?: number
  customerId?: string
  items: OrderItem[]
  shippingAddress: ShippingAddress
  paymentInfo: PaymentInfo
  subtotal: number
  shipping: number
  tax: number
  total: number
  status: OrderStatus
  tenantId?: string
}

interface ShippingAddress {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
}

interface PaymentInfo {
  method: 'card' | 'cash' | 'transfer'
  cardLast4?: string
  transactionId?: string
}

interface InventoryLocation {
  id: number
  name: string
  type: 'warehouse' | 'supplier' | 'store'
  priority: number
  shippingCost: number
  estimatedDays: number
  address: string
}

interface FulfillmentPlan {
  orderId: number
  items: FulfillmentItem[]
  estimatedDelivery: Date
  totalShippingCost: number
  preferredCarrier: string
}

interface FulfillmentItem {
  productId: number
  quantity: number
  sourceLocation: InventoryLocation
  allocatedQuantity: number
  backorderQuantity: number
}

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

export class OrderRoutingEngine {
  private pool: Pool

  constructor(pool: Pool) {
    this.pool = pool
  }

  public async processOrder(order: Order): Promise<{
    orderId: number
    fulfillmentPlan: FulfillmentPlan
    estimatedDelivery: Date
  }> {
    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')

      // 1. Create order record
      const orderId = await this.createOrderRecord(client, order)

      // 2. Check inventory availability
      const inventoryCheck = await this.checkInventoryAvailability(client, order.items)

      // 3. Create fulfillment plan
      const fulfillmentPlan = await this.createFulfillmentPlan(
        client, 
        orderId, 
        order.items, 
        order.shippingAddress,
        inventoryCheck
      )

      // 4. Reserve inventory
      await this.reserveInventory(client, fulfillmentPlan.items)

      // 5. Calculate shipping and delivery estimates
      const estimatedDelivery = await this.calculateDeliveryDate(
        fulfillmentPlan, 
        order.shippingAddress
      )

      // 6. Update order with fulfillment details
      await this.updateOrderWithFulfillment(client, orderId, fulfillmentPlan, estimatedDelivery)

      await client.query('COMMIT')

      return {
        orderId,
        fulfillmentPlan,
        estimatedDelivery
      }

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  private async createOrderRecord(client: any, order: Order): Promise<number> {
    const orderInsert = `
      INSERT INTO consumer_orders (
        customer_email,
        shipping_address,
        payment_info,
        subtotal,
        shipping_cost,
        tax_amount,
        total_amount,
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING id
    `

    const orderResult = await client.query(orderInsert, [
      order.shippingAddress.email,
      JSON.stringify(order.shippingAddress),
      JSON.stringify(order.paymentInfo),
      order.subtotal,
      order.shipping,
      order.tax,
      order.total,
      'pending'
    ])

    const orderId = orderResult.rows[0].id

    // Insert order items
    for (const item of order.items) {
      await client.query(`
        INSERT INTO consumer_order_items (
          order_id, product_id, quantity, unit_price, total_price
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        orderId,
        item.productId,
        item.quantity,
        item.price,
        item.quantity * item.price
      ])
    }

    return orderId
  }

  private async checkInventoryAvailability(
    client: any, 
    items: OrderItem[]
  ): Promise<Map<number, { available: number; locations: InventoryLocation[] }>> {
    const inventoryMap = new Map()

    for (const item of items) {
      // Get inventory across all locations for this product
      const inventoryQuery = `
        SELECT 
          p.id as product_id,
          p.inv_egdc,
          p.inv_fami, 
          p.inv_osiel,
          p.inv_molly,
          p.inventory_total
        FROM products p
        WHERE p.id = $1 AND p.inventory_total > 0
      `

      const result = await client.query(inventoryQuery, [item.productId])
      
      if (result.rows.length === 0) {
        inventoryMap.set(item.productId, { available: 0, locations: [] })
        continue
      }

      const product = result.rows[0]
      const locations: InventoryLocation[] = []

      // Map inventory locations with priority and shipping info
      if (product.inv_egdc > 0) {
        locations.push({
          id: 1,
          name: 'EGDC Principal',
          type: 'warehouse',
          priority: 1,
          shippingCost: 0, // Main warehouse - no extra cost
          estimatedDays: 2,
          address: 'Ciudad de México'
        })
      }

      if (product.inv_fami > 0) {
        locations.push({
          id: 2,
          name: 'Bodega FAMI',
          type: 'warehouse',
          priority: 2,
          shippingCost: 50,
          estimatedDays: 3,
          address: 'Estado de México'
        })
      }

      if (product.inv_osiel > 0) {
        locations.push({
          id: 3,
          name: 'Proveedor Osiel',
          type: 'supplier',
          priority: 3,
          shippingCost: 100,
          estimatedDays: 5,
          address: 'Guadalajara'
        })
      }

      if (product.inv_molly > 0) {
        locations.push({
          id: 4,
          name: 'Distribuidor Molly',
          type: 'supplier',
          priority: 4,
          shippingCost: 120,
          estimatedDays: 4,
          address: 'Monterrey'
        })
      }

      inventoryMap.set(item.productId, {
        available: product.inventory_total,
        locations: locations.sort((a, b) => a.priority - b.priority)
      })
    }

    return inventoryMap
  }

  private async createFulfillmentPlan(
    client: any,
    orderId: number,
    items: OrderItem[],
    shippingAddress: ShippingAddress,
    inventoryCheck: Map<number, { available: number; locations: InventoryLocation[] }>
  ): Promise<FulfillmentPlan> {
    const fulfillmentItems: FulfillmentItem[] = []
    let totalShippingCost = 0
    let maxDeliveryDays = 0

    for (const item of items) {
      const inventory = inventoryCheck.get(item.productId)
      
      if (!inventory || inventory.available === 0) {
        throw new Error(`Product ${item.productId} is not available`)
      }

      let remainingQuantity = item.quantity
      const productFulfillmentItems: FulfillmentItem[] = []

      // Try to fulfill from locations in order of priority
      for (const location of inventory.locations) {
        if (remainingQuantity <= 0) break

        // Get actual inventory for this location
        const locationInventory = await this.getLocationInventory(client, item.productId, location.id)
        const allocatedQuantity = Math.min(remainingQuantity, locationInventory)

        if (allocatedQuantity > 0) {
          productFulfillmentItems.push({
            productId: item.productId,
            quantity: item.quantity,
            sourceLocation: location,
            allocatedQuantity,
            backorderQuantity: 0
          })

          remainingQuantity -= allocatedQuantity
          totalShippingCost += location.shippingCost
          maxDeliveryDays = Math.max(maxDeliveryDays, location.estimatedDays)
        }
      }

      // If we couldn't fulfill the complete quantity
      if (remainingQuantity > 0) {
        // For now, we'll backorder the remaining quantity from the best location
        const bestLocation = inventory.locations[0]
        productFulfillmentItems.push({
          productId: item.productId,
          quantity: item.quantity,
          sourceLocation: bestLocation,
          allocatedQuantity: 0,
          backorderQuantity: remainingQuantity
        })

        maxDeliveryDays = Math.max(maxDeliveryDays, 7) // Add extra days for backorder
      }

      fulfillmentItems.push(...productFulfillmentItems)
    }

    // Calculate estimated delivery date
    const estimatedDelivery = new Date()
    estimatedDelivery.setDate(estimatedDelivery.getDate() + maxDeliveryDays)

    // Choose preferred carrier based on location and cost
    const preferredCarrier = this.selectCarrier(shippingAddress, totalShippingCost)

    return {
      orderId,
      items: fulfillmentItems,
      estimatedDelivery,
      totalShippingCost,
      preferredCarrier
    }
  }

  private async getLocationInventory(
    client: any, 
    productId: number, 
    locationId: number
  ): Promise<number> {
    const query = `
      SELECT 
        CASE 
          WHEN $2 = 1 THEN inv_egdc
          WHEN $2 = 2 THEN inv_fami
          WHEN $2 = 3 THEN inv_osiel
          WHEN $2 = 4 THEN inv_molly
          ELSE 0
        END as inventory
      FROM products 
      WHERE id = $1
    `

    const result = await client.query(query, [productId, locationId])
    return result.rows[0]?.inventory || 0
  }

  private async reserveInventory(client: any, items: FulfillmentItem[]): Promise<void> {
    for (const item of items) {
      if (item.allocatedQuantity > 0) {
        // Create inventory reservation record
        await client.query(`
          INSERT INTO inventory_reservations (
            product_id, 
            location_id, 
            quantity, 
            reservation_type,
            created_at,
            expires_at
          ) VALUES ($1, $2, $3, 'order', NOW(), NOW() + INTERVAL '24 hours')
        `, [
          item.productId,
          item.sourceLocation.id,
          item.allocatedQuantity
        ])

        // Update product inventory
        const updateField = this.getInventoryFieldForLocation(item.sourceLocation.id)
        await client.query(`
          UPDATE products 
          SET ${updateField} = ${updateField} - $1
          WHERE id = $2
        `, [item.allocatedQuantity, item.productId])
      }
    }
  }

  private getInventoryFieldForLocation(locationId: number): string {
    switch (locationId) {
      case 1: return 'inv_egdc'
      case 2: return 'inv_fami'  
      case 3: return 'inv_osiel'
      case 4: return 'inv_molly'
      default: return 'inv_egdc'
    }
  }

  private async calculateDeliveryDate(
    fulfillmentPlan: FulfillmentPlan,
    shippingAddress: ShippingAddress
  ): Promise<Date> {
    let maxDays = 0

    // Find the longest delivery time among all fulfillment items
    for (const item of fulfillmentPlan.items) {
      maxDays = Math.max(maxDays, item.sourceLocation.estimatedDays)
    }

    // Add extra days for remote locations
    if (shippingAddress.state !== 'Ciudad de México' && shippingAddress.state !== 'CDMX') {
      maxDays += 1
    }

    // Add weekend buffer
    const deliveryDate = new Date()
    deliveryDate.setDate(deliveryDate.getDate() + maxDays)

    // Ensure delivery is not on weekend
    if (deliveryDate.getDay() === 0) { // Sunday
      deliveryDate.setDate(deliveryDate.getDate() + 1)
    } else if (deliveryDate.getDay() === 6) { // Saturday
      deliveryDate.setDate(deliveryDate.getDate() + 2)
    }

    return deliveryDate
  }

  private selectCarrier(
    shippingAddress: ShippingAddress, 
    totalShippingCost: number
  ): string {
    // Logic to select best carrier based on location and cost
    const state = shippingAddress.state.toLowerCase()
    
    if (state.includes('ciudad de méxico') || state.includes('cdmx')) {
      return totalShippingCost > 200 ? 'DHL' : 'Estafeta'
    } else if (state.includes('méxico') || state.includes('guadalajara') || state.includes('monterrey')) {
      return 'Fedex'
    } else {
      return 'Paquetexpress'
    }
  }

  private async updateOrderWithFulfillment(
    client: any,
    orderId: number,
    fulfillmentPlan: FulfillmentPlan,
    estimatedDelivery: Date
  ): Promise<void> {
    await client.query(`
      UPDATE consumer_orders 
      SET 
        fulfillment_plan = $1,
        estimated_delivery = $2,
        preferred_carrier = $3,
        status = 'confirmed',
        updated_at = NOW()
      WHERE id = $4
    `, [
      JSON.stringify(fulfillmentPlan),
      estimatedDelivery,
      fulfillmentPlan.preferredCarrier,
      orderId
    ])
  }

  // Method to handle order status updates
  public async updateOrderStatus(
    orderId: number, 
    status: OrderStatus, 
    trackingNumber?: string
  ): Promise<void> {
    const client = await this.pool.connect()
    
    try {
      const updateQuery = `
        UPDATE consumer_orders 
        SET 
          status = $1,
          tracking_number = $2,
          updated_at = NOW()
        WHERE id = $3
      `

      await client.query(updateQuery, [status, trackingNumber, orderId])

      // Create status history record
      await client.query(`
        INSERT INTO order_status_history (
          order_id, status, notes, created_at
        ) VALUES ($1, $2, $3, NOW())
      `, [orderId, status, trackingNumber ? `Tracking: ${trackingNumber}` : null])

    } finally {
      client.release()
    }
  }

  // Method to get order details with fulfillment info
  public async getOrderDetails(orderId: number): Promise<any> {
    const client = await this.pool.connect()
    
    try {
      const orderQuery = `
        SELECT 
          o.*,
          ARRAY_AGG(
            JSON_BUILD_OBJECT(
              'product_id', oi.product_id,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'product_name', p.marca || ' ' || p.modelo,
              'product_color', p.color,
              'product_size', p.talla
            )
          ) as items
        FROM consumer_orders o
        LEFT JOIN consumer_order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE o.id = $1
        GROUP BY o.id
      `

      const result = await client.query(orderQuery, [orderId])
      return result.rows[0]

    } finally {
      client.release()
    }
  }
}

// Database schema for supporting tables
export const orderRoutingSchema = `
  -- Consumer orders table
  CREATE TABLE IF NOT EXISTS consumer_orders (
    id SERIAL PRIMARY KEY,
    customer_email VARCHAR(255) NOT NULL,
    shipping_address JSONB NOT NULL,
    payment_info JSONB NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    shipping_cost DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    fulfillment_plan JSONB,
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    preferred_carrier VARCHAR(100),
    tracking_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Order items table
  CREATE TABLE IF NOT EXISTS consumer_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES consumer_orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL
  );

  -- Inventory reservations table
  CREATE TABLE IF NOT EXISTS inventory_reservations (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id),
    location_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    reservation_type VARCHAR(50) NOT NULL,
    order_id INTEGER REFERENCES consumer_orders(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
  );

  -- Order status history table
  CREATE TABLE IF NOT EXISTS order_status_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES consumer_orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_consumer_orders_email ON consumer_orders(customer_email);
  CREATE INDEX IF NOT EXISTS idx_consumer_orders_status ON consumer_orders(status);
  CREATE INDEX IF NOT EXISTS idx_consumer_orders_created_at ON consumer_orders(created_at);
  CREATE INDEX IF NOT EXISTS idx_inventory_reservations_product_id ON inventory_reservations(product_id);
  CREATE INDEX IF NOT EXISTS idx_inventory_reservations_expires_at ON inventory_reservations(expires_at);
`
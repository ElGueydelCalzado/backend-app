-- EGDC Marketplace Evolution: Task 1.4
-- Add Purchase Order System
-- Creates purchase_orders table with RLS and comprehensive B2B functionality

BEGIN;

-- =============================================
-- 1. CREATE PURCHASE ORDERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Tenant relationships (retailer buying from supplier)
    retailer_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    supplier_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    retailer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    supplier_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Order status and lifecycle
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Order created, awaiting supplier confirmation
        'confirmed',    -- Supplier confirmed order
        'processing',   -- Order being prepared
        'shipped',      -- Order shipped to retailer
        'delivered',    -- Order received by retailer
        'cancelled',    -- Order cancelled by either party
        'disputed'      -- Order in dispute
    )),
    
    -- Order items (JSONB for flexibility)
    items JSONB NOT NULL CHECK (jsonb_array_length(items) > 0),
    
    -- Financial calculations
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    tax_rate DECIMAL(5,4) DEFAULT 0.16, -- 16% Mexican IVA
    tax_amount DECIMAL(10,2) GENERATED ALWAYS AS (
        ROUND(subtotal * COALESCE(tax_rate, 0), 2)
    ) STORED,
    shipping_cost DECIMAL(10,2) DEFAULT 0 CHECK (shipping_cost >= 0),
    discount_amount DECIMAL(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount DECIMAL(10,2) GENERATED ALWAYS AS (
        subtotal + COALESCE(ROUND(subtotal * COALESCE(tax_rate, 0), 2), 0) + 
        COALESCE(shipping_cost, 0) - COALESCE(discount_amount, 0)
    ) STORED,
    
    -- Shipping and delivery information
    shipping_address JSONB NOT NULL,
    delivery_instructions TEXT,
    estimated_delivery_date DATE,
    actual_delivery_date DATE,
    tracking_number VARCHAR(100),
    
    -- Payment information
    payment_terms VARCHAR(50) DEFAULT 'Net 30',
    payment_method VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN (
        'pending', 'paid', 'overdue', 'disputed'
    )),
    payment_due_date DATE,
    
    -- Order notes and communication
    retailer_notes TEXT,
    supplier_notes TEXT,
    internal_notes TEXT,
    
    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_tenant_relationship CHECK (retailer_tenant_id != supplier_tenant_id),
    CONSTRAINT valid_delivery_dates CHECK (
        estimated_delivery_date IS NULL OR 
        actual_delivery_date IS NULL OR 
        actual_delivery_date >= estimated_delivery_date - interval '7 days'
    )
);

-- =============================================
-- 2. CREATE ORDER ITEMS TRACKING TABLE
-- =============================================

-- Separate table for detailed order item tracking (optional but useful for analytics)
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    
    -- Item details (snapshot at time of order)
    product_sku VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_brand VARCHAR(100),
    product_model VARCHAR(100),
    product_color VARCHAR(100),
    product_size VARCHAR(20),
    
    -- Pricing and quantity
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost DECIMAL(10,2) NOT NULL CHECK (unit_cost >= 0),
    line_total DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    
    -- Fulfillment tracking
    quantity_shipped INTEGER DEFAULT 0 CHECK (quantity_shipped >= 0 AND quantity_shipped <= quantity),
    quantity_delivered INTEGER DEFAULT 0 CHECK (quantity_delivered >= 0 AND quantity_delivered <= quantity_shipped),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. CREATE ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on both tables
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Policy: Retailers can see orders they created
CREATE POLICY purchase_orders_retailer_access ON purchase_orders
    FOR ALL
    USING (retailer_tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Policy: Suppliers can see orders placed with them
CREATE POLICY purchase_orders_supplier_access ON purchase_orders
    FOR ALL
    USING (supplier_tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Policy: Order items follow same access as parent order
CREATE POLICY purchase_order_items_access ON purchase_order_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM purchase_orders po 
            WHERE po.id = purchase_order_items.order_id 
            AND (
                po.retailer_tenant_id = current_setting('app.current_tenant_id', true)::UUID OR
                po.supplier_tenant_id = current_setting('app.current_tenant_id', true)::UUID
            )
        )
    );

-- =============================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Primary access patterns
CREATE INDEX IF NOT EXISTS idx_purchase_orders_retailer ON purchase_orders(retailer_tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_number ON purchase_orders(order_number);

-- Date-based queries
CREATE INDEX IF NOT EXISTS idx_purchase_orders_dates ON purchase_orders(created_at, status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_delivery ON purchase_orders(estimated_delivery_date) WHERE status IN ('confirmed', 'processing', 'shipped');

-- Financial queries
CREATE INDEX IF NOT EXISTS idx_purchase_orders_payment ON purchase_orders(payment_status, payment_due_date) WHERE payment_status != 'paid';

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order ON purchase_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product ON purchase_order_items(product_id);

-- =============================================
-- 5. CREATE TRIGGERS AND FUNCTIONS
-- =============================================

-- Function to update purchase order timestamps
CREATE OR REPLACE FUNCTION update_purchase_order_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Set status-specific timestamps
    IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
        NEW.confirmed_at = NOW();
        -- Set payment due date based on payment terms
        NEW.payment_due_date = CASE 
            WHEN NEW.payment_terms = 'Net 15' THEN CURRENT_DATE + interval '15 days'
            WHEN NEW.payment_terms = 'Net 30' THEN CURRENT_DATE + interval '30 days'
            WHEN NEW.payment_terms = 'immediate' THEN CURRENT_DATE
            ELSE CURRENT_DATE + interval '30 days'
        END;
    END IF;
    
    IF NEW.status = 'shipped' AND OLD.status != 'shipped' THEN
        NEW.shipped_at = NOW();
    END IF;
    
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        NEW.delivered_at = NOW();
    END IF;
    
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        NEW.cancelled_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for purchase orders
CREATE TRIGGER trigger_update_purchase_order_timestamps
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_order_timestamps();

-- Function to update order items timestamps
CREATE OR REPLACE FUNCTION update_purchase_order_items_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order items
CREATE TRIGGER trigger_update_purchase_order_items_timestamps
    BEFORE UPDATE ON purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_order_items_timestamps();

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    year_prefix VARCHAR(4);
    sequence_num INTEGER;
    order_num VARCHAR(50);
BEGIN
    year_prefix := EXTRACT(year FROM NOW())::VARCHAR;
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(
        CASE 
            WHEN order_number LIKE year_prefix || '-%' 
            THEN SUBSTRING(order_number FROM LENGTH(year_prefix) + 2)::INTEGER
            ELSE 0
        END
    ), 0) + 1
    INTO sequence_num
    FROM purchase_orders
    WHERE order_number LIKE year_prefix || '-%';
    
    order_num := year_prefix || '-' || LPAD(sequence_num::VARCHAR, 6, '0');
    
    RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 6. CREATE HELPFUL VIEWS
-- =============================================

-- View for order summary with tenant information
CREATE OR REPLACE VIEW purchase_orders_summary AS
SELECT 
    po.id,
    po.order_number,
    po.status,
    po.created_at,
    po.total_amount,
    
    -- Retailer info
    rt.name as retailer_name,
    rt.subdomain as retailer_subdomain,
    ru.name as retailer_user_name,
    
    -- Supplier info
    st.name as supplier_name,
    st.subdomain as supplier_subdomain,
    su.name as supplier_user_name,
    
    -- Order metrics
    jsonb_array_length(po.items) as item_count,
    po.estimated_delivery_date,
    po.payment_due_date,
    po.payment_status
    
FROM purchase_orders po
JOIN tenants rt ON po.retailer_tenant_id = rt.id
JOIN tenants st ON po.supplier_tenant_id = st.id
LEFT JOIN users ru ON po.retailer_user_id = ru.id
LEFT JOIN users su ON po.supplier_user_id = su.id;

-- View for financial reporting
CREATE OR REPLACE VIEW purchase_orders_financial AS
SELECT 
    po.supplier_tenant_id,
    st.name as supplier_name,
    st.subdomain as supplier_subdomain,
    
    COUNT(*) as total_orders,
    SUM(po.total_amount) as total_revenue,
    AVG(po.total_amount) as avg_order_value,
    
    COUNT(CASE WHEN po.status = 'pending' THEN 1 END) as pending_orders,
    COUNT(CASE WHEN po.status = 'confirmed' THEN 1 END) as confirmed_orders,
    COUNT(CASE WHEN po.status = 'delivered' THEN 1 END) as delivered_orders,
    
    SUM(CASE WHEN po.payment_status = 'pending' THEN po.total_amount ELSE 0 END) as pending_payments,
    SUM(CASE WHEN po.payment_status = 'paid' THEN po.total_amount ELSE 0 END) as paid_amount
    
FROM purchase_orders po
JOIN tenants st ON po.supplier_tenant_id = st.id
GROUP BY po.supplier_tenant_id, st.name, st.subdomain;

COMMIT;

-- =============================================
-- 7. VERIFICATION QUERIES
-- =============================================

-- Verify table creation
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('purchase_orders', 'purchase_order_items')
    AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Verify indexes
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE tablename IN ('purchase_orders', 'purchase_order_items')
ORDER BY tablename, indexname;

-- Verify RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('purchase_orders', 'purchase_order_items')
ORDER BY tablename, policyname;

-- Test order number generation
SELECT generate_order_number() as sample_order_number;

-- =============================================
-- NOTES FOR IMPLEMENTATION
-- =============================================

/*
This purchase order system provides:

1. ✅ Complete B2B transaction management
2. ✅ Proper tenant isolation with RLS
3. ✅ Automatic financial calculations
4. ✅ Order lifecycle tracking
5. ✅ Payment term management
6. ✅ Shipping and delivery tracking
7. ✅ Audit trail with timestamps
8. ✅ Performance optimization with indexes
9. ✅ Helpful views for reporting

Key Features:
- Multi-status order workflow
- Generated columns for automatic calculations
- JSONB for flexible item storage
- Comprehensive audit trail
- Financial tracking with payment terms
- Shipping address and tracking

Next steps:
- Test order creation and updates
- Verify RLS policies work correctly
- Proceed to Task 1.5: Enhance WarehouseTabs Component
*/
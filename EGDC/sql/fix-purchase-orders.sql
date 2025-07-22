-- FIX PURCHASE ORDERS SYSTEM
-- Create proper purchase orders tables without generated column issues

-- Drop existing tables if they have issues
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;

-- Create purchase_orders table (PostgreSQL 15 compatible)
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL DEFAULT ('PO-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('purchase_order_seq')::text, 6, '0')),
    
    -- Tenant relationships
    retailer_tenant_id UUID NOT NULL REFERENCES tenants(id),
    supplier_tenant_id UUID NOT NULL REFERENCES tenants(id),
    retailer_user_id UUID REFERENCES users(id),
    supplier_user_id UUID REFERENCES users(id),
    
    -- Order details
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'disputed')),
    
    -- Financial details (using triggers instead of generated columns)
    subtotal DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    shipping_cost DECIMAL(10,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'MXN',
    
    -- Business terms
    payment_terms VARCHAR(50) DEFAULT 'Net 30',
    payment_method VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'overdue', 'cancelled')),
    payment_due_date DATE,
    
    -- Shipping and delivery
    shipping_address JSONB,
    billing_address JSONB,
    estimated_delivery_date DATE,
    tracking_number VARCHAR(100),
    
    -- Communication
    retailer_notes TEXT,
    supplier_notes TEXT,
    internal_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Create purchase_order_items table
CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    
    -- Product details (snapshot at time of order)
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),
    categoria VARCHAR(100),
    marca VARCHAR(100),
    modelo VARCHAR(100),
    color VARCHAR(100),
    talla VARCHAR(50),
    
    -- Pricing and quantities
    unit_price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    quantity_shipped INTEGER DEFAULT 0 CHECK (quantity_shipped >= 0 AND quantity_shipped <= quantity),
    line_total DECIMAL(10,2) DEFAULT 0.00,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to calculate order totals
CREATE OR REPLACE FUNCTION update_purchase_order_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate payment due date
    IF NEW.payment_due_date IS NULL THEN
        NEW.payment_due_date := CASE 
            WHEN NEW.payment_terms = 'Net 15' THEN NEW.created_at::date + INTERVAL '15 days'
            WHEN NEW.payment_terms = 'Net 30' THEN NEW.created_at::date + INTERVAL '30 days'
            WHEN NEW.payment_terms = 'Net 45' THEN NEW.created_at::date + INTERVAL '45 days'
            WHEN NEW.payment_terms = 'COD' THEN NEW.created_at::date
            ELSE NEW.created_at::date + INTERVAL '30 days'
        END;
    END IF;
    
    -- Calculate total amount
    NEW.total_amount := COALESCE(NEW.subtotal, 0) + COALESCE(NEW.tax_amount, 0) + COALESCE(NEW.shipping_cost, 0) - COALESCE(NEW.discount_amount, 0);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update item line totals
CREATE OR REPLACE FUNCTION update_purchase_order_item_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate line total
    NEW.line_total := NEW.unit_price * NEW.quantity;
    
    -- Update order subtotal
    UPDATE purchase_orders 
    SET subtotal = (
        SELECT COALESCE(SUM(line_total), 0) 
        FROM purchase_order_items 
        WHERE order_id = NEW.order_id
    ),
    updated_at = NOW()
    WHERE id = NEW.order_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_purchase_order_totals
    BEFORE INSERT OR UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_purchase_order_totals();

CREATE TRIGGER trigger_update_purchase_order_item_totals
    BEFORE INSERT OR UPDATE ON purchase_order_items
    FOR EACH ROW EXECUTE FUNCTION update_purchase_order_item_totals();

-- Create indexes for performance
CREATE INDEX idx_purchase_orders_retailer ON purchase_orders(retailer_tenant_id);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_tenant_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_created ON purchase_orders(created_at);
CREATE INDEX idx_purchase_orders_order_number ON purchase_orders(order_number);

CREATE INDEX idx_purchase_order_items_order ON purchase_order_items(order_id);
CREATE INDEX idx_purchase_order_items_product ON purchase_order_items(product_id);
CREATE INDEX idx_purchase_order_items_sku ON purchase_order_items(product_sku);

-- Enable Row Level Security
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY purchase_orders_isolation ON purchase_orders
    USING (
        retailer_tenant_id = current_setting('app.current_tenant_id', true)::uuid 
        OR supplier_tenant_id = current_setting('app.current_tenant_id', true)::uuid
    );

CREATE POLICY purchase_order_items_isolation ON purchase_order_items
    USING (
        order_id IN (
            SELECT id FROM purchase_orders 
            WHERE retailer_tenant_id = current_setting('app.current_tenant_id', true)::uuid 
               OR supplier_tenant_id = current_setting('app.current_tenant_id', true)::uuid
        )
    );

-- Create business intelligence views
CREATE OR REPLACE VIEW purchase_orders_summary AS
SELECT 
    po.id,
    po.order_number,
    po.status,
    po.created_at,
    po.total_amount,
    po.currency,
    rt.name as retailer_name,
    rt.subdomain as retailer_subdomain,
    ru.name as retailer_user_name,
    st.name as supplier_name,
    st.subdomain as supplier_subdomain,
    su.name as supplier_user_name,
    COALESCE(poi.item_count, 0) as item_count,
    COALESCE(poi.total_quantity, 0) as total_quantity,
    po.estimated_delivery_date,
    po.payment_due_date,
    po.payment_status
FROM purchase_orders po
LEFT JOIN tenants rt ON po.retailer_tenant_id = rt.id
LEFT JOIN tenants st ON po.supplier_tenant_id = st.id  
LEFT JOIN users ru ON po.retailer_user_id = ru.id
LEFT JOIN users su ON po.supplier_user_id = su.id
LEFT JOIN (
    SELECT 
        order_id, 
        COUNT(*) as item_count,
        SUM(quantity) as total_quantity
    FROM purchase_order_items 
    GROUP BY order_id
) poi ON po.id = poi.order_id;

-- Create financial analytics view
CREATE OR REPLACE VIEW purchase_orders_financial AS
SELECT 
    st.id as supplier_tenant_id,
    st.name as supplier_name,
    st.subdomain as supplier_subdomain,
    COUNT(*) as total_orders,
    COALESCE(SUM(po.total_amount), 0) as total_revenue,
    COALESCE(AVG(po.total_amount), 0) as avg_order_value,
    COUNT(*) FILTER (WHERE po.status = 'pending') as pending_orders,
    COUNT(*) FILTER (WHERE po.status = 'confirmed') as confirmed_orders,
    COUNT(*) FILTER (WHERE po.status = 'delivered') as delivered_orders,
    COALESCE(SUM(po.total_amount) FILTER (WHERE po.payment_status = 'pending'), 0) as pending_payments,
    COALESCE(SUM(po.total_amount) FILTER (WHERE po.payment_status = 'paid'), 0) as paid_amount
FROM tenants st
LEFT JOIN purchase_orders po ON st.id = po.supplier_tenant_id
WHERE st.business_type = 'wholesaler'
GROUP BY st.id, st.name, st.subdomain;

-- Insert sample purchase orders for testing
DO $$
DECLARE
    egdc_tenant_id UUID;
    fami_tenant_id UUID;
    osiel_tenant_id UUID;
    sample_order_id UUID;
    fami_product_id INTEGER;
    osiel_product_id INTEGER;
BEGIN
    -- Get tenant IDs
    SELECT id INTO egdc_tenant_id FROM tenants WHERE subdomain = 'egdc';
    SELECT id INTO fami_tenant_id FROM tenants WHERE subdomain = 'fami';
    SELECT id INTO osiel_tenant_id FROM tenants WHERE subdomain = 'osiel';
    
    -- Get sample product IDs
    SELECT id INTO fami_product_id FROM products WHERE tenant_id = fami_tenant_id LIMIT 1;
    SELECT id INTO osiel_product_id FROM products WHERE tenant_id = osiel_tenant_id LIMIT 1;
    
    IF egdc_tenant_id IS NOT NULL AND fami_tenant_id IS NOT NULL AND fami_product_id IS NOT NULL THEN
        -- Create sample order from EGDC to FAMI
        INSERT INTO purchase_orders (
            retailer_tenant_id, supplier_tenant_id, status, 
            payment_terms, shipping_cost, tax_amount,
            shipping_address, retailer_notes
        ) VALUES (
            egdc_tenant_id, fami_tenant_id, 'pending',
            'Net 30', 150.00, 0.00,
            '{"street": "Av. Reforma 123", "city": "Mexico City", "state": "CDMX", "postal_code": "06600", "country": "Mexico"}'::jsonb,
            'Primera orden de prueba con FAMI Wholesale'
        ) RETURNING id INTO sample_order_id;
        
        -- Add items to the order
        INSERT INTO purchase_order_items (
            order_id, product_id, product_name, product_sku, 
            categoria, marca, modelo, color, talla,
            unit_price, quantity
        ) VALUES (
            sample_order_id, fami_product_id, 'FAMI Elegance Heel', 'FAMI-EH-NEG-6',
            'Tacones', 'FAMI Collection', 'Elegance Heel', 'Negro', '6',
            720.00, 10
        );
        
        RAISE NOTICE 'Created sample purchase order: %', sample_order_id;
    END IF;
    
    IF egdc_tenant_id IS NOT NULL AND osiel_tenant_id IS NOT NULL AND osiel_product_id IS NOT NULL THEN
        -- Create sample order from EGDC to Osiel
        INSERT INTO purchase_orders (
            retailer_tenant_id, supplier_tenant_id, status, 
            payment_terms, shipping_cost, tax_amount,
            shipping_address, retailer_notes
        ) VALUES (
            egdc_tenant_id, osiel_tenant_id, 'confirmed',
            'Net 15', 200.00, 64.60,
            '{"street": "Av. Reforma 123", "city": "Mexico City", "state": "CDMX", "postal_code": "06600", "country": "Mexico"}'::jsonb,
            'Orden de deportivos para temporada de verano'
        ) RETURNING id INTO sample_order_id;
        
        -- Add items to the order
        INSERT INTO purchase_order_items (
            order_id, product_id, product_name, product_sku, 
            categoria, marca, modelo, color, talla,
            unit_price, quantity
        ) VALUES (
            sample_order_id, osiel_product_id, 'Osiel Runner Pro', 'OSIEL-RP-BLA-8',
            'Deportivos', 'Osiel Sports', 'Runner Pro', 'Blanco', '8',
            646.00, 5
        );
        
        RAISE NOTICE 'Created sample purchase order: %', sample_order_id;
    END IF;
END $$;

RAISE NOTICE '✅ Purchase Orders System Fixed and Ready!';
RAISE NOTICE 'Features: Order tracking, automated calculations, RLS policies, sample data';
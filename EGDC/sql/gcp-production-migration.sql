-- GCP PRODUCTION DATABASE MIGRATION SCRIPT
-- Transforms single-tenant EGDC to multi-tenant B2B marketplace
-- RUN THIS ON: postgresql://egdc_user:egdc1!@34.45.148.180:5432/egdc_inventory

-- ====================================================================================
-- STEP 1: ENHANCE TENANTS TABLE FOR MULTI-TENANT SUPPORT
-- ====================================================================================

-- Add new columns for business type and supplier settings (if not exists)
DO $$ 
BEGIN
    -- Add business_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'business_type') THEN
        ALTER TABLE tenants ADD COLUMN business_type VARCHAR(20) DEFAULT 'retailer';
    END IF;
    
    -- Add access_mode column  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'access_mode') THEN
        ALTER TABLE tenants ADD COLUMN access_mode VARCHAR(20) DEFAULT 'full_access';
    END IF;
    
    -- Add supplier_settings column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'supplier_settings') THEN
        ALTER TABLE tenants ADD COLUMN supplier_settings JSONB DEFAULT '{}';
    END IF;
    
    -- Add billing_status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'billing_status') THEN
        ALTER TABLE tenants ADD COLUMN billing_status VARCHAR(20) DEFAULT 'trial';
    END IF;
    
    RAISE NOTICE 'Enhanced tenants table with multi-tenant columns';
END $$;

-- Add constraints and indexes
ALTER TABLE tenants 
    ADD CONSTRAINT IF NOT EXISTS check_business_type 
    CHECK (business_type IN ('retailer', 'wholesaler', 'hybrid'));

ALTER TABLE tenants 
    ADD CONSTRAINT IF NOT EXISTS check_access_mode 
    CHECK (access_mode IN ('full_access', 'read_only', 'catalog_only', 'restricted'));

ALTER TABLE tenants 
    ADD CONSTRAINT IF NOT EXISTS check_billing_status 
    CHECK (billing_status IN ('trial', 'active', 'suspended', 'cancelled'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenants_business_type ON tenants(business_type);
CREATE INDEX IF NOT EXISTS idx_tenants_access_mode ON tenants(access_mode);
CREATE INDEX IF NOT EXISTS idx_tenants_billing_status ON tenants(billing_status);

-- ====================================================================================
-- STEP 2: CREATE SUPPLIER TENANT ACCOUNTS
-- ====================================================================================

-- Insert supplier tenants (with conflict resolution)
INSERT INTO tenants (
    id, name, subdomain, email, plan, status, business_type, access_mode, 
    supplier_settings, billing_status, created_at, updated_at
) VALUES 
(
    gen_random_uuid(),
    'FAMI Wholesale',
    'fami',
    'admin@fami.com.mx',
    'supplier_standard',
    'active',
    'wholesaler',
    'catalog_only',
    '{
        "minimum_order_amount": 1500,
        "payment_terms": "Net 30",
        "shipping_methods": ["standard", "express"],
        "business_hours": "Mon-Fri 8AM-6PM",
        "contact_phone": "+52-55-1234-5678",
        "warehouse_location": "Mexico City, Mexico",
        "specialties": ["Women Shoes", "Fashion Footwear"],
        "catalog_access": "full"
    }'::jsonb,
    'active',
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'Osiel Distribution',
    'osiel',
    'osiel@distribution.com.mx',
    'supplier_premium',
    'active',
    'wholesaler',
    'catalog_only',
    '{
        "minimum_order_amount": 2000,
        "payment_terms": "Net 15",
        "shipping_methods": ["standard", "express", "overnight"],
        "business_hours": "Mon-Sat 7AM-7PM",
        "contact_phone": "+52-55-9876-5432",
        "warehouse_location": "Guadalajara, Mexico",
        "specialties": ["Sports Shoes", "Athletic Footwear"],
        "catalog_access": "full"
    }'::jsonb,
    'active',
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'Molly Fashion Supply',
    'molly',
    'contact@mollyfashion.com.mx',
    'supplier_standard',
    'active',
    'wholesaler',
    'catalog_only',
    '{
        "minimum_order_amount": 1000,
        "payment_terms": "Net 45",
        "shipping_methods": ["standard"],
        "business_hours": "Mon-Fri 9AM-5PM",
        "contact_phone": "+52-55-5555-1234",
        "warehouse_location": "Monterrey, Mexico",
        "specialties": ["Casual Shoes", "Comfort Footwear"],
        "catalog_access": "full"
    }'::jsonb,
    'active',
    NOW(),
    NOW()
)
ON CONFLICT (subdomain) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    business_type = EXCLUDED.business_type,
    access_mode = EXCLUDED.access_mode,
    supplier_settings = EXCLUDED.supplier_settings,
    billing_status = EXCLUDED.billing_status,
    updated_at = NOW();

-- ====================================================================================
-- STEP 3: CREATE SUPPLIER USER ACCOUNTS
-- ====================================================================================

-- Get tenant IDs for user creation
DO $$
DECLARE
    fami_tenant_id UUID;
    osiel_tenant_id UUID;
    molly_tenant_id UUID;
BEGIN
    -- Get tenant IDs
    SELECT id INTO fami_tenant_id FROM tenants WHERE subdomain = 'fami';
    SELECT id INTO osiel_tenant_id FROM tenants WHERE subdomain = 'osiel';
    SELECT id INTO molly_tenant_id FROM tenants WHERE subdomain = 'molly';
    
    -- Create FAMI users
    INSERT INTO users (
        id, tenant_id, name, email, role, status, permissions, created_at, updated_at
    ) VALUES 
    (
        gen_random_uuid(),
        fami_tenant_id,
        'FAMI Admin',
        'admin@fami.com.mx',
        'admin',
        'active',
        '{
            "inventory": {"read": true, "write": true, "delete": false},
            "orders": {"read": true, "write": true, "delete": false},
            "analytics": {"read": true, "write": false, "delete": false},
            "users": {"read": true, "write": true, "delete": false},
            "settings": {"read": true, "write": true, "delete": false}
        }'::jsonb,
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        fami_tenant_id,
        'FAMI Staff',
        'staff@fami.com.mx',
        'staff',
        'active',
        '{
            "inventory": {"read": true, "write": true, "delete": false},
            "orders": {"read": true, "write": true, "delete": false},
            "analytics": {"read": true, "write": false, "delete": false},
            "users": {"read": false, "write": false, "delete": false},
            "settings": {"read": false, "write": false, "delete": false}
        }'::jsonb,
        NOW(),
        NOW()
    )
    ON CONFLICT (email) DO NOTHING;
    
    -- Create Osiel users
    INSERT INTO users (
        id, tenant_id, name, email, role, status, permissions, created_at, updated_at
    ) VALUES 
    (
        gen_random_uuid(),
        osiel_tenant_id,
        'Osiel Admin',
        'osiel@distribution.com.mx',
        'admin',
        'active',
        '{
            "inventory": {"read": true, "write": true, "delete": false},
            "orders": {"read": true, "write": true, "delete": false},
            "analytics": {"read": true, "write": false, "delete": false},
            "users": {"read": true, "write": true, "delete": false},
            "settings": {"read": true, "write": true, "delete": false}
        }'::jsonb,
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        osiel_tenant_id,
        'Osiel Staff',
        'staff@distribution.com.mx',
        'staff',
        'active',
        '{
            "inventory": {"read": true, "write": true, "delete": false},
            "orders": {"read": true, "write": true, "delete": false},
            "analytics": {"read": true, "write": false, "delete": false},
            "users": {"read": false, "write": false, "delete": false},
            "settings": {"read": false, "write": false, "delete": false}
        }'::jsonb,
        NOW(),
        NOW()
    )
    ON CONFLICT (email) DO NOTHING;
    
    -- Create Molly users
    INSERT INTO users (
        id, tenant_id, name, email, role, status, permissions, created_at, updated_at
    ) VALUES 
    (
        gen_random_uuid(),
        molly_tenant_id,
        'Molly Admin',
        'contact@mollyfashion.com.mx',
        'admin',
        'active',
        '{
            "inventory": {"read": true, "write": true, "delete": false},
            "orders": {"read": true, "write": true, "delete": false},
            "analytics": {"read": true, "write": false, "delete": false},
            "users": {"read": true, "write": true, "delete": false},
            "settings": {"read": true, "write": true, "delete": false}
        }'::jsonb,
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        molly_tenant_id,
        'Molly Staff',
        'staff@mollyfashion.com.mx',
        'staff',
        'active',
        '{
            "inventory": {"read": true, "write": true, "delete": false},
            "orders": {"read": true, "write": true, "delete": false},
            "analytics": {"read": true, "write": false, "delete": false},
            "users": {"read": false, "write": false, "delete": false},
            "settings": {"read": false, "write": false, "delete": false}
        }'::jsonb,
        NOW(),
        NOW()
    )
    ON CONFLICT (email) DO NOTHING;
    
    RAISE NOTICE 'Created supplier user accounts for FAMI, Osiel, and Molly';
END $$;

-- ====================================================================================
-- STEP 4: CREATE PURCHASE ORDERS SYSTEM
-- ====================================================================================

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL DEFAULT ('PO-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('purchase_order_seq')::text, 6, '0')),
    
    -- Tenant relationships
    retailer_tenant_id UUID NOT NULL REFERENCES tenants(id),
    supplier_tenant_id UUID NOT NULL REFERENCES tenants(id),
    retailer_user_id UUID REFERENCES users(id),
    supplier_user_id UUID REFERENCES users(id),
    
    -- Order details
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'disputed')),
    total_amount DECIMAL(10,2) GENERATED ALWAYS AS (
        COALESCE(subtotal, 0) + COALESCE(tax_amount, 0) + COALESCE(shipping_cost, 0) - COALESCE(discount_amount, 0)
    ) STORED,
    
    -- Financial details
    subtotal DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    shipping_cost DECIMAL(10,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'MXN',
    
    -- Business terms
    payment_terms VARCHAR(50) DEFAULT 'Net 30',
    payment_method VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'overdue', 'cancelled')),
    payment_due_date DATE GENERATED ALWAYS AS (
        CASE 
            WHEN payment_terms = 'Net 15' THEN (created_at::date + INTERVAL '15 days')::date
            WHEN payment_terms = 'Net 30' THEN (created_at::date + INTERVAL '30 days')::date
            WHEN payment_terms = 'Net 45' THEN (created_at::date + INTERVAL '45 days')::date
            WHEN payment_terms = 'COD' THEN created_at::date
            ELSE (created_at::date + INTERVAL '30 days')::date
        END
    ) STORED,
    
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

-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS purchase_order_seq START 1;

-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id),
    
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
    line_total DECIMAL(10,2) GENERATED ALWAYS AS (unit_price * quantity) STORED,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_retailer ON purchase_orders(retailer_tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created ON purchase_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order ON purchase_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product ON purchase_order_items(product_id);

-- Enable Row Level Security
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for purchase_orders
CREATE POLICY purchase_orders_isolation ON purchase_orders
    USING (
        retailer_tenant_id = current_setting('app.current_tenant_id', true)::uuid 
        OR supplier_tenant_id = current_setting('app.current_tenant_id', true)::uuid
    );

-- Create RLS policies for purchase_order_items  
CREATE POLICY purchase_order_items_isolation ON purchase_order_items
    USING (
        order_id IN (
            SELECT id FROM purchase_orders 
            WHERE retailer_tenant_id = current_setting('app.current_tenant_id', true)::uuid 
               OR supplier_tenant_id = current_setting('app.current_tenant_id', true)::uuid
        )
    );

-- ====================================================================================
-- STEP 5: CREATE BUSINESS INTELLIGENCE VIEWS
-- ====================================================================================

-- Business partnerships view
CREATE OR REPLACE VIEW business_partnerships AS
SELECT 
    r.id as retailer_id,
    r.name as retailer_name,
    r.subdomain as retailer_subdomain,
    w.id as wholesaler_id,
    w.name as wholesaler_name,
    w.subdomain as wholesaler_subdomain,
    w.supplier_settings->>'minimum_order_amount' as minimum_order,
    w.supplier_settings->>'payment_terms' as payment_terms
FROM tenants r
CROSS JOIN tenants w  
WHERE r.business_type = 'retailer' 
  AND w.business_type = 'wholesaler'
  AND r.status = 'active' 
  AND w.status = 'active';

-- Retailer tenants view
CREATE OR REPLACE VIEW retailer_tenants AS
SELECT 
    id, name, subdomain, email, plan, status, 
    billing_status, access_mode, created_at
FROM tenants 
WHERE business_type = 'retailer';

-- Wholesaler tenants view  
CREATE OR REPLACE VIEW wholesaler_tenants AS
SELECT 
    id, name, subdomain, email, plan, status, 
    billing_status, access_mode, supplier_settings, created_at
FROM tenants 
WHERE business_type = 'wholesaler';

-- Purchase orders summary view
CREATE OR REPLACE VIEW purchase_orders_summary AS
SELECT 
    po.id,
    po.order_number,
    po.status,
    po.created_at,
    po.total_amount,
    rt.name as retailer_name,
    rt.subdomain as retailer_subdomain,
    ru.name as retailer_user_name,
    st.name as supplier_name,
    st.subdomain as supplier_subdomain,
    su.name as supplier_user_name,
    COALESCE(poi.item_count, 0) as item_count,
    po.estimated_delivery_date,
    po.payment_due_date,
    po.payment_status
FROM purchase_orders po
LEFT JOIN tenants rt ON po.retailer_tenant_id = rt.id
LEFT JOIN tenants st ON po.supplier_tenant_id = st.id  
LEFT JOIN users ru ON po.retailer_user_id = ru.id
LEFT JOIN users su ON po.supplier_user_id = su.id
LEFT JOIN (
    SELECT order_id, COUNT(*) as item_count 
    FROM purchase_order_items 
    GROUP BY order_id
) poi ON po.id = poi.order_id;

-- Financial analytics view
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

-- ====================================================================================
-- MIGRATION COMPLETE
-- ====================================================================================

-- Verify migration success
DO $$
DECLARE
    tenant_count INTEGER;
    supplier_count INTEGER;
    user_count INTEGER;
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO tenant_count FROM tenants;
    SELECT COUNT(*) INTO supplier_count FROM tenants WHERE business_type = 'wholesaler';
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO table_count FROM information_schema.tables WHERE table_schema = 'public';
    
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'GCP PRODUCTION MIGRATION COMPLETED SUCCESSFULLY';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Total tenants: %', tenant_count;
    RAISE NOTICE 'Supplier tenants: %', supplier_count;
    RAISE NOTICE 'Total users: %', user_count;
    RAISE NOTICE 'Total tables: %', table_count;
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Multi-tenant B2B marketplace is ready!';
END $$;
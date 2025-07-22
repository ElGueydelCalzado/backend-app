-- COMPLETE MULTI-TENANT MIGRATION
-- Add missing tenant_id column and complete purchase orders setup

-- =====================================================================================
-- STEP 1: Add tenant_id to products table
-- =====================================================================================

-- Add tenant_id column to products table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'tenant_id') THEN
        -- Add the column
        ALTER TABLE products ADD COLUMN tenant_id UUID;
        
        -- Create index
        CREATE INDEX idx_products_tenant_id ON products(tenant_id);
        
        -- Get the main retailer tenant (EGDC or first retailer)
        DECLARE
            main_tenant_id UUID;
        BEGIN
            SELECT id INTO main_tenant_id 
            FROM tenants 
            WHERE business_type = 'retailer' OR name ILIKE '%egdc%'
            LIMIT 1;
            
            -- If no retailer found, create one
            IF main_tenant_id IS NULL THEN
                INSERT INTO tenants (
                    name, subdomain, email, plan, status, business_type, 
                    access_mode, billing_status
                ) VALUES (
                    'EGDC Retailer', 'egdc', 'admin@elgueydelcalzado.com', 
                    'business', 'active', 'retailer', 'full_access', 'active'
                ) RETURNING id INTO main_tenant_id;
            END IF;
            
            -- Assign all existing products to the main tenant
            UPDATE products SET tenant_id = main_tenant_id WHERE tenant_id IS NULL;
            
            -- Add foreign key constraint
            ALTER TABLE products ADD CONSTRAINT products_tenant_id_fkey 
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
            
            -- Make tenant_id required
            ALTER TABLE products ALTER COLUMN tenant_id SET NOT NULL;
            
            RAISE NOTICE 'Added tenant_id column and assigned % products to main tenant', 
                (SELECT COUNT(*) FROM products);
        END;
    ELSE
        RAISE NOTICE 'tenant_id column already exists in products table';
    END IF;
END $$;

-- =====================================================================================
-- STEP 2: Create purchase orders system (if not exists)
-- =====================================================================================

-- Create sequence for order numbers (if not exists)
CREATE SEQUENCE IF NOT EXISTS purchase_order_seq START 1;

-- Create purchase_orders table (if not exists)
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

-- Create purchase_order_items table (if not exists)
CREATE TABLE IF NOT EXISTS purchase_order_items (
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
    line_total DECIMAL(10,2) GENERATED ALWAYS AS (unit_price * quantity) STORED,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_purchase_orders_retailer ON purchase_orders(retailer_tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created ON purchase_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order ON purchase_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product ON purchase_order_items(product_id);

-- Enable Row Level Security (if not enabled)
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_orders' AND policyname = 'purchase_orders_isolation') THEN
        CREATE POLICY purchase_orders_isolation ON purchase_orders
            USING (
                retailer_tenant_id = current_setting('app.current_tenant_id', true)::uuid 
                OR supplier_tenant_id = current_setting('app.current_tenant_id', true)::uuid
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_order_items' AND policyname = 'purchase_order_items_isolation') THEN
        CREATE POLICY purchase_order_items_isolation ON purchase_order_items
            USING (
                order_id IN (
                    SELECT id FROM purchase_orders 
                    WHERE retailer_tenant_id = current_setting('app.current_tenant_id', true)::uuid 
                       OR supplier_tenant_id = current_setting('app.current_tenant_id', true)::uuid
                )
            );
    END IF;
END $$;

-- =====================================================================================
-- STEP 3: Enable Row Level Security on products table
-- =====================================================================================

-- Enable RLS on products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for products (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'products_tenant_isolation') THEN
        CREATE POLICY products_tenant_isolation ON products
            USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

-- =====================================================================================
-- STEP 4: Create or update constraint for unique SKU per tenant
-- =====================================================================================

-- Drop existing unique constraint on SKU if it exists (for single tenant)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'products_sku_key') THEN
        ALTER TABLE products DROP CONSTRAINT products_sku_key;
        RAISE NOTICE 'Dropped single-tenant SKU constraint';
    END IF;
    
    -- Add multi-tenant unique constraint (SKU unique per tenant)
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'products_sku_tenant_unique') THEN
        ALTER TABLE products ADD CONSTRAINT products_sku_tenant_unique UNIQUE (sku, tenant_id);
        RAISE NOTICE 'Added multi-tenant SKU constraint';
    END IF;
END $$;

-- =====================================================================================
-- STEP 5: Create sample supplier products (for testing)
-- =====================================================================================

DO $$
DECLARE
    fami_tenant_id UUID;
    osiel_tenant_id UUID;
    molly_tenant_id UUID;
BEGIN
    -- Get supplier tenant IDs
    SELECT id INTO fami_tenant_id FROM tenants WHERE subdomain = 'fami';
    SELECT id INTO osiel_tenant_id FROM tenants WHERE subdomain = 'osiel';
    SELECT id INTO molly_tenant_id FROM tenants WHERE subdomain = 'molly';
    
    -- Add sample products for FAMI (if not exists)
    IF fami_tenant_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM products WHERE tenant_id = fami_tenant_id) THEN
        INSERT INTO products (
            tenant_id, categoria, marca, modelo, color, talla, sku, costo, 
            inv_fami, shein_modifier, shopify_modifier, meli_modifier
        ) VALUES 
        (fami_tenant_id, 'Tacones', 'FAMI Collection', 'Elegance Heel', 'Negro', '6', 'FAMI-EH-NEG-6', 450.00, 25, 1.6, 1.9, 2.2),
        (fami_tenant_id, 'Tacones', 'FAMI Collection', 'Elegance Heel', 'Rojo', '7', 'FAMI-EH-ROJ-7', 450.00, 18, 1.6, 1.9, 2.2),
        (fami_tenant_id, 'Sandalias', 'FAMI Comfort', 'Summer Vibes', 'Beige', '8', 'FAMI-SV-BEI-8', 320.00, 30, 1.5, 1.8, 2.1),
        (fami_tenant_id, 'Botas', 'FAMI Boots', 'Winter Style', 'Café', '9', 'FAMI-WS-CAF-9', 680.00, 12, 1.7, 2.0, 2.3);
        
        RAISE NOTICE 'Added sample products for FAMI';
    END IF;
    
    -- Add sample products for Osiel (if not exists)
    IF osiel_tenant_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM products WHERE tenant_id = osiel_tenant_id) THEN
        INSERT INTO products (
            tenant_id, categoria, marca, modelo, color, talla, sku, costo, 
            inv_osiel, shein_modifier, shopify_modifier, meli_modifier
        ) VALUES 
        (osiel_tenant_id, 'Deportivos', 'Osiel Sports', 'Runner Pro', 'Blanco', '8', 'OSIEL-RP-BLA-8', 380.00, 40, 1.4, 1.7, 2.0),
        (osiel_tenant_id, 'Deportivos', 'Osiel Sports', 'Runner Pro', 'Negro', '9', 'OSIEL-RP-NEG-9', 380.00, 35, 1.4, 1.7, 2.0),
        (osiel_tenant_id, 'Casual', 'Osiel Casual', 'Street Walker', 'Azul', '7', 'OSIEL-SW-AZU-7', 290.00, 50, 1.3, 1.6, 1.9),
        (osiel_tenant_id, 'Casual', 'Osiel Casual', 'Street Walker', 'Gris', '10', 'OSIEL-SW-GRI-10', 290.00, 28, 1.3, 1.6, 1.9),
        (osiel_tenant_id, 'Deportivos', 'Osiel Performance', 'Marathon Elite', 'Verde', '8.5', 'OSIEL-ME-VER-85', 520.00, 22, 1.5, 1.8, 2.1);
        
        RAISE NOTICE 'Added sample products for Osiel';
    END IF;
    
    -- Add sample products for Molly (if not exists)
    IF molly_tenant_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM products WHERE tenant_id = molly_tenant_id) THEN
        INSERT INTO products (
            tenant_id, categoria, marca, modelo, color, talla, sku, costo, 
            inv_molly, shein_modifier, shopify_modifier, meli_modifier
        ) VALUES 
        (molly_tenant_id, 'Flats', 'Molly Comfort', 'All Day Easy', 'Rosa', '6', 'MOLLY-ADE-ROS-6', 220.00, 45, 1.4, 1.7, 2.0),
        (molly_tenant_id, 'Flats', 'Molly Comfort', 'All Day Easy', 'Negro', '7', 'MOLLY-ADE-NEG-7', 220.00, 38, 1.4, 1.7, 2.0),
        (molly_tenant_id, 'Casual', 'Molly Style', 'Urban Chic', 'Blanco', '8', 'MOLLY-UC-BLA-8', 350.00, 32, 1.5, 1.8, 2.1),
        (molly_tenant_id, 'Sandals', 'Molly Summer', 'Beach Ready', 'Dorado', '9', 'MOLLY-BR-DOR-9', 180.00, 60, 1.3, 1.6, 1.9);
        
        RAISE NOTICE 'Added sample products for Molly';
    END IF;
END $$;

-- =====================================================================================
-- MIGRATION VERIFICATION
-- =====================================================================================

DO $$
DECLARE
    tenant_count INTEGER;
    product_count INTEGER;
    supplier_product_count INTEGER;
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO tenant_count FROM tenants;
    SELECT COUNT(*) INTO product_count FROM products;
    SELECT COUNT(*) INTO supplier_product_count FROM products WHERE tenant_id IN (SELECT id FROM tenants WHERE business_type = 'wholesaler');
    SELECT COUNT(*) INTO table_count FROM information_schema.tables WHERE table_schema = 'public';
    
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'MULTI-TENANT MIGRATION COMPLETED SUCCESSFULLY';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Total tenants: %', tenant_count;
    RAISE NOTICE 'Total products: %', product_count;
    RAISE NOTICE 'Supplier products: %', supplier_product_count;
    RAISE NOTICE 'Total tables: %', table_count;
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'B2B Multi-tenant marketplace is ready!';
    RAISE NOTICE 'All systems: ✅ OPERATIONAL';
END $$;
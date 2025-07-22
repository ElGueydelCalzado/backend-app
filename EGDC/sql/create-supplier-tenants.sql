-- EGDC Marketplace Evolution: Task 1.2
-- Create Real Supplier Tenant Accounts
-- Creates FAMI, Osiel, and Molly as actual wholesaler tenants

BEGIN;

-- =============================================
-- 1. CREATE REAL SUPPLIER TENANT ACCOUNTS
-- =============================================

INSERT INTO tenants (
    id, 
    name, 
    subdomain, 
    email, 
    phone, 
    address,
    business_type, 
    access_mode, 
    plan, 
    status, 
    billing_status,
    supplier_settings, 
    currency, 
    timezone,
    created_at
) VALUES 

-- FAMI Wholesale - Established footwear distributor in Guadalajara
(
    gen_random_uuid(),
    'FAMI Wholesale', 
    'fami', 
    'admin@fami-wholesale.com',
    '+52-33-1234-5678',
    'Av. Vallarta 1234, Col. Americana, Guadalajara, Jalisco 44100, México',
    'wholesaler',
    'inventory_management',
    'professional',
    'active',
    'trial',
    '{
        "wholesale_pricing": true,
        "minimum_order": 5,
        "minimum_order_value": 500.00,
        "shipping_zones": ["Mexico", "Central America"],
        "payment_terms": "Net 30",
        "bulk_discounts": {
            "10+": 0.05,
            "50+": 0.10,
            "100+": 0.15
        },
        "specialties": ["Athletic Footwear", "Work Boots", "Casual Shoes"],
        "catalog_description": "Premier distributor of athletic and work footwear in Western Mexico",
        "lead_time_days": 7,
        "return_policy": "30 days for defective items",
        "accepts_purchase_orders": true
    }'::jsonb,
    'MXN',
    'America/Mexico_City',
    '2024-01-15 10:00:00-06'::timestamptz
),

-- Osiel Wholesale - Regional distributor specializing in work boots
(
    gen_random_uuid(),
    'Osiel Distribuciones', 
    'osiel', 
    'ventas@osiel-distribuciones.mx',
    '+52-55-8765-4321',
    'Calle Industria 567, Col. Industrial, Ciudad de México 08830, México',
    'wholesaler',
    'inventory_management',
    'professional',
    'active',
    'trial',
    '{
        "wholesale_pricing": true,
        "minimum_order": 3,
        "minimum_order_value": 300.00,
        "shipping_zones": ["Mexico"],
        "payment_terms": "Net 15",
        "bulk_discounts": {
            "5+": 0.03,
            "25+": 0.08,
            "75+": 0.12
        },
        "specialties": ["Work Boots", "Safety Footwear", "Industrial Shoes"],
        "catalog_description": "Specialized in durable work boots and safety footwear for industries",
        "lead_time_days": 5,
        "return_policy": "15 days for defective items, strict quality control",
        "accepts_purchase_orders": true,
        "certifications": ["ISO 9001", "STPS Safety Standards"]
    }'::jsonb,
    'MXN',
    'America/Mexico_City',
    '2024-02-01 14:30:00-06'::timestamptz
),

-- Molly Shoes - Boutique supplier focusing on fashion and comfort
(
    gen_random_uuid(),
    'Molly Shoes Distribution', 
    'molly', 
    'orders@mollyshoes.com.mx',
    '+52-81-2468-1357',
    'Av. Constitución 890, Centro, Monterrey, Nuevo León 64000, México',
    'wholesaler',
    'inventory_management',
    'starter',
    'active',
    'trial',
    '{
        "wholesale_pricing": true,
        "minimum_order": 2,
        "minimum_order_value": 200.00,
        "shipping_zones": ["Mexico", "United States"],
        "payment_terms": "Net 15",
        "bulk_discounts": {
            "6+": 0.04,
            "20+": 0.09,
            "50+": 0.14
        },
        "specialties": ["Fashion Footwear", "Comfort Shoes", "Sandals"],
        "catalog_description": "Curated selection of fashionable and comfortable footwear",
        "lead_time_days": 10,
        "return_policy": "30 days exchange policy, customer satisfaction guaranteed",
        "accepts_purchase_orders": true,
        "brand_partnerships": ["Birkenstock", "Havaianas", "Select Fashion Brands"]
    }'::jsonb,
    'MXN',
    'America/Mexico_City',
    '2024-02-15 09:15:00-06'::timestamptz
)

ON CONFLICT (subdomain) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    business_type = EXCLUDED.business_type,
    access_mode = EXCLUDED.access_mode,
    plan = EXCLUDED.plan,
    status = EXCLUDED.status,
    billing_status = EXCLUDED.billing_status,
    supplier_settings = EXCLUDED.supplier_settings,
    updated_at = NOW();

-- =============================================
-- 2. CREATE SAMPLE INVENTORY FOR SUPPLIERS
-- =============================================

-- Get supplier tenant IDs for inventory assignment
DO $$
DECLARE
    fami_tenant_id UUID;
    osiel_tenant_id UUID;
    molly_tenant_id UUID;
    product_record RECORD;
BEGIN
    -- Get the actual tenant IDs from the database
    SELECT id INTO fami_tenant_id FROM tenants WHERE subdomain = 'fami';
    SELECT id INTO osiel_tenant_id FROM tenants WHERE subdomain = 'osiel';
    SELECT id INTO molly_tenant_id FROM tenants WHERE subdomain = 'molly';
    
    -- Create supplier-specific inventory by copying existing products with modified data
    
    -- FAMI: Athletic and work boots (higher inventory)
    FOR product_record IN 
        SELECT * FROM products 
        WHERE categoria IN ('Botas', 'Zapatos') 
        AND marca IN ('Nike', 'Adidas', 'Caterpillar', 'Timberland')
        LIMIT 8
    LOOP
        INSERT INTO products (
            tenant_id, fecha, categoria, marca, modelo, color, talla, sku, ean,
            costo, shein_modifier, shopify_modifier, meli_modifier,
            inv_egdc, inv_fami, inv_osiel, inv_molly,
            shein, meli, shopify, tiktok, upseller, go_trendier, google_drive,
            created_at
        ) VALUES (
            fami_tenant_id,
            product_record.fecha,
            product_record.categoria,
            product_record.marca,
            product_record.modelo,
            product_record.color,
            product_record.talla,
            'FAMI-' || substring(product_record.sku from 1 for 10),
            'FMI' || substring(product_record.ean from 1 for 10),
            product_record.costo * 0.85, -- Wholesale cost (15% lower)
            1.0, -- Base modifiers for wholesale
            1.0,
            1.0,
            0, -- No EGDC inventory for supplier products
            floor(random() * 50 + 25), -- FAMI: 25-75 units
            0,
            0,
            false, false, false, false, false, false, false,
            NOW() - interval '30 days' * random()
        );
    END LOOP;
    
    -- OSIEL: Work boots and safety footwear (medium inventory)
    FOR product_record IN 
        SELECT * FROM products 
        WHERE categoria = 'Botas' 
        AND marca IN ('Caterpillar', 'Timberland', 'Dr. Martens')
        LIMIT 5
    LOOP
        INSERT INTO products (
            tenant_id, fecha, categoria, marca, modelo, color, talla, sku, ean,
            costo, shein_modifier, shopify_modifier, meli_modifier,
            inv_egdc, inv_fami, inv_osiel, inv_molly,
            shein, meli, shopify, tiktok, upseller, go_trendier, google_drive,
            created_at
        ) VALUES (
            osiel_tenant_id,
            product_record.fecha,
            product_record.categoria,
            product_record.marca,
            product_record.modelo,
            product_record.color,
            product_record.talla,
            'OSL-' || substring(product_record.sku from 1 for 10),
            'OSL' || substring(product_record.ean from 1 for 10),
            product_record.costo * 0.80, -- Better wholesale cost (20% lower)
            1.0,
            1.0,
            1.0,
            0,
            0,
            floor(random() * 30 + 15), -- OSIEL: 15-45 units
            0,
            false, false, false, false, false, false, false,
            NOW() - interval '45 days' * random()
        );
    END LOOP;
    
    -- MOLLY: Fashion and comfort shoes (smaller inventory, premium)
    FOR product_record IN 
        SELECT * FROM products 
        WHERE categoria IN ('Sandalias', 'Zapatos') 
        AND marca IN ('Birkenstock', 'Havaianas', 'Vans', 'Converse')
        LIMIT 6
    LOOP
        INSERT INTO products (
            tenant_id, fecha, categoria, marca, modelo, color, talla, sku, ean,
            costo, shein_modifier, shopify_modifier, meli_modifier,
            inv_egdc, inv_fami, inv_osiel, inv_molly,
            shein, meli, shopify, tiktok, upseller, go_trendier, google_drive,
            created_at
        ) VALUES (
            molly_tenant_id,
            product_record.fecha,
            product_record.categoria,
            product_record.marca,
            product_record.modelo,
            product_record.color,
            product_record.talla,
            'MLY-' || substring(product_record.sku from 1 for 10),
            'MLY' || substring(product_record.ean from 1 for 10),
            product_record.costo * 0.90, -- Premium wholesale (10% lower)
            1.0,
            1.0,
            1.0,
            0,
            0,
            0,
            floor(random() * 20 + 10), -- MOLLY: 10-30 units
            false, false, false, false, false, false, false,
            NOW() - interval '20 days' * random()
        );
    END LOOP;
    
    RAISE NOTICE 'Created sample inventory for all suppliers';
END $$;

-- =============================================
-- 3. UPDATE TRIAL PERIODS
-- =============================================

-- Set trial end dates (30 days from now for realistic testing)
UPDATE tenants 
SET trial_ends_at = NOW() + interval '30 days'
WHERE business_type = 'wholesaler' AND billing_status = 'trial';

COMMIT;

-- =============================================
-- 4. VERIFICATION QUERIES
-- =============================================

-- Verify all supplier tenants created
SELECT 
    name,
    subdomain,
    email,
    business_type,
    access_mode,
    plan,
    billing_status,
    supplier_settings->>'minimum_order' as min_order,
    supplier_settings->>'payment_terms' as payment_terms,
    supplier_settings->'specialties' as specialties
FROM tenants
WHERE business_type = 'wholesaler'
ORDER BY created_at;

-- Verify supplier inventory counts
SELECT 
    t.name as supplier_name,
    t.subdomain,
    COUNT(p.id) as product_count,
    SUM(CASE 
        WHEN t.subdomain = 'fami' THEN p.inv_fami
        WHEN t.subdomain = 'osiel' THEN p.inv_osiel  
        WHEN t.subdomain = 'molly' THEN p.inv_molly
        ELSE 0
    END) as total_inventory,
    STRING_AGG(DISTINCT p.categoria, ', ') as categories,
    STRING_AGG(DISTINCT p.marca, ', ') as brands
FROM tenants t
LEFT JOIN products p ON t.id = p.tenant_id
WHERE t.business_type = 'wholesaler'
GROUP BY t.id, t.name, t.subdomain
ORDER BY t.name;

-- Verify trial periods
SELECT 
    name,
    subdomain,
    billing_status,
    trial_ends_at,
    EXTRACT(days FROM (trial_ends_at - NOW())) as days_remaining
FROM tenants
WHERE business_type = 'wholesaler';

-- =============================================
-- NOTES FOR IMPLEMENTATION
-- =============================================

/*
This script creates:
1. ✅ Three real supplier tenant accounts with unique UUIDs
2. ✅ Realistic business information for each supplier
3. ✅ Detailed supplier settings with pricing, terms, and specialties
4. ✅ Sample inventory for each supplier based on their specialties
5. ✅ Trial periods set for 30 days for realistic testing

Supplier Profiles:
- FAMI: Large athletic/work footwear distributor (high volume, good discounts)
- Osiel: Specialized work boots supplier (medium volume, fast delivery)
- Molly: Boutique fashion footwear (low volume, premium brands)

Next steps:
- Verify data with queries above
- Proceed to Task 1.3: Create Supplier User Accounts
- Test supplier login and inventory access
*/
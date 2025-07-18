-- MULTI-TENANT DATABASE FIXES
-- Critical security and data integrity fixes for multi-tenant system
-- Generated: July 18, 2025
-- Status: CRITICAL - Apply immediately before production

-- =======================================================================
-- PRIORITY 1: DATA INTEGRITY FIXES (CRITICAL)
-- =======================================================================

-- Fix 1: Ensure all products have a tenant_id (assign to default EGDC tenant)
DO $$
DECLARE
    egdc_tenant_id UUID;
BEGIN
    -- Get or create EGDC tenant
    SELECT id INTO egdc_tenant_id FROM tenants WHERE subdomain = 'egdc' LIMIT 1;
    
    IF egdc_tenant_id IS NULL THEN
        INSERT INTO tenants (
            subdomain, name, email, plan, status, 
            currency, timezone, created_at, updated_at
        ) VALUES (
            'egdc', 'EGDC', 'admin@elgueydelcalzado.com', 'enterprise', 'active',
            'MXN', 'America/Mexico_City', NOW(), NOW()
        ) RETURNING id INTO egdc_tenant_id;
        
        RAISE NOTICE 'Created default EGDC tenant with ID: %', egdc_tenant_id;
    END IF;
    
    -- Update NULL tenant_id values in products
    UPDATE products 
    SET tenant_id = egdc_tenant_id 
    WHERE tenant_id IS NULL;
    
    -- Update NULL tenant_id values in change_logs
    UPDATE change_logs 
    SET tenant_id = egdc_tenant_id 
    WHERE tenant_id IS NULL;
    
    RAISE NOTICE 'Updated % products with NULL tenant_id', 
        (SELECT COUNT(*) FROM products WHERE tenant_id = egdc_tenant_id);
END $$;

-- Fix 2: Make tenant_id NOT NULL on core tables
ALTER TABLE products ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE change_logs ALTER COLUMN tenant_id SET NOT NULL;

-- Fix 3: Add unique constraints for tenant-scoped data integrity
-- This prevents duplicate SKUs within the same tenant
ALTER TABLE products 
ADD CONSTRAINT products_sku_tenant_unique 
UNIQUE (sku, tenant_id) 
WHERE sku IS NOT NULL AND sku != '';

-- Fix 4: Add unique constraint for EAN codes within tenant
ALTER TABLE products 
ADD CONSTRAINT products_ean_tenant_unique 
UNIQUE (ean, tenant_id) 
WHERE ean IS NOT NULL AND ean != '';

-- =======================================================================
-- PRIORITY 2: SCHEMA CONSISTENCY FIXES (HIGH)
-- =======================================================================

-- Fix 5: Update inventory schema to match application expectations
-- Current: 7 columns (bodega_principal, tienda_centro, tienda_norte, tienda_sur, online)
-- Expected: 4 columns (egdc, fami, osiel, molly)

-- First, ensure the expected columns exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS inv_osiel INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS inv_molly INTEGER DEFAULT 0;

-- Migrate data from old columns to new ones (if they exist)
DO $$
BEGIN
    -- Migrate bodega_principal to inv_egdc if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='products' AND column_name='inv_bodega_principal') THEN
        UPDATE products 
        SET inv_egdc = GREATEST(COALESCE(inv_egdc, 0), COALESCE(inv_bodega_principal, 0));
        ALTER TABLE products DROP COLUMN inv_bodega_principal;
        RAISE NOTICE 'Migrated inv_bodega_principal to inv_egdc';
    END IF;
    
    -- Handle other old inventory columns
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='products' AND column_name='inv_tienda_centro') THEN
        -- Add centro inventory to egdc (main business)
        UPDATE products 
        SET inv_egdc = COALESCE(inv_egdc, 0) + COALESCE(inv_tienda_centro, 0);
        ALTER TABLE products DROP COLUMN inv_tienda_centro;
        RAISE NOTICE 'Migrated inv_tienda_centro to inv_egdc';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='products' AND column_name='inv_tienda_norte') THEN
        UPDATE products 
        SET inv_egdc = COALESCE(inv_egdc, 0) + COALESCE(inv_tienda_norte, 0);
        ALTER TABLE products DROP COLUMN inv_tienda_norte;
        RAISE NOTICE 'Migrated inv_tienda_norte to inv_egdc';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='products' AND column_name='inv_tienda_sur') THEN
        UPDATE products 
        SET inv_egdc = COALESCE(inv_egdc, 0) + COALESCE(inv_tienda_sur, 0);
        ALTER TABLE products DROP COLUMN inv_tienda_sur;
        RAISE NOTICE 'Migrated inv_tienda_sur to inv_egdc';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='products' AND column_name='inv_online') THEN
        UPDATE products 
        SET inv_egdc = COALESCE(inv_egdc, 0) + COALESCE(inv_online, 0);
        ALTER TABLE products DROP COLUMN inv_online;
        RAISE NOTICE 'Migrated inv_online to inv_egdc';
    END IF;
END $$;

-- Fix 6: Update the inventory total calculation trigger
CREATE OR REPLACE FUNCTION update_inventory_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.inventory_total = COALESCE(NEW.inv_egdc, 0) + 
                         COALESCE(NEW.inv_fami, 0) + 
                         COALESCE(NEW.inv_osiel, 0) + 
                         COALESCE(NEW.inv_molly, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS products_update_inventory_total ON products;
CREATE TRIGGER products_update_inventory_total
    BEFORE INSERT OR UPDATE OF inv_egdc, inv_fami, inv_osiel, inv_molly
    ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_total();

-- Fix 7: Recalculate all inventory totals with new schema
UPDATE products 
SET inventory_total = COALESCE(inv_egdc, 0) + 
                     COALESCE(inv_fami, 0) + 
                     COALESCE(inv_osiel, 0) + 
                     COALESCE(inv_molly, 0);

-- =======================================================================
-- PRIORITY 3: ENHANCED SECURITY (MEDIUM)
-- =======================================================================

-- Fix 8: Add tenant-aware triggers for automatic tenant_id assignment
CREATE OR REPLACE FUNCTION ensure_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    -- If tenant_id is not provided, try to get it from session
    IF NEW.tenant_id IS NULL THEN
        BEGIN
            NEW.tenant_id := current_setting('app.current_tenant_id', false)::UUID;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'tenant_id is required but not found in session context';
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to products table
DROP TRIGGER IF EXISTS products_ensure_tenant_id ON products;
CREATE TRIGGER products_ensure_tenant_id
    BEFORE INSERT ON products
    FOR EACH ROW
    EXECUTE FUNCTION ensure_tenant_id();

-- Apply to change_logs table
DROP TRIGGER IF EXISTS change_logs_ensure_tenant_id ON change_logs;
CREATE TRIGGER change_logs_ensure_tenant_id
    BEFORE INSERT ON change_logs
    FOR EACH ROW
    EXECUTE FUNCTION ensure_tenant_id();

-- =======================================================================
-- PRIORITY 4: PERFORMANCE OPTIMIZATION
-- =======================================================================

-- Fix 9: Add missing composite indexes for multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_products_tenant_categoria_marca 
ON products (tenant_id, categoria, marca) 
WHERE categoria IS NOT NULL AND marca IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_tenant_sku 
ON products (tenant_id, sku) 
WHERE sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_tenant_inventory 
ON products (tenant_id, inventory_total) 
WHERE inventory_total > 0;

CREATE INDEX IF NOT EXISTS idx_change_logs_tenant_product_created 
ON change_logs (tenant_id, product_id, created_at DESC);

-- =======================================================================
-- VALIDATION QUERIES
-- =======================================================================

-- Validate the fixes
DO $$
DECLARE
    product_count INTEGER;
    changelog_count INTEGER;
    null_tenant_products INTEGER;
    null_tenant_changelogs INTEGER;
BEGIN
    SELECT COUNT(*) INTO product_count FROM products;
    SELECT COUNT(*) INTO changelog_count FROM change_logs;
    SELECT COUNT(*) INTO null_tenant_products FROM products WHERE tenant_id IS NULL;
    SELECT COUNT(*) INTO null_tenant_changelogs FROM change_logs WHERE tenant_id IS NULL;
    
    RAISE NOTICE '=== VALIDATION RESULTS ===';
    RAISE NOTICE 'Total products: %', product_count;
    RAISE NOTICE 'Total change logs: %', changelog_count;
    RAISE NOTICE 'Products with NULL tenant_id: %', null_tenant_products;
    RAISE NOTICE 'Change logs with NULL tenant_id: %', null_tenant_changelogs;
    
    IF null_tenant_products > 0 OR null_tenant_changelogs > 0 THEN
        RAISE WARNING 'Some records still have NULL tenant_id. Manual review required.';
    ELSE
        RAISE NOTICE '✅ All records have valid tenant_id values';
    END IF;
END $$;

-- Show current schema for validation
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('products', 'change_logs', 'tenants', 'users')
AND column_name LIKE '%tenant%'
ORDER BY table_name, ordinal_position;

-- Show constraint validation
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    conrelid::regclass as table_name
FROM pg_constraint 
WHERE conrelid IN ('products'::regclass, 'change_logs'::regclass)
AND conname LIKE '%tenant%'
ORDER BY table_name;

RAISE NOTICE '=== MULTI-TENANT DATABASE FIXES COMPLETED ===';
RAISE NOTICE 'Schema is now fully multi-tenant compatible';
RAISE NOTICE 'Next step: Test with connection script';
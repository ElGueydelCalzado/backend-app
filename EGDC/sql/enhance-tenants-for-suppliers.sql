-- EGDC Marketplace Evolution: Task 1.1
-- Enhance Tenants Table for Supplier/Retailer Business Types
-- This migration adds columns to support B2B marketplace functionality

BEGIN;

-- =============================================
-- 1. ADD NEW COLUMNS TO TENANTS TABLE
-- =============================================

-- Add business type classification
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_type VARCHAR(20) DEFAULT 'retailer';

-- Add access mode for different user experiences
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS access_mode VARCHAR(20) DEFAULT 'full_access';

-- Add supplier-specific settings
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS supplier_settings JSONB DEFAULT '{}';

-- Add billing status for subscription management
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_status VARCHAR(20) DEFAULT 'trial';

-- =============================================
-- 2. ADD CONSTRAINTS AND VALIDATION
-- =============================================

-- Ensure business_type has valid values
ALTER TABLE tenants ADD CONSTRAINT check_business_type 
    CHECK (business_type IN ('retailer', 'wholesaler', 'distributor'));

-- Ensure access_mode has valid values
ALTER TABLE tenants ADD CONSTRAINT check_access_mode 
    CHECK (access_mode IN ('full_access', 'inventory_management', 'catalog_browse', 'order_only'));

-- Ensure billing_status has valid values
ALTER TABLE tenants ADD CONSTRAINT check_billing_status 
    CHECK (billing_status IN ('trial', 'active', 'suspended', 'cancelled'));

-- =============================================
-- 3. UPDATE EXISTING EGDC TENANT
-- =============================================

-- Classify existing EGDC tenant as retailer with full access
UPDATE tenants 
SET business_type = 'retailer', 
    access_mode = 'full_access',
    billing_status = 'active',
    supplier_settings = '{
        "accepts_purchase_orders": true,
        "minimum_order_value": 0,
        "payment_terms": "immediate",
        "shipping_zones": ["Mexico"]
    }'::jsonb
WHERE subdomain = 'egdc';

-- =============================================
-- 4. CREATE PERFORMANCE INDEXES
-- =============================================

-- Index for business type queries
CREATE INDEX IF NOT EXISTS idx_tenants_business_type ON tenants(business_type);

-- Index for access mode queries  
CREATE INDEX IF NOT EXISTS idx_tenants_access_mode ON tenants(access_mode);

-- Index for billing status queries
CREATE INDEX IF NOT EXISTS idx_tenants_billing_status ON tenants(billing_status);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_tenants_type_status ON tenants(business_type, billing_status);

-- =============================================
-- 5. UPDATE TRIGGER FOR SUPPLIER_SETTINGS
-- =============================================

-- Function to validate supplier settings JSON structure
CREATE OR REPLACE FUNCTION validate_supplier_settings()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate required fields for wholesaler business type
    IF NEW.business_type = 'wholesaler' THEN
        -- Ensure minimum required fields exist
        IF NOT (NEW.supplier_settings ? 'minimum_order' AND 
                NEW.supplier_settings ? 'payment_terms' AND 
                NEW.supplier_settings ? 'shipping_zones') THEN
            RAISE EXCEPTION 'Wholesaler tenants must have minimum_order, payment_terms, and shipping_zones in supplier_settings';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate supplier settings
DROP TRIGGER IF EXISTS trigger_validate_supplier_settings ON tenants;
CREATE TRIGGER trigger_validate_supplier_settings
    BEFORE INSERT OR UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION validate_supplier_settings();

-- =============================================
-- 6. HELPFUL VIEWS FOR DEVELOPMENT
-- =============================================

-- View for retailer tenants
CREATE OR REPLACE VIEW retailer_tenants AS
SELECT 
    id,
    name,
    subdomain,
    email,
    plan,
    status,
    billing_status,
    access_mode,
    created_at
FROM tenants
WHERE business_type = 'retailer' AND status = 'active';

-- View for wholesaler tenants
CREATE OR REPLACE VIEW wholesaler_tenants AS
SELECT 
    id,
    name,
    subdomain,
    email,
    plan,
    status,
    billing_status,
    access_mode,
    supplier_settings,
    created_at
FROM tenants
WHERE business_type = 'wholesaler' AND status = 'active';

-- View for business relationships (future use)
CREATE OR REPLACE VIEW business_partnerships AS
SELECT 
    r.id as retailer_id,
    r.name as retailer_name,
    r.subdomain as retailer_subdomain,
    w.id as wholesaler_id,
    w.name as wholesaler_name,
    w.subdomain as wholesaler_subdomain,
    w.supplier_settings->>'minimum_order' as minimum_order,
    w.supplier_settings->>'payment_terms' as payment_terms
FROM retailer_tenants r
CROSS JOIN wholesaler_tenants w
WHERE r.billing_status = 'active' AND w.billing_status = 'active';

COMMIT;

-- =============================================
-- 7. VERIFICATION QUERIES
-- =============================================

-- Verify column additions
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'tenants' 
    AND column_name IN ('business_type', 'access_mode', 'supplier_settings', 'billing_status')
ORDER BY column_name;

-- Verify EGDC tenant update
SELECT 
    name,
    subdomain,
    business_type,
    access_mode,
    billing_status,
    supplier_settings
FROM tenants
WHERE subdomain = 'egdc';

-- Verify indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'tenants' 
    AND indexname LIKE '%business_type%' 
    OR indexname LIKE '%access_mode%' 
    OR indexname LIKE '%billing_status%';

-- Check constraints
SELECT 
    conname,
    contype,
    consrc
FROM pg_constraint
WHERE conrelid = 'tenants'::regclass
    AND conname LIKE 'check_%';

-- =============================================
-- ROLLBACK PLAN (IF NEEDED)
-- =============================================

/*
-- To rollback this migration:

BEGIN;

-- Drop triggers and functions
DROP TRIGGER IF EXISTS trigger_validate_supplier_settings ON tenants;
DROP FUNCTION IF EXISTS validate_supplier_settings();

-- Drop views
DROP VIEW IF EXISTS business_partnerships;
DROP VIEW IF EXISTS wholesaler_tenants;
DROP VIEW IF EXISTS retailer_tenants;

-- Drop indexes
DROP INDEX IF EXISTS idx_tenants_type_status;
DROP INDEX IF EXISTS idx_tenants_billing_status;
DROP INDEX IF EXISTS idx_tenants_access_mode;
DROP INDEX IF EXISTS idx_tenants_business_type;

-- Drop constraints
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS check_billing_status;
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS check_access_mode;
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS check_business_type;

-- Drop columns
ALTER TABLE tenants DROP COLUMN IF EXISTS billing_status;
ALTER TABLE tenants DROP COLUMN IF EXISTS supplier_settings;
ALTER TABLE tenants DROP COLUMN IF EXISTS access_mode;
ALTER TABLE tenants DROP COLUMN IF EXISTS business_type;

COMMIT;
*/

-- =============================================
-- NOTES FOR IMPLEMENTATION
-- =============================================

/*
This migration:
1. ✅ Adds new columns without affecting existing data
2. ✅ Properly classifies EGDC as retailer with full access
3. ✅ Creates performance indexes for new queries
4. ✅ Adds data validation for business logic
5. ✅ Provides helpful views for development
6. ✅ Includes rollback plan for safety

Next steps:
- Run this migration on staging first
- Verify EGDC functionality is preserved
- Test with `npx tsx scripts/test-connection.ts`
- Proceed to Task 1.2: Create Supplier Tenants
*/
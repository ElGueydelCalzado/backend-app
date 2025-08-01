-- DATABASE BUSINESS TYPE CORRECTION SCRIPT
-- Fix redirect loops caused by missing or incorrect business_type field
-- This script ensures EGDC users have correct business_type to prevent authentication loops

BEGIN;

-- ====================================================================================
-- STEP 1: ENSURE BUSINESS_TYPE COLUMN EXISTS ON TENANTS TABLE
-- ====================================================================================

DO $$ 
BEGIN
    -- Add business_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'business_type') THEN
        ALTER TABLE tenants ADD COLUMN business_type VARCHAR(20) DEFAULT 'retailer';
        RAISE NOTICE 'Added business_type column to tenants table';
    ELSE
        RAISE NOTICE 'business_type column already exists on tenants table';
    END IF;
END $$;

-- Add constraint to ensure valid business types
ALTER TABLE tenants 
    ADD CONSTRAINT IF NOT EXISTS check_business_type 
    CHECK (business_type IN ('retailer', 'wholesaler', 'supplier', 'hybrid'));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tenants_business_type ON tenants(business_type);

-- ====================================================================================
-- STEP 2: FIX EGDC TENANT BUSINESS_TYPE
-- ====================================================================================

-- Update EGDC tenant to have correct business_type
UPDATE tenants 
SET business_type = 'retailer', updated_at = NOW()
WHERE subdomain = 'egdc' 
  AND (business_type IS NULL OR business_type = '' OR business_type != 'retailer');

-- Verify EGDC tenant exists and has correct business_type
DO $$
DECLARE
    egdc_count INTEGER;
    egdc_business_type VARCHAR(20);
BEGIN
    -- Check if EGDC tenant exists
    SELECT COUNT(*), MAX(business_type) INTO egdc_count, egdc_business_type
    FROM tenants 
    WHERE subdomain = 'egdc';
    
    IF egdc_count = 0 THEN
        -- Create EGDC tenant if it doesn't exist
        INSERT INTO tenants (name, subdomain, email, business_type, plan, status)
        VALUES ('El Guey del Calzado', 'egdc', 'elweydelcalzado@gmail.com', 'retailer', 'professional', 'active');
        RAISE NOTICE 'Created EGDC tenant with business_type = retailer';
    ELSE
        RAISE NOTICE 'EGDC tenant exists with business_type = %', egdc_business_type;
    END IF;
END $$;

-- ====================================================================================
-- STEP 3: FIX ALL USERS FOR EGDC TENANT TO HAVE CORRECT BUSINESS_TYPE CONTEXT
-- ====================================================================================

DO $$
DECLARE
    egdc_tenant_id UUID;
    affected_users INTEGER;
BEGIN
    -- Get EGDC tenant ID
    SELECT id INTO egdc_tenant_id 
    FROM tenants 
    WHERE subdomain = 'egdc' 
    LIMIT 1;
    
    IF egdc_tenant_id IS NOT NULL THEN
        -- Ensure all users in EGDC tenant have proper context
        -- We don't need to add business_type to users table, but ensure tenant has it
        SELECT COUNT(*) INTO affected_users
        FROM users 
        WHERE tenant_id = egdc_tenant_id;
        
        RAISE NOTICE 'EGDC Tenant ID: %, Users affected: %', egdc_tenant_id, affected_users;
        
        -- Update any users that might have NULL tenant_id and email matches EGDC
        UPDATE users 
        SET tenant_id = egdc_tenant_id, updated_at = NOW()
        WHERE tenant_id IS NULL 
          AND email IN ('elweydelcalzado@gmail.com', 'admin@egdc.com');
          
    ELSE
        RAISE EXCEPTION 'EGDC tenant not found after creation attempt';
    END IF;
END $$;

-- ====================================================================================
-- STEP 4: SET DEFAULT BUSINESS_TYPE FOR ALL OTHER TENANTS
-- ====================================================================================

-- Ensure all existing tenants have a business_type
UPDATE tenants 
SET business_type = 'retailer', updated_at = NOW()
WHERE business_type IS NULL OR business_type = '';

-- ====================================================================================
-- STEP 5: CREATE DIAGNOSTIC QUERY FOR BUSINESS_TYPE ISSUES
-- ====================================================================================

-- Create a view to easily diagnose business_type issues
CREATE OR REPLACE VIEW tenant_business_type_diagnosis AS
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    t.subdomain,
    t.business_type,
    t.status as tenant_status,
    COUNT(u.id) as user_count,
    array_agg(u.email) as user_emails,
    CASE 
        WHEN t.business_type IS NULL THEN 'CRITICAL: business_type is NULL'
        WHEN t.business_type = '' THEN 'CRITICAL: business_type is empty'
        WHEN t.business_type NOT IN ('retailer', 'wholesaler', 'supplier', 'hybrid') THEN 'WARNING: invalid business_type'
        ELSE 'OK'
    END as diagnosis
FROM tenants t
LEFT JOIN users u ON t.id = u.tenant_id AND u.status = 'active'
GROUP BY t.id, t.name, t.subdomain, t.business_type, t.status
ORDER BY 
    CASE 
        WHEN t.subdomain = 'egdc' THEN 1 
        ELSE 2 
    END,
    t.name;

-- ====================================================================================
-- STEP 6: VERIFICATION AND REPORTING
-- ====================================================================================

-- Show current state after fixes
RAISE NOTICE '==================== BUSINESS TYPE CORRECTION RESULTS ====================';

DO $$
DECLARE
    rec RECORD;
BEGIN
    -- Report on all tenants and their business_type status
    FOR rec IN 
        SELECT * FROM tenant_business_type_diagnosis
    LOOP
        RAISE NOTICE 'Tenant: % (%) - business_type: % - Users: % - Status: %', 
            rec.tenant_name, rec.subdomain, rec.business_type, rec.user_count, rec.diagnosis;
    END LOOP;
    
    -- Special check for EGDC
    FOR rec IN 
        SELECT t.*, COUNT(u.id) as user_count
        FROM tenants t
        LEFT JOIN users u ON t.id = u.tenant_id
        WHERE t.subdomain = 'egdc'
        GROUP BY t.id, t.name, t.subdomain, t.business_type, t.status
    LOOP
        RAISE NOTICE '=== EGDC TENANT STATUS ===';
        RAISE NOTICE 'ID: %', rec.id;
        RAISE NOTICE 'Name: %', rec.name;
        RAISE NOTICE 'Subdomain: %', rec.subdomain;
        RAISE NOTICE 'Business Type: %', rec.business_type;
        RAISE NOTICE 'Status: %', rec.status;
        RAISE NOTICE 'User Count: %', rec.user_count;
        RAISE NOTICE '========================';
    END LOOP;
END $$;

COMMIT;

-- ====================================================================================
-- ADDITIONAL DIAGNOSTIC QUERIES (RUN MANUALLY TO CHECK STATUS)
-- ====================================================================================

-- Query to check current tenant status
/*
SELECT 
    subdomain,
    name,
    business_type,
    status,
    (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as user_count
FROM tenants t
ORDER BY subdomain;
*/

-- Query to check EGDC specifically
/*
SELECT 
    t.id,
    t.subdomain,
    t.business_type,
    t.status,
    u.email,
    u.name as user_name,
    u.role,
    u.status as user_status
FROM tenants t
LEFT JOIN users u ON t.id = u.tenant_id
WHERE t.subdomain = 'egdc';
*/

-- Query to find potential problematic tenants
/*
SELECT 
    subdomain,
    business_type,
    CASE 
        WHEN business_type IS NULL THEN 'NULL business_type - will cause redirect loops'
        WHEN business_type = '' THEN 'Empty business_type - will cause redirect loops'
        WHEN business_type NOT IN ('retailer', 'wholesaler', 'supplier', 'hybrid') THEN 'Invalid business_type'
        ELSE 'OK'
    END as issue
FROM tenants
WHERE business_type IS NULL 
   OR business_type = '' 
   OR business_type NOT IN ('retailer', 'wholesaler', 'supplier', 'hybrid');
*/
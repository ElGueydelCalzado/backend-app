-- EGDC Marketplace Evolution: Task 1.3
-- Create Supplier User Accounts
-- Creates admin users for FAMI, Osiel, and Molly supplier tenants

BEGIN;

-- =============================================
-- 1. CREATE ADMIN USERS FOR SUPPLIER TENANTS
-- =============================================

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
    
    -- Verify tenant IDs were found
    IF fami_tenant_id IS NULL OR osiel_tenant_id IS NULL OR molly_tenant_id IS NULL THEN
        RAISE EXCEPTION 'One or more supplier tenants not found. Run create-supplier-tenants.sql first.';
    END IF;
    
    -- Create admin user for FAMI Wholesale
    INSERT INTO users (
        id,
        tenant_id,
        email,
        name,
        avatar_url,
        role,
        permissions,
        google_id,
        status,
        last_login,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        fami_tenant_id,
        'admin@fami-wholesale.com',
        'Carlos Morales - FAMI Admin',
        NULL,
        'admin',
        '{
            "inventory": {
                "read": true,
                "write": true,
                "delete": true,
                "bulk_operations": true
            },
            "orders": {
                "read": true,
                "write": true,
                "approve": true,
                "cancel": true
            },
            "customers": {
                "read": true,
                "write": true,
                "delete": false
            },
            "settings": {
                "read": true,
                "write": true
            },
            "reports": {
                "read": true,
                "export": true
            }
        }'::jsonb,
        'google-fami-admin-placeholder',
        'active',
        NULL,
        '2024-01-15 10:30:00-06'::timestamptz,
        '2024-01-15 10:30:00-06'::timestamptz
    ) ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions,
        status = EXCLUDED.status,
        updated_at = NOW();
    
    -- Create admin user for Osiel Distribuciones
    INSERT INTO users (
        id,
        tenant_id,
        email,
        name,
        avatar_url,
        role,
        permissions,
        google_id,
        status,
        last_login,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        osiel_tenant_id,
        'ventas@osiel-distribuciones.mx',
        'Osiel Hernández - Director Ventas',
        NULL,
        'admin',
        '{
            "inventory": {
                "read": true,
                "write": true,
                "delete": true,
                "bulk_operations": true
            },
            "orders": {
                "read": true,
                "write": true,
                "approve": true,
                "cancel": true
            },
            "customers": {
                "read": true,
                "write": true,
                "delete": false
            },
            "settings": {
                "read": true,
                "write": true
            },
            "reports": {
                "read": true,
                "export": true
            }
        }'::jsonb,
        'google-osiel-admin-placeholder',
        'active',
        NULL,
        '2024-02-01 15:00:00-06'::timestamptz,
        '2024-02-01 15:00:00-06'::timestamptz
    ) ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions,
        status = EXCLUDED.status,
        updated_at = NOW();
    
    -- Create admin user for Molly Shoes Distribution
    INSERT INTO users (
        id,
        tenant_id,
        email,
        name,
        avatar_url,
        role,
        permissions,
        google_id,
        status,
        last_login,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        molly_tenant_id,
        'orders@mollyshoes.com.mx',
        'Molly García - Gerente General',
        NULL,
        'admin',
        '{
            "inventory": {
                "read": true,
                "write": true,
                "delete": true,
                "bulk_operations": true
            },
            "orders": {
                "read": true,
                "write": true,
                "approve": true,
                "cancel": true
            },
            "customers": {
                "read": true,
                "write": true,
                "delete": false
            },
            "settings": {
                "read": true,
                "write": true
            },
            "reports": {
                "read": true,
                "export": true
            }
        }'::jsonb,
        'google-molly-admin-placeholder',
        'active',
        NULL,
        '2024-02-15 09:45:00-06'::timestamptz,
        '2024-02-15 09:45:00-06'::timestamptz
    ) ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions,
        status = EXCLUDED.status,
        updated_at = NOW();
    
    RAISE NOTICE 'Created admin users for all supplier tenants';
END $$;

-- =============================================
-- 2. CREATE ADDITIONAL STAFF USERS (OPTIONAL)
-- =============================================

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
    
    -- Create inventory manager for FAMI
    INSERT INTO users (
        id, tenant_id, email, name, role, permissions, status, created_at
    ) VALUES (
        gen_random_uuid(),
        fami_tenant_id,
        'inventario@fami-wholesale.com',
        'Ana López - Inventarios FAMI',
        'manager',
        '{
            "inventory": {"read": true, "write": true, "delete": false, "bulk_operations": true},
            "orders": {"read": true, "write": false, "approve": false, "cancel": false},
            "reports": {"read": true, "export": true}
        }'::jsonb,
        'active',
        NOW()
    ) ON CONFLICT (email) DO NOTHING;
    
    -- Create sales representative for Osiel
    INSERT INTO users (
        id, tenant_id, email, name, role, permissions, status, created_at
    ) VALUES (
        gen_random_uuid(),
        osiel_tenant_id,
        'representante@osiel-distribuciones.mx',
        'Miguel Torres - Ventas Osiel',
        'employee',
        '{
            "inventory": {"read": true, "write": false, "delete": false, "bulk_operations": false},
            "orders": {"read": true, "write": true, "approve": false, "cancel": false},
            "customers": {"read": true, "write": true, "delete": false}
        }'::jsonb,
        'active',
        NOW()
    ) ON CONFLICT (email) DO NOTHING;
    
    -- Create customer service for Molly
    INSERT INTO users (
        id, tenant_id, email, name, role, permissions, status, created_at
    ) VALUES (
        gen_random_uuid(),
        molly_tenant_id,
        'atencion@mollyshoes.com.mx',
        'Sofia Ramírez - Atención Molly',
        'employee',
        '{
            "inventory": {"read": true, "write": false, "delete": false, "bulk_operations": false},
            "orders": {"read": true, "write": true, "approve": false, "cancel": false},
            "customers": {"read": true, "write": true, "delete": false}
        }'::jsonb,
        'active',
        NOW()
    ) ON CONFLICT (email) DO NOTHING;
    
    RAISE NOTICE 'Created additional staff users for suppliers';
END $$;

-- =============================================
-- 3. UPDATE GOOGLE OAUTH PLACEHOLDER IDS
-- =============================================

-- Generate realistic Google OAuth IDs for testing
-- In production, these would be set during actual OAuth flow
UPDATE users 
SET google_id = CASE 
    WHEN email = 'admin@fami-wholesale.com' THEN '108756432198765432101'
    WHEN email = 'ventas@osiel-distribuciones.mx' THEN '108756432198765432102'
    WHEN email = 'orders@mollyshoes.com.mx' THEN '108756432198765432103'
    WHEN email = 'inventario@fami-wholesale.com' THEN '108756432198765432104'
    WHEN email = 'representante@osiel-distribuciones.mx' THEN '108756432198765432105'
    WHEN email = 'atencion@mollyshoes.com.mx' THEN '108756432198765432106'
    ELSE google_id
END
WHERE email IN (
    'admin@fami-wholesale.com',
    'ventas@osiel-distribuciones.mx', 
    'orders@mollyshoes.com.mx',
    'inventario@fami-wholesale.com',
    'representante@osiel-distribuciones.mx',
    'atencion@mollyshoes.com.mx'
);

COMMIT;

-- =============================================
-- 4. VERIFICATION QUERIES
-- =============================================

-- Verify all supplier users created
SELECT 
    u.name as user_name,
    u.email,
    u.role,
    u.status,
    t.name as tenant_name,
    t.subdomain,
    t.business_type,
    u.permissions->>'inventory' as inventory_permissions,
    u.permissions->>'orders' as order_permissions
FROM users u
JOIN tenants t ON u.tenant_id = t.id
WHERE t.business_type = 'wholesaler'
ORDER BY t.subdomain, u.role DESC, u.name;

-- Count users by tenant
SELECT 
    t.name as tenant_name,
    t.subdomain,
    COUNT(u.id) as user_count,
    STRING_AGG(u.role, ', ' ORDER BY u.role) as roles
FROM tenants t
LEFT JOIN users u ON t.id = u.tenant_id
WHERE t.business_type = 'wholesaler'
GROUP BY t.id, t.name, t.subdomain
ORDER BY t.subdomain;

-- Verify admin users have full permissions
SELECT 
    u.name,
    u.email,
    t.subdomain,
    u.permissions->'inventory'->>'read' as inv_read,
    u.permissions->'inventory'->>'write' as inv_write,
    u.permissions->'orders'->>'approve' as order_approve,
    u.permissions->'settings'->>'write' as settings_write
FROM users u
JOIN tenants t ON u.tenant_id = t.id
WHERE t.business_type = 'wholesaler' AND u.role = 'admin'
ORDER BY t.subdomain;

-- Check Google OAuth IDs
SELECT 
    u.name,
    u.email,
    t.subdomain,
    u.google_id,
    CASE 
        WHEN u.google_id LIKE 'google-%placeholder' THEN 'Placeholder ID'
        WHEN u.google_id ~ '^[0-9]+$' THEN 'Valid Format'
        ELSE 'Invalid Format'
    END as oauth_status
FROM users u
JOIN tenants t ON u.tenant_id = t.id
WHERE t.business_type = 'wholesaler'
ORDER BY t.subdomain, u.name;

-- =============================================
-- NOTES FOR IMPLEMENTATION
-- =============================================

/*
This script creates:
1. ✅ Admin users for each supplier tenant with full permissions
2. ✅ Realistic user names in Spanish for Mexican businesses
3. ✅ Detailed permission structures for role-based access
4. ✅ Additional staff users for realistic business scenarios
5. ✅ Proper Google OAuth placeholder IDs for testing

User Hierarchy Created:
- Admin users: Full system access for tenant management
- Manager users: Inventory management and reporting access
- Employee users: Limited access for daily operations

Next steps:
- Verify users can access their tenant's data
- Test authentication flow with these users
- Proceed to Task 1.4: Add Purchase Order System
*/
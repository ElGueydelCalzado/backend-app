-- EGDC Multi-Tenant SaaS Database Schema
-- Transforms single-tenant app into scalable SaaS platform
-- Each business gets isolated data with Row-Level Security

BEGIN;

-- =============================================
-- 1. TENANTS TABLE - Business Accounts
-- =============================================

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    
    -- Subscription & billing
    plan VARCHAR(50) DEFAULT 'starter',
    status VARCHAR(20) DEFAULT 'active',
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    
    -- Settings
    timezone VARCHAR(50) DEFAULT 'America/Mexico_City',
    currency VARCHAR(3) DEFAULT 'MXN',
    settings JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. USERS TABLE - Individual User Accounts
-- =============================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- User details
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    
    -- Role & permissions
    role VARCHAR(50) DEFAULT 'employee',
    permissions JSONB DEFAULT '{}',
    
    -- OAuth data
    google_id VARCHAR(255),
    
    -- Status
    status VARCHAR(20) DEFAULT 'active',
    last_login TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. UPDATE EXISTING PRODUCTS TABLE
-- =============================================

-- Add tenant_id to existing products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Create index for tenant-based queries
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);

-- =============================================
-- 4. UPDATE CHANGE_LOGS TABLE
-- =============================================

-- Add tenant_id to change_logs table
ALTER TABLE change_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE change_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for tenant-based queries
CREATE INDEX IF NOT EXISTS idx_change_logs_tenant_id ON change_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_change_logs_user_id ON change_logs(user_id);

-- =============================================
-- 5. TENANT INVITATIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS tenant_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'employee',
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Invitation details
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 6. ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tenant
CREATE POLICY users_tenant_isolation ON users
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Products isolated by tenant
CREATE POLICY products_tenant_isolation ON products
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Change logs isolated by tenant
CREATE POLICY change_logs_tenant_isolation ON change_logs
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Tenant invitations isolated by tenant
CREATE POLICY tenant_invitations_isolation ON tenant_invitations
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- =============================================
-- 7. HELPER FUNCTIONS
-- =============================================

-- Function to get current tenant ID from session
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.current_tenant_id', true)::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', tenant_uuid::TEXT, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 8. UPDATED TRIGGERS
-- =============================================

-- Update trigger for tenants
CREATE OR REPLACE FUNCTION update_tenant_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tenant_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_updated_at();

-- Update trigger for users
CREATE OR REPLACE FUNCTION update_user_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_user_updated_at();

-- =============================================
-- 9. INDEXES FOR PERFORMANCE
-- =============================================

-- Tenants indexes
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Invitations indexes
CREATE INDEX IF NOT EXISTS idx_invitations_token ON tenant_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON tenant_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON tenant_invitations(expires_at);

-- =============================================
-- 10. DEMO DATA FOR TESTING
-- =============================================

-- Create demo tenant (EGDC) - using proper UUID format
DO $$
DECLARE
    demo_tenant_id UUID;
    demo_user_id UUID;
BEGIN
    -- Generate proper UUIDs
    demo_tenant_id := gen_random_uuid();
    demo_user_id := gen_random_uuid();
    
    -- Create demo tenant
    INSERT INTO tenants (id, name, subdomain, email, plan, status) 
    VALUES (
        demo_tenant_id,
        'El Guey del Calzado',
        'egdc',
        'elweydelcalzado@gmail.com',
        'professional',
        'active'
    ) ON CONFLICT (subdomain) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        plan = EXCLUDED.plan,
        status = EXCLUDED.status;
    
    -- Create demo user (admin)
    INSERT INTO users (id, tenant_id, email, name, role, google_id, status) 
    VALUES (
        demo_user_id,
        demo_tenant_id,
        'elweydelcalzado@gmail.com',
        'El Guey del Calzado',
        'admin',
        'google-oauth-id-placeholder',
        'active'
    ) ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        status = EXCLUDED.status;
    
    -- Update existing products to belong to demo tenant
    UPDATE products 
    SET tenant_id = demo_tenant_id
    WHERE tenant_id IS NULL;
    
    -- Update existing change logs to belong to demo tenant
    UPDATE change_logs 
    SET tenant_id = demo_tenant_id
    WHERE tenant_id IS NULL;
    
    RAISE NOTICE 'Demo tenant created with ID: %', demo_tenant_id;
    RAISE NOTICE 'Demo user created with ID: %', demo_user_id;
END $$;

COMMIT;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Check tenant setup
SELECT 
    t.name as tenant_name,
    t.subdomain,
    t.plan,
    t.status,
    COUNT(u.id) as user_count,
    COUNT(p.id) as product_count
FROM tenants t
LEFT JOIN users u ON t.id = u.tenant_id
LEFT JOIN products p ON t.id = p.tenant_id
GROUP BY t.id, t.name, t.subdomain, t.plan, t.status;

-- Check user setup
SELECT 
    u.name as user_name,
    u.email,
    u.role,
    t.name as tenant_name,
    t.subdomain
FROM users u
JOIN tenants t ON u.tenant_id = t.id;

-- =============================================
-- NOTES FOR IMPLEMENTATION
-- =============================================

/*
Next Steps:
1. Run this schema migration on production database
2. Update API routes to use tenant context
3. Update authentication to include tenant_id
4. Create user registration/invitation flow
5. Add tenant management UI

Security Features:
- Row Level Security ensures complete data isolation
- Each tenant only sees their own data
- Invitation system for team management
- Role-based permissions

Performance Features:
- Optimized indexes for tenant-based queries
- Efficient RLS policies
- Proper foreign key constraints
*/
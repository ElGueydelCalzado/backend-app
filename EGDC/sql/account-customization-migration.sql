-- Account Customization Migration
-- Adds support for custom account names and subdomain changes

-- Add account customization fields to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_subdomain VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subdomain_history JSONB DEFAULT '[]';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subdomain_change_count INTEGER DEFAULT 0;

-- Update existing tenants to have display_name based on current name
UPDATE tenants SET display_name = name WHERE display_name IS NULL;

-- Create account change requests table
CREATE TABLE IF NOT EXISTS account_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    requested_subdomain VARCHAR(100) NOT NULL,
    current_subdomain VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    requested_by UUID REFERENCES users(id),
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure no duplicate pending requests
    UNIQUE(tenant_id, requested_subdomain, status) DEFERRABLE INITIALLY DEFERRED
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_account_change_requests_tenant_status ON account_change_requests(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_account_change_requests_subdomain ON account_change_requests(requested_subdomain);

-- Create function to validate subdomain format
CREATE OR REPLACE FUNCTION validate_subdomain_format(subdomain TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check length (3-30 characters)
    IF LENGTH(subdomain) < 3 OR LENGTH(subdomain) > 30 THEN
        RETURN FALSE;
    END IF;
    
    -- Check format: lowercase letters, numbers, hyphens only
    -- Must start and end with alphanumeric
    IF subdomain !~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' AND LENGTH(subdomain) > 1 THEN
        RETURN FALSE;
    END IF;
    
    -- Single character must be alphanumeric
    IF LENGTH(subdomain) = 1 AND subdomain !~ '^[a-z0-9]$' THEN
        RETURN FALSE;
    END IF;
    
    -- No consecutive hyphens
    IF subdomain LIKE '%---%' THEN
        RETURN FALSE;
    END IF;
    
    -- Reserved subdomains
    IF subdomain IN ('www', 'app', 'api', 'admin', 'mail', 'ftp', 'blog', 'shop', 'store', 'support', 'help', 'login', 'auth', 'dashboard') THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to check subdomain availability
CREATE OR REPLACE FUNCTION check_subdomain_availability(requested_subdomain TEXT, excluding_tenant_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if subdomain is valid format
    IF NOT validate_subdomain_format(requested_subdomain) THEN
        RETURN FALSE;
    END IF;
    
    -- Check if subdomain is already taken by another tenant
    IF EXISTS (
        SELECT 1 FROM tenants 
        WHERE (subdomain = requested_subdomain OR custom_subdomain = requested_subdomain)
        AND (excluding_tenant_id IS NULL OR id != excluding_tenant_id)
        AND status = 'active'
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Check if there's a pending request for this subdomain
    IF EXISTS (
        SELECT 1 FROM account_change_requests 
        WHERE requested_subdomain = requested_subdomain 
        AND status = 'pending'
        AND (excluding_tenant_id IS NULL OR tenant_id != excluding_tenant_id)
    ) THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to apply account name change
CREATE OR REPLACE FUNCTION apply_account_name_change(
    p_tenant_id UUID,
    p_new_subdomain VARCHAR(100),
    p_admin_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    old_subdomain VARCHAR(100);
    current_history JSONB;
    result JSONB;
BEGIN
    -- Get current subdomain
    SELECT COALESCE(custom_subdomain, subdomain) INTO old_subdomain
    FROM tenants WHERE id = p_tenant_id;
    
    IF old_subdomain IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tenant not found');
    END IF;
    
    -- Check availability
    IF NOT check_subdomain_availability(p_new_subdomain, p_tenant_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Subdomain not available');
    END IF;
    
    -- Get current subdomain history
    SELECT COALESCE(subdomain_history, '[]'::jsonb) INTO current_history
    FROM tenants WHERE id = p_tenant_id;
    
    -- Update tenant with new custom subdomain
    UPDATE tenants SET
        custom_subdomain = p_new_subdomain,
        subdomain_history = current_history || jsonb_build_object(
            'old_subdomain', old_subdomain,
            'new_subdomain', p_new_subdomain,
            'changed_at', NOW(),
            'changed_by', p_admin_user_id
        ),
        subdomain_change_count = subdomain_change_count + 1,
        updated_at = NOW()
    WHERE id = p_tenant_id;
    
    -- Mark any pending requests as completed
    UPDATE account_change_requests SET
        status = 'completed',
        updated_at = NOW()
    WHERE tenant_id = p_tenant_id 
    AND requested_subdomain = p_new_subdomain 
    AND status = 'pending';
    
    result := jsonb_build_object(
        'success', true,
        'old_subdomain', old_subdomain,
        'new_subdomain', p_new_subdomain,
        'change_count', (SELECT subdomain_change_count FROM tenants WHERE id = p_tenant_id)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create view for easy tenant subdomain resolution
CREATE OR REPLACE VIEW tenant_subdomains AS
SELECT 
    id,
    name,
    display_name,
    subdomain as original_subdomain,
    custom_subdomain,
    COALESCE(custom_subdomain, subdomain) as current_subdomain,
    email,
    business_type,
    status,
    subdomain_change_count,
    subdomain_history,
    created_at,
    updated_at
FROM tenants;

-- Grant permissions
GRANT SELECT ON tenant_subdomains TO PUBLIC;
GRANT EXECUTE ON FUNCTION validate_subdomain_format(TEXT) TO PUBLIC;
GRANT EXECUTE ON FUNCTION check_subdomain_availability(TEXT, UUID) TO PUBLIC;

-- Test the functions with example data
SELECT 
    'egdc' as subdomain,
    validate_subdomain_format('egdc') as is_valid_format,
    check_subdomain_availability('egdc') as is_available;

SELECT 
    'test-account' as subdomain,
    validate_subdomain_format('test-account') as is_valid_format,
    check_subdomain_availability('test-account') as is_available;

-- Invalid examples
SELECT 
    'a' as subdomain,
    validate_subdomain_format('a') as is_valid_format;

SELECT 
    'admin' as subdomain,
    validate_subdomain_format('admin') as is_valid_format;

-- Show current tenant status
SELECT 
    name,
    original_subdomain,
    custom_subdomain,
    current_subdomain,
    subdomain_change_count
FROM tenant_subdomains 
ORDER BY created_at;
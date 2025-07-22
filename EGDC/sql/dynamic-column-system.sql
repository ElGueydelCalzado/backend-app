-- DYNAMIC COLUMN MANAGEMENT SYSTEM
-- Allows safe user-managed column additions/removals without direct database access

-- =====================================================================================
-- STEP 1: CREATE COLUMN METADATA TABLE
-- =====================================================================================

CREATE TABLE IF NOT EXISTS custom_columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    table_name VARCHAR(100) NOT NULL DEFAULT 'products',
    column_name VARCHAR(100) NOT NULL,
    column_type VARCHAR(50) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT false,
    default_value TEXT,
    validation_rules JSONB DEFAULT '{}',
    is_searchable BOOLEAN DEFAULT true,
    is_filterable BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 100,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'pending_approval')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, table_name, column_name)
);

-- Enable RLS for tenant isolation
ALTER TABLE custom_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY custom_columns_isolation ON custom_columns
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_custom_columns_tenant ON custom_columns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_columns_table ON custom_columns(table_name);
CREATE INDEX IF NOT EXISTS idx_custom_columns_status ON custom_columns(status);

-- =====================================================================================
-- STEP 2: CREATE COLUMN CHANGE LOG TABLE
-- =====================================================================================

CREATE TABLE IF NOT EXISTS column_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    custom_column_id UUID REFERENCES custom_columns(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'modify', 'delete', 'enable', 'disable')),
    old_definition JSONB,
    new_definition JSONB,
    sql_executed TEXT,
    success BOOLEAN DEFAULT false,
    error_message TEXT,
    executed_by UUID REFERENCES users(id),
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE column_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY column_change_log_isolation ON column_change_log
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- =====================================================================================
-- STEP 3: CREATE SAFE COLUMN MANAGEMENT FUNCTIONS
-- =====================================================================================

-- Function to safely add a column
CREATE OR REPLACE FUNCTION add_custom_column(
    p_tenant_id UUID,
    p_table_name VARCHAR(100),
    p_column_name VARCHAR(100),
    p_column_type VARCHAR(50),
    p_display_name VARCHAR(255),
    p_description TEXT DEFAULT NULL,
    p_default_value TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_sql TEXT;
    v_safe_column_name VARCHAR(100);
    v_result JSONB;
    v_custom_column_id UUID;
BEGIN
    -- Validate inputs
    IF p_table_name NOT IN ('products', 'warehouses') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Only products and warehouses tables support custom columns'
        );
    END IF;
    
    -- Sanitize column name (only alphanumeric and underscore)
    v_safe_column_name := regexp_replace(lower(p_column_name), '[^a-z0-9_]', '_', 'g');
    v_safe_column_name := 'custom_' || v_safe_column_name;
    
    -- Check if column already exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = p_table_name AND column_name = v_safe_column_name
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Column already exists: ' || v_safe_column_name
        );
    END IF;
    
    -- Validate column type
    IF p_column_type NOT IN ('VARCHAR(255)', 'TEXT', 'INTEGER', 'DECIMAL(10,2)', 'BOOLEAN', 'DATE', 'TIMESTAMP') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid column type. Allowed: VARCHAR(255), TEXT, INTEGER, DECIMAL(10,2), BOOLEAN, DATE, TIMESTAMP'
        );
    END IF;
    
    -- Build safe SQL
    v_sql := format('ALTER TABLE %I ADD COLUMN %I %s', p_table_name, v_safe_column_name, p_column_type);
    
    IF p_default_value IS NOT NULL THEN
        v_sql := v_sql || format(' DEFAULT %L', p_default_value);
    END IF;
    
    BEGIN
        -- Execute the SQL
        EXECUTE v_sql;
        
        -- Create index for searchable columns
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_%s ON %I(%I)', 
                      p_table_name, v_safe_column_name, p_table_name, v_safe_column_name);
        
        -- Record in metadata
        INSERT INTO custom_columns (
            tenant_id, table_name, column_name, column_type, display_name, 
            description, default_value, created_by
        ) VALUES (
            p_tenant_id, p_table_name, v_safe_column_name, p_column_type, 
            p_display_name, p_description, p_default_value, p_created_by
        ) RETURNING id INTO v_custom_column_id;
        
        -- Log the change
        INSERT INTO column_change_log (
            tenant_id, custom_column_id, action, new_definition, 
            sql_executed, success, executed_by
        ) VALUES (
            p_tenant_id, v_custom_column_id, 'create',
            jsonb_build_object(
                'column_name', v_safe_column_name,
                'column_type', p_column_type,
                'display_name', p_display_name
            ),
            v_sql, true, p_created_by
        );
        
        RETURN jsonb_build_object(
            'success', true,
            'column_name', v_safe_column_name,
            'message', 'Column added successfully'
        );
        
    EXCEPTION WHEN OTHERS THEN
        -- Log the error
        INSERT INTO column_change_log (
            tenant_id, action, sql_executed, success, error_message, executed_by
        ) VALUES (
            p_tenant_id, 'create', v_sql, false, SQLERRM, p_created_by
        );
        
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to add column: ' || SQLERRM
        );
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to safely remove a column
CREATE OR REPLACE FUNCTION remove_custom_column(
    p_tenant_id UUID,
    p_column_id UUID,
    p_executed_by UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_column RECORD;
    v_sql TEXT;
BEGIN
    -- Get column info
    SELECT * INTO v_column 
    FROM custom_columns 
    WHERE id = p_column_id AND tenant_id = p_tenant_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Column not found or insufficient permissions'
        );
    END IF;
    
    -- Only allow removal of custom columns (safety check)
    IF NOT v_column.column_name LIKE 'custom_%' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Can only remove custom columns (prefixed with custom_)'
        );
    END IF;
    
    -- Build safe SQL
    v_sql := format('ALTER TABLE %I DROP COLUMN IF EXISTS %I', 
                   v_column.table_name, v_column.column_name);
    
    BEGIN
        -- Execute the SQL
        EXECUTE v_sql;
        
        -- Remove from metadata
        DELETE FROM custom_columns WHERE id = p_column_id;
        
        -- Log the change
        INSERT INTO column_change_log (
            tenant_id, custom_column_id, action, old_definition, 
            sql_executed, success, executed_by
        ) VALUES (
            p_tenant_id, p_column_id, 'delete',
            jsonb_build_object(
                'column_name', v_column.column_name,
                'column_type', v_column.column_type,
                'display_name', v_column.display_name
            ),
            v_sql, true, p_executed_by
        );
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Column removed successfully'
        );
        
    EXCEPTION WHEN OTHERS THEN
        -- Log the error
        INSERT INTO column_change_log (
            tenant_id, custom_column_id, action, sql_executed, 
            success, error_message, executed_by
        ) VALUES (
            p_tenant_id, p_column_id, 'delete', v_sql, false, SQLERRM, p_executed_by
        );
        
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to remove column: ' || SQLERRM
        );
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to get all custom columns for a tenant
CREATE OR REPLACE FUNCTION get_custom_columns(p_tenant_id UUID, p_table_name VARCHAR(100) DEFAULT 'products')
RETURNS TABLE (
    id UUID,
    column_name VARCHAR(100),
    column_type VARCHAR(50),
    display_name VARCHAR(255),
    description TEXT,
    is_required BOOLEAN,
    default_value TEXT,
    is_searchable BOOLEAN,
    is_filterable BOOLEAN,
    display_order INTEGER,
    status VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cc.id, cc.column_name, cc.column_type, cc.display_name, cc.description,
        cc.is_required, cc.default_value, cc.is_searchable, cc.is_filterable,
        cc.display_order, cc.status, cc.created_at
    FROM custom_columns cc
    WHERE cc.tenant_id = p_tenant_id 
      AND cc.table_name = p_table_name
      AND cc.status = 'active'
    ORDER BY cc.display_order, cc.created_at;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- STEP 4: CREATE API-FRIENDLY VIEWS
-- =====================================================================================

-- View for dynamic table schema
CREATE OR REPLACE VIEW dynamic_table_schema AS
SELECT 
    t.id as tenant_id,
    t.subdomain,
    cc.table_name,
    cc.column_name,
    cc.column_type,
    cc.display_name,
    cc.description,
    cc.is_required,
    cc.default_value,
    cc.is_searchable,
    cc.is_filterable,
    cc.display_order,
    cc.status
FROM custom_columns cc
JOIN tenants t ON cc.tenant_id = t.id
WHERE cc.status = 'active';

-- View for column change history
CREATE OR REPLACE VIEW column_change_history AS
SELECT 
    ccl.id,
    ccl.tenant_id,
    t.name as tenant_name,
    ccl.action,
    ccl.old_definition,
    ccl.new_definition,
    ccl.success,
    ccl.error_message,
    u.name as executed_by_name,
    ccl.executed_at
FROM column_change_log ccl
JOIN tenants t ON ccl.tenant_id = t.id
LEFT JOIN users u ON ccl.executed_by = u.id
ORDER BY ccl.executed_at DESC;

-- =====================================================================================
-- SYSTEM READY
-- =====================================================================================

-- Insert some example custom columns for demonstration
DO $$
DECLARE
    egdc_tenant_id UUID;
BEGIN
    -- Get EGDC tenant ID (assuming it exists)
    SELECT id INTO egdc_tenant_id FROM tenants WHERE subdomain = 'egdc' OR business_type = 'retailer' LIMIT 1;
    
    IF egdc_tenant_id IS NOT NULL THEN
        -- Add example custom columns
        PERFORM add_custom_column(
            egdc_tenant_id, 
            'products', 
            'supplier_code', 
            'VARCHAR(255)', 
            'Supplier Product Code',
            'Internal code from supplier system'
        );
        
        PERFORM add_custom_column(
            egdc_tenant_id, 
            'products', 
            'warranty_months', 
            'INTEGER', 
            'Warranty Period (Months)',
            'Product warranty duration in months'
        );
        
        RAISE NOTICE 'Dynamic column management system initialized with example columns';
    END IF;
END $$;
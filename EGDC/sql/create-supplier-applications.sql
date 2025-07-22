-- CREATE SUPPLIER APPLICATIONS TABLE
-- Stores supplier registration applications before approval

-- Create supplier applications table
CREATE TABLE IF NOT EXISTS supplier_applications (
    id VARCHAR(50) PRIMARY KEY,
    
    -- Business Information
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100) NOT NULL,
    industry VARCHAR(100) NOT NULL,
    website VARCHAR(500),
    description TEXT NOT NULL,
    
    -- Contact Information
    contact_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    business_address JSONB NOT NULL,
    
    -- Business Details
    years_in_business VARCHAR(50),
    employee_count VARCHAR(50),
    annual_revenue VARCHAR(50),
    primary_markets JSONB DEFAULT '[]',
    
    -- Platform Preferences
    product_categories JSONB NOT NULL,
    estimated_products VARCHAR(50) NOT NULL,
    minimum_order_amount INTEGER NOT NULL,
    payment_terms VARCHAR(50) NOT NULL,
    shipping_methods JSONB NOT NULL,
    
    -- Legal & Compliance
    tax_id VARCHAR(100),
    business_license VARCHAR(100),
    certifications JSONB DEFAULT '[]',
    
    -- Application Management
    proposed_subdomain VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'on_hold')),
    tenant_id UUID REFERENCES tenants(id), -- Set when approved
    
    -- Approval/Rejection Details
    reviewed_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    admin_notes TEXT,
    
    -- Full Application Data (for backup/audit)
    application_data JSONB NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_supplier_applications_email ON supplier_applications(contact_email);
CREATE INDEX IF NOT EXISTS idx_supplier_applications_status ON supplier_applications(status);
CREATE INDEX IF NOT EXISTS idx_supplier_applications_subdomain ON supplier_applications(proposed_subdomain);
CREATE INDEX IF NOT EXISTS idx_supplier_applications_created ON supplier_applications(created_at);
CREATE INDEX IF NOT EXISTS idx_supplier_applications_business_name ON supplier_applications(business_name);

-- Add unique constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_contact_email_pending'
    ) THEN
        ALTER TABLE supplier_applications ADD CONSTRAINT unique_contact_email_pending 
            EXCLUDE (contact_email WITH =) WHERE (status IN ('pending', 'under_review'));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_proposed_subdomain'
    ) THEN
        ALTER TABLE supplier_applications ADD CONSTRAINT unique_proposed_subdomain 
            UNIQUE (proposed_subdomain);
    END IF;
END $$;

-- Create application review log table
CREATE TABLE IF NOT EXISTS supplier_application_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id VARCHAR(50) NOT NULL REFERENCES supplier_applications(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'created', 'reviewed', 'approved', 'rejected', 'notes_added'
    performed_by UUID REFERENCES users(id),
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for logs
CREATE INDEX IF NOT EXISTS idx_supplier_application_logs_application ON supplier_application_logs(application_id);
CREATE INDEX IF NOT EXISTS idx_supplier_application_logs_created ON supplier_application_logs(created_at);

-- Create function to log application changes
CREATE OR REPLACE FUNCTION log_supplier_application_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log status changes
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO supplier_application_logs (
            application_id, action, old_status, new_status, 
            performed_by, notes, created_at
        ) VALUES (
            NEW.id, 'status_change', OLD.status, NEW.status,
            NEW.reviewed_by, NEW.admin_notes, NOW()
        );
    END IF;
    
    -- Log approval
    IF TG_OP = 'UPDATE' AND OLD.approved_at IS NULL AND NEW.approved_at IS NOT NULL THEN
        INSERT INTO supplier_application_logs (
            application_id, action, performed_by, notes, created_at
        ) VALUES (
            NEW.id, 'approved', NEW.reviewed_by, 'Application approved and tenant created', NOW()
        );
    END IF;
    
    -- Log rejection
    IF TG_OP = 'UPDATE' AND OLD.rejected_at IS NULL AND NEW.rejected_at IS NOT NULL THEN
        INSERT INTO supplier_application_logs (
            application_id, action, performed_by, notes, created_at
        ) VALUES (
            NEW.id, 'rejected', NEW.reviewed_by, NEW.rejection_reason, NOW()
        );
    END IF;
    
    -- Update timestamp
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_log_supplier_application_changes
    BEFORE UPDATE ON supplier_applications
    FOR EACH ROW EXECUTE FUNCTION log_supplier_application_changes();

-- Create business intelligence views
CREATE OR REPLACE VIEW supplier_applications_summary AS
SELECT 
    status,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as last_7_days,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as last_30_days,
    AVG(EXTRACT(EPOCH FROM (COALESCE(approved_at, rejected_at, NOW()) - created_at))) / 3600 as avg_processing_hours
FROM supplier_applications
GROUP BY status;

-- Industry analysis view
CREATE OR REPLACE VIEW supplier_applications_by_industry AS
SELECT 
    industry,
    COUNT(*) as total_applications,
    COUNT(*) FILTER (WHERE status = 'approved') as approved,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    ROUND(COUNT(*) FILTER (WHERE status = 'approved') * 100.0 / COUNT(*), 2) as approval_rate
FROM supplier_applications
GROUP BY industry
ORDER BY total_applications DESC;

-- Recent applications view
CREATE OR REPLACE VIEW recent_supplier_applications AS
SELECT 
    id,
    business_name,
    contact_email,
    industry,
    product_categories,
    estimated_products,
    minimum_order_amount,
    status,
    created_at,
    CASE 
        WHEN status = 'pending' THEN EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600
        ELSE NULL 
    END as hours_pending
FROM supplier_applications
WHERE status IN ('pending', 'under_review')
ORDER BY created_at ASC;

-- Insert sample data for testing (optional)
DO $$
BEGIN
    -- Only insert if no applications exist
    IF NOT EXISTS (SELECT 1 FROM supplier_applications LIMIT 1) THEN
        INSERT INTO supplier_applications (
            id, business_name, business_type, industry, description,
            contact_name, contact_email, contact_phone, business_address,
            product_categories, estimated_products, minimum_order_amount,
            payment_terms, shipping_methods, proposed_subdomain, status,
            application_data
        ) VALUES (
            'demo_app_001',
            'Demo Footwear Solutions',
            'manufacturer',
            'footwear',
            'Leading manufacturer of high-quality footwear for wholesale distribution',
            'Maria Rodriguez',
            'maria@demofootwear.com',
            '+52-55-1234-5678',
            '{"street": "Av. Industrial 123", "city": "Mexico City", "state": "CDMX", "postal_code": "06600", "country": "Mexico"}',
            '["Zapatos Casuales", "Deportivos", "Botas"]',
            '201-500',
            2000,
            'Net 30',
            '["Standard Shipping", "Express Shipping"]',
            'demofootwear123',
            'pending',
            '{"demo": true, "source": "system_generated"}'
        );
        
        RAISE NOTICE 'Sample supplier application created for testing';
    END IF;
END $$;

-- Success messages
DO $$
BEGIN
    RAISE NOTICE '✅ Supplier Applications system created successfully!';
    RAISE NOTICE 'Features: Application tracking, approval workflow, audit logs, BI views';
END $$;
-- URGENT: Add tenant_id column to production database
-- Run this script in your PostgreSQL database (Google Cloud SQL)

-- Step 1: Add tenant_id column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(255);

-- Step 2: Set a default tenant_id for existing products (EGDC's tenant)
UPDATE products 
SET tenant_id = '471e9c26-a232-46b3-a992-2932e5dfadf4' 
WHERE tenant_id IS NULL;

-- Step 3: Make tenant_id NOT NULL after setting default values
ALTER TABLE products ALTER COLUMN tenant_id SET NOT NULL;

-- Step 4: Add index for performance
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);

-- Step 5: Add tenant_id to change_logs table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'change_logs') THEN
        ALTER TABLE change_logs ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(255);
        
        -- Set default tenant_id for existing change logs
        UPDATE change_logs 
        SET tenant_id = '471e9c26-a232-46b3-a992-2932e5dfadf4' 
        WHERE tenant_id IS NULL;
        
        -- Make tenant_id NOT NULL
        ALTER TABLE change_logs ALTER COLUMN tenant_id SET NOT NULL;
        
        -- Add index
        CREATE INDEX IF NOT EXISTS idx_change_logs_tenant_id ON change_logs(tenant_id);
    END IF;
END $$;

-- Verify the changes
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('products', 'change_logs') 
AND column_name = 'tenant_id';

COMMENT ON COLUMN products.tenant_id IS 'Multi-tenant isolation - identifies which business owns this product';
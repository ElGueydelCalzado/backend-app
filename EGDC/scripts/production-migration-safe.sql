-- Safe production migration for dimensions and weight
-- Run this in your production database

-- Add new columns (will fail gracefully if they already exist)
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE products ADD COLUMN height_cm DECIMAL(5,2) DEFAULT NULL;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE products ADD COLUMN length_cm DECIMAL(5,2) DEFAULT NULL;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE products ADD COLUMN thickness_cm DECIMAL(5,2) DEFAULT NULL;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE products ADD COLUMN weight_grams INTEGER DEFAULT NULL;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;

-- Add indexes (will fail gracefully if they already exist)
CREATE INDEX IF NOT EXISTS idx_products_dimensions ON products(height_cm, length_cm, thickness_cm);
CREATE INDEX IF NOT EXISTS idx_products_weight ON products(weight_grams);

-- Add constraints (will fail gracefully if they already exist)
DO $$
BEGIN
    BEGIN
        ALTER TABLE products ADD CONSTRAINT check_height_positive 
          CHECK (height_cm IS NULL OR (height_cm > 0 AND height_cm <= 100));
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE products ADD CONSTRAINT check_length_positive 
          CHECK (length_cm IS NULL OR (length_cm > 0 AND length_cm <= 150));
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE products ADD CONSTRAINT check_thickness_positive 
          CHECK (thickness_cm IS NULL OR (thickness_cm > 0 AND thickness_cm <= 50));
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE products ADD CONSTRAINT check_weight_positive 
          CHECK (weight_grams IS NULL OR (weight_grams > 0 AND weight_grams <= 10000));
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
END $$;

-- Verify the migration
SELECT 'Migration completed successfully!' as status;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('height_cm', 'length_cm', 'thickness_cm', 'weight_grams')
ORDER BY column_name;
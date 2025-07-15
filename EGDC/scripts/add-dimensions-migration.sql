-- Database Migration: Add Dimensions and Weight Columns
-- This script safely adds new columns without breaking existing functionality

-- Add new columns to products table
-- Using DECIMAL for precise measurements and making them nullable initially
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS height_cm DECIMAL(5,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS length_cm DECIMAL(5,2) DEFAULT NULL, 
ADD COLUMN IF NOT EXISTS thickness_cm DECIMAL(5,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS weight_grams INTEGER DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN products.height_cm IS 'Product height in centimeters (e.g., 25.50)';
COMMENT ON COLUMN products.length_cm IS 'Product length in centimeters (e.g., 30.25)';
COMMENT ON COLUMN products.thickness_cm IS 'Product thickness in centimeters (e.g., 2.75)';
COMMENT ON COLUMN products.weight_grams IS 'Product weight in grams (e.g., 450)';

-- Add indexes for potential filtering/sorting
CREATE INDEX IF NOT EXISTS idx_products_dimensions ON products(height_cm, length_cm, thickness_cm);
CREATE INDEX IF NOT EXISTS idx_products_weight ON products(weight_grams);

-- Add check constraints for realistic values
ALTER TABLE products ADD CONSTRAINT check_height_positive 
  CHECK (height_cm IS NULL OR (height_cm > 0 AND height_cm <= 100));
  
ALTER TABLE products ADD CONSTRAINT check_length_positive 
  CHECK (length_cm IS NULL OR (length_cm > 0 AND length_cm <= 150));
  
ALTER TABLE products ADD CONSTRAINT check_thickness_positive 
  CHECK (thickness_cm IS NULL OR (thickness_cm > 0 AND thickness_cm <= 50));
  
ALTER TABLE products ADD CONSTRAINT check_weight_positive 
  CHECK (weight_grams IS NULL OR (weight_grams > 0 AND weight_grams <= 10000));

-- Verify the migration
SELECT 'Migration completed successfully!' as status;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('height_cm', 'length_cm', 'thickness_cm', 'weight_grams')
ORDER BY column_name;
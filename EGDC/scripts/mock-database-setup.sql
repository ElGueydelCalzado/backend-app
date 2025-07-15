-- Mock Database Setup for Preview Environment
-- Run this directly in GCP SQL Console

-- Drop existing tables if they exist
DROP TABLE IF EXISTS change_logs;
DROP TABLE IF EXISTS products;

-- Create products table
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  fecha DATE DEFAULT CURRENT_DATE,
  categoria VARCHAR(100),
  marca VARCHAR(100),
  modelo VARCHAR(200),
  color VARCHAR(100),
  talla VARCHAR(20),
  sku VARCHAR(100) UNIQUE,
  ean VARCHAR(50),
  costo DECIMAL(10,2),
  shein_modifier DECIMAL(4,2) DEFAULT 1.0,
  shopify_modifier DECIMAL(4,2) DEFAULT 1.0,
  meli_modifier DECIMAL(4,2) DEFAULT 1.0,
  precio_shein DECIMAL(10,2) GENERATED ALWAYS AS (CEILING((costo * shein_modifier * 1.2) / 5) * 5) STORED,
  precio_egdc DECIMAL(10,2) GENERATED ALWAYS AS (CEILING(((costo * shopify_modifier + 100) * 1.25) / 5) * 5) STORED,
  precio_meli DECIMAL(10,2) GENERATED ALWAYS AS (CEILING(((costo * meli_modifier + 100) * 1.395) / 5) * 5) STORED,
  inv_egdc INTEGER DEFAULT 0,
  inv_fami INTEGER DEFAULT 0,
  inv_osiel INTEGER DEFAULT 0,
  inv_molly INTEGER DEFAULT 0,
  inventory_total INTEGER GENERATED ALWAYS AS (inv_egdc + inv_fami + inv_osiel + inv_molly) STORED,
  shein BOOLEAN DEFAULT false,
  meli BOOLEAN DEFAULT false,
  shopify BOOLEAN DEFAULT false,
  tiktok BOOLEAN DEFAULT false,
  upseller BOOLEAN DEFAULT false,
  go_trendier BOOLEAN DEFAULT false,
  google_drive BOOLEAN DEFAULT false,
  height_cm DECIMAL(5,2) DEFAULT NULL,
  length_cm DECIMAL(5,2) DEFAULT NULL,
  thickness_cm DECIMAL(5,2) DEFAULT NULL,
  weight_grams INTEGER DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create change_logs table
CREATE TABLE change_logs (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  change_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_products_categoria ON products(categoria);
CREATE INDEX idx_products_marca ON products(marca);
CREATE INDEX idx_products_modelo ON products(modelo);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_dimensions ON products(height_cm, length_cm, thickness_cm);
CREATE INDEX idx_products_weight ON products(weight_grams);
CREATE INDEX idx_change_logs_product_id ON change_logs(product_id);
CREATE INDEX idx_change_logs_created_at ON change_logs(created_at);

-- Add check constraints for realistic values
ALTER TABLE products ADD CONSTRAINT check_height_positive 
  CHECK (height_cm IS NULL OR (height_cm > 0 AND height_cm <= 100));
  
ALTER TABLE products ADD CONSTRAINT check_length_positive 
  CHECK (length_cm IS NULL OR (length_cm > 0 AND length_cm <= 150));
  
ALTER TABLE products ADD CONSTRAINT check_thickness_positive 
  CHECK (thickness_cm IS NULL OR (thickness_cm > 0 AND thickness_cm <= 50));
  
ALTER TABLE products ADD CONSTRAINT check_weight_positive 
  CHECK (weight_grams IS NULL OR (weight_grams > 0 AND weight_grams <= 10000));

-- Insert mock data
INSERT INTO products (
  categoria, marca, modelo, color, talla, sku, ean, costo,
  shein_modifier, shopify_modifier, meli_modifier,
  inv_egdc, inv_fami, inv_osiel, inv_molly,
  shein, meli, shopify, tiktok, upseller, go_trendier, google_drive,
  height_cm, length_cm, thickness_cm, weight_grams
) VALUES 
('Deportivos', 'Nike', 'Air Max 90', 'Blanco/Negro', '42', 'NIKE-AM90-WB-42', '1234567890123', 250.00, 2.0, 1.8, 1.6, 5, 3, 10, 2, true, true, true, false, false, false, false, 12.50, 30.20, 11.80, 650),
('Casual', 'Adidas', 'Stan Smith', 'Blanco/Verde', '41', 'ADIDAS-SS-WG-41', '1234567890124', 200.00, 2.2, 1.9, 1.7, 8, 2, 15, 3, false, true, true, true, false, true, true, 10.75, 29.50, 10.20, 580),
('Botas', 'Timberland', 'Classic 6-inch', 'Miel', '43', 'TIMB-C6-H-43', '1234567890125', 400.00, 1.5, 1.4, 1.3, 2, 1, 5, 1, false, true, true, false, true, false, false, 15.80, 31.75, 12.60, 890),
('Sandalias', 'Birkenstock', 'Arizona', 'Negro', '40', 'BIRK-AZ-B-40', '1234567890126', 150.00, 2.5, 2.0, 1.8, 12, 8, 20, 4, true, true, true, true, false, true, true, 4.20, 26.80, 9.50, 320),
('Deportivos', 'Puma', 'Suede Classic', 'Azul', '42', 'PUMA-SC-B-42', '1234567890127', 180.00, 2.1, 1.7, 1.5, 7, 4, 12, 2, true, false, true, false, false, false, false, 9.80, 28.90, 10.10, 520);

-- Insert mock change logs
INSERT INTO change_logs (product_id, field_name, old_value, new_value, change_type) VALUES 
(1, 'inv_egdc', '3', '5', 'update'),
(2, 'costo', '180.00', '200.00', 'update'),
(3, 'inv_tienda_centro', '2', '1', 'update'),
(1, 'weight_grams', '600', '650', 'update'),
(2, 'height_cm', '10.50', '10.75', 'update'),
(4, 'length_cm', '26.50', '26.80', 'update');

-- Verify the setup
SELECT 'Mock Database Setup Complete!' as status;
SELECT COUNT(*) as total_products FROM products;
SELECT COUNT(*) as total_change_logs FROM change_logs;
SELECT categoria, marca, modelo, sku, inventory_total, height_cm, length_cm, thickness_cm, weight_grams FROM products LIMIT 3;
-- EGDC Inventory Management Database Setup - NEW SIMPLIFIED SCHEMA
-- Run this script in your PostgreSQL database to create the new structure

-- Drop existing tables if they exist
DROP TABLE IF EXISTS change_logs CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- Create the products table with new simplified schema
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    fecha DATE DEFAULT CURRENT_DATE,
    categoria TEXT,
    marca TEXT,
    modelo TEXT,
    color TEXT,
    talla TEXT,
    sku TEXT,
    ean TEXT,
    google_drive TEXT,
    costo DECIMAL(10,2),
    shein_modifier DECIMAL(4,2) DEFAULT 1.00,
    shopify_modifier DECIMAL(4,2) DEFAULT 1.00,
    meli_modifier DECIMAL(4,2) DEFAULT 1.00,
    precio_shein DECIMAL(10,2) GENERATED ALWAYS AS (CEILING((costo * shein_modifier * 1.2) / 5) * 5) STORED,
    precio_shopify DECIMAL(10,2) GENERATED ALWAYS AS (CEILING(((costo * shopify_modifier + 100) * 1.25) / 5) * 5) STORED,
    precio_meli DECIMAL(10,2) GENERATED ALWAYS AS (CEILING(((costo * meli_modifier + 100) * 1.395) / 5) * 5) STORED,
    inv_egdc INTEGER DEFAULT 0,
    inv_fami INTEGER DEFAULT 0,
    inv_osiel INTEGER DEFAULT 0,
    inv_molly INTEGER DEFAULT 0,
    inventory_total INTEGER DEFAULT 0,
    shein BOOLEAN DEFAULT FALSE,
    meli BOOLEAN DEFAULT FALSE,
    shopify BOOLEAN DEFAULT FALSE,
    tiktok BOOLEAN DEFAULT FALSE,
    upseller BOOLEAN DEFAULT FALSE,
    go_trendier BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the change_logs table for audit trail
CREATE TABLE change_logs (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    change_type TEXT NOT NULL DEFAULT 'update',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_categoria ON products(categoria);
CREATE INDEX IF NOT EXISTS idx_products_marca ON products(marca);
CREATE INDEX IF NOT EXISTS idx_products_modelo ON products(modelo);
CREATE INDEX IF NOT EXISTS idx_products_color ON products(color);
CREATE INDEX IF NOT EXISTS idx_products_talla ON products(talla);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_ean ON products(ean);
CREATE INDEX IF NOT EXISTS idx_products_fecha ON products(fecha);
-- Pricing indexes
CREATE INDEX IF NOT EXISTS idx_products_costo ON products(costo);
CREATE INDEX IF NOT EXISTS idx_products_precio_shein ON products(precio_shein);
CREATE INDEX IF NOT EXISTS idx_products_precio_shopify ON products(precio_shopify);
CREATE INDEX IF NOT EXISTS idx_products_precio_meli ON products(precio_meli);
-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_products_inv_egdc ON products(inv_egdc);
CREATE INDEX IF NOT EXISTS idx_products_inv_fami ON products(inv_fami);
CREATE INDEX IF NOT EXISTS idx_products_inv_osiel ON products(inv_osiel);
CREATE INDEX IF NOT EXISTS idx_products_inv_molly ON products(inv_molly);
CREATE INDEX IF NOT EXISTS idx_products_inventory_total ON products(inventory_total);
-- Platform availability indexes
CREATE INDEX IF NOT EXISTS idx_products_shein ON products(shein);
CREATE INDEX IF NOT EXISTS idx_products_meli ON products(meli);
CREATE INDEX IF NOT EXISTS idx_products_shopify ON products(shopify);
CREATE INDEX IF NOT EXISTS idx_change_logs_product_id ON change_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_change_logs_created_at ON change_logs(created_at);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to automatically calculate total inventory
CREATE OR REPLACE FUNCTION update_inventory_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.inventory_total = COALESCE(NEW.inv_egdc, 0) + 
                         COALESCE(NEW.inv_fami, 0) + 
                         COALESCE(NEW.inv_osiel, 0) + 
                         COALESCE(NEW.inv_molly, 0);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically calculate total inventory
CREATE TRIGGER update_products_inventory_total 
    BEFORE INSERT OR UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_inventory_total();

-- Sample data insertion (optional - for testing)
INSERT INTO products (
    fecha, categoria, marca, modelo, color, talla, sku, ean, google_drive, costo,
    shein_modifier, shopify_modifier, meli_modifier,
    inv_egdc, inv_fami, inv_osiel, inv_molly,
    shein, meli, shopify, tiktok, upseller, go_trendier
) VALUES
    ('2024-01-15', 'Zapatos', 'Nike', 'Air Max 90', 'Blanco', '9', 'NIK-AM90-001', '1234567890123', 'https://drive.google.com/folder/example1', 89.99, 1.10, 1.05, 1.15, 15, 8, 5, 3, true, true, true, false, false, false),
    ('2024-01-16', 'Zapatos', 'Adidas', 'Stan Smith', 'Verde', '8.5', 'ADI-SS-002', '2345678901234', 'https://drive.google.com/folder/example2', 75.50, 1.20, 1.00, 1.10, 22, 12, 10, 6, true, true, false, true, false, false),
    ('2024-01-17', 'Botas', 'Timberland', '6-Inch Premium', 'Amarillo', '10', 'TIM-6IP-003', '3456789012345', null, 120.00, 1.00, 1.15, 1.05, 8, 5, 3, 2, false, true, true, false, true, false),
    ('2024-01-18', 'Sandalias', 'Havaianas', 'Brasil', 'Azul', '7', 'HAV-BR-004', '4567890123456', 'https://drive.google.com/folder/example3', 25.99, 1.30, 1.25, 1.20, 50, 30, 20, 15, true, false, false, true, false, true),
    ('2024-01-19', 'Zapatos', 'Converse', 'Chuck Taylor All Star', 'Negro', '9.5', 'CON-CTA-005', '5678901234567', null, 55.00, 1.15, 1.10, 1.08, 18, 10, 8, 4, true, true, true, true, false, false);

-- Display success message
SELECT 'Database schema created successfully with ' || COUNT(*) || ' sample products' as message
FROM products;
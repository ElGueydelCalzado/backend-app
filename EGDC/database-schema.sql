-- PostgreSQL Database Schema for EGDC Inventory Management
-- 4-location inventory system: EGDC, FAMI, Osiel, Molly

-- Drop existing tables if they exist
DROP TABLE IF EXISTS change_logs CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- Create products table with 4-location inventory
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    categoria VARCHAR(100),
    marca VARCHAR(100),
    modelo VARCHAR(100),
    color VARCHAR(50),
    talla VARCHAR(20),
    sku VARCHAR(100) UNIQUE,
    ean VARCHAR(50),
    google_drive TEXT,
    
    -- Cost and pricing modifiers
    costo DECIMAL(10,2) DEFAULT 0,
    shein_modifier DECIMAL(4,2) DEFAULT 1.5,
    shopify_modifier DECIMAL(4,2) DEFAULT 1.8,
    meli_modifier DECIMAL(4,2) DEFAULT 2.0,
    
    -- 4-location inventory system
    inv_egdc INTEGER DEFAULT 0,
    inv_fami INTEGER DEFAULT 0,
    inv_osiel INTEGER DEFAULT 0,
    inv_molly INTEGER DEFAULT 0,
    
    -- Platform availability flags
    shein BOOLEAN DEFAULT FALSE,
    meli BOOLEAN DEFAULT FALSE,
    shopify BOOLEAN DEFAULT FALSE,
    tiktok BOOLEAN DEFAULT FALSE,
    upseller BOOLEAN DEFAULT FALSE,
    go_trendier BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add auto-calculated columns for prices
ALTER TABLE products 
ADD COLUMN precio_shein DECIMAL(10,2) GENERATED ALWAYS AS (
    CEILING((costo * shein_modifier * 1.2) / 5) * 5
) STORED;

ALTER TABLE products 
ADD COLUMN precio_shopify DECIMAL(10,2) GENERATED ALWAYS AS (
    CEILING(((costo * shopify_modifier + 100) * 1.25) / 5) * 5
) STORED;

ALTER TABLE products 
ADD COLUMN precio_meli DECIMAL(10,2) GENERATED ALWAYS AS (
    CEILING(((costo * meli_modifier + 100) * 1.395) / 5) * 5
) STORED;

-- Add auto-calculated total inventory
ALTER TABLE products 
ADD COLUMN inventory_total INTEGER GENERATED ALWAYS AS (
    COALESCE(inv_egdc, 0) + COALESCE(inv_fami, 0) + COALESCE(inv_osiel, 0) + COALESCE(inv_molly, 0)
) STORED;

-- Create change logs table for audit trail
CREATE TABLE change_logs (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    change_type VARCHAR(50) DEFAULT 'update',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_products_categoria ON products(categoria);
CREATE INDEX idx_products_marca ON products(marca);
CREATE INDEX idx_products_modelo ON products(modelo);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_inventory_total ON products(inventory_total);
CREATE INDEX idx_products_created_at ON products(created_at);
CREATE INDEX idx_change_logs_product_id ON change_logs(product_id);
CREATE INDEX idx_change_logs_created_at ON change_logs(created_at);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO products (
    categoria, marca, modelo, color, talla, sku, costo, 
    inv_egdc, inv_fami, inv_osiel, inv_molly,
    shein, shopify, meli
) VALUES 
(
    'Calzado Deportivo', 'Nike', 'Air Max 90', 'Blanco', '42', 'NIK-AM90-WHT-42', 150.00,
    5, 3, 2, 1,
    true, true, false
),
(
    'Calzado Casual', 'Adidas', 'Stan Smith', 'Verde', '38', 'ADI-SS-GRN-38', 120.00,
    8, 4, 0, 2,
    false, true, true
),
(
    'Calzado Deportivo', 'Puma', 'Suede Classic', 'Negro', '40', 'PUM-SC-BLK-40', 100.00,
    3, 2, 5, 1,
    true, false, true
);

COMMIT;
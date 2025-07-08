-- EGDC Database Fix Script
-- Run this in your Supabase SQL Editor to update the schema

-- First, let's backup any existing data
CREATE TABLE IF NOT EXISTS products_backup AS SELECT * FROM products;

-- Drop the existing products table
DROP TABLE IF EXISTS products CASCADE;

-- Drop change_logs if it exists
DROP TABLE IF EXISTS change_logs CASCADE;

-- Create the products table with correct schema
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    fecha DATE,
    categoria TEXT NOT NULL,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    color TEXT,
    talla TEXT,
    sku TEXT,
    ean TEXT,
    costo DECIMAL(10,2),
    shein_modifier DECIMAL(4,2) DEFAULT 1.00,
    shopify_modifier DECIMAL(4,2) DEFAULT 1.00,
    meli_modifier DECIMAL(4,2) DEFAULT 1.00,
    precio_shein DECIMAL(10,2) GENERATED ALWAYS AS (CEILING((costo * shein_modifier * 1.2) / 5) * 5) STORED,
    precio_egdc DECIMAL(10,2) GENERATED ALWAYS AS (CEILING(((costo * shopify_modifier + 100) * 1.25) / 5) * 5) STORED,
    precio_meli DECIMAL(10,2) GENERATED ALWAYS AS (CEILING(((costo * meli_modifier + 100) * 1.395) / 5) * 5) STORED,
    inv_egdc INTEGER DEFAULT 0,
    inv_fami INTEGER DEFAULT 0,
    inv_bodega_principal INTEGER DEFAULT 0,
    inv_tienda_centro INTEGER DEFAULT 0,
    inv_tienda_norte INTEGER DEFAULT 0,
    inv_tienda_sur INTEGER DEFAULT 0,
    inv_online INTEGER DEFAULT 0,
    inventory_total INTEGER DEFAULT 0,
    shein BOOLEAN DEFAULT FALSE,
    meli BOOLEAN DEFAULT FALSE,
    shopify BOOLEAN DEFAULT FALSE,
    tiktok BOOLEAN DEFAULT FALSE,
    upseller BOOLEAN DEFAULT FALSE,
    go_trendier BOOLEAN DEFAULT FALSE,
    google_drive BOOLEAN DEFAULT FALSE,
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

-- Migrate data from backup if it exists (mapping old column names to new ones)
INSERT INTO products (
    fecha, categoria, marca, modelo, sku, ean, costo,
    shein_modifier, shopify_modifier, meli_modifier,
    inv_egdc, inv_fami, inv_bodega_principal, inv_tienda_centro, 
    inv_tienda_norte, inv_tienda_sur, inv_online,
    shein, meli, shopify, tiktok, upseller, go_trendier, google_drive,
    created_at, updated_at
)
SELECT 
    CURRENT_DATE as fecha,
    COALESCE(category, 'Sin Categoría') as categoria,
    COALESCE(brand, 'Sin Marca') as marca,
    COALESCE(model, 'Sin Modelo') as modelo,
    sku,
    ean,
    cost as costo,
    1.00 as shein_modifier,
    1.00 as shopify_modifier,
    1.00 as meli_modifier,
    0 as inv_egdc,
    0 as inv_fami,
    0 as inv_bodega_principal,
    0 as inv_tienda_centro,
    0 as inv_tienda_norte,
    0 as inv_tienda_sur,
    0 as inv_online,
    false as shein,
    false as meli,
    false as shopify,
    false as tiktok,
    false as upseller,
    false as go_trendier,
    false as google_drive,
    created_at,
    updated_at
FROM products_backup
WHERE EXISTS (SELECT 1 FROM products_backup);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_categoria ON products(categoria);
CREATE INDEX IF NOT EXISTS idx_products_marca ON products(marca);
CREATE INDEX IF NOT EXISTS idx_products_modelo ON products(modelo);
CREATE INDEX IF NOT EXISTS idx_products_color ON products(color);
CREATE INDEX IF NOT EXISTS idx_products_talla ON products(talla);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_ean ON products(ean);
CREATE INDEX IF NOT EXISTS idx_products_fecha ON products(fecha);
CREATE INDEX IF NOT EXISTS idx_products_costo ON products(costo);
CREATE INDEX IF NOT EXISTS idx_products_precio_shein ON products(precio_shein);
CREATE INDEX IF NOT EXISTS idx_products_precio_egdc ON products(precio_egdc);
CREATE INDEX IF NOT EXISTS idx_products_precio_meli ON products(precio_meli);
CREATE INDEX IF NOT EXISTS idx_products_inv_egdc ON products(inv_egdc);
CREATE INDEX IF NOT EXISTS idx_products_inv_fami ON products(inv_fami);
CREATE INDEX IF NOT EXISTS idx_products_inventory_total ON products(inventory_total);
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
                         COALESCE(NEW.inv_bodega_principal, 0) + 
                         COALESCE(NEW.inv_tienda_centro, 0) + 
                         COALESCE(NEW.inv_tienda_norte, 0) + 
                         COALESCE(NEW.inv_tienda_sur, 0) + 
                         COALESCE(NEW.inv_online, 0);
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

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_logs ENABLE ROW LEVEL SECURITY;

-- Create policies to allow full access
CREATE POLICY "Allow all operations on products" ON products
    FOR ALL USING (TRUE);

CREATE POLICY "Allow all operations on change_logs" ON change_logs
    FOR ALL USING (TRUE);

-- Add some sample data if the table is empty
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM products) THEN
        INSERT INTO products (
            fecha, categoria, marca, modelo, color, talla, sku, ean, costo,
            shein_modifier, shopify_modifier, meli_modifier,
            inv_egdc, inv_fami, inv_bodega_principal, inv_tienda_centro, inv_tienda_norte, inv_tienda_sur, inv_online,
            shein, meli, shopify, tiktok, upseller, go_trendier, google_drive
        ) VALUES
            ('2024-01-15', 'Zapatos', 'Nike', 'Air Max 90', 'Blanco', '9', 'NIK-AM90-001', '1234567890123', 89.99, 1.10, 1.05, 1.15, 15, 8, 12, 5, 3, 2, 4, true, true, true, false, false, false, true),
            ('2024-01-16', 'Zapatos', 'Adidas', 'Stan Smith', 'Verde', '8.5', 'ADI-SS-002', '2345678901234', 75.50, 1.20, 1.00, 1.10, 22, 12, 18, 8, 6, 4, 7, true, true, false, true, false, false, true),
            ('2024-01-17', 'Botas', 'Timberland', '6-Inch Premium', 'Amarillo', '10', 'TIM-6IP-003', '3456789012345', 120.00, 1.00, 1.15, 1.05, 8, 5, 6, 2, 1, 1, 2, false, true, true, false, true, false, false),
            ('2024-01-18', 'Sandalias', 'Havaianas', 'Brasil', 'Azul', '7', 'HAV-BR-004', '4567890123456', 25.99, 1.30, 1.25, 1.20, 50, 30, 25, 15, 10, 8, 12, true, false, false, true, false, true, true),
            ('2024-01-19', 'Zapatos', 'Converse', 'Chuck Taylor All Star', 'Negro', '9.5', 'CON-CTA-005', '5678901234567', 55.00, 1.15, 1.10, 1.08, 18, 10, 14, 6, 4, 3, 5, true, true, true, true, false, false, false),
            ('2024-01-20', 'Botas', 'Dr. Martens', '1460 Originals', 'Negro', '8', 'DRM-1460-006', '6789012345678', 150.00, 0.95, 1.00, 1.00, 6, 3, 4, 2, 1, 1, 1, false, false, true, false, true, true, false),
            ('2024-01-21', 'Sandalias', 'Birkenstock', 'Arizona', 'Marrón', '9', 'BIR-AZ-007', '7890123456789', 95.00, 1.05, 1.20, 1.12, 12, 7, 10, 4, 3, 2, 3, false, true, true, false, false, false, true),
            ('2024-01-22', 'Zapatos', 'Vans', 'Old Skool', 'Rojo', '8', 'VAN-OS-008', '8901234567890', 60.00, 1.25, 1.15, 1.18, 25, 15, 20, 10, 7, 5, 8, true, true, false, true, true, false, true);
    END IF;
END
$$;

-- Clean up backup table (optional)
-- DROP TABLE IF EXISTS products_backup;
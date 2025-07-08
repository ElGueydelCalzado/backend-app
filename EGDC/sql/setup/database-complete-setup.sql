-- EGDC Complete Database Setup - Fresh Installation
-- This script creates everything from scratch with automatic pricing system
-- Run this in your Supabase SQL Editor after dropping existing tables

-- Create the products table with automatic pricing
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    fecha DATE DEFAULT CURRENT_DATE,
    categoria TEXT NOT NULL,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    color TEXT,
    talla TEXT,
    sku TEXT,
    ean TEXT,
    costo DECIMAL(10,2),
    
    -- Pricing modifiers (editable by user)
    shein_modifier DECIMAL(4,2) DEFAULT 1.00,
    shopify_modifier DECIMAL(4,2) DEFAULT 1.00,
    meli_modifier DECIMAL(4,2) DEFAULT 1.00,
    
    -- Auto-calculated prices using your formulas
    precio_shein DECIMAL(10,2) GENERATED ALWAYS AS (
        CASE 
            WHEN costo IS NOT NULL AND shein_modifier IS NOT NULL 
            THEN CEILING((costo * shein_modifier * 1.2) / 5) * 5
            ELSE NULL 
        END
    ) STORED,
    precio_egdc DECIMAL(10,2) GENERATED ALWAYS AS (
        CASE 
            WHEN costo IS NOT NULL AND shopify_modifier IS NOT NULL 
            THEN CEILING(((costo * shopify_modifier + 100) * 1.25) / 5) * 5
            ELSE NULL 
        END
    ) STORED,
    precio_meli DECIMAL(10,2) GENERATED ALWAYS AS (
        CASE 
            WHEN costo IS NOT NULL AND meli_modifier IS NOT NULL 
            THEN CEILING(((costo * meli_modifier + 100) * 1.395) / 5) * 5
            ELSE NULL 
        END
    ) STORED,
    
    -- Multi-location inventory
    inv_egdc INTEGER DEFAULT 0,
    inv_fami INTEGER DEFAULT 0,
    inv_bodega_principal INTEGER DEFAULT 0,
    inv_tienda_centro INTEGER DEFAULT 0,
    inv_tienda_norte INTEGER DEFAULT 0,
    inv_tienda_sur INTEGER DEFAULT 0,
    inv_online INTEGER DEFAULT 0,
    inventory_total INTEGER DEFAULT 0,
    
    -- Platform availability flags
    shein BOOLEAN DEFAULT FALSE,
    meli BOOLEAN DEFAULT FALSE,
    shopify BOOLEAN DEFAULT FALSE,
    tiktok BOOLEAN DEFAULT FALSE,
    upseller BOOLEAN DEFAULT FALSE,
    go_trendier BOOLEAN DEFAULT FALSE,
    google_drive BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the change_logs table for comprehensive audit trail
CREATE TABLE change_logs (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    change_type TEXT NOT NULL DEFAULT 'update',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comprehensive indexes for optimal performance
-- Basic product info indexes
CREATE INDEX idx_products_categoria ON products(categoria);
CREATE INDEX idx_products_marca ON products(marca);
CREATE INDEX idx_products_modelo ON products(modelo);
CREATE INDEX idx_products_color ON products(color);
CREATE INDEX idx_products_talla ON products(talla);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_ean ON products(ean);
CREATE INDEX idx_products_fecha ON products(fecha);

-- Pricing indexes
CREATE INDEX idx_products_costo ON products(costo);
CREATE INDEX idx_products_shein_modifier ON products(shein_modifier);
CREATE INDEX idx_products_shopify_modifier ON products(shopify_modifier);
CREATE INDEX idx_products_meli_modifier ON products(meli_modifier);
CREATE INDEX idx_products_precio_shein ON products(precio_shein);
CREATE INDEX idx_products_precio_egdc ON products(precio_egdc);
CREATE INDEX idx_products_precio_meli ON products(precio_meli);

-- Inventory indexes
CREATE INDEX idx_products_inv_egdc ON products(inv_egdc);
CREATE INDEX idx_products_inv_fami ON products(inv_fami);
CREATE INDEX idx_products_inv_bodega_principal ON products(inv_bodega_principal);
CREATE INDEX idx_products_inv_tienda_centro ON products(inv_tienda_centro);
CREATE INDEX idx_products_inv_tienda_norte ON products(inv_tienda_norte);
CREATE INDEX idx_products_inv_tienda_sur ON products(inv_tienda_sur);
CREATE INDEX idx_products_inv_online ON products(inv_online);
CREATE INDEX idx_products_inventory_total ON products(inventory_total);

-- Platform availability indexes
CREATE INDEX idx_products_shein ON products(shein);
CREATE INDEX idx_products_meli ON products(meli);
CREATE INDEX idx_products_shopify ON products(shopify);
CREATE INDEX idx_products_tiktok ON products(tiktok);

-- Change logs indexes
CREATE INDEX idx_change_logs_product_id ON change_logs(product_id);
CREATE INDEX idx_change_logs_created_at ON change_logs(created_at);
CREATE INDEX idx_change_logs_field_name ON change_logs(field_name);

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for full access (customize based on your auth needs)
CREATE POLICY "Allow all operations on products" ON products FOR ALL USING (TRUE);
CREATE POLICY "Allow all operations on change_logs" ON change_logs FOR ALL USING (TRUE);

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

-- Create triggers
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_inventory_total 
    BEFORE INSERT OR UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_inventory_total();

-- Insert comprehensive sample data with various pricing scenarios
INSERT INTO products (
    fecha, categoria, marca, modelo, color, talla, sku, ean, costo,
    shein_modifier, shopify_modifier, meli_modifier,
    inv_egdc, inv_fami, inv_bodega_principal, inv_tienda_centro, inv_tienda_norte, inv_tienda_sur, inv_online,
    shein, meli, shopify, tiktok, upseller, go_trendier, google_drive
) VALUES
    -- Premium brands with higher modifiers
    ('2024-01-15', 'Zapatos', 'Nike', 'Air Max 90', 'Blanco', '9', 'NIK-AM90-001', '1234567890123', 89.99, 1.10, 1.05, 1.15, 15, 8, 12, 5, 3, 2, 4, true, true, true, false, false, false, true),
    ('2024-01-16', 'Zapatos', 'Adidas', 'Stan Smith', 'Verde', '8.5', 'ADI-SS-002', '2345678901234', 75.50, 1.20, 1.00, 1.10, 22, 12, 18, 8, 6, 4, 7, true, true, false, true, false, false, true),
    ('2024-01-17', 'Botas', 'Timberland', '6-Inch Premium', 'Amarillo', '10', 'TIM-6IP-003', '3456789012345', 120.00, 1.00, 1.15, 1.05, 8, 5, 6, 2, 1, 1, 2, false, true, true, false, true, false, false),
    
    -- Budget-friendly brands with competitive pricing
    ('2024-01-18', 'Sandalias', 'Havaianas', 'Brasil', 'Azul', '7', 'HAV-BR-004', '4567890123456', 25.99, 1.30, 1.25, 1.20, 50, 30, 25, 15, 10, 8, 12, true, false, false, true, false, true, true),
    ('2024-01-19', 'Zapatos', 'Converse', 'Chuck Taylor All Star', 'Negro', '9.5', 'CON-CTA-005', '5678901234567', 55.00, 1.15, 1.10, 1.08, 18, 10, 14, 6, 4, 3, 5, true, true, true, true, false, false, false),
    
    -- Luxury brands with premium pricing strategy
    ('2024-01-20', 'Botas', 'Dr. Martens', '1460 Originals', 'Negro', '8', 'DRM-1460-006', '6789012345678', 150.00, 0.95, 1.00, 1.00, 6, 3, 4, 2, 1, 1, 1, false, false, true, false, true, true, false),
    ('2024-01-21', 'Sandalias', 'Birkenstock', 'Arizona', 'Marrón', '9', 'BIR-AZ-007', '7890123456789', 95.00, 1.05, 1.20, 1.12, 12, 7, 10, 4, 3, 2, 3, false, true, true, false, false, false, true),
    
    -- Youth brands with aggressive online pricing
    ('2024-01-22', 'Zapatos', 'Vans', 'Old Skool', 'Rojo', '8', 'VAN-OS-008', '8901234567890', 60.00, 1.25, 1.15, 1.18, 25, 15, 20, 10, 7, 5, 8, true, true, false, true, true, false, true),
    
    -- New arrivals with test pricing
    ('2024-01-23', 'Zapatos', 'Puma', 'RS-X', 'Multicolor', '10.5', 'PUM-RSX-009', '9012345678901', 85.00, 1.12, 1.08, 1.14, 20, 15, 25, 12, 8, 6, 10, true, true, true, true, false, true, true),
    ('2024-01-24', 'Botas', 'Caterpillar', 'Colorado', 'Café', '11', 'CAT-COL-010', '0123456789012', 110.00, 1.05, 1.12, 1.08, 10, 8, 15, 5, 3, 2, 5, false, true, true, false, true, false, false);

-- Create a view for easy price comparison analysis
CREATE VIEW price_analysis AS
SELECT 
    id,
    categoria,
    marca,
    modelo,
    costo,
    shein_modifier,
    shopify_modifier,
    meli_modifier,
    precio_shein,
    precio_egdc,
    precio_meli,
    -- Calculate markup percentages
    ROUND(((precio_shein - costo) / costo * 100), 2) as shein_markup_pct,
    ROUND(((precio_egdc - costo) / costo * 100), 2) as shopify_markup_pct,
    ROUND(((precio_meli - costo) / costo * 100), 2) as meli_markup_pct,
    inventory_total
FROM products
WHERE costo IS NOT NULL
ORDER BY categoria, marca, modelo;

-- Create a view for inventory summary by location
CREATE VIEW inventory_summary AS
SELECT 
    categoria,
    COUNT(*) as total_products,
    SUM(inv_egdc) as total_egdc,
    SUM(inv_fami) as total_fami,
    SUM(inv_bodega_principal) as total_bodega,
    SUM(inv_tienda_centro) as total_centro,
    SUM(inv_tienda_norte) as total_norte,
    SUM(inv_tienda_sur) as total_sur,
    SUM(inv_online) as total_online,
    SUM(inventory_total) as grand_total
FROM products
GROUP BY categoria
ORDER BY categoria;

-- Helpful comment for the user
SELECT 'Database setup complete! You now have:' as message
UNION ALL
SELECT '✅ Automatic pricing with your formulas'
UNION ALL
SELECT '✅ Multi-location inventory tracking'
UNION ALL
SELECT '✅ Comprehensive audit logging'
UNION ALL
SELECT '✅ Performance-optimized indexes'
UNION ALL
SELECT '✅ Sample data with various pricing scenarios'
UNION ALL
SELECT '✅ Helpful views for analysis'; 
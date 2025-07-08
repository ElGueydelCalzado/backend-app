-- Drop existing products table and recreate with new structure
-- WARNING: This will delete all existing data

-- Drop existing table
DROP TABLE IF EXISTS products CASCADE;

-- Create new products table with updated structure
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    categoria TEXT,
    marca TEXT,
    modelo TEXT,
    color TEXT,
    talla TEXT,
    sku TEXT UNIQUE,
    ean TEXT,
    costo DECIMAL(10,2),
    google_drive TEXT,
    shein_modifier DECIMAL(5,2) DEFAULT 1.5,
    shopify_modifier DECIMAL(5,2) DEFAULT 2.0,
    meli_modifier DECIMAL(5,2) DEFAULT 2.5,
    precio_shein DECIMAL(10,2) GENERATED ALWAYS AS (
        CASE 
            WHEN costo IS NOT NULL AND shein_modifier IS NOT NULL 
            THEN CEILING((costo * shein_modifier * 1.2) / 5) * 5
            ELSE NULL 
        END
    ) STORED,
    precio_shopify DECIMAL(10,2) GENERATED ALWAYS AS (
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
    inv_egdc INTEGER DEFAULT 0,
    inv_fami INTEGER DEFAULT 0,
    inventory_total INTEGER GENERATED ALWAYS AS (
        COALESCE(inv_egdc, 0) + COALESCE(inv_fami, 0)
    ) STORED,
    shein BOOLEAN DEFAULT FALSE,
    meli BOOLEAN DEFAULT FALSE,
    shopify BOOLEAN DEFAULT FALSE,
    tiktok BOOLEAN DEFAULT FALSE,
    upseller BOOLEAN DEFAULT FALSE,
    go_trendier BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_products_categoria ON products(categoria);
CREATE INDEX idx_products_marca ON products(marca);
CREATE INDEX idx_products_modelo ON products(modelo);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_created_at ON products(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (optional)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust as needed)
CREATE POLICY "Allow all operations on products" ON products
    FOR ALL USING (true);

-- Grant permissions (adjust role name as needed)
GRANT ALL ON products TO authenticated;
GRANT ALL ON products TO anon;
GRANT USAGE, SELECT ON SEQUENCE products_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE products_id_seq TO anon;

-- Table created successfully! 
-- You can now import your SKU data.
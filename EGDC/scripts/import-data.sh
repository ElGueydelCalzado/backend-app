#!/bin/bash

# EGDC Data Import Script
# This script imports your data into Google Cloud SQL

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="egdc-test"
INSTANCE_NAME="egdc-inventory-db"
DB_NAME="egdc_inventory"
DB_USER="egdc_user"
DB_PASSWORD="EgdcSecure2024!"

echo -e "${GREEN}🚀 Importing EGDC data to Google Cloud SQL${NC}"

# Source gcloud
source ~/google-cloud-sdk/path.bash.inc

# Get the latest export files
EXPORT_DIR="./supabase_export"
PRODUCTS_SQL=$(ls -t ${EXPORT_DIR}/products_insert_*.sql | head -1)
CHANGELOGS_SQL=$(ls -t ${EXPORT_DIR}/change_logs_insert_*.sql | head -1)

echo -e "${GREEN}📁 Using export files:${NC}"
echo -e "   Products: $PRODUCTS_SQL"
echo -e "   Change logs: $CHANGELOGS_SQL"

# Create database schema first
echo -e "${GREEN}🏗️  Creating database schema...${NC}"

# Use the complete database setup
gcloud sql connect $INSTANCE_NAME --user=$DB_USER --database=$DB_NAME << 'EOF'
-- Create the products table with automatic pricing
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    fecha DATE DEFAULT CURRENT_DATE,
    categoria TEXT,
    marca TEXT,
    modelo TEXT,
    color TEXT,
    talla TEXT,
    sku TEXT,
    ean TEXT,
    costo DECIMAL(10,2),
    google_drive TEXT,
    
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
    
    -- Multi-location inventory
    inv_egdc INTEGER DEFAULT 0,
    inv_fami INTEGER DEFAULT 0,
    inv_bodega_principal INTEGER DEFAULT 0,
    inv_tienda_centro INTEGER DEFAULT 0,
    inv_tienda_norte INTEGER DEFAULT 0,
    inv_tienda_sur INTEGER DEFAULT 0,
    inv_online INTEGER DEFAULT 0,
    inventory_total INTEGER GENERATED ALWAYS AS (
        COALESCE(inv_egdc, 0) + COALESCE(inv_fami, 0) + COALESCE(inv_bodega_principal, 0) + 
        COALESCE(inv_tienda_centro, 0) + COALESCE(inv_tienda_norte, 0) + 
        COALESCE(inv_tienda_sur, 0) + COALESCE(inv_online, 0)
    ) STORED,
    
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

-- Create the change_logs table for comprehensive audit trail
CREATE TABLE IF NOT EXISTS change_logs (
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
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

\q
EOF

echo -e "${GREEN}✅ Database schema created successfully!${NC}"

# Import products data
echo -e "${GREEN}📦 Importing products data...${NC}"
if [ -f "$PRODUCTS_SQL" ]; then
    gcloud sql connect $INSTANCE_NAME --user=$DB_USER --database=$DB_NAME < "$PRODUCTS_SQL"
    echo -e "${GREEN}✅ Products data imported successfully!${NC}"
else
    echo -e "${RED}❌ Products SQL file not found!${NC}"
    exit 1
fi

# Import change logs data
echo -e "${GREEN}📋 Importing change logs data...${NC}"
if [ -f "$CHANGELOGS_SQL" ]; then
    gcloud sql connect $INSTANCE_NAME --user=$DB_USER --database=$DB_NAME < "$CHANGELOGS_SQL"
    echo -e "${GREEN}✅ Change logs data imported successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  Change logs SQL file not found, skipping...${NC}"
fi

# Verify import
echo -e "${GREEN}🔍 Verifying data import...${NC}"
gcloud sql connect $INSTANCE_NAME --user=$DB_USER --database=$DB_NAME << 'EOF'
SELECT 'Products count:' as info, COUNT(*) as count FROM products;
SELECT 'Change logs count:' as info, COUNT(*) as count FROM change_logs;
SELECT 'Sample products:' as info;
SELECT id, categoria, marca, modelo, costo, precio_shein, precio_shopify, precio_meli, inventory_total 
FROM products 
LIMIT 5;
\q
EOF

echo -e "${GREEN}✅ Data import completed successfully!${NC}"
echo -e "${GREEN}🎉 Your EGDC inventory system is now running on Google Cloud SQL!${NC}"
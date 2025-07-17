-- Database schema for expandable navigation settings
-- Adding warehouses and marketplaces configuration tables

-- WAREHOUSES CONFIGURATION TABLE
CREATE TABLE IF NOT EXISTS warehouses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,           -- 'FAMI', 'MOLLY', 'OSIEL'
  slug VARCHAR(50) NOT NULL UNIQUE,     -- 'fami', 'molly', 'osiel'
  type VARCHAR(50) DEFAULT 'external',  -- 'own', 'external', 'supplier'
  status VARCHAR(50) DEFAULT 'pending', -- 'active', 'pending', 'error', 'disabled'
  
  -- Display Information
  icon VARCHAR(10) DEFAULT '🏭',
  description TEXT,
  
  -- API Connection Settings
  api_url VARCHAR(500),
  api_key VARCHAR(500),
  api_secret VARCHAR(500),
  webhook_url VARCHAR(500),
  
  -- Sync Configuration
  sync_enabled BOOLEAN DEFAULT false,
  sync_frequency INTEGER DEFAULT 15,    -- minutes
  sync_bidirectional BOOLEAN DEFAULT false,
  notify_low_stock BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP,
  
  -- Business Rules
  min_stock_threshold INTEGER DEFAULT 5,
  auto_reorder BOOLEAN DEFAULT false,
  default_markup_percentage DECIMAL(5,2) DEFAULT 0.00,
  
  -- Product Count (updated by triggers)
  product_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- MARKETPLACES CONFIGURATION TABLE  
CREATE TABLE IF NOT EXISTS marketplaces (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,           -- 'MercadoLibre', 'Shopify', 'SHEIN'
  slug VARCHAR(50) NOT NULL UNIQUE,     -- 'mercadolibre', 'shopify', 'shein'
  platform VARCHAR(50) NOT NULL,       -- 'mercadolibre', 'shopify', 'shein', 'tiktok'
  status VARCHAR(50) DEFAULT 'pending', -- 'active', 'pending', 'error', 'disabled'
  
  -- Display Information
  icon VARCHAR(10) DEFAULT '🛒',
  description TEXT,
  
  -- API Credentials
  app_id VARCHAR(500),
  client_id VARCHAR(500),
  client_secret VARCHAR(500),
  access_token VARCHAR(1000),
  refresh_token VARCHAR(1000),
  
  -- Sync Settings
  sync_products BOOLEAN DEFAULT true,
  sync_prices BOOLEAN DEFAULT true,
  sync_inventory BOOLEAN DEFAULT true,
  auto_publish BOOLEAN DEFAULT false,
  import_orders BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP,
  
  -- Platform-specific Settings
  store_url VARCHAR(500),              -- For Shopify
  seller_id VARCHAR(100),              -- For MercadoLibre
  store_name VARCHAR(200),             -- Display name
  
  -- Product Count (updated by sync)
  published_products_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- WAREHOUSE SYNC LOGS TABLE
CREATE TABLE IF NOT EXISTS warehouse_sync_logs (
  id SERIAL PRIMARY KEY,
  warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL,      -- 'full', 'incremental', 'manual'
  status VARCHAR(50) NOT NULL,         -- 'success', 'error', 'partial'
  products_synced INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  error_message TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- MARKETPLACE SYNC LOGS TABLE
CREATE TABLE IF NOT EXISTS marketplace_sync_logs (
  id SERIAL PRIMARY KEY,
  marketplace_id INTEGER REFERENCES marketplaces(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL,      -- 'products', 'prices', 'inventory', 'orders'
  status VARCHAR(50) NOT NULL,         -- 'success', 'error', 'partial'
  items_synced INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  error_message TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample warehouse data
INSERT INTO warehouses (name, slug, type, status, icon, description, sync_enabled, product_count) VALUES
('FAMI', 'fami', 'supplier', 'active', '🏭', 'Proveedor FAMI - Calzado deportivo', true, 2450),
('MOLLY', 'molly', 'supplier', 'active', '🏭', 'Proveedor MOLLY - Calzado casual', true, 1320),
('OSIEL', 'osiel', 'supplier', 'pending', '🏭', 'Proveedor OSIEL - Configuración pendiente', false, 0)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  description = EXCLUDED.description,
  sync_enabled = EXCLUDED.sync_enabled,
  product_count = EXCLUDED.product_count,
  updated_at = NOW();

-- Insert sample marketplace data
INSERT INTO marketplaces (name, slug, platform, status, icon, description, sync_products, published_products_count) VALUES
('MercadoLibre', 'mercadolibre', 'mercadolibre', 'active', '🛒', 'Marketplace líder en Latinoamérica', true, 850),
('Shopify', 'shopify', 'shopify', 'active', '🛍️', 'Tienda online EGDC', true, 1200),
('SHEIN', 'shein', 'shein', 'error', '👗', 'Marketplace de moda global', false, 0),
('TikTok Shop', 'tiktok', 'tiktok', 'pending', '🎵', 'Social commerce platform', false, 0)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  description = EXCLUDED.description,
  sync_products = EXCLUDED.sync_products,
  published_products_count = EXCLUDED.published_products_count,
  updated_at = NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_warehouses_status ON warehouses(status);
CREATE INDEX IF NOT EXISTS idx_warehouses_sync_enabled ON warehouses(sync_enabled);
CREATE INDEX IF NOT EXISTS idx_marketplaces_status ON marketplaces(status);
CREATE INDEX IF NOT EXISTS idx_marketplaces_platform ON marketplaces(platform);

-- Add updated_at trigger for warehouses
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_warehouses_updated_at ON warehouses;
CREATE TRIGGER update_warehouses_updated_at 
    BEFORE UPDATE ON warehouses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_marketplaces_updated_at ON marketplaces;
CREATE TRIGGER update_marketplaces_updated_at 
    BEFORE UPDATE ON marketplaces 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ADD WAREHOUSE INVENTORY COLUMNS TO GCP PRODUCTION DATABASE
-- New columns for warehouse inventory management

-- Add warehouse-specific columns to products table
DO $$ 
BEGIN
    -- Add Clave column (Product Code/Key)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'clave') THEN
        ALTER TABLE products ADD COLUMN clave VARCHAR(100);
        CREATE INDEX IF NOT EXISTS idx_products_clave ON products(clave);
        RAISE NOTICE 'Added clave column';
    END IF;
    
    -- Add Marca column (Brand - different from existing marca?)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'marca_warehouse') THEN
        ALTER TABLE products ADD COLUMN marca_warehouse VARCHAR(100);
        CREATE INDEX IF NOT EXISTS idx_products_marca_warehouse ON products(marca_warehouse);
        RAISE NOTICE 'Added marca_warehouse column';
    END IF;
    
    -- Add Numeracion column (Numbering/Size System)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'numeracion') THEN
        ALTER TABLE products ADD COLUMN numeracion VARCHAR(50);
        CREATE INDEX IF NOT EXISTS idx_products_numeracion ON products(numeracion);
        RAISE NOTICE 'Added numeracion column';
    END IF;
    
    -- Add Producto column (Product Name - different from existing modelo?)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'producto') THEN
        ALTER TABLE products ADD COLUMN producto VARCHAR(255);
        CREATE INDEX IF NOT EXISTS idx_products_producto ON products(producto);
        RAISE NOTICE 'Added producto column';
    END IF;
    
    -- Add Costo column (Cost - different from existing costo?)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'costo_warehouse') THEN
        ALTER TABLE products ADD COLUMN costo_warehouse DECIMAL(10,2);
        CREATE INDEX IF NOT EXISTS idx_products_costo_warehouse ON products(costo_warehouse);
        RAISE NOTICE 'Added costo_warehouse column';
    END IF;
    
    -- Add Precio column (Regular Price)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'precio_regular') THEN
        ALTER TABLE products ADD COLUMN precio_regular DECIMAL(10,2);
        CREATE INDEX IF NOT EXISTS idx_products_precio_regular ON products(precio_regular);
        RAISE NOTICE 'Added precio_regular column';
    END IF;
    
    -- Add Precio de Contado column (Cash Price)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'precio_contado') THEN
        ALTER TABLE products ADD COLUMN precio_contado DECIMAL(10,2);
        CREATE INDEX IF NOT EXISTS idx_products_precio_contado ON products(precio_contado);
        RAISE NOTICE 'Added precio_contado column';
    END IF;
    
    RAISE NOTICE 'Warehouse inventory columns added successfully!';
END $$;
import { Product } from './types'

// Dummy data for EGDC warehouse
export const EGDC_WAREHOUSE_DATA: Product[] = [
  {
    id: 1001,
    categoria: 'Calzado Deportivo',
    marca: 'Nike',
    modelo: 'Air Max 90',
    color: 'Blanco',
    talla: '42',
    sku: 'NIK-AM90-WHT-42',
    ean: '123456789012',
    costo: 150.00,
    shein_modifier: 1.5,
    shopify_modifier: 1.8,
    meli_modifier: 2.0,
    precio_shein: 270,
    precio_shopify: 465,
    precio_meli: 535,
    inv_egdc: 15,
    inv_fami: 0,
    inv_osiel: 0,
    inv_molly: 0,
    inventory_total: 15,
    shein: true,
    meli: true,
    shopify: true,
    tiktok: false,
    upseller: false,
    go_trendier: true,
    google_drive: 'https://drive.google.com/file/d/example1',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z'
  },
  {
    id: 1002,
    categoria: 'Calzado Deportivo',
    marca: 'Adidas',
    modelo: 'Ultraboost 22',
    color: 'Negro',
    talla: '40',
    sku: 'ADI-UB22-BLK-40',
    ean: '123456789013',
    costo: 180.00,
    shein_modifier: 1.4,
    shopify_modifier: 1.7,
    meli_modifier: 1.9,
    precio_shein: 305,
    precio_shopify: 510,
    precio_meli: 580,
    inv_egdc: 8,
    inv_fami: 0,
    inv_osiel: 0,
    inv_molly: 0,
    inventory_total: 8,
    shein: false,
    meli: true,
    shopify: true,
    tiktok: true,
    upseller: false,
    go_trendier: false,
    google_drive: null,
    created_at: '2024-01-16T14:20:00Z',
    updated_at: '2024-01-16T14:20:00Z'
  }
]

// Dummy data for FAMI wholesale business
export const FAMI_WAREHOUSE_DATA: Product[] = [
  {
    id: 2001,
    categoria: 'Calzado Casual',
    marca: 'Vans',
    modelo: 'Old Skool',
    color: 'Negro/Blanco',
    talla: '38',
    sku: 'FAMI-VAN-OS-BW-38',
    ean: '123456789014',
    costo: 45.00, // FAMI's internal cost
    shein_modifier: 1.6,
    shopify_modifier: 1.9,
    meli_modifier: 2.1,
    precio_shein: 120, // FAMI's price to EGDC (wholesale)
    precio_shopify: 120, // Same wholesale price for EGDC
    precio_meli: 120, // Same wholesale price for EGDC
    inv_egdc: 0, // EGDC doesn't own this inventory
    inv_fami: 25, // FAMI has 25 units available
    inv_osiel: 0,
    inv_molly: 0,
    inventory_total: 25,
    shein: false, // FAMI's platform availability (not relevant to EGDC)
    meli: false,
    shopify: false,
    tiktok: false,
    upseller: false,
    go_trendier: false,
    google_drive: 'https://drive.google.com/file/d/fami-example2',
    created_at: '2024-01-17T09:15:00Z',
    updated_at: '2024-01-17T09:15:00Z'
  },
  {
    id: 2002,
    categoria: 'Calzado Casual',
    marca: 'Converse',
    modelo: 'Chuck Taylor All Star',
    color: 'Rojo',
    talla: '41',
    sku: 'FAMI-CON-CT-RED-41',
    ean: '123456789015',
    costo: 38.00, // FAMI's internal cost
    shein_modifier: 1.7,
    shopify_modifier: 2.0,
    meli_modifier: 2.2,
    precio_shein: 85, // FAMI's price to EGDC (wholesale)
    precio_shopify: 85, // Same wholesale price for EGDC
    precio_meli: 85, // Same wholesale price for EGDC
    inv_egdc: 0, // EGDC doesn't own this inventory
    inv_fami: 18, // FAMI has 18 units available
    inv_osiel: 0,
    inv_molly: 0,
    inventory_total: 18,
    shein: false, // FAMI's platform availability (not relevant to EGDC)
    meli: false,
    shopify: false,
    tiktok: false,
    upseller: false,
    go_trendier: false,
    google_drive: null,
    created_at: '2024-01-18T11:45:00Z',
    updated_at: '2024-01-18T11:45:00Z'
  }
]

// Dummy data for Osiel wholesale business
export const OSIEL_WAREHOUSE_DATA: Product[] = [
  {
    id: 3001,
    categoria: 'Calzado Formal',
    marca: 'Clarks',
    modelo: 'Desert Boot',
    color: 'Marrón',
    talla: '43',
    sku: 'OSIEL-CLA-DB-BRN-43',
    ean: '123456789016',
    costo: 65.00, // Osiel's internal cost
    shein_modifier: 1.3,
    shopify_modifier: 1.6,
    meli_modifier: 1.8,
    precio_shein: 140, // Osiel's price to EGDC (wholesale)
    precio_shopify: 140, // Same wholesale price for EGDC
    precio_meli: 140, // Same wholesale price for EGDC
    inv_egdc: 0, // EGDC doesn't own this inventory
    inv_fami: 0,
    inv_osiel: 12, // Osiel has 12 units available
    inv_molly: 0,
    inventory_total: 12,
    shein: false, // Osiel's platform availability (not relevant to EGDC)
    meli: false,
    shopify: false,
    tiktok: false,
    upseller: false,
    go_trendier: false,
    google_drive: 'https://drive.google.com/file/d/osiel-example3',
    created_at: '2024-01-19T13:30:00Z',
    updated_at: '2024-01-19T13:30:00Z'
  },
  {
    id: 3002,
    categoria: 'Calzado Formal',
    marca: 'Cole Haan',
    modelo: 'Oxford Dress Shoe',
    color: 'Negro',
    talla: '42',
    sku: 'OSIEL-CH-OX-BLK-42',
    ean: '123456789019',
    costo: 85.00, // Osiel's internal cost
    shein_modifier: 1.4,
    shopify_modifier: 1.7,
    meli_modifier: 1.9,
    precio_shein: 180, // Osiel's price to EGDC (wholesale)
    precio_shopify: 180, // Same wholesale price for EGDC
    precio_meli: 180, // Same wholesale price for EGDC
    inv_egdc: 0, // EGDC doesn't own this inventory
    inv_fami: 0,
    inv_osiel: 8, // Osiel has 8 units available
    inv_molly: 0,
    inventory_total: 8,
    shein: false, // Osiel's platform availability (not relevant to EGDC)
    meli: false,
    shopify: false,
    tiktok: false,
    upseller: false,
    go_trendier: false,
    google_drive: null,
    created_at: '2024-01-19T14:15:00Z',
    updated_at: '2024-01-19T14:15:00Z'
  }
]

// Dummy data for Molly wholesale business  
export const MOLLY_WAREHOUSE_DATA: Product[] = [
  {
    id: 4001,
    categoria: 'Calzado Infantil',
    marca: 'Stride Rite',
    modelo: 'Made2Play Sneaker',
    color: 'Rosa',
    talla: '28',
    sku: 'MOLLY-STR-M2P-PNK-28',
    ean: '123456789017',
    costo: 32.00, // Molly's internal cost
    shein_modifier: 1.8,
    shopify_modifier: 2.1,
    meli_modifier: 2.3,
    precio_shein: 75, // Molly's price to EGDC (wholesale)
    precio_shopify: 75, // Same wholesale price for EGDC
    precio_meli: 75, // Same wholesale price for EGDC
    inv_egdc: 0, // EGDC doesn't own this inventory
    inv_fami: 0,
    inv_osiel: 0,
    inv_molly: 30, // Molly has 30 units available
    inventory_total: 30,
    shein: false, // Molly's platform availability (not relevant to EGDC)
    meli: false,
    shopify: false,
    tiktok: false,
    upseller: false,
    go_trendier: false,
    google_drive: null,
    created_at: '2024-01-20T16:00:00Z',
    updated_at: '2024-01-20T16:00:00Z'
  },
  {
    id: 4002,
    categoria: 'Calzado Infantil',
    marca: 'New Balance',
    modelo: 'Kids 574',
    color: 'Azul',
    talla: '32',
    sku: 'MOLLY-NB-574K-BLU-32',
    ean: '123456789018',
    costo: 42.00, // Molly's internal cost
    shein_modifier: 1.5,
    shopify_modifier: 1.8,
    meli_modifier: 2.0,
    precio_shein: 95, // Molly's price to EGDC (wholesale)
    precio_shopify: 95, // Same wholesale price for EGDC
    precio_meli: 95, // Same wholesale price for EGDC
    inv_egdc: 0, // EGDC doesn't own this inventory
    inv_fami: 0,
    inv_osiel: 0,
    inv_molly: 22, // Molly has 22 units available
    inventory_total: 22,
    shein: false, // Molly's platform availability (not relevant to EGDC)
    meli: false,
    shopify: false,
    tiktok: false,
    upseller: false,
    go_trendier: false,
    google_drive: 'https://drive.google.com/file/d/molly-example4',
    created_at: '2024-01-21T08:45:00Z',
    updated_at: '2024-01-21T08:45:00Z'
  },
  {
    id: 4003,
    categoria: 'Calzado Infantil',
    marca: 'Skechers',
    modelo: 'Light-Up Sneakers',
    color: 'Multicolor',
    talla: '30',
    sku: 'MOLLY-SKE-LU-MC-30',
    ean: '123456789020',
    costo: 28.00, // Molly's internal cost
    shein_modifier: 1.6,
    shopify_modifier: 1.9,
    meli_modifier: 2.1,
    precio_shein: 65, // Molly's price to EGDC (wholesale)
    precio_shopify: 65, // Same wholesale price for EGDC
    precio_meli: 65, // Same wholesale price for EGDC
    inv_egdc: 0, // EGDC doesn't own this inventory
    inv_fami: 0,
    inv_osiel: 0,
    inv_molly: 15, // Molly has 15 units available
    inventory_total: 15,
    shein: false, // Molly's platform availability (not relevant to EGDC)
    meli: false,
    shopify: false,
    tiktok: false,
    upseller: false,
    go_trendier: false,
    google_drive: null,
    created_at: '2024-01-21T10:30:00Z',
    updated_at: '2024-01-21T10:30:00Z'
  }
]

// Helper function to get data by business (no combined view - each business is independent)
export function getWarehouseData(warehouse: 'egdc' | 'fami' | 'osiel' | 'molly'): Product[] {
  switch (warehouse) {
    case 'egdc':
      return EGDC_WAREHOUSE_DATA
    case 'fami':
      return FAMI_WAREHOUSE_DATA
    case 'osiel':
      return OSIEL_WAREHOUSE_DATA
    case 'molly':
      return MOLLY_WAREHOUSE_DATA
    default:
      return EGDC_WAREHOUSE_DATA
  }
}
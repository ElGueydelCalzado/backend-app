import { Product } from './types'

// Default tenant ID for mock data (EGDC tenant)
const DEFAULT_TENANT_ID = '471e9c26-a232-46b3-a992-2932e5dfadf4' // EGDC tenant ID

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 1,
    tenant_id: DEFAULT_TENANT_ID,
    categoria: 'Zapatos',
    marca: 'Nike',
    modelo: 'Air Max 90',
    color: 'Blanco',
    talla: '42',
    sku: 'NIKE-AM90-WHT-42',
    ean: '1234567890123',
    costo: 150,
    shein_modifier: 1.5,
    shopify_modifier: 1.8,
    meli_modifier: 2.0,
    precio_shein: 270,
    precio_shopify: 420,
    precio_meli: 450,
    inv_egdc: 5,
    inv_fami: 3,
    inv_osiel: 2,
    inv_molly: 1,
    inventory_total: 11,
    shein: true,
    meli: true,
    shopify: true,
    tiktok: false,
    upseller: false,
    go_trendier: true,
    google_drive: 'https://drive.google.com/file/d/example1',
    height_cm: 15,
    length_cm: 30,
    thickness_cm: 12,
    weight_grams: 800,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: 2,
    tenant_id: DEFAULT_TENANT_ID,
    categoria: 'Zapatos',
    marca: 'Adidas',
    modelo: 'Stan Smith',
    color: 'Verde',
    talla: '40',
    sku: 'ADIDAS-SS-GRN-40',
    ean: '1234567890124',
    costo: 120,
    shein_modifier: 1.4,
    shopify_modifier: 1.7,
    meli_modifier: 1.9,
    precio_shein: 202,
    precio_shopify: 374,
    precio_meli: 396,
    inv_egdc: 8,
    inv_fami: 4,
    inv_osiel: 3,
    inv_molly: 2,
    inventory_total: 17,
    shein: true,
    meli: false,
    shopify: true,
    tiktok: true,
    upseller: false,
    go_trendier: false,
    google_drive: 'https://drive.google.com/file/d/example2',
    height_cm: 14,
    length_cm: 28,
    thickness_cm: 11,
    weight_grams: 750,
    created_at: '2024-01-16T10:00:00Z',
    updated_at: '2024-01-16T10:00:00Z'
  },
  {
    id: 3,
    tenant_id: DEFAULT_TENANT_ID,
    categoria: 'Sandalias',
    marca: 'Havaianas',
    modelo: 'Brasil',
    color: 'Azul',
    talla: '38',
    sku: 'HAV-BR-BLU-38',
    ean: '1234567890125',
    costo: 45,
    shein_modifier: 1.8,
    shopify_modifier: 2.2,
    meli_modifier: 2.5,
    precio_shein: 98,
    precio_shopify: 199,
    precio_meli: 213,
    inv_egdc: 15,
    inv_fami: 10,
    inv_osiel: 8,
    inv_molly: 5,
    inventory_total: 38,
    shein: false,
    meli: true,
    shopify: true,
    tiktok: true,
    upseller: true,
    go_trendier: true,
    google_drive: 'https://drive.google.com/file/d/example3',
    height_cm: 3,
    length_cm: 25,
    thickness_cm: 8,
    weight_grams: 200,
    created_at: '2024-01-17T10:00:00Z',
    updated_at: '2024-01-17T10:00:00Z'
  },
  {
    id: 4,
    tenant_id: DEFAULT_TENANT_ID,
    categoria: 'Botas',
    marca: 'Timberland',
    modelo: '6-Inch Premium',
    color: 'Marrón',
    talla: '44',
    sku: 'TIMB-6IP-BRN-44',
    ean: '1234567890126',
    costo: 200,
    shein_modifier: 1.3,
    shopify_modifier: 1.6,
    meli_modifier: 1.8,
    precio_shein: 312,
    precio_shopify: 512,
    precio_meli: 576,
    inv_egdc: 3,
    inv_fami: 2,
    inv_osiel: 1,
    inv_molly: 1,
    inventory_total: 7,
    shein: false,
    meli: true,
    shopify: true,
    tiktok: false,
    upseller: true,
    go_trendier: false,
    google_drive: 'https://drive.google.com/file/d/example4',
    height_cm: 20,
    length_cm: 32,
    thickness_cm: 15,
    weight_grams: 1200,
    created_at: '2024-01-18T10:00:00Z',
    updated_at: '2024-01-18T10:00:00Z'
  },
  {
    id: 5,
    tenant_id: DEFAULT_TENANT_ID,
    categoria: 'Zapatos',
    marca: 'Converse',
    modelo: 'Chuck Taylor All Star',
    color: 'Negro',
    talla: '41',
    sku: 'CONV-CTAS-BLK-41',
    ean: '1234567890127',
    costo: 80,
    shein_modifier: 1.6,
    shopify_modifier: 2.0,
    meli_modifier: 2.3,
    precio_shein: 154,
    precio_shopify: 260,
    precio_meli: 284,
    inv_egdc: 12,
    inv_fami: 8,
    inv_osiel: 6,
    inv_molly: 4,
    inventory_total: 30,
    shein: true,
    meli: true,
    shopify: true,
    tiktok: true,
    upseller: false,
    go_trendier: true,
    google_drive: 'https://drive.google.com/file/d/example5',
    height_cm: 12,
    length_cm: 29,
    thickness_cm: 10,
    weight_grams: 650,
    created_at: '2024-01-19T10:00:00Z',
    updated_at: '2024-01-19T10:00:00Z'
  }
]

// Helper function to simulate database operations with delays
export const mockDelay = (ms: number = 500) => 
  new Promise(resolve => setTimeout(resolve, ms))

// Mock API functions
export const mockInventoryAPI = {
  async getProducts() {
    await mockDelay(300)
    return { success: true, data: MOCK_PRODUCTS }
  },

  async updateProduct(id: number, updates: Partial<Product>) {
    await mockDelay(200)
    const index = MOCK_PRODUCTS.findIndex(p => p.id === id)
    if (index !== -1) {
      MOCK_PRODUCTS[index] = { ...MOCK_PRODUCTS[index], ...updates }
      return { success: true, data: MOCK_PRODUCTS[index] }
    }
    return { success: false, error: 'Product not found' }
  },

  async createProduct(product: Omit<Product, 'id'>) {
    await mockDelay(400)
    const newId = Math.max(...MOCK_PRODUCTS.map(p => p.id)) + 1
    const newProduct = { ...product, id: newId }
    MOCK_PRODUCTS.push(newProduct)
    return { success: true, data: newProduct }
  },

  async deleteProduct(id: number) {
    await mockDelay(200)
    const index = MOCK_PRODUCTS.findIndex(p => p.id === id)
    if (index !== -1) {
      const deleted = MOCK_PRODUCTS.splice(index, 1)[0]
      return { success: true, data: deleted }
    }
    return { success: false, error: 'Product not found' }
  }
}
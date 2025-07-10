import dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') })

import { PostgresManager } from '../lib/postgres'

async function testPricing() {
  try {
    console.log('🔌 Testing PostgreSQL connection and pricing...')
    
    const products = await PostgresManager.getProducts()
    console.log(`✅ Found ${products.length} products`)
    
    if (products.length === 0) {
      console.log('❌ No products found in database')
      return
    }
    
    // Check first few products
    console.log('\n📦 Sample Products with Pricing:')
    products.slice(0, 5).forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.marca} ${product.modelo}`)
      console.log(`   Cost: $${product.costo}`)
      console.log(`   Modifiers: SHEIN(${product.shein_modifier}), Shopify(${product.shopify_modifier}), MeLi(${product.meli_modifier})`)
      console.log(`   Prices: SHEIN($${product.precio_shein}), Shopify($${product.precio_shopify}), MeLi($${product.precio_meli})`)
      
      // Manual calculation check for Shopify
      if (product.costo && product.shopify_modifier) {
        const expectedShopify = Math.ceil(((product.costo * product.shopify_modifier + 100) * 1.25) / 5) * 5
        console.log(`   Expected Shopify: $${expectedShopify} ${product.precio_shopify === expectedShopify ? '✅' : '❌'}`)
      }
    })
    
    // Check if any products have zero pricing
    const zeroShopifyPrices = products.filter(p => !p.precio_shopify || p.precio_shopify === 0)
    console.log(`\n⚠️  Products with $0 Shopify pricing: ${zeroShopifyPrices.length}`)
    
    if (zeroShopifyPrices.length > 0) {
      console.log('First few with $0 Shopify pricing:')
      zeroShopifyPrices.slice(0, 3).forEach(product => {
        console.log(`   ${product.marca} ${product.modelo} - Cost: $${product.costo}, Modifier: ${product.shopify_modifier}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testPricing()
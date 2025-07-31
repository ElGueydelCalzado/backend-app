'use client'

import React, { useEffect, useState } from 'react'
import { Star, ShoppingCart, Heart, ArrowRight, Truck, Shield, Clock, Phone } from 'lucide-react'
import ConsumerLayout from '../../components/consumer/ConsumerLayout'
import PWAInstaller from '../../components/consumer/PWAInstaller'

interface Product {
  id: number
  categoria: string
  marca: string
  modelo: string
  color: string
  talla: string
  sku: string
  google_drive: string | null
  precio_shopify: number
  inventory_total: number
  rating: number
  reviews: number
}

const HomePage: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [newProducts, setNewProducts] = useState<Product[]>([])
  const [saleProducts, setSaleProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const [featuredRes, newRes, saleRes] = await Promise.all([
        fetch('/api/consumer/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'featured' })
        }),
        fetch('/api/consumer/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'new' })
        }),
        fetch('/api/consumer/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'sale' })
        })
      ])

      if (featuredRes.ok) {
        const featuredData = await featuredRes.json()
        setFeaturedProducts(featuredData.products || [])
      }

      if (newRes.ok) {
        const newData = await newRes.json()
        setNewProducts(newData.products || [])
      }

      if (saleRes.ok) {
        const saleData = await saleRes.json()
        setSaleProducts(saleData.products || [])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = async (productId: number) => {
    try {
      const response = await fetch('/api/consumer/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 })
      })

      if (response.ok) {
        // Show success notification
        alert('Producto agregado al carrito')
      }
    } catch (error) {
      console.error('Error adding to cart:', error)
    }
  }

  const ProductCard: React.FC<{ product: Product }> = ({ product }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        <img
          src={product.google_drive || '/placeholder-shoe.jpg'}
          alt={`${product.marca} ${product.modelo}`}
          className="w-full h-48 object-cover"
        />
        <button className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors">
          <Heart className="w-4 h-4 text-gray-600" />
        </button>
        {product.inventory_total < 5 && (
          <span className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded">
            Últimas unidades
          </span>
        )}
      </div>
      
      <div className="p-4">
        <div className="flex items-center mb-2">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < product.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
              }`}
            />
          ))}
          <span className="text-sm text-gray-600 ml-1">({product.reviews})</span>
        </div>
        
        <h3 className="font-semibold text-gray-900 mb-1">
          {product.marca} {product.modelo}
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          {product.color} - Talla {product.talla}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold text-green-600">
            ${product.precio_shopify.toLocaleString()}
          </div>
          <button
            onClick={() => addToCart(product.id)}
            className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="text-sm">Agregar</span>
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <ConsumerLayout>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-4xl md:text-6xl font-bold mb-6">
                  El Calzado Perfecto para Cada Paso
                </h1>
                <p className="text-xl mb-8 text-blue-100">
                  Descubre nuestra colección de calzado de alta calidad. Desde deportivo hasta formal, 
                  tenemos el par perfecto para ti.
                </p>
                <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                  <a
                    href="/catalogo"
                    className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-center"
                  >
                    Ver Catálogo
                  </a>
                  <a
                    href="/ofertas"
                    className="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors text-center"
                  >
                    Ver Ofertas
                  </a>
                </div>
              </div>
              <div className="relative">
                <img
                  src="/hero-shoes.jpg"
                  alt="Colección de calzado Los Papatos"
                  className="rounded-lg shadow-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-hero.jpg'
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Envío Gratis</h3>
                <p className="text-gray-600">En compras mayores a $1,000 MXN</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Garantía de Calidad</h3>
                <p className="text-gray-600">30 días para devoluciones</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Atención 24/7</h3>
                <p className="text-gray-600">Soporte al cliente siempre disponible</p>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Products */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Productos Destacados</h2>
              <a
                href="/catalogo?featured=true"
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-medium"
              >
                <span>Ver todos</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-gray-200 rounded-lg h-80 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* New Arrivals */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Nuevos Productos</h2>
              <a
                href="/catalogo?new=true"
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-medium"
              >
                <span>Ver todos</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-gray-200 rounded-lg h-80 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {newProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Sale Section */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-red-600 rounded-2xl text-white p-8 mb-8">
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-4">¡Ofertas Especiales!</h2>
                <p className="text-xl text-red-100 mb-6">
                  Encuentra calzado de calidad a precios increíbles
                </p>
                <a
                  href="/ofertas"
                  className="bg-white text-red-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  Ver Todas las Ofertas
                </a>
              </div>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-gray-200 rounded-lg h-80 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {saleProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="py-16 bg-gray-900 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Mantente al Día</h2>
            <p className="text-xl text-gray-300 mb-8">
              Suscríbete a nuestro newsletter y recibe ofertas exclusivas y novedades
            </p>
            <form className="max-w-md mx-auto flex space-x-4">
              <input
                type="email"
                placeholder="Tu email"
                className="flex-1 px-4 py-3 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Suscribirse
              </button>
            </form>
          </div>
        </section>
      </div>

      {/* PWA Installer */}
      <PWAInstaller />
    </ConsumerLayout>
  )
}

export default HomePage
'use client'

import React, { useState, useEffect } from 'react'
import { Search, ShoppingCart, Heart, User, Menu, X, Phone, Mail, MapPin } from 'lucide-react'
import ShoppingCartComponent from './ShoppingCart'

interface ConsumerLayoutProps {
  children: React.ReactNode
}

const ConsumerLayout: React.FC<ConsumerLayoutProps> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [cartItemsCount, setCartItemsCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch cart items count
  useEffect(() => {
    const fetchCartCount = async () => {
      try {
        const response = await fetch('/api/consumer/cart/count')
        if (response.ok) {
          const data = await response.json()
          setCartItemsCount(data.count || 0)
        }
      } catch (error) {
        console.error('Error fetching cart count:', error)
      }
    }

    fetchCartCount()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/buscar?q=${encodeURIComponent(searchQuery)}`
    }
  }

  const categories = [
    { name: 'Calzado Deportivo', slug: 'deportivo' },
    { name: 'Calzado Casual', slug: 'casual' },
    { name: 'Calzado Formal', slug: 'formal' },
    { name: 'Botas', slug: 'botas' },
    { name: 'Sandalias', slug: 'sandalias' },
    { name: 'Accesorios', slug: 'accesorios' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        {/* Top Bar */}
        <div className="bg-blue-600 text-white text-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>+52 (55) 1234-5678</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>contacto@lospapatos.com</span>
                </div>
              </div>
              <div className="hidden md:flex items-center space-x-4">
                <span>Envío gratis en compras mayores a $1,000</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <div className="flex items-center">
              <a href="/" className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">LP</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">Los Papatos</span>
              </a>
            </div>

            {/* Search Bar - Desktop */}
            <div className="hidden md:flex flex-1 max-w-lg mx-8">
              <form onSubmit={handleSearch} className="w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar productos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </form>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              {/* Wishlist */}
              <button className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors">
                <Heart className="w-6 h-6" />
              </button>

              {/* Cart */}
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ShoppingCart className="w-6 h-6" />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cartItemsCount > 99 ? '99+' : cartItemsCount}
                  </span>
                )}
              </button>

              {/* User Menu */}
              <button className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors">
                <User className="w-6 h-6" />
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Search Bar - Mobile */}
          <div className="md:hidden pb-4">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </form>
          </div>
        </div>

        {/* Navigation */}
        <nav className="bg-gray-50 border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="hidden md:flex items-center justify-center space-x-8 py-4">
              <a href="/categorias" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                Todas las Categorías
              </a>
              {categories.map((category) => (
                <a
                  key={category.slug}
                  href={`/categoria/${category.slug}`}
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                >
                  {category.name}
                </a>
              ))}
              <a href="/ofertas" className="text-red-600 hover:text-red-700 font-medium transition-colors">
                Ofertas
              </a>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
              <div className="md:hidden py-4 space-y-2">
                <a href="/categorias" className="block py-2 text-gray-700 hover:text-blue-600 font-medium transition-colors">
                  Todas las Categorías
                </a>
                {categories.map((category) => (
                  <a
                    key={category.slug}
                    href={`/categoria/${category.slug}`}
                    className="block py-2 text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    {category.name}
                  </a>
                ))}
                <a href="/ofertas" className="block py-2 text-red-600 hover:text-red-700 font-medium transition-colors">
                  Ofertas
                </a>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main>
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">LP</span>
                </div>
                <span className="text-xl font-bold">Los Papatos</span>
              </div>
              <p className="text-gray-400 mb-4">
                Tu tienda de confianza para encontrar el calzado perfecto. Calidad, estilo y comodidad en cada paso.
              </p>
              <div className="flex items-center space-x-2 text-gray-400">
                <MapPin className="w-4 h-4" />
                <span>Ciudad de México, México</span>
              </div>
            </div>

            {/* Customer Service */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Atención al Cliente</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/contacto" className="hover:text-white transition-colors">Contacto</a></li>
                <li><a href="/ayuda" className="hover:text-white transition-colors">Centro de Ayuda</a></li>
                <li><a href="/envios" className="hover:text-white transition-colors">Envíos y Devoluciones</a></li>
                <li><a href="/guia-tallas" className="hover:text-white transition-colors">Guía de Tallas</a></li>
              </ul>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Enlaces Rápidos</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/ofertas" className="hover:text-white transition-colors">Ofertas Especiales</a></li>
                <li><a href="/nuevos" className="hover:text-white transition-colors">Nuevos Productos</a></li>
                <li><a href="/marcas" className="hover:text-white transition-colors">Marcas</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Newsletter</h3>
              <p className="text-gray-400 mb-4">
                Suscríbete para recibir ofertas exclusivas y novedades.
              </p>
              <form className="space-y-2">
                <input
                  type="email"
                  placeholder="Tu email"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
                >
                  Suscribirse
                </button>
              </form>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <p className="text-gray-400 text-sm">
                © 2024 Los Papatos. Todos los derechos reservados.
              </p>
              <div className="flex items-center space-x-6 mt-4 md:mt-0">
                <a href="/privacidad" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Política de Privacidad
                </a>
                <a href="/terminos" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Términos y Condiciones
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Shopping Cart */}
      <ShoppingCartComponent
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={() => {
          setIsCartOpen(false)
          window.location.href = '/checkout'
        }}
      />
    </div>
  )
}

export default ConsumerLayout
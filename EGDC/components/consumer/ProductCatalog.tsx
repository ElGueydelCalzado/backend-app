'use client'

import React, { useState, useEffect } from 'react'
import { Search, Filter, Grid, List, Heart, ShoppingCart, Star, ChevronDown } from 'lucide-react'

interface Product {
  id: number
  categoria: string | null
  marca: string | null
  modelo: string | null
  color: string | null
  talla: string | null
  sku: string | null
  google_drive: string | null
  precio_shopify: number | null
  inventory_total: number | null
  rating?: number
  reviews?: number
}

interface Filters {
  categoria: string[]
  marca: string[]
  color: string[]
  talla: string[]
  priceRange: [number, number]
}

interface ProductCatalogProps {
  initialProducts?: Product[]
}

const ProductCatalog: React.FC<ProductCatalogProps> = ({ initialProducts = [] }) => {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(initialProducts)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState('name')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    categoria: [],
    marca: [],
    color: [],
    talla: [],
    priceRange: [0, 5000]
  })
  const [wishlist, setWishlist] = useState<Set<number>>(new Set())

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/consumer/products')
        if (response.ok) {
          const data = await response.json()
          setProducts(data.products || [])
          setFilteredProducts(data.products || [])
        }
      } catch (error) {
        console.error('Error fetching products:', error)
      } finally {
        setLoading(false)
      }
    }

    if (initialProducts.length === 0) {
      fetchProducts()
    }
  }, [initialProducts])

  // Apply filters and search
  useEffect(() => {
    let filtered = products.filter(product => {
      // Search filter
      if (searchQuery) {
        const search = searchQuery.toLowerCase()
        const matchesSearch = 
          product.marca?.toLowerCase().includes(search) ||
          product.modelo?.toLowerCase().includes(search) ||
          product.categoria?.toLowerCase().includes(search) ||
          product.color?.toLowerCase().includes(search)
        if (!matchesSearch) return false
      }

      // Category filter
      if (filters.categoria.length > 0 && product.categoria) {
        if (!filters.categoria.includes(product.categoria)) return false
      }

      // Brand filter
      if (filters.marca.length > 0 && product.marca) {
        if (!filters.marca.includes(product.marca)) return false
      }

      // Color filter
      if (filters.color.length > 0 && product.color) {
        if (!filters.color.includes(product.color)) return false
      }

      // Size filter
      if (filters.talla.length > 0 && product.talla) {
        if (!filters.talla.includes(product.talla)) return false
      }

      // Price filter
      if (product.precio_shopify) {
        if (product.precio_shopify < filters.priceRange[0] || product.precio_shopify > filters.priceRange[1]) {
          return false
        }
      }

      return true
    })

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return (a.precio_shopify || 0) - (b.precio_shopify || 0)
        case 'price-high':
          return (b.precio_shopify || 0) - (a.precio_shopify || 0)
        case 'rating':
          return (b.rating || 0) - (a.rating || 0)
        case 'newest':
          return b.id - a.id
        default:
          return (a.marca || '').localeCompare(b.marca || '')
      }
    })

    setFilteredProducts(filtered)
  }, [products, searchQuery, filters, sortBy])

  const toggleWishlist = (productId: number) => {
    const newWishlist = new Set(wishlist)
    if (newWishlist.has(productId)) {
      newWishlist.delete(productId)
    } else {
      newWishlist.add(productId)
    }
    setWishlist(newWishlist)
  }

  const addToCart = async (product: Product) => {
    try {
      const response = await fetch('/api/consumer/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1
        })
      })
      
      if (response.ok) {
        // Show success notification
        console.log('Product added to cart')
      }
    } catch (error) {
      console.error('Error adding to cart:', error)
    }
  }

  const getUniqueValues = (field: keyof Product): string[] => {
    const values = products
      .map(p => p[field])
      .filter((value): value is string => value !== null && value !== undefined)
    return [...new Set(values)].sort()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Catálogo de Calzado</h1>
        <p className="text-gray-600">Descubre nuestra colección completa de calzado de calidad</p>
      </div>

      {/* Search and Controls */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por marca, modelo, categoría..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>Filtros</span>
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">Ordenar por nombre</option>
              <option value="price-low">Precio: menor a mayor</option>
              <option value="price-high">Precio: mayor a menor</option>
              <option value="rating">Mejor valorados</option>
              <option value="newest">Más recientes</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Filters Sidebar */}
        {showFilters && (
          <div className="w-80 bg-white border border-gray-200 rounded-lg p-6 h-fit">
            <h3 className="text-lg font-semibold mb-4">Filtros</h3>
            
            {/* Category Filter */}
            <div className="mb-6">
              <h4 className="font-medium mb-2">Categoría</h4>
              <div className="space-y-2">
                {getUniqueValues('categoria').map(categoria => (
                  <label key={categoria} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.categoria.includes(categoria)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters(prev => ({
                            ...prev,
                            categoria: [...prev.categoria, categoria]
                          }))
                        } else {
                          setFilters(prev => ({
                            ...prev,
                            categoria: prev.categoria.filter(c => c !== categoria)
                          }))
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">{categoria}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Brand Filter */}
            <div className="mb-6">
              <h4 className="font-medium mb-2">Marca</h4>
              <div className="space-y-2">
                {getUniqueValues('marca').map(marca => (
                  <label key={marca} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.marca.includes(marca)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters(prev => ({
                            ...prev,
                            marca: [...prev.marca, marca]
                          }))
                        } else {
                          setFilters(prev => ({
                            ...prev,
                            marca: prev.marca.filter(m => m !== marca)
                          }))
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">{marca}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="mb-6">
              <h4 className="font-medium mb-2">Rango de Precio</h4>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="5000"
                  value={filters.priceRange[1]}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    priceRange: [prev.priceRange[0], parseInt(e.target.value)]
                  }))}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>${filters.priceRange[0]}</span>
                  <span>${filters.priceRange[1]}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Products Grid/List */}
        <div className="flex-1">
          <div className="mb-4 text-sm text-gray-600">
            Mostrando {filteredProducts.length} de {products.length} productos
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <div key={product.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img
                      src={product.google_drive || '/placeholder-shoe.jpg'}
                      alt={`${product.marca} ${product.modelo}`}
                      className="w-full h-48 object-cover"
                    />
                    <button
                      onClick={() => toggleWishlist(product.id)}
                      className={`absolute top-2 right-2 p-2 rounded-full ${
                        wishlist.has(product.id) ? 'bg-red-500 text-white' : 'bg-white text-gray-400'
                      } hover:bg-red-500 hover:text-white transition-colors`}
                    >
                      <Heart className="w-4 h-4" fill={wishlist.has(product.id) ? 'currentColor' : 'none'} />
                    </button>
                    {product.inventory_total && product.inventory_total < 5 && (
                      <span className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                        Últimas unidades
                      </span>
                    )}
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-center mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < (product.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="text-sm text-gray-600 ml-1">({product.reviews || 0})</span>
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {product.marca} {product.modelo}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {product.color} - Talla {product.talla}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold text-green-600">
                        ${product.precio_shopify?.toLocaleString()}
                      </div>
                      <button
                        onClick={() => addToCart(product)}
                        disabled={!product.inventory_total || product.inventory_total === 0}
                        className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-1 rounded transition-colors"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span className="text-sm">Agregar</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((product) => (
                <div key={product.id} className="bg-white border border-gray-200 rounded-lg p-6 flex items-center space-x-6 hover:shadow-lg transition-shadow">
                  <img
                    src={product.google_drive || '/placeholder-shoe.jpg'}
                    alt={`${product.marca} ${product.modelo}`}
                    className="w-24 h-24 object-cover rounded"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < (product.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="text-sm text-gray-600 ml-2">({product.reviews || 0})</span>
                    </div>
                    
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">
                      {product.marca} {product.modelo}
                    </h3>
                    <p className="text-gray-600 mb-2">
                      {product.categoria} - {product.color} - Talla {product.talla}
                    </p>
                    <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600 mb-2">
                      ${product.precio_shopify?.toLocaleString()}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleWishlist(product.id)}
                        className={`p-2 rounded ${
                          wishlist.has(product.id) ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'
                        } hover:bg-red-500 hover:text-white transition-colors`}
                      >
                        <Heart className="w-4 h-4" fill={wishlist.has(product.id) ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        onClick={() => addToCart(product)}
                        disabled={!product.inventory_total || product.inventory_total === 0}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded transition-colors"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>Agregar al carrito</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Search className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron productos</h3>
              <p className="text-gray-600">Prueba ajustando los filtros o la búsqueda</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductCatalog
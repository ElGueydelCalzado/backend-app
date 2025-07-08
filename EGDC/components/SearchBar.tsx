'use client'

import { useState, useEffect, useRef } from 'react'
import { Product } from '@/lib/supabase'

interface SearchBarProps {
  allData: Product[]
  onSearchResults: (results: Product[]) => void
  onClearSearch: () => void
  className?: string
}

export default function SearchBar({ 
  allData, 
  onSearchResults, 
  onClearSearch, 
  className = '' 
}: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Perform search when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '' || !allData || allData.length === 0) {
      onClearSearch()
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    // Debounce search for better performance
    const debounceTimer = setTimeout(() => {
      performSearch(searchTerm.trim())
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchTerm, allData])

  const performSearch = (term: string) => {
    if (!allData || allData.length === 0) {
      setIsSearching(false)
      return
    }
    
    const lowerTerm = term.toLowerCase()
    
    const results = allData.filter(product => {
      // Search in multiple fields
      const searchFields = [
        product.sku,
        product.ean,
        product.marca,
        product.modelo,
        product.categoria,
        product.color,
        product.talla
      ]

      return searchFields.some(field => 
        field && field.toString().toLowerCase().includes(lowerTerm)
      )
    })

    onSearchResults(results)
    setIsSearching(false)
  }

  const clearSearch = () => {
    setSearchTerm('')
    onClearSearch()
    searchInputRef.current?.focus()
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+K or Cmd+K to focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
      
      // Escape to clear search
      if (event.key === 'Escape' && searchTerm) {
        event.preventDefault()
        clearSearch()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [searchTerm])

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isSearching ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          ) : (
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
        
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Buscar por SKU, EAN, marca, modelo... (Ctrl+K)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
        />
        
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            title="Limpiar búsqueda (Esc)"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Search Results Info */}
      {searchTerm && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-30">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>
              Búsqueda: "<span className="font-medium text-gray-900">{searchTerm}</span>"
            </span>
            <span className="text-gray-500">
              Presiona Esc para limpiar
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
/**
 * @fileoverview Root layout component for EGDC Inventory Management System
 * @author EGDC Team
 * @version 1.0.0
 */

import type { Metadata } from 'next'
import './globals.css'
import ErrorBoundary from '@/components/ErrorBoundary'

export const metadata: Metadata = {
  title: 'EGDC - Gestión de Inventario',
  description: 'Sistema profesional de gestión de inventario para productos de calzado',
  keywords: ['inventario', 'calzado', 'gestión', 'productos', 'EGDC'],
  authors: [{ name: 'EGDC Team' }],
  creator: 'EGDC',
  publisher: 'EGDC',
  robots: 'noindex, nofollow', // Prevent search engine indexing
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-gray-100 min-h-screen" suppressHydrationWarning={true}>
        <ErrorBoundary level="app">
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
} 
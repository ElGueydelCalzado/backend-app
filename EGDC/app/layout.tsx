/**
 * @fileoverview Root layout component for EGDC Inventory Management System
 * @author EGDC Team
 * @version 1.0.0
 */

import type { Metadata } from 'next'
import './globals.css'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Providers } from './providers'
import { AccessibilityProvider } from '@/components/AccessibilityProvider'
import { ThemeProvider } from '@/components/ThemeProvider'
import PWAInstallPrompt, { PWAUpdatePrompt } from '@/components/PWAInstallPrompt'
import OfflineManager from '@/components/OfflineManager'
import PerformanceOptimizer from '@/components/PerformanceOptimizer'

export const metadata: Metadata = {
  title: 'EGDC - Gestión de Inventario',
  description: 'Sistema profesional de gestión de inventario para productos de calzado',
  keywords: ['inventario', 'calzado', 'gestión', 'productos', 'EGDC'],
  authors: [{ name: 'EGDC Team' }],
  creator: 'EGDC',
  publisher: 'EGDC',
  robots: 'noindex, nofollow', // Prevent search engine indexing
  viewport: 'width=device-width, initial-scale=1, minimum-scale=1, user-scalable=yes',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1f2937' },
  ],
  colorScheme: 'light dark',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'EGDC',
    startupImage: [
      '/icons/apple-splash-2048-2732.jpg',
      '/icons/apple-splash-1668-2224.jpg',
      '/icons/apple-splash-1536-2048.jpg',
      '/icons/apple-splash-1125-2436.jpg',
      '/icons/apple-splash-1242-2208.jpg',
      '/icons/apple-splash-750-1334.jpg',
      '/icons/apple-splash-828-1792.jpg',
    ],
  },
  applicationName: 'EGDC',
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'EGDC',
    title: 'EGDC - Gestión de Inventario',
    description: 'Sistema profesional de gestión de inventario para productos de calzado',
  },
  twitter: {
    card: 'summary',
    title: 'EGDC - Gestión de Inventario',
    description: 'Sistema profesional de gestión de inventario para productos de calzado',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" dir="ltr">
      <head>
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className="bg-gray-100 min-h-screen antialiased" suppressHydrationWarning={true}>
        {/* Skip to main content link for screen readers */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          tabIndex={0}
        >
          Saltar al contenido principal
        </a>
        
        {/* Live region for screen reader announcements */}
        <div 
          id="sr-live-region" 
          aria-live="polite" 
          aria-atomic="true" 
          className="sr-only"
        ></div>
        
        <Providers>
          <ThemeProvider>
            <PerformanceOptimizer>
              <AccessibilityProvider>
                <OfflineManager>
                  <ErrorBoundary level="app">
                    <div id="main-content" tabIndex={-1}>
                      {children}
                    </div>
                    <PWAInstallPrompt />
                    <PWAUpdatePrompt />
                  </ErrorBoundary>
                </OfflineManager>
              </AccessibilityProvider>
            </PerformanceOptimizer>
          </ThemeProvider>
        </Providers>
        
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered with scope: ', registration.scope);
                    })
                    .catch(function(error) {
                      console.log('SW registration failed: ', error);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
} 
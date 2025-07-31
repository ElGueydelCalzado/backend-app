'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAccessibility } from './AccessibilityProvider'

interface PerformanceMetrics {
  fcp: number | null // First Contentful Paint
  lcp: number | null // Largest Contentful Paint
  fid: number | null // First Input Delay
  cls: number | null // Cumulative Layout Shift
  ttfb: number | null // Time to First Byte
}

interface PerformanceOptimizerProps {
  children: React.ReactNode
}

export default function PerformanceOptimizer({ children }: PerformanceOptimizerProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null
  })
  const [isSlowDevice, setIsSlowDevice] = useState(false)
  const [connectionType, setConnectionType] = useState<string>('unknown')
  const { reducedMotion } = useAccessibility()

  // Detect device capabilities
  useEffect(() => {
    // Check device memory (if available)
    const deviceMemory = (navigator as any).deviceMemory
    const hardwareConcurrency = navigator.hardwareConcurrency

    // Consider device slow if:
    // - Device memory is less than 4GB
    // - Hardware concurrency is less than 4 cores
    const slowDevice = (deviceMemory && deviceMemory < 4) || (hardwareConcurrency && hardwareConcurrency < 4)
    setIsSlowDevice(slowDevice)

    // Check connection type
    const connection = (navigator as any).connection
    if (connection) {
      setConnectionType(connection.effectiveType || 'unknown')
    }
  }, [])

  // Performance observer for Core Web Vitals
  useEffect(() => {
    if (!('PerformanceObserver' in window)) return

    // Observe LCP
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1] as any
      setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }))
    })

    // Observe FID
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const firstEntry = entries[0] as any
      setMetrics(prev => ({ ...prev, fid: firstEntry.processingStart - firstEntry.startTime }))
    })

    // Observe CLS
    const clsObserver = new PerformanceObserver((list) => {
      let clsValue = 0
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
        }
      })
      setMetrics(prev => ({ ...prev, cls: clsValue }))
    })

    // Observe Navigation Timing for TTFB
    const navigationObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        if (entry.entryType === 'navigation') {
          const ttfb = entry.responseStart - entry.requestStart
          setMetrics(prev => ({ ...prev, ttfb }))
        }
      })
    })

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      fidObserver.observe({ entryTypes: ['first-input'] })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
      navigationObserver.observe({ entryTypes: ['navigation'] })
    } catch (error) {
      console.warn('Performance observers not fully supported:', error)
    }

    // Observe FCP using paint timing
    const paintObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          setMetrics(prev => ({ ...prev, fcp: entry.startTime }))
        }
      })
    })

    try {
      paintObserver.observe({ entryTypes: ['paint'] })
    } catch (error) {
      console.warn('Paint observer not supported:', error)
    }

    return () => {
      lcpObserver.disconnect()
      fidObserver.disconnect()
      clsObserver.disconnect()
      navigationObserver.disconnect()
      paintObserver.disconnect()
    }
  }, [])

  // Optimize based on device capabilities
  useEffect(() => {
    const root = document.documentElement

    if (isSlowDevice || connectionType === 'slow-2g' || connectionType === '2g') {
      // Reduce animations and effects for slow devices/connections
      root.classList.add('performance-mode')
      
      // Disable non-essential animations
      root.style.setProperty('--animation-duration', '0.1s')
      root.style.setProperty('--transition-duration', '0.1s')
    } else {
      root.classList.remove('performance-mode')
      
      // Normal animation timing
      if (!reducedMotion) {
        root.style.setProperty('--animation-duration', '0.2s')
        root.style.setProperty('--transition-duration', '0.2s')
      }
    }
  }, [isSlowDevice, connectionType, reducedMotion])

  // Preload critical resources
  useEffect(() => {
    // Preload fonts
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'font'
    link.type = 'font/woff2'
    link.crossOrigin = 'anonymous'
    link.href = '/fonts/inter-var.woff2'
    document.head.appendChild(link)

    // Preload critical images
    const criticalImages = [
      '/icons/icon-192x192.png',
      '/icons/icon-512x512.png'
    ]

    criticalImages.forEach(src => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = src
      document.head.appendChild(link)
    })

    return () => {
      // Cleanup preload links if needed
    }
  }, [])

  // Resource hints for better loading
  useEffect(() => {
    // DNS prefetch for external resources
    const dnsPrefetchDomains = [
      'fonts.googleapis.com',
      'fonts.gstatic.com'
    ]

    dnsPrefetchDomains.forEach(domain => {
      const link = document.createElement('link')
      link.rel = 'dns-prefetch'
      link.href = `//${domain}`
      document.head.appendChild(link)
    })
  }, [])

  // Lazy loading optimization
  const enableLazyLoading = useCallback(() => {
    // Enable native lazy loading for images
    const images = document.querySelectorAll('img[data-src]')
    
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            if (img.dataset.src) {
              img.src = img.dataset.src
              img.removeAttribute('data-src')
              imageObserver.unobserve(img)
            }
          }
        })
      })

      images.forEach(img => imageObserver.observe(img))
    } else {
      // Fallback for browsers without IntersectionObserver
      images.forEach(img => {
        const image = img as HTMLImageElement
        if (image.dataset.src) {
          image.src = image.dataset.src
          image.removeAttribute('data-src')
        }
      })
    }
  }, [])

  useEffect(() => {
    enableLazyLoading()
  }, [enableLazyLoading])

  // Virtual scrolling helper for large lists
  const useVirtualScrolling = useCallback((itemHeight: number, containerHeight: number, items: any[]) => {
    const [startIndex, setStartIndex] = useState(0)
    const [endIndex, setEndIndex] = useState(Math.ceil(containerHeight / itemHeight))

    const handleScroll = useCallback((scrollTop: number) => {
      const newStartIndex = Math.floor(scrollTop / itemHeight)
      const newEndIndex = newStartIndex + Math.ceil(containerHeight / itemHeight)
      
      setStartIndex(newStartIndex)
      setEndIndex(Math.min(newEndIndex, items.length))
    }, [itemHeight, containerHeight, items.length])

    return {
      startIndex,
      endIndex,
      handleScroll,
      visibleItems: items.slice(startIndex, endIndex),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight
    }
  }, [])

  // Performance monitoring
  useEffect(() => {
    // Log performance metrics for analysis
    if (metrics.lcp && metrics.fcp && metrics.cls !== null) {
      console.log('Performance Metrics:', {
        'First Contentful Paint': `${metrics.fcp?.toFixed(2)}ms`,
        'Largest Contentful Paint': `${metrics.lcp?.toFixed(2)}ms`,
        'First Input Delay': metrics.fid ? `${metrics.fid?.toFixed(2)}ms` : 'Not measured',
        'Cumulative Layout Shift': metrics.cls?.toFixed(3),
        'Time to First Byte': metrics.ttfb ? `${metrics.ttfb?.toFixed(2)}ms` : 'Not measured',
        'Device Classification': isSlowDevice ? 'Slow' : 'Fast',
        'Connection Type': connectionType
      })

      // Send metrics to analytics (if needed)
      // analytics.track('performance_metrics', metrics)
    }
  }, [metrics, isSlowDevice, connectionType])

  return (
    <>
      {children}
      
      {/* Performance monitoring UI (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-xs z-50 max-w-xs">
          <h4 className="font-bold mb-2">Performance Metrics</h4>
          <div className="space-y-1">
            <div>FCP: {metrics.fcp ? `${metrics.fcp.toFixed(0)}ms` : 'N/A'}</div>
            <div>LCP: {metrics.lcp ? `${metrics.lcp.toFixed(0)}ms` : 'N/A'}</div>
            <div>FID: {metrics.fid ? `${metrics.fid.toFixed(0)}ms` : 'N/A'}</div>
            <div>CLS: {metrics.cls ? metrics.cls.toFixed(3) : 'N/A'}</div>
            <div>TTFB: {metrics.ttfb ? `${metrics.ttfb.toFixed(0)}ms` : 'N/A'}</div>
            <div>Device: {isSlowDevice ? 'Slow' : 'Fast'}</div>
            <div>Connection: {connectionType}</div>
          </div>
        </div>
      )}
    </>
  )
}

// Export performance utilities for use in other components
export { PerformanceOptimizer }

export const performanceUtils = {
  // Debounce function for search inputs
  debounce: <T extends (...args: any[]) => any>(func: T, wait: number) => {
    let timeout: NodeJS.Timeout
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  },

  // Throttle function for scroll events
  throttle: <T extends (...args: any[]) => any>(func: T, limit: number) => {
    let inThrottle: boolean
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  },

  // Preload component for better UX
  preloadRoute: (route: string) => {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = route
    document.head.appendChild(link)
  },

  // Check if device prefers reduced motion
  prefersReducedMotion: () => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  },

  // Get device capabilities
  getDeviceCapabilities: () => {
    const navigator = window.navigator as any
    return {
      deviceMemory: navigator.deviceMemory || 'unknown',
      hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
      connection: navigator.connection?.effectiveType || 'unknown',
      maxTouchPoints: navigator.maxTouchPoints || 0
    }
  }
}
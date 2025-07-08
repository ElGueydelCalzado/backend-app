'use client'

import React, { Component, ReactNode } from 'react'

interface ErrorInfo {
  componentStack: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetOnPropsChange?: boolean
  resetKeys?: Array<string | number>
  level?: 'app' | 'component' | 'section'
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: undefined,
      errorInfo: undefined
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error for debugging - always log for monitoring
    console.error(`ErrorBoundary (${this.props.level || 'component'}) caught an error:`, error, errorInfo)

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Auto-reset after 10 seconds for non-app level errors
    if (this.props.level !== 'app') {
      this.resetTimeoutId = window.setTimeout(() => {
        this.resetErrorBoundary()
      }, 10000)
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props
    const { hasError } = this.state

    // Reset if resetKeys changed
    if (hasError && resetKeys) {
      const prevResetKeys = prevProps.resetKeys || []
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevResetKeys[index]
      )
      if (hasResetKeyChanged) {
        this.resetErrorBoundary()
      }
    }

    // Reset if props changed and resetOnPropsChange is true
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary()
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
      this.resetTimeoutId = null
    }
    
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined
    })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback based on error level
      return this.renderDefaultFallback()
    }

    return this.props.children
  }

  private renderDefaultFallback() {
    const { level = 'component' } = this.props
    const { error } = this.state

    if (level === 'app') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-red-200 p-8 text-center">
            <div className="text-6xl mb-4">💥</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              ¡Oops! Algo salió mal
            </h1>
            <p className="text-gray-600 mb-6">
              La aplicación encontró un error inesperado. Por favor, recarga la página para continuar.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
              >
                🔄 Recargar Página
              </button>
              <button
                onClick={this.resetErrorBoundary}
                className="w-full px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
              >
                🔧 Intentar Nuevamente
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Ver detalles del error (desarrollo)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto max-h-32">
                  {error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    if (level === 'section') {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 m-4">
          <div className="flex items-center mb-4">
            <span className="text-2xl mr-3">⚠️</span>
            <h3 className="text-lg font-semibold text-yellow-800">
              Error en esta sección
            </h3>
          </div>
          <p className="text-yellow-700 mb-4">
            Esta sección encontró un error y no puede mostrarse correctamente.
          </p>
          <button
            onClick={this.resetErrorBoundary}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
          >
            🔄 Reintentar
          </button>
          {process.env.NODE_ENV === 'development' && error && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-yellow-600 hover:text-yellow-800">
                Ver error (desarrollo)
              </summary>
              <pre className="mt-2 text-xs bg-yellow-100 p-2 rounded overflow-auto max-h-24">
                {error.toString()}
              </pre>
            </details>
          )}
        </div>
      )
    }

    // Default component level
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-2">
        <div className="flex items-center mb-2">
          <span className="text-lg mr-2">🚨</span>
          <h4 className="font-medium text-red-800">Error del componente</h4>
        </div>
        <p className="text-red-700 text-sm mb-3">
          Este componente encontró un error inesperado.
        </p>
        <button
          onClick={this.resetErrorBoundary}
          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    )
  }
}

// Hook version for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error('useErrorHandler:', error, errorInfo)
    // Could integrate with error reporting service here
  }
}

// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

export default ErrorBoundary
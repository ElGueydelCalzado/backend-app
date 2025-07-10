'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface ToastMessage {
  id: string
  text: string
  type: 'success' | 'error' | 'info'
  duration?: number
}

interface ToastNotificationProps {
  message: ToastMessage | null
  onClose: (id: string) => void
}

export default function ToastNotification({ message, onClose }: ToastNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    if (message) {
      setIsVisible(true)
      setIsLeaving(false)

      // Auto-hide after duration (default 5 seconds)
      const duration = message.duration || 5000
      const timer = setTimeout(() => {
        handleClose()
      }, duration)

      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [message])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => {
      if (message) {
        onClose(message.id)
      }
    }, 300) // Match the animation duration
  }

  if (!message || !isVisible) {
    return null
  }

  const styles = {
    success: 'bg-gradient-to-r from-green-500 to-emerald-500 border-green-400',
    error: 'bg-gradient-to-r from-red-500 to-pink-500 border-red-400',
    info: 'bg-gradient-to-r from-blue-500 to-indigo-500 border-blue-400'
  }

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️'
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div 
        className={`
          ${styles[message.type]} 
          text-white shadow-2xl rounded-xl border-2 p-4 
          transform transition-all duration-300 ease-out
          ${isLeaving 
            ? 'translate-x-full opacity-0 scale-95' 
            : 'translate-x-0 opacity-100 scale-100'
          }
          backdrop-blur-sm
        `}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <span className="text-xl flex-shrink-0">{icons[message.type]}</span>
            <p className="font-medium text-sm leading-relaxed">{message.text}</p>
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 ml-3 p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Cerrar notificación"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Progress bar for auto-hide */}
        <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white/40 rounded-full transition-all ease-linear"
            style={{
              width: '100%',
              animation: `toast-progress ${message.duration || 5000}ms linear forwards`
            }}
          />
        </div>
      </div>
      
      <style jsx>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
}

// Hook for managing toast notifications
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info', duration?: number) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: ToastMessage = { id, text, type, duration }
    
    setToasts(prev => [...prev, newToast])
    
    return id
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  return {
    toasts,
    showToast,
    removeToast
  }
}
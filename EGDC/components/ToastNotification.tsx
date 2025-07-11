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

      // Auto-hide after duration (default 4 seconds)
      const duration = message.duration || 4000
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
    }, 250) // Faster animation
  }

  if (!message || !isVisible) {
    return null
  }

  const styles = {
    success: 'bg-gradient-to-r from-green-500 to-emerald-500 border-green-400 shadow-green-500/25',
    error: 'bg-gradient-to-r from-red-500 to-pink-500 border-red-400 shadow-red-500/25',
    info: 'bg-gradient-to-r from-blue-500 to-indigo-500 border-blue-400 shadow-blue-500/25'
  }

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️'
  }

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
      <div 
        className={`
          ${styles[message.type]} 
          text-white shadow-2xl rounded-lg border-2 px-4 py-3 
          transform transition-all duration-250 ease-out max-w-xs
          ${isLeaving 
            ? 'scale-90 opacity-0' 
            : 'scale-100 opacity-100'
          }
          backdrop-blur-sm
        `}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <span className="text-lg flex-shrink-0">{icons[message.type]}</span>
            <p className="font-medium text-sm leading-tight truncate">{message.text}</p>
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
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
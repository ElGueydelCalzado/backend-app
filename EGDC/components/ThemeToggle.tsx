'use client'

import React from 'react'
import { useTheme } from './ThemeProvider'
import { useAccessibility } from './AccessibilityProvider'

interface ThemeToggleProps {
  className?: string
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const { language } = useAccessibility()

  const handleToggle = () => {
    toggleTheme()
  }

  const isDark = theme === 'dark'
  
  const labels = {
    toggle: language === 'es' ? 'Cambiar tema' : 'Toggle theme',
    light: language === 'es' ? 'Cambiar a modo oscuro' : 'Switch to dark mode',
    dark: language === 'es' ? 'Cambiar a modo claro' : 'Switch to light mode'
  }

  return (
    <button
      onClick={handleToggle}
      className={`
        relative inline-flex items-center justify-center
        w-12 h-6 rounded-full transition-all duration-300 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600
        touch-target ${className}
      `}
      aria-label={isDark ? labels.dark : labels.light}
      title={isDark ? labels.dark : labels.light}
      type="button"
    >
      {/* Toggle Background Track */}
      <span 
        className={`
          absolute inset-0 rounded-full transition-colors duration-300
          ${isDark ? 'bg-egdc-orange-primary' : 'bg-gray-300'}
        `}
      />
      
      {/* Toggle Handle/Thumb */}
      <span
        className={`
          relative inline-flex items-center justify-center
          w-5 h-5 rounded-full bg-white shadow-md
          transform transition-all duration-300 ease-in-out
          ${isDark ? 'translate-x-3' : '-translate-x-3'}
        `}
      >
        {/* Sun Icon */}
        <svg
          className={`
            absolute w-3 h-3 text-yellow-500 transform transition-all duration-300
            ${isDark ? 'opacity-0 rotate-180 scale-50' : 'opacity-100 rotate-0 scale-100'}
          `}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
            clipRule="evenodd"
          />
        </svg>

        {/* Moon Icon */}
        <svg
          className={`
            absolute w-3 h-3 text-blue-200 transform transition-all duration-300
            ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-180 scale-50'}
          `}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"
          />
        </svg>
      </span>

      {/* Screen reader only status */}
      <span className="sr-only">
        {language === 'es' 
          ? `Tema actual: ${isDark ? 'oscuro' : 'claro'}`
          : `Current theme: ${isDark ? 'dark' : 'light'}`
        }
      </span>
    </button>
  )
}

// Alternative minimal variant for mobile or compact spaces
export function ThemeToggleCompact({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const { language } = useAccessibility()

  const isDark = theme === 'dark'
  
  const label = isDark 
    ? (language === 'es' ? 'Modo claro' : 'Light mode')
    : (language === 'es' ? 'Modo oscuro' : 'Dark mode')

  return (
    <button
      onClick={toggleTheme}
      className={`
        p-2 rounded-lg transition-all duration-300
        text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
        hover:bg-gray-100 dark:hover:bg-gray-800
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        touch-target ${className}
      `}
      aria-label={label}
      title={label}
      type="button"
    >
      {isDark ? (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </button>
  )
}
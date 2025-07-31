'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { ARIAUtils, FocusManager, ACCESSIBILITY_CONFIG } from '@/lib/enterprise-accessibility'

interface AccessibilityContextType {
  reducedMotion: boolean
  highContrast: boolean
  fontSize: 'normal' | 'large' | 'extra-large'
  screenReaderMode: boolean
  keyboardNavigation: boolean
  darkMode: boolean
  language: 'es' | 'en'
  announceMessage: (message: string, priority?: 'polite' | 'assertive') => void
}

const AccessibilityContext = createContext<AccessibilityContextType>({
  reducedMotion: false,
  highContrast: false,
  fontSize: 'normal',
  screenReaderMode: false,
  keyboardNavigation: false,
  darkMode: false,
  language: 'es',
  announceMessage: () => {},
})

export const useAccessibility = () => useContext(AccessibilityContext)

interface AccessibilityProviderProps {
  children: ReactNode
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [reducedMotion, setReducedMotion] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'extra-large'>('normal')
  const [screenReaderMode, setScreenReaderMode] = useState(false)
  const [keyboardNavigation, setKeyboardNavigation] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [language, setLanguage] = useState<'es' | 'en'>('es')

  // Detect media query preferences
  useEffect(() => {
    // Reduced motion detection
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(reducedMotionQuery.matches)
    
    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches)
    }
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange)

    // High contrast detection
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
    setHighContrast(highContrastQuery.matches)
    
    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      setHighContrast(e.matches)
    }
    highContrastQuery.addEventListener('change', handleHighContrastChange)

    // Dark mode detection
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setDarkMode(darkModeQuery.matches)
    
    const handleDarkModeChange = (e: MediaQueryListEvent) => {
      setDarkMode(e.matches)
    }
    darkModeQuery.addEventListener('change', handleDarkModeChange)

    // Keyboard navigation detection
    const handleKeyboardNavigation = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setKeyboardNavigation(true)
      }
    }

    const handleMouseUse = () => {
      setKeyboardNavigation(false)
    }

    document.addEventListener('keydown', handleKeyboardNavigation)
    document.addEventListener('mousedown', handleMouseUse)

    // Screen reader detection (heuristic)
    const checkScreenReader = () => {
      // Check for common screen reader indicators
      const hasScreenReader = 
        window.navigator.userAgent.includes('NVDA') ||
        window.navigator.userAgent.includes('JAWS') ||
        window.speechSynthesis?.getVoices().length > 0 ||
        'speechSynthesis' in window

      setScreenReaderMode(hasScreenReader)
    }

    checkScreenReader()

    // Create skip link for keyboard navigation
    // const skipLink = FocusManager.createSkipLink()
    // document.body.insertBefore(skipLink, document.body.firstChild)

    return () => {
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange)
      highContrastQuery.removeEventListener('change', handleHighContrastChange)
      darkModeQuery.removeEventListener('change', handleDarkModeChange)
      document.removeEventListener('keydown', handleKeyboardNavigation)
      document.removeEventListener('mousedown', handleMouseUse)
      
      // Clean up skip link
      // if (skipLink.parentNode) {
      //   skipLink.parentNode.removeChild(skipLink)
      // }
    }
  }, [])

  // Apply accessibility styles based on preferences
  useEffect(() => {
    const root = document.documentElement
    
    // Font size adjustments
    switch (fontSize) {
      case 'large':
        root.style.fontSize = '18px'
        break
      case 'extra-large':
        root.style.fontSize = '24px'
        break
      default:
        root.style.fontSize = '16px'
    }

    // High contrast mode
    if (highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }

    // Dark mode
    if (darkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // Reduced motion
    if (reducedMotion) {
      root.classList.add('reduce-motion')
    } else {
      root.classList.remove('reduce-motion')
    }

    // Keyboard navigation mode
    if (keyboardNavigation) {
      root.classList.add('keyboard-navigation')
    } else {
      root.classList.remove('keyboard-navigation')
    }
  }, [fontSize, highContrast, darkMode, reducedMotion, keyboardNavigation])

  const announceMessage = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    ARIAUtils.announce(message, priority)
  }

  const contextValue: AccessibilityContextType = {
    reducedMotion,
    highContrast,
    fontSize,
    screenReaderMode,
    keyboardNavigation,
    darkMode,
    language,
    announceMessage,
  }

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  )
}

// Accessibility settings component
export function AccessibilitySettings() {
  const {
    fontSize,
    highContrast,
    darkMode,
    language,
    announceMessage,
  } = useAccessibility()

  const [localFontSize, setLocalFontSize] = useState(fontSize)
  const [localHighContrast, setLocalHighContrast] = useState(highContrast)
  const [localDarkMode, setLocalDarkMode] = useState(darkMode)
  const [localLanguage, setLocalLanguage] = useState(language)

  const handleFontSizeChange = (newSize: 'normal' | 'large' | 'extra-large') => {
    setLocalFontSize(newSize)
    const root = document.documentElement
    switch (newSize) {
      case 'large':
        root.style.fontSize = '18px'
        break
      case 'extra-large':
        root.style.fontSize = '24px'
        break
      default:
        root.style.fontSize = '16px'
    }
    announceMessage(`Font size changed to ${newSize}`)
  }

  const handleContrastToggle = () => {
    const newContrast = !localHighContrast
    setLocalHighContrast(newContrast)
    const root = document.documentElement
    if (newContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }
    announceMessage(`High contrast mode ${newContrast ? 'enabled' : 'disabled'}`)
  }

  const handleDarkModeToggle = () => {
    const newDarkMode = !localDarkMode
    setLocalDarkMode(newDarkMode)
    const root = document.documentElement
    if (newDarkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    announceMessage(`Dark mode ${newDarkMode ? 'enabled' : 'disabled'}`)
  }

  const handleLanguageChange = (newLanguage: 'es' | 'en') => {
    setLocalLanguage(newLanguage)
    document.documentElement.lang = newLanguage
    announceMessage(`Language changed to ${newLanguage === 'es' ? 'Spanish' : 'English'}`)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6" id="accessibility-settings">
        Configuración de Accesibilidad
      </h2>
      
      <div className="space-y-6" role="group" aria-labelledby="accessibility-settings">
        {/* Font Size Control */}
        <fieldset className="space-y-3">
          <legend className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            Tamaño de Fuente
          </legend>
          <div className="space-y-2" role="radiogroup" aria-label="Font size options">
            {[
              { value: 'normal', label: 'Normal (16px)' },
              { value: 'large', label: 'Grande (18px)' },
              { value: 'extra-large', label: 'Extra Grande (24px)' },
            ].map((option) => (
              <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="fontSize"
                  value={option.value}
                  checked={localFontSize === option.value}
                  onChange={() => handleFontSizeChange(option.value as any)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  aria-describedby={`font-size-${option.value}-desc`}
                />
                <span className="text-gray-700 dark:text-gray-300">{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* High Contrast Toggle */}
        <div className="flex items-center justify-between">
          <label htmlFor="high-contrast" className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            Alto Contraste
          </label>
          <button
            id="high-contrast"
            type="button"
            role="switch"
            aria-checked={localHighContrast}
            onClick={handleContrastToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              localHighContrast ? 'bg-blue-600' : 'bg-gray-200'
            }`}
            aria-describedby="high-contrast-desc"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                localHighContrast ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <p id="high-contrast-desc" className="text-sm text-gray-600 dark:text-gray-400">
          Mejora la legibilidad aumentando el contraste de colores
        </p>

        {/* Dark Mode Toggle */}
        <div className="flex items-center justify-between">
          <label htmlFor="dark-mode" className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            Modo Oscuro
          </label>
          <button
            id="dark-mode"
            type="button"
            role="switch"
            aria-checked={localDarkMode}
            onClick={handleDarkModeToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              localDarkMode ? 'bg-blue-600' : 'bg-gray-200'
            }`}
            aria-describedby="dark-mode-desc"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                localDarkMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <p id="dark-mode-desc" className="text-sm text-gray-600 dark:text-gray-400">
          Reduce la fatiga visual en entornos con poca luz
        </p>

        {/* Language Selection */}
        <fieldset className="space-y-3">
          <legend className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            Idioma
          </legend>
          <div className="space-y-2" role="radiogroup" aria-label="Language options">
            {[
              { value: 'es', label: 'Español' },
              { value: 'en', label: 'English' },
            ].map((option) => (
              <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="language"
                  value={option.value}
                  checked={localLanguage === option.value}
                  onChange={() => handleLanguageChange(option.value as 'es' | 'en')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-gray-700 dark:text-gray-300">{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  )
}

export default AccessibilityProvider
/**
 * Enterprise Accessibility System
 * WCAG 2.1 AA compliance utilities and components
 */

import { createContext, useContext } from 'react'

// WCAG 2.1 AA Configuration
export const ACCESSIBILITY_CONFIG = {
  CONTRAST_RATIOS: {
    NORMAL_TEXT: 4.5, // AA standard
    LARGE_TEXT: 3, // AA standard for 18pt+ or 14pt+ bold
    ENHANCED_AA: 7, // AAA standard
  },
  FONT_SIZES: {
    MINIMUM: 12, // Minimum readable size
    NORMAL: 16, // Base font size
    LARGE: 18, // Large text threshold
    HEADING_H1: 32,
    HEADING_H2: 28,
    HEADING_H3: 24,
    HEADING_H4: 20,
    HEADING_H5: 18,
    HEADING_H6: 16,
  },
  FOCUS_INDICATORS: {
    WIDTH: 2, // px
    STYLE: 'solid',
    COLOR: '#005fcc', // High contrast blue
    OFFSET: 2, // px
  },
  TOUCH_TARGETS: {
    MINIMUM_SIZE: 44, // px - WCAG AA minimum
    RECOMMENDED_SIZE: 48, // px - Better UX
    SPACING: 8, // px between targets
  },
  TIMING: {
    ANIMATION_DURATION: 200, // ms - respects prefers-reduced-motion
    TOOLTIP_DELAY: 500, // ms
    NOTIFICATION_DURATION: 7000, // ms - time to read
  },
  ARIA_LIVE_REGIONS: {
    POLITE: 'polite',
    ASSERTIVE: 'assertive',
    OFF: 'off',
  },
} as const

// Accessibility context for global settings
interface AccessibilityContextType {
  reducedMotion: boolean
  highContrast: boolean
  fontSize: 'normal' | 'large' | 'extra-large'
  screenReaderMode: boolean
  keyboardNavigation: boolean
}

const AccessibilityContext = createContext<AccessibilityContextType>({
  reducedMotion: false,
  highContrast: false,
  fontSize: 'normal',
  screenReaderMode: false,
  keyboardNavigation: false,
})

export const useAccessibility = () => useContext(AccessibilityContext)

// Color contrast utilities
export class ColorContrastAnalyzer {
  /**
   * Calculate relative luminance of a color
   */
  private static getLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }

  /**
   * Calculate contrast ratio between two colors
   */
  static getContrastRatio(color1: string, color2: string): number {
    const hex1 = color1.replace('#', '')
    const hex2 = color2.replace('#', '')
    
    const r1 = parseInt(hex1.substr(0, 2), 16)
    const g1 = parseInt(hex1.substr(2, 2), 16)
    const b1 = parseInt(hex1.substr(4, 2), 16)
    
    const r2 = parseInt(hex2.substr(0, 2), 16)
    const g2 = parseInt(hex2.substr(2, 2), 16)
    const b2 = parseInt(hex2.substr(4, 2), 16)
    
    const lum1 = this.getLuminance(r1, g1, b1)
    const lum2 = this.getLuminance(r2, g2, b2)
    
    const brightest = Math.max(lum1, lum2)
    const darkest = Math.min(lum1, lum2)
    
    return (brightest + 0.05) / (darkest + 0.05)
  }

  /**
   * Check if color combination meets WCAG contrast requirements
   */
  static meetsWCAGContrast(
    foreground: string,
    background: string,
    level: 'AA' | 'AAA' = 'AA',
    isLargeText: boolean = false
  ): boolean {
    const ratio = this.getContrastRatio(foreground, background)
    
    if (level === 'AAA') {
      return isLargeText ? ratio >= 4.5 : ratio >= 7
    }
    
    return isLargeText ? ratio >= 3 : ratio >= 4.5
  }

  /**
   * Generate accessible color palette
   */
  static generateAccessiblePalette(baseColor: string): {
    primary: string
    secondary: string
    background: string
    text: string
    textSecondary: string
    error: string
    warning: string
    success: string
  } {
    return {
      primary: baseColor,
      secondary: '#6b7280', // Neutral gray with good contrast
      background: '#ffffff',
      text: '#111827', // Near black for maximum contrast
      textSecondary: '#4b5563', // Dark gray with AA contrast on white
      error: '#dc2626', // Red with good contrast
      warning: '#d97706', // Orange with good contrast
      success: '#059669', // Green with good contrast
    }
  }
}

// Screen reader utilities
export class ScreenReaderUtils {
  /**
   * Generate descriptive text for complex UI elements
   */
  static describeDataTable(
    rows: number,
    columns: number,
    selectedCount: number = 0
  ): string {
    let description = `Data table with ${rows} rows and ${columns} columns.`
    if (selectedCount > 0) {
      description += ` ${selectedCount} items selected.`
    }
    description += ' Use arrow keys to navigate, Enter to select, and Space to toggle.'
    return description
  }

  /**
   * Generate status announcements
   */
  static announceAction(
    action: string,
    item?: string,
    result: 'success' | 'error' | 'warning' = 'success'
  ): string {
    const resultText = result === 'success' ? 'completed successfully' : 
                      result === 'error' ? 'failed' : 'completed with warnings'
    
    return item ? 
      `${action} for ${item} ${resultText}` : 
      `${action} ${resultText}`
  }

  /**
   * Generate loading state announcements
   */
  static announceLoadingState(
    isLoading: boolean,
    loadingText: string = 'Loading content'
  ): string {
    return isLoading ? `${loadingText}, please wait.` : 'Content loaded.'
  }

  /**
   * Generate form validation messages
   */
  static announceFormValidation(
    fieldName: string,
    errors: string[],
    isValid: boolean
  ): string {
    if (isValid) {
      return `${fieldName} is valid.`
    }
    
    const errorText = errors.length === 1 ? 
      errors[0] : 
      `${errors.length} errors: ${errors.join(', ')}`
    
    return `${fieldName} has errors: ${errorText}`
  }
}

// Keyboard navigation utilities
export class KeyboardNavigation {
  /**
   * Handle arrow key navigation in grids/tables
   */
  static handleArrowKeys(
    event: KeyboardEvent,
    currentRow: number,
    currentCol: number,
    maxRows: number,
    maxCols: number,
    onNavigate: (row: number, col: number) => void
  ): boolean {
    let newRow = currentRow
    let newCol = currentCol
    let handled = false

    switch (event.key) {
      case 'ArrowUp':
        newRow = Math.max(0, currentRow - 1)
        handled = true
        break
      case 'ArrowDown':
        newRow = Math.min(maxRows - 1, currentRow + 1)
        handled = true
        break
      case 'ArrowLeft':
        newCol = Math.max(0, currentCol - 1)
        handled = true
        break
      case 'ArrowRight':
        newCol = Math.min(maxCols - 1, currentCol + 1)
        handled = true
        break
      case 'Home':
        if (event.ctrlKey) {
          newRow = 0
          newCol = 0
        } else {
          newCol = 0
        }
        handled = true
        break
      case 'End':
        if (event.ctrlKey) {
          newRow = maxRows - 1
          newCol = maxCols - 1
        } else {
          newCol = maxCols - 1
        }
        handled = true
        break
    }

    if (handled) {
      event.preventDefault()
      onNavigate(newRow, newCol)
    }

    return handled
  }

  /**
   * Handle list navigation
   */
  static handleListNavigation(
    event: KeyboardEvent,
    currentIndex: number,
    itemCount: number,
    onNavigate: (index: number) => void,
    onSelect?: (index: number) => void
  ): boolean {
    let newIndex = currentIndex
    let handled = false

    switch (event.key) {
      case 'ArrowUp':
        newIndex = currentIndex > 0 ? currentIndex - 1 : itemCount - 1
        handled = true
        break
      case 'ArrowDown':
        newIndex = currentIndex < itemCount - 1 ? currentIndex + 1 : 0
        handled = true
        break
      case 'Home':
        newIndex = 0
        handled = true
        break
      case 'End':
        newIndex = itemCount - 1
        handled = true
        break
      case 'Enter':
      case ' ':
        if (onSelect) {
          onSelect(currentIndex)
          handled = true
        }
        break
    }

    if (handled && newIndex !== currentIndex) {
      event.preventDefault()
      onNavigate(newIndex)
    }

    return handled
  }

  /**
   * Skip to main content functionality
   */
  static createSkipLink(): HTMLElement {
    const skipLink = document.createElement('a')
    skipLink.href = '#main-content'
    skipLink.textContent = 'Skip to main content'
    skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded'
    
    skipLink.addEventListener('click', (e) => {
      e.preventDefault()
      const mainContent = document.getElementById('main-content')
      if (mainContent) {
        mainContent.focus()
        mainContent.scrollIntoView()
      }
    })

    return skipLink
  }
}

// Focus management utilities
export class FocusManager {
  private static focusStack: HTMLElement[] = []

  /**
   * Trap focus within a container (for modals, dialogs)
   */
  static trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus()
          e.preventDefault()
        }
      }
    }

    container.addEventListener('keydown', handleTabKey)
    firstElement?.focus()

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleTabKey)
    }
  }

  /**
   * Save current focus and restore later
   */
  static saveFocus(): void {
    const activeElement = document.activeElement as HTMLElement
    if (activeElement) {
      this.focusStack.push(activeElement)
    }
  }

  /**
   * Restore previously saved focus
   */
  static restoreFocus(): void {
    const element = this.focusStack.pop()
    if (element && element.focus) {
      element.focus()
    }
  }

  /**
   * Create visible focus indicator
   */
  static addFocusIndicator(element: HTMLElement): void {
    element.style.outline = `${ACCESSIBILITY_CONFIG.FOCUS_INDICATORS.WIDTH}px ${ACCESSIBILITY_CONFIG.FOCUS_INDICATORS.STYLE} ${ACCESSIBILITY_CONFIG.FOCUS_INDICATORS.COLOR}`
    element.style.outlineOffset = `${ACCESSIBILITY_CONFIG.FOCUS_INDICATORS.OFFSET}px`
  }

  /**
   * Remove focus indicator
   */
  static removeFocusIndicator(element: HTMLElement): void {
    element.style.outline = 'none'
    element.style.outlineOffset = '0'
  }
}

// ARIA utilities
export class ARIAUtils {
  /**
   * Generate unique IDs for ARIA relationships
   */
  static generateId(prefix: string = 'aria'): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Create live region for announcements
   */
  static createLiveRegion(
    level: 'polite' | 'assertive' = 'polite'
  ): HTMLElement {
    const liveRegion = document.createElement('div')
    liveRegion.setAttribute('aria-live', level)
    liveRegion.setAttribute('aria-atomic', 'true')
    liveRegion.className = 'sr-only'
    document.body.appendChild(liveRegion)
    return liveRegion
  }

  /**
   * Announce message to screen readers
   */
  static announce(
    message: string,
    level: 'polite' | 'assertive' = 'polite'
  ): void {
    const liveRegion = this.createLiveRegion(level)
    liveRegion.textContent = message
    
    // Clean up after announcement
    setTimeout(() => {
      document.body.removeChild(liveRegion)
    }, 1000)
  }

  /**
   * Create ARIA attributes for form fields
   */
  static createFormFieldAria(
    fieldId: string,
    label: string,
    description?: string,
    errors?: string[],
    required: boolean = false
  ): Record<string, string> {
    const attrs: Record<string, string> = {
      'id': fieldId,
      'aria-label': label,
    }

    if (required) {
      attrs['aria-required'] = 'true'
    }

    if (description) {
      const descId = this.generateId('desc')
      attrs['aria-describedby'] = descId
    }

    if (errors && errors.length > 0) {
      attrs['aria-invalid'] = 'true'
      const errorId = this.generateId('error')
      attrs['aria-describedby'] = attrs['aria-describedby'] ? 
        `${attrs['aria-describedby']} ${errorId}` : errorId
    }

    return attrs
  }

  /**
   * Create ARIA attributes for data tables
   */
  static createTableAria(
    caption: string,
    rowCount: number,
    columnCount: number
  ): Record<string, string> {
    return {
      'role': 'table',
      'aria-label': caption,
      'aria-rowcount': rowCount.toString(),
      'aria-colcount': columnCount.toString(),
    }
  }

  /**
   * Create ARIA attributes for interactive elements
   */
  static createInteractiveAria(
    role: string,
    label: string,
    expanded?: boolean,
    selected?: boolean,
    disabled?: boolean
  ): Record<string, string> {
    const attrs: Record<string, string> = {
      'role': role,
      'aria-label': label,
    }

    if (expanded !== undefined) {
      attrs['aria-expanded'] = expanded.toString()
    }

    if (selected !== undefined) {
      attrs['aria-selected'] = selected.toString()
    }

    if (disabled !== undefined) {
      attrs['aria-disabled'] = disabled.toString()
    }

    return attrs
  }
}

// Accessible component utilities
export class AccessibleComponents {
  /**
   * Create accessible button
   */
  static createButton(
    text: string,
    onClick: () => void,
    options: {
      variant?: 'primary' | 'secondary' | 'danger'
      size?: 'small' | 'medium' | 'large'
      disabled?: boolean
      loading?: boolean
      ariaLabel?: string
    } = {}
  ): React.ReactElement {
    const {
      variant = 'primary',
      size = 'medium',
      disabled = false,
      loading = false,
      ariaLabel
    } = options

    const baseClasses = [
      'inline-flex items-center justify-center',
      'font-medium rounded-md',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'transition-colors duration-200'
    ]

    const sizeClasses = {
      small: 'px-3 py-2 text-sm',
      medium: 'px-4 py-2 text-base',
      large: 'px-6 py-3 text-lg'
    }

    const variantClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
    }

    const className = [
      ...baseClasses,
      sizeClasses[size],
      variantClasses[variant]
    ].join(' ')

    return React.createElement(
      'button',
      {
        type: 'button',
        className,
        onClick,
        disabled: disabled || loading,
        'aria-label': ariaLabel || text,
        'aria-busy': loading,
      },
      loading ? 'Loading...' : text
    )
  }

  /**
   * Create accessible form field
   */
  static createFormField(
    type: 'input' | 'textarea' | 'select',
    props: {
      id: string
      label: string
      value: string
      onChange: (value: string) => void
      placeholder?: string
      description?: string
      errors?: string[]
      required?: boolean
      options?: Array<{ value: string; label: string }> // for select
    }
  ): React.ReactElement {
    const {
      id,
      label,
      value,
      onChange,
      placeholder,
      description,
      errors = [],
      required = false,
      options = []
    } = props

    const hasErrors = errors.length > 0
    const ariaAttrs = ARIAUtils.createFormFieldAria(id, label, description, errors, required)

    const fieldProps = {
      ...ariaAttrs,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        onChange(e.target.value)
      },
      placeholder,
      className: [
        'block w-full px-3 py-2 border rounded-md shadow-sm',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
        hasErrors ? 'border-red-300' : 'border-gray-300',
        'disabled:bg-gray-50 disabled:text-gray-500'
      ].join(' ')
    }

    const labelElement = React.createElement(
      'label',
      {
        htmlFor: id,
        className: 'block text-sm font-medium text-gray-700 mb-1'
      },
      required ? `${label} *` : label
    )

    let fieldElement: React.ReactElement

    if (type === 'select') {
      fieldElement = React.createElement(
        'select',
        fieldProps,
        ...options.map(option => 
          React.createElement('option', { key: option.value, value: option.value }, option.label)
        )
      )
    } else if (type === 'textarea') {
      fieldElement = React.createElement('textarea', { ...fieldProps, rows: 4 })
    } else {
      fieldElement = React.createElement('input', { ...fieldProps, type: 'text' })
    }

    const elements = [labelElement, fieldElement]

    if (description) {
      elements.push(
        React.createElement(
          'p',
          { id: `${id}-desc`, className: 'mt-1 text-sm text-gray-600' },
          description
        )
      )
    }

    if (hasErrors) {
      elements.push(
        React.createElement(
          'div',
          { id: `${id}-error`, className: 'mt-1 text-sm text-red-600', role: 'alert' },
          errors.join(', ')
        )
      )
    }

    return React.createElement('div', { className: 'mb-4' }, ...elements)
  }
}

// Accessibility testing utilities
export class AccessibilityTester {
  /**
   * Test color contrast compliance
   */
  static testColorContrast(elements: HTMLElement[]): Array<{
    element: HTMLElement
    foreground: string
    background: string
    ratio: number
    passes: boolean
  }> {
    return elements.map(element => {
      const styles = window.getComputedStyle(element)
      const foreground = styles.color
      const background = styles.backgroundColor
      
      // Convert RGB to hex for contrast calculation
      const fgHex = this.rgbToHex(foreground)
      const bgHex = this.rgbToHex(background)
      
      const ratio = ColorContrastAnalyzer.getContrastRatio(fgHex, bgHex)
      const passes = ColorContrastAnalyzer.meetsWCAGContrast(fgHex, bgHex)

      return {
        element,
        foreground: fgHex,
        background: bgHex,
        ratio,
        passes
      }
    })
  }

  private static rgbToHex(rgb: string): string {
    // Convert RGB string to hex
    const match = rgb.match(/\d+/g)
    if (!match) return '#000000'
    
    const [r, g, b] = match.map(Number)
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
  }

  /**
   * Test keyboard navigation
   */
  static testKeyboardNavigation(container: HTMLElement): {
    focusableElements: number
    tabOrder: HTMLElement[]
    issues: string[]
  } {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>

    const tabOrder: HTMLElement[] = []
    const issues: string[] = []

    focusableElements.forEach((element, index) => {
      tabOrder.push(element)
      
      // Check for missing focus indicators
      if (!element.style.outline && !element.classList.contains('focus:')) {
        issues.push(`Element ${index + 1} lacks visible focus indicator`)
      }

      // Check for proper tab order
      const tabIndex = element.tabIndex
      if (tabIndex > 0) {
        issues.push(`Element ${index + 1} uses positive tabindex (${tabIndex}), which can break tab order`)
      }
    })

    return {
      focusableElements: focusableElements.length,
      tabOrder,
      issues
    }
  }

  /**
   * Test ARIA implementation
   */
  static testARIA(container: HTMLElement): {
    ariaElements: number
    missingLabels: HTMLElement[]
    invalidRoles: HTMLElement[]
    issues: string[]
  } {
    const issues: string[] = []
    const missingLabels: HTMLElement[] = []
    const invalidRoles: HTMLElement[] = []

    // Check for elements that need labels
    const interactiveElements = container.querySelectorAll(
      'button, input, select, textarea, [role="button"], [role="checkbox"], [role="radio"]'
    ) as NodeListOf<HTMLElement>

    interactiveElements.forEach(element => {
      const hasLabel = element.hasAttribute('aria-label') || 
                      element.hasAttribute('aria-labelledby') ||
                      element.textContent?.trim()

      if (!hasLabel) {
        missingLabels.push(element)
        issues.push(`Interactive element missing accessible label: ${element.tagName}`)
      }
    })

    // Check for invalid ARIA roles
    const elementsWithRoles = container.querySelectorAll('[role]') as NodeListOf<HTMLElement>
    const validRoles = [
      'button', 'checkbox', 'radio', 'textbox', 'combobox', 'listbox', 'option',
      'table', 'row', 'cell', 'columnheader', 'rowheader', 'grid', 'gridcell',
      'dialog', 'alertdialog', 'alert', 'status', 'log', 'marquee', 'timer',
      'tab', 'tablist', 'tabpanel', 'navigation', 'banner', 'main', 'region',
      'article', 'section', 'complementary', 'contentinfo', 'form', 'search'
    ]

    elementsWithRoles.forEach(element => {
      const role = element.getAttribute('role')
      if (role && !validRoles.includes(role)) {
        invalidRoles.push(element)
        issues.push(`Invalid ARIA role: ${role}`)
      }
    })

    return {
      ariaElements: elementsWithRoles.length,
      missingLabels,
      invalidRoles,
      issues
    }
  }

  /**
   * Generate accessibility report
   */
  static generateReport(container: HTMLElement): {
    colorContrast: ReturnType<typeof AccessibilityTester.testColorContrast>
    keyboardNavigation: ReturnType<typeof AccessibilityTester.testKeyboardNavigation>
    aria: ReturnType<typeof AccessibilityTester.testARIA>
    summary: {
      totalIssues: number
      criticalIssues: number
      warningIssues: number
      passRate: number
    }
  } {
    const allElements = Array.from(container.querySelectorAll('*')) as HTMLElement[]
    const colorContrast = this.testColorContrast(allElements)
    const keyboardNavigation = this.testKeyboardNavigation(container)
    const aria = this.testARIA(container)

    const totalIssues = colorContrast.filter(r => !r.passes).length + 
                       keyboardNavigation.issues.length + 
                       aria.issues.length

    const criticalIssues = aria.missingLabels.length + 
                          colorContrast.filter(r => r.ratio < 3).length

    const warningIssues = totalIssues - criticalIssues

    const totalTests = colorContrast.length + keyboardNavigation.focusableElements + aria.ariaElements
    const passedTests = totalTests - totalIssues
    const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 100

    return {
      colorContrast,
      keyboardNavigation,
      aria,
      summary: {
        totalIssues,
        criticalIssues,
        warningIssues,
        passRate: Math.round(passRate * 100) / 100
      }
    }
  }
}

// CSS utility classes for accessibility
export const ACCESSIBILITY_STYLES = `
/* Screen reader only content */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.sr-only.focus:focus {
  position: static;
  width: auto;
  height: auto;
  padding: 0.5rem;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  * {
    border-color: ButtonText !important;
  }
  
  button, input, select, textarea {
    border: 2px solid ButtonText !important;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Focus indicators */
.focus-visible:focus {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
}

/* Touch target sizing */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

/* Color-blind friendly alternatives */
.color-blind-safe {
  /* Use patterns, icons, or text in addition to color */
}

/* High contrast colors */
.high-contrast {
  --text-primary: #000000;
  --text-secondary: #4a5568;
  --bg-primary: #ffffff;
  --bg-secondary: #f7fafc;
  --border-color: #2d3748;
  --focus-color: #005fcc;
  --error-color: #e53e3e;
  --success-color: #38a169;
  --warning-color: #d69e2e;
}
`

export default {
  ACCESSIBILITY_CONFIG,
  ColorContrastAnalyzer,
  ScreenReaderUtils,
  KeyboardNavigation,
  FocusManager,
  ARIAUtils,
  AccessibleComponents,
  AccessibilityTester,
  ACCESSIBILITY_STYLES,
}
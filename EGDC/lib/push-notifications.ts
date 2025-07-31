/**
 * Push Notifications Service for EGDC
 * Handles low stock alerts and inventory updates
 */

import React from 'react'

interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  url?: string
  tag?: string
  requireInteraction?: boolean
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
  data?: any
}

interface SubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export class PushNotificationManager {
  private static instance: PushNotificationManager
  private registration: ServiceWorkerRegistration | null = null
  private subscription: PushSubscription | null = null

  static getInstance(): PushNotificationManager {
    if (!PushNotificationManager.instance) {
      PushNotificationManager.instance = new PushNotificationManager()
    }
    return PushNotificationManager.instance
  }

  /**
   * Initialize push notifications
   */
  async initialize(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported')
      return false
    }

    try {
      // Wait for service worker to be ready
      this.registration = await navigator.serviceWorker.ready
      
      // Check if already subscribed
      this.subscription = await this.registration.pushManager.getSubscription()
      
      return true
    } catch (error) {
      console.error('Failed to initialize push notifications:', error)
      return false
    }
  }

  /**
   * Request permission for notifications
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported')
      return false
    }

    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(vapidPublicKey: string): Promise<SubscriptionData | null> {
    if (!this.registration) {
      await this.initialize()
    }

    if (!this.registration) {
      throw new Error('Service worker not available')
    }

    try {
      // Check if already subscribed
      let subscription = await this.registration.pushManager.getSubscription()
      
      if (!subscription) {
        // Create new subscription
        subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
        })
      }

      this.subscription = subscription

      // Convert subscription to our format
      const subscriptionData: SubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
        }
      }

      return subscriptionData
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
      return null
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.subscription) {
      return true
    }

    try {
      const result = await this.subscription.unsubscribe()
      this.subscription = null
      return result
    } catch (error) {
      console.error('Failed to unsubscribe:', error)
      return false
    }
  }

  /**
   * Send a local notification (for testing or offline scenarios)
   */
  async sendLocalNotification(payload: NotificationPayload): Promise<void> {
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported')
    }

    if (Notification.permission !== 'granted') {
      throw new Error('Notification permission not granted')
    }

    const notification = new Notification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/badge-72x72.png',
      tag: payload.tag,
      requireInteraction: payload.requireInteraction || false,
      data: payload.data,
      actions: payload.actions as any // TypeScript issue with NotificationAction
    })

    notification.onclick = () => {
      if (payload.url) {
        window.open(payload.url, '_blank')
      }
      notification.close()
    }
  }

  /**
   * Check if notifications are supported and enabled
   */
  isSupported(): boolean {
    return 'serviceWorker' in navigator && 
           'PushManager' in window && 
           'Notification' in window
  }

  /**
   * Get current notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied'
    }
    return Notification.permission
  }

  /**
   * Get current subscription status
   */
  isSubscribed(): boolean {
    return this.subscription !== null
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }
}

/**
 * Low Stock Alert Manager
 */
export class LowStockAlertManager {
  private notificationManager: PushNotificationManager
  private thresholds: { [key: string]: number } = {
    critical: 2,
    low: 5,
    warning: 10
  }

  constructor() {
    this.notificationManager = PushNotificationManager.getInstance()
  }

  /**
   * Set custom stock thresholds
   */
  setThresholds(thresholds: { critical?: number; low?: number; warning?: number }) {
    this.thresholds = { ...this.thresholds, ...thresholds }
  }

  /**
   * Check inventory levels and send alerts
   */
  async checkInventoryLevels(products: Array<{ 
    id: number
    marca: string
    modelo: string
    inventory_total: number
    sku: string
  }>, language: 'es' | 'en' = 'es'): Promise<void> {
    const alerts = this.analyzeInventoryLevels(products)
    
    if (alerts.length === 0) {
      return
    }

    // Group alerts by severity
    const criticalAlerts = alerts.filter(a => a.level === 'critical')
    const lowAlerts = alerts.filter(a => a.level === 'low')
    const warningAlerts = alerts.filter(a => a.level === 'warning')

    // Send critical alerts immediately
    if (criticalAlerts.length > 0) {
      await this.sendCriticalStockAlert(criticalAlerts, language)
    }

    // Send summary for low and warning alerts
    if (lowAlerts.length > 0 || warningAlerts.length > 0) {
      await this.sendStockSummaryAlert(lowAlerts, warningAlerts, language)
    }
  }

  /**
   * Analyze inventory levels
   */
  private analyzeInventoryLevels(products: Array<{
    id: number
    marca: string
    modelo: string
    inventory_total: number
    sku: string
  }>): Array<{
    product: typeof products[0]
    level: 'critical' | 'low' | 'warning'
  }> {
    const alerts: Array<{
      product: typeof products[0]
      level: 'critical' | 'low' | 'warning'
    }> = []

    for (const product of products) {
      if (product.inventory_total <= this.thresholds.critical) {
        alerts.push({ product, level: 'critical' })
      } else if (product.inventory_total <= this.thresholds.low) {
        alerts.push({ product, level: 'low' })
      } else if (product.inventory_total <= this.thresholds.warning) {
        alerts.push({ product, level: 'warning' })
      }
    }

    return alerts
  }

  /**
   * Send critical stock alert
   */
  private async sendCriticalStockAlert(
    alerts: Array<{ product: any; level: string }>, 
    language: 'es' | 'en'
  ): Promise<void> {
    const product = alerts[0].product
    const title = language === 'es' 
      ? '🚨 Stock Crítico' 
      : '🚨 Critical Stock'
    
    const body = language === 'es'
      ? `${product.marca} ${product.modelo} tiene solo ${product.inventory_total} unidades restantes`
      : `${product.marca} ${product.modelo} has only ${product.inventory_total} units remaining`

    await this.notificationManager.sendLocalNotification({
      title,
      body,
      icon: '/icons/critical-stock.png',
      tag: 'critical-stock',
      requireInteraction: true,
      url: '/inventory',
      actions: [
        {
          action: 'view-inventory',
          title: language === 'es' ? 'Ver Inventario' : 'View Inventory',
          icon: '/icons/view-icon.png'
        },
        {
          action: 'reorder',
          title: language === 'es' ? 'Reordenar' : 'Reorder',
          icon: '/icons/reorder-icon.png'
        }
      ],
      data: {
        type: 'critical-stock',
        productId: product.id,
        level: 'critical'
      }
    })
  }

  /**
   * Send stock summary alert
   */
  private async sendStockSummaryAlert(
    lowAlerts: Array<{ product: any; level: string }>,
    warningAlerts: Array<{ product: any; level: string }>,
    language: 'es' | 'en'
  ): Promise<void> {
    const totalItems = lowAlerts.length + warningAlerts.length
    
    const title = language === 'es' 
      ? '📦 Resumen de Stock' 
      : '📦 Stock Summary'
    
    let body = ''
    if (language === 'es') {
      if (lowAlerts.length > 0) {
        body += `${lowAlerts.length} productos con stock bajo`
      }
      if (warningAlerts.length > 0) {
        if (body) body += ', '
        body += `${warningAlerts.length} productos en alerta`
      }
    } else {
      if (lowAlerts.length > 0) {
        body += `${lowAlerts.length} products with low stock`
      }
      if (warningAlerts.length > 0) {
        if (body) body += ', '
        body += `${warningAlerts.length} products with warning levels`
      }
    }

    await this.notificationManager.sendLocalNotification({
      title,
      body,
      icon: '/icons/stock-warning.png',
      tag: 'stock-summary',
      url: '/inventory',
      actions: [
        {
          action: 'view-inventory',
          title: language === 'es' ? 'Ver Inventario' : 'View Inventory',
          icon: '/icons/view-icon.png'
        }
      ],
      data: {
        type: 'stock-summary',
        lowCount: lowAlerts.length,
        warningCount: warningAlerts.length
      }
    })
  }
}

/**
 * React Hook for Push Notifications
 */
export function usePushNotifications() {
  const [isSupported, setIsSupported] = React.useState(false)
  const [permission, setPermission] = React.useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = React.useState(false)

  const notificationManager = PushNotificationManager.getInstance()
  const lowStockManager = new LowStockAlertManager()

  React.useEffect(() => {
    setIsSupported(notificationManager.isSupported())
    setPermission(notificationManager.getPermissionStatus())
    setIsSubscribed(notificationManager.isSubscribed())
    
    // Initialize notification manager
    notificationManager.initialize()
  }, [])

  const requestPermission = async (): Promise<boolean> => {
    const granted = await notificationManager.requestPermission()
    setPermission(notificationManager.getPermissionStatus())
    return granted
  }

  const subscribe = async (vapidPublicKey: string): Promise<boolean> => {
    try {
      const subscription = await notificationManager.subscribe(vapidPublicKey)
      setIsSubscribed(!!subscription)
      return !!subscription
    } catch (error) {
      console.error('Failed to subscribe to notifications:', error)
      return false
    }
  }

  const unsubscribe = async (): Promise<boolean> => {
    const result = await notificationManager.unsubscribe()
    setIsSubscribed(false)
    return result
  }

  const sendTestNotification = async (language: 'es' | 'en' = 'es') => {
    await notificationManager.sendLocalNotification({
      title: language === 'es' ? 'Notificación de Prueba' : 'Test Notification',
      body: language === 'es' 
        ? 'Las notificaciones están funcionando correctamente'
        : 'Notifications are working correctly',
      tag: 'test-notification',
      data: { type: 'test' }
    })
  }

  const checkInventoryAlerts = async (products: any[], language: 'es' | 'en' = 'es') => {
    await lowStockManager.checkInventoryLevels(products, language)
  }

  return {
    isSupported,
    permission,
    isSubscribed,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
    checkInventoryAlerts,
    setStockThresholds: lowStockManager.setThresholds.bind(lowStockManager)
  }
}

export default PushNotificationManager
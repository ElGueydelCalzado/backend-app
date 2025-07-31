'use client'

import React, { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, CreditCard, Truck, MapPin, Check, X, Lock } from 'lucide-react'

interface CartItem {
  id: number
  productId: number
  quantity: number
  product: {
    id: number
    marca: string | null
    modelo: string | null
    color: string | null
    talla: string | null
    sku: string | null
    google_drive: string | null
    precio_shopify: number | null
    inventory_total: number | null
  }
}

interface ShippingInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
}

interface PaymentInfo {
  cardNumber: string
  expiryDate: string
  cvv: string
  cardName: string
}

const CheckoutFlow: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'México'
  })

  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: ''
  })

  const [shippingMethod, setShippingMethod] = useState('standard')
  const [paymentMethod, setPaymentMethod] = useState('card')

  // Fetch cart items
  useEffect(() => {
    fetchCartItems()
  }, [])

  const fetchCartItems = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/consumer/cart')
      if (response.ok) {
        const data = await response.json()
        setCartItems(data.items || [])
      }
    } catch (error) {
      console.error('Error fetching cart items:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.product.precio_shopify || 0) * item.quantity
    }, 0)
  }

  const calculateShipping = () => {
    const subtotal = calculateSubtotal()
    if (subtotal > 1000) return 0
    
    switch (shippingMethod) {
      case 'express': return 250
      case 'same-day': return 400
      default: return 150
    }
  }

  const calculateTax = () => {
    return calculateSubtotal() * 0.16
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateShipping() + calculateTax()
  }

  const validateShippingInfo = () => {
    const required = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'zipCode']
    return required.every(field => shippingInfo[field as keyof ShippingInfo].trim() !== '')
  }

  const validatePaymentInfo = () => {
    const { cardNumber, expiryDate, cvv, cardName } = paymentInfo
    return cardNumber.length >= 16 && expiryDate.length >= 5 && cvv.length >= 3 && cardName.trim() !== ''
  }

  const processOrder = async () => {
    setProcessing(true)
    try {
      const orderData = {
        items: cartItems,
        shipping: shippingInfo,
        payment: { method: paymentMethod },
        shippingMethod,
        subtotal: calculateSubtotal(),
        shipping: calculateShipping(),
        tax: calculateTax(),
        total: calculateTotal()
      }

      const response = await fetch('/api/consumer/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })

      if (response.ok) {
        const data = await response.json()
        // Redirect to success page
        window.location.href = `/orden-confirmada/${data.orderId}`
      } else {
        throw new Error('Order processing failed')
      }
    } catch (error) {
      console.error('Error processing order:', error)
      alert('Error al procesar la orden. Por favor intenta nuevamente.')
    } finally {
      setProcessing(false)
    }
  }

  const steps = [
    { number: 1, title: 'Información de Envío', icon: MapPin },
    { number: 2, title: 'Método de Envío', icon: Truck },
    { number: 3, title: 'Pago', icon: CreditCard },
    { number: 4, title: 'Confirmación', icon: Check }
  ]

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (cartItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Tu carrito está vacío</h2>
          <p className="text-gray-600 mb-6">Añade algunos productos antes de proceder al checkout</p>
          <a 
            href="/catalogo" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Continuar Comprando
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Checkout</h1>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className={`flex items-center space-x-2 ${
                currentStep >= step.number ? 'text-blue-600' : 'text-gray-400'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  currentStep >= step.number 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'border-gray-300 text-gray-400'
                }`}>
                  {currentStep > step.number ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <div className="hidden md:block">
                  <div className="font-medium">{step.title}</div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${
                  currentStep > step.number ? 'bg-blue-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Step 1: Shipping Information */}
          {currentStep === 1 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-6">Información de Envío</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={shippingInfo.firstName}
                    onChange={(e) => setShippingInfo({...shippingInfo, firstName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    value={shippingInfo.lastName}
                    onChange={(e) => setShippingInfo({...shippingInfo, lastName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={shippingInfo.email}
                    onChange={(e) => setShippingInfo({...shippingInfo, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    value={shippingInfo.phone}
                    onChange={(e) => setShippingInfo({...shippingInfo, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección *
                  </label>
                  <input
                    type="text"
                    value={shippingInfo.address}
                    onChange={(e) => setShippingInfo({...shippingInfo, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ciudad *
                  </label>
                  <input
                    type="text"
                    value={shippingInfo.city}
                    onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado *
                  </label>
                  <input
                    type="text"
                    value={shippingInfo.state}
                    onChange={(e) => setShippingInfo({...shippingInfo, state: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código Postal *
                  </label>
                  <input
                    type="text"
                    value={shippingInfo.zipCode}
                    onChange={(e) => setShippingInfo({...shippingInfo, zipCode: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    País *
                  </label>
                  <select
                    value={shippingInfo.country}
                    onChange={(e) => setShippingInfo({...shippingInfo, country: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="México">México</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Shipping Method */}
          {currentStep === 2 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-6">Método de Envío</h2>
              
              <div className="space-y-4">
                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    shippingMethod === 'standard' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setShippingMethod('standard')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="shipping"
                        value="standard"
                        checked={shippingMethod === 'standard'}
                        onChange={() => setShippingMethod('standard')}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium">Envío Estándar</div>
                        <div className="text-sm text-gray-600">5-7 días hábiles</div>
                      </div>
                    </div>
                    <div className="font-semibold">
                      {calculateSubtotal() > 1000 ? 'GRATIS' : '$150'}
                    </div>
                  </div>
                </div>
                
                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    shippingMethod === 'express' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setShippingMethod('express')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="shipping"
                        value="express"
                        checked={shippingMethod === 'express'}
                        onChange={() => setShippingMethod('express')}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium">Envío Express</div>
                        <div className="text-sm text-gray-600">2-3 días hábiles</div>
                      </div>
                    </div>
                    <div className="font-semibold">$250</div>
                  </div>
                </div>
                
                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    shippingMethod === 'same-day' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setShippingMethod('same-day')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="shipping"
                        value="same-day"
                        checked={shippingMethod === 'same-day'}
                        onChange={() => setShippingMethod('same-day')}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium">Envío el Mismo Día</div>
                        <div className="text-sm text-gray-600">Solo CDMX y área metropolitana</div>
                      </div>
                    </div>
                    <div className="font-semibold">$400</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {currentStep === 3 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-6">Información de Pago</h2>
              
              <div className="mb-6">
                <div className="flex space-x-4 mb-4">
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                      paymentMethod === 'card' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Tarjeta de Crédito/Débito</span>
                  </button>
                </div>
              </div>

              {paymentMethod === 'card' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Tarjeta *
                    </label>
                    <input
                      type="text"
                      value={paymentInfo.cardNumber}
                      onChange={(e) => setPaymentInfo({...paymentInfo, cardNumber: e.target.value})}
                      placeholder="1234 5678 9012 3456"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha de Vencimiento *
                      </label>
                      <input
                        type="text"
                        value={paymentInfo.expiryDate}
                        onChange={(e) => setPaymentInfo({...paymentInfo, expiryDate: e.target.value})}
                        placeholder="MM/YY"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CVV *
                      </label>
                      <input
                        type="text"
                        value={paymentInfo.cvv}
                        onChange={(e) => setPaymentInfo({...paymentInfo, cvv: e.target.value})}
                        placeholder="123"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre en la Tarjeta *
                    </label>
                    <input
                      type="text"
                      value={paymentInfo.cardName}
                      onChange={(e) => setPaymentInfo({...paymentInfo, cardName: e.target.value})}
                      placeholder="Juan Pérez"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="mt-6 p-4 bg-gray-50 rounded-lg flex items-center space-x-2">
                <Lock className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-600">
                  Tu información de pago está protegida con encriptación SSL de 256 bits
                </span>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {currentStep === 4 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-6">Confirmar Orden</h2>
              
              <div className="space-y-6">
                {/* Shipping Info Summary */}
                <div>
                  <h3 className="font-medium mb-2">Información de Envío</h3>
                  <div className="text-sm text-gray-600">
                    <p>{shippingInfo.firstName} {shippingInfo.lastName}</p>
                    <p>{shippingInfo.address}</p>
                    <p>{shippingInfo.city}, {shippingInfo.state} {shippingInfo.zipCode}</p>
                    <p>{shippingInfo.email} | {shippingInfo.phone}</p>
                  </div>
                </div>
                
                {/* Shipping Method Summary */}
                <div>
                  <h3 className="font-medium mb-2">Método de Envío</h3>
                  <div className="text-sm text-gray-600">
                    {shippingMethod === 'standard' && 'Envío Estándar (5-7 días hábiles)'}
                    {shippingMethod === 'express' && 'Envío Express (2-3 días hábiles)'}
                    {shippingMethod === 'same-day' && 'Envío el Mismo Día'}
                  </div>
                </div>
                
                {/* Payment Method Summary */}
                <div>
                  <h3 className="font-medium mb-2">Método de Pago</h3>
                  <div className="text-sm text-gray-600">
                    Tarjeta terminada en ****{paymentInfo.cardNumber.slice(-4)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              disabled={currentStep === 1}
              className="flex items-center space-x-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>
            
            {currentStep < 4 ? (
              <button
                onClick={() => {
                  if (currentStep === 1 && !validateShippingInfo()) {
                    alert('Por favor completa todos los campos requeridos')
                    return
                  }
                  if (currentStep === 3 && !validatePaymentInfo()) {
                    alert('Por favor completa la información de pago')
                    return
                  }
                  setCurrentStep(currentStep + 1)
                }}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                <span>Siguiente</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={processOrder}
                disabled={processing}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmar Orden</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-4">
            <h3 className="text-lg font-semibold mb-4">Resumen de la Orden</h3>
            
            {/* Items */}
            <div className="space-y-3 mb-6">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center space-x-3">
                  <img
                    src={item.product.google_drive || '/placeholder-shoe.jpg'}
                    alt={`${item.product.marca} ${item.product.modelo}`}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {item.product.marca} {item.product.modelo}
                    </div>
                    <div className="text-xs text-gray-600">
                      {item.product.color} - Talla {item.product.talla}
                    </div>
                    <div className="text-xs text-gray-600">
                      Cantidad: {item.quantity}
                    </div>
                  </div>
                  <div className="text-sm font-semibold">
                    ${((item.product.precio_shopify || 0) * item.quantity).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Totals */}
            <div className="space-y-2 border-t pt-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>${calculateSubtotal().toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span>Envío:</span>
                <span className={calculateShipping() === 0 ? 'text-green-600' : ''}>
                  {calculateShipping() === 0 ? 'GRATIS' : `$${calculateShipping().toLocaleString()}`}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span>IVA (16%):</span>
                <span>${calculateTax().toLocaleString()}</span>
              </div>
              
              <hr className="my-2" />
              
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>${calculateTotal().toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckoutFlow
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Package, Plus, Upload, CheckCircle } from 'lucide-react'

interface OnboardingProps {
  onComplete: () => void
}

export default function NewRetailerOnboarding({ onComplete }: OnboardingProps) {
  const { data: session } = useSession()
  const [currentStep, setCurrentStep] = useState(1)
  const [isCompleting, setIsCompleting] = useState(false)

  const handleComplete = async () => {
    setIsCompleting(true)
    // Mark onboarding as complete
    try {
      // In the future, save onboarding completion to user preferences
      setTimeout(() => {
        setIsCompleting(false)
        onComplete()
      }, 1000)
    } catch (error) {
      setIsCompleting(false)
    }
  }

  const steps = [
    {
      id: 1,
      title: 'Bienvenido a tu tienda',
      description: 'Tu cuenta ha sido creada exitosamente',
      icon: <CheckCircle className="w-8 h-8 text-green-500" />
    },
    {
      id: 2, 
      title: 'Gestiona tu inventario',
      description: 'Agrega productos y controla tu stock',
      icon: <Package className="w-8 h-8 text-blue-500" />
    },
    {
      id: 3,
      title: '¡Listo para empezar!',
      description: 'Tu sistema está configurado y listo',
      icon: <Plus className="w-8 h-8 text-purple-500" />
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">
              {session?.user?.name ? session.user.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'TU'}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ¡Bienvenido, {session?.user?.name}!
          </h1>
          <p className="text-gray-600">
            Tu cuenta en <span className="font-semibold text-blue-600">{session?.user?.tenant_name}</span> está lista
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                    step.id <= currentStep
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {step.icon}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-4 ${
                      step.id < currentStep ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Current Step Content */}
        <div className="text-center mb-8">
          <div className="mb-6">
            {steps[currentStep - 1].icon}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {steps[currentStep - 1].title}
          </h2>
          <p className="text-gray-600 mb-6">
            {steps[currentStep - 1].description}
          </p>

          {/* Step-specific content */}
          {currentStep === 1 && (
            <div className="bg-green-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-green-900 mb-2">✅ Tu cuenta incluye:</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Inventario ilimitado de productos</li>
                <li>• Dashboard con métricas en tiempo real</li>
                <li>• Sistema de precios automatizado</li>
                <li>• Acceso a tu tienda en: <span className="font-mono bg-green-100 px-2 py-1 rounded">
                  app.lospapatos.com/{session?.user?.tenant_subdomain}</span></li>
              </ul>
            </div>
          )}

          {currentStep === 2 && (
            <div className="bg-blue-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-blue-900 mb-4">🚀 Próximos pasos:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <Package className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <div className="font-medium text-blue-900">Ver Inventario</div>
                  <div className="text-blue-700">Gestiona tus productos</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <Plus className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <div className="font-medium text-blue-900">Agregar Productos</div>
                  <div className="text-blue-700">Comienza tu catálogo</div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="bg-purple-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-purple-900 mb-2">🎉 ¡Todo listo!</h3>
              <p className="text-purple-700 mb-4">
                Tu sistema de inventario está configurado y listo para usar.
              </p>
              <div className="text-sm text-purple-600">
                Puedes comenzar agregando productos desde el menú "Inventario"
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className={`px-6 py-3 rounded-lg font-medium ${
              currentStep === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Anterior
          </button>

          {currentStep < steps.length ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={isCompleting}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {isCompleting ? 'Finalizando...' : 'Comenzar a usar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
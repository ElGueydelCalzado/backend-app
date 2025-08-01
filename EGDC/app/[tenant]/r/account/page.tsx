'use client'

import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import LoadingScreen from '@/components/LoadingScreen'
import TabNavigation from '@/components/TabNavigation'
import TenantSelector from '@/components/TenantSelector'
import AccountSettings from '@/components/AccountSettings'

// Retailer Account Settings Page
export default function RetailerAccountPage() {
  const params = useParams()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  const tenant = params.tenant as string

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      console.log('❌ No session found - redirecting to login')
      router.push('/login')
      return
    }

    // Validate tenant access and business type
    const userTenant = session.user?.tenant_subdomain?.toLowerCase()
    const currentTenant = tenant?.toLowerCase()
    const businessType = session.user?.business_type
    
    const isValidTenantAccess = userTenant === currentTenant || 
                              userTenant?.includes(currentTenant) ||
                              currentTenant?.includes(userTenant)
    
    console.log('🏪 Retailer Account - Tenant validation:', {
      userTenant,
      currentTenant,
      businessType,
      isValidTenantAccess,
      sessionUser: session.user
    })

    if (!isValidTenantAccess) {
      console.log('❌ Tenant access denied - user does not have access to this tenant')
      router.push('/login')
      return
    }

    // Check if user has retailer access
    if (businessType !== 'retailer') {
      console.log('❌ Business type mismatch - redirecting to appropriate dashboard')
      const businessRoute = businessType === 'supplier' ? 's' : 's'
      router.push(`/${tenant}/${businessRoute}/account`)
      return
    }

    setLoading(false)
  }, [session, status, tenant, router])

  if (loading) {
    return <LoadingScreen text="Cargando configuración de cuenta..." />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <TabNavigation currentTab="account" />
        <TenantSelector currentTenant={tenant} businessType="retailer" />
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Configuración de Cuenta - {session?.user?.tenant_name || 'EGDC'}
          </h1>
          <p className="text-gray-600 mt-2">
            Gestiona tu cuenta de retailer y configuraciones del sistema
          </p>
        </div>

        {/* Account Settings Component */}
        <AccountSettings 
          user={session?.user}
          businessType="retailer"
          tenant={tenant}
        />
      </main>
    </div>
  )
}
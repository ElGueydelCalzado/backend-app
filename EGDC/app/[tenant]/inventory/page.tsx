'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function TenantInventoryRedirect() {
  const params = useParams()
  const router = useRouter()
  
  useEffect(() => {
    const tenant = params.tenant as string
    if (tenant) {
      // Redirect from /tenant/inventory to /tenant/dashboard
      // The dashboard handles all inventory functionality
      router.replace(`/${tenant}/dashboard`)
    }
  }, [params.tenant, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirigiendo...</p>
      </div>
    </div>
  )
}
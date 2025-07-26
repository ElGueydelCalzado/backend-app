'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import LoadingScreen from '@/components/LoadingScreen'

export default function DashboardRedirect() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // Check if SKIP_AUTH is enabled for development/testing
    const isSkipAuth = process.env.NODE_ENV === 'development' && 
                      (process.env.NEXT_PUBLIC_SKIP_AUTH === 'true' || 
                       window.location.search.includes('skip_auth=true'))

    if (isSkipAuth) {
      // In SKIP_AUTH mode, redirect directly to EGDC dashboard for testing
      console.log('🧪 SKIP_AUTH mode detected - redirecting to EGDC dashboard')
      router.push('/egdc/dashboard')
      return
    }

    if (status === 'loading') return // Still loading

    if (!session) {
      // Not authenticated, redirect to login
      router.push('/login')
      return
    }

    if (session.user?.tenant_subdomain) {
      // Redirect to tenant-specific dashboard
      const tenantPath = session.user.tenant_subdomain.replace('preview-', '').replace('mock-', '')
      const tenantUrl = `/${tenantPath}/dashboard`
      
      console.log('🔄 Redirecting from generic dashboard to tenant dashboard:', {
        from: '/dashboard',
        to: tenantUrl,
        tenant: tenantPath
      })
      
      router.push(tenantUrl)
    } else {
      // No tenant info, redirect to login
      router.push('/login')
    }
  }, [session, status, router])

  // Show loading while redirecting
  return <LoadingScreen text="Redirigiendo a tu workspace..." />
}